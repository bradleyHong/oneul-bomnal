/**
 * 오늘은 봄날 · ArtWork Studio (고객 화면)
 *
 * 흐름
 *   ① 만들고 싶은 장면을 한국어로 적는다
 *   ② 화면 규격을 고른다 (프리셋 또는 직접 입력)
 *   ③ 엔진이 문장을 읽어 5초짜리 시연본을 코드로 그린다
 *   ④ 견적을 확인하고 의뢰한다
 *
 * 시연본은 전부 코드로 그립니다. 사진을 합성하지 않습니다.
 * 라이선스를 확보한 에셋은 사내 최종 렌더의 입력으로만 쓰고,
 * 이 화면에는 올리지 않습니다.
 * 화면에 워터마크가 항상 찍히며 저장 기능은 두지 않습니다.
 */
(function () {
  "use strict";

  var GEN = window.BomnalGen;

  /* ── 화면 규격 프리셋 ─────────────────────────────── */
  var PANELS = [
    { id: "wide169", name: "가로형 · 로비 미디어월", w: 3840, h: 2160, note: "16:9" },
    { id: "vert916", name: "세로형 · 안내 사이니지", w: 1080, h: 1920, note: "9:16" },
    { id: "ultra329", name: "긴 화면 · 외벽 전광판", w: 3840, h: 960, note: "32:9" },
    { id: "unknown", name: "잘 모르겠음 · 상담 때 확인", w: 3840, h: 2160, note: "상담 필요", unknown: true },
    { id: "column16", name: "기둥형 · 세로 긴 화면", w: 340, h: 2040, note: "1:6" },
    /* 두 면 기둥. 한 장으로 그려 모서리에서 반씩 잘라 건다.
       면마다 따로 돌리면 기둥 하나가 아니라 화면 두 대로 보인다. */
    { id: "column2", name: "두 면 기둥 · 모서리", w: 1512, h: 2160, note: "2면", wrap: 2 },
    { id: "square", name: "정사각 · 포토존", w: 2048, h: 2048, note: "1:1" }
  ];

  function $(q, r) { return (r || document).querySelector(q); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  /* ── 견적 ─────────────────────────────────────────── */
  var BASE_PIXELSEC = 3840 * 2160 * 30;     // 4K 30초 = 1크레딧
  var CREDIT_WON = 1000000;
  /* 전용 플레이어 한 대. 라즈베리파이 5 · 16GB, 작품을 넣고 HDMI 만 꽂으면
     도는 상태로 보낸다. 값이 정해진 물건이라 배수를 안 탄다. */
  var PLAYER_WON = 1500000;

  function quote(panel, seconds, opts) {
    var credits = (panel.w * panel.h * seconds) / BASE_PIXELSEC;
    credits = Math.max(0.5, Math.round(credits * 10) / 10);
    var mult = 1;
    if (opts.asset) mult *= 1.2;
    if (opts.custom) mult *= 1.6;
    if (opts.rush) mult *= 1.5;
    var render = Math.round(credits * mult * CREDIT_WON / 10000) * 10000;
    /* 물건은 배수가 아니라 값이 정해져 있다. 렌더 값과 따로 더한다. */
    var player = opts.player ? PLAYER_WON : 0;
    return { credits: credits, mult: Math.round(mult * 100) / 100, render: render,
             player: player, won: render + player };
  }

  function comma(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  /* ── 화면 조립 ────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    var root = $("#studio");
    if (!root) return;

    var elStory = $("[data-st-story]", root);
    var elPanel = $("[data-st-panel]", root);
    var elW = $("[data-st-w]", root);
    var elH = $("[data-st-h]", root);
    var elSec = $("[data-st-sec]", root);
    var elGo = $("[data-st-go]", root);
    var elReset = $("[data-st-reset]", root);
    var elCanvas = $("[data-st-canvas]", root);
    var elPause = $("[data-st-pause]", root);
    var elFocus = $("[data-st-focus]", root);
    var elCuts = $("[data-st-cuts]", root);
    var elQuote = $("[data-st-quote]", root);
    var elStat = $("[data-st-stat]", root);
    var elChips = $("[data-st-chips]", root);
    var elForm = $("[data-st-form]", root);
    var elSend = $("[data-st-send]", root);
    var elMsg = $("[data-st-msg]", root);
    var elHist = $("[data-st-hist]", root);
    var elHistWrap = $("[data-st-hist-wrap]", root);
    var LAST = null;
    var formatButtons = Array.prototype.slice.call(root.querySelectorAll("[data-st-format]"));
    var selectedArtwork = null;
    var ART_KEY = "bomnal.artCompare.v1";
    var compareArts = [];
    try {
      compareArts = JSON.parse(localStorage.getItem(ART_KEY) || "[]") || [];
      if (!Array.isArray(compareArts)) compareArts = [];
    } catch (e) { compareArts = []; }

    function artFrom(node) {
      if (!node) return null;
      return {
        id: node.getAttribute("data-art-id") || "",
        title: node.getAttribute("data-art-title") || "",
        kind: node.getAttribute("data-art-kind") || "",
        img: node.getAttribute("data-art-img") || "",
        alt: node.getAttribute("data-art-alt") || "",
        space: node.getAttribute("data-art-space") || "",
        mood: node.getAttribute("data-art-mood") || "",
        ratio: node.getAttribute("data-art-ratio") || "",
        custom: node.getAttribute("data-art-custom") || "",
        desc: node.getAttribute("data-art-desc") || ""
      };
    }

    function sameArt(a, b) { return a && b && a.id === b.id; }

    function artSave() {
      try { localStorage.setItem(ART_KEY, JSON.stringify(compareArts.slice(0, 12))); }
      catch (e) { /* 사생활 보호 모드면 이번 방문에만 비교한다 */ }
    }

    function artSummary() {
      if (!selectedArtwork) return "";
      return selectedArtwork.title + " · " + selectedArtwork.kind;
    }

    function renderCompare() {
      var wrap = $("[data-art-compare-wrap]", root);
      var list = $("[data-art-compare-list]", root);
      if (!wrap || !list) return;
      wrap.hidden = compareArts.length === 0;
      list.innerHTML = "";
      compareArts.forEach(function (art) {
        var item = el("button", "st-compare-item");
        item.type = "button";
        item.setAttribute("data-art-id", art.id);
        item.innerHTML =
          '<img src="' + art.img + '" alt="" loading="lazy" decoding="async" />' +
          '<span><b>' + art.title + '</b><small>' + art.kind + '</small></span>';
        item.addEventListener("click", function () {
          selectArtwork(art, true);
        });
        list.appendChild(item);
      });
      Array.prototype.forEach.call(root.querySelectorAll("[data-art-compare]"), function (btn) {
        btn.textContent = selectedArtwork && compareArts.some(function (a) { return sameArt(a, selectedArtwork); })
          ? "비교에서 빼기" : "비교에 담기";
      });
    }

    function selectArtwork(art, scrollToDetail) {
      if (!art || !art.id) return;
      selectedArtwork = art;
      var img = $("[data-art-image]", root);
      if (img) {
        img.src = art.img;
        img.alt = art.alt || art.title;
      }
      var fields = [
        ["[data-art-kind]", art.kind],
        ["[data-art-title]", art.title],
        ["[data-art-desc]", art.desc],
        ["[data-art-space]", art.space],
        ["[data-art-mood]", art.mood],
        ["[data-art-ratio]", art.ratio],
        ["[data-art-custom]", art.custom]
      ];
      fields.forEach(function (row) {
        var target = $(row[0], root);
        if (target) target.textContent = row[1] || "";
      });
      Array.prototype.forEach.call(root.querySelectorAll("[data-art-select]"), function (btn) {
        btn.classList.toggle("is-on", btn.getAttribute("data-art-id") === art.id);
        btn.setAttribute("aria-pressed", btn.getAttribute("data-art-id") === art.id ? "true" : "false");
      });
      renderCompare();
      updateQuote();
      if (scrollToDetail) {
        var detail = $("[data-art-detail]", root);
        if (detail && detail.scrollIntoView) detail.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    function checkedText(group) {
      var n = group && group.querySelector("input:checked");
      return n ? n.value : "";
    }

    function customerPrefs() {
      return {
        place: checkedText($("[data-st-place]", root)),
        mood: checkedText($("[data-st-mood]", root)),
        color: checkedText($("[data-st-color]", root))
      };
    }

    Array.prototype.forEach.call(root.querySelectorAll("[data-art-select]"), function (btn) {
      btn.setAttribute("aria-pressed", btn.classList.contains("is-on") ? "true" : "false");
      btn.addEventListener("click", function () {
        selectArtwork(artFrom(btn), true);
      });
    });
    var firstArt = root.querySelector("[data-art-select].is-on") || root.querySelector("[data-art-select]");
    if (firstArt) selectArtwork(artFrom(firstArt), false);
    var elArtQuote = $("[data-art-quote]", root);
    if (elArtQuote) {
      elArtQuote.addEventListener("click", function () {
        updateQuote();
        var q = document.getElementById("quote");
        if (q && q.scrollIntoView) q.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    var elArtCompare = $("[data-art-compare]", root);
    if (elArtCompare) {
      elArtCompare.addEventListener("click", function () {
        if (!selectedArtwork) return;
        var before = compareArts.length;
        compareArts = compareArts.filter(function (a) { return !sameArt(a, selectedArtwork); });
        if (compareArts.length === before) compareArts.unshift(selectedArtwork);
        if (compareArts.length > 12) compareArts.pop();
        artSave();
        renderCompare();
      });
    }
    var elArtBack = $("[data-art-back]", root);
    if (elArtBack) {
      elArtBack.addEventListener("click", function () {
        var list = $("[data-art-list]", root);
        if (list && list.scrollIntoView) list.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    PANELS.forEach(function (p, i) {
      var o = el("option", null, p.name + "  (" + p.note + " · " + p.w + "×" + p.h + ")");
      o.value = i;
      elPanel.appendChild(o);
    });
    var oCustom = el("option", null, "직접 입력");
    oCustom.value = "custom";
    elPanel.appendChild(oCustom);

    function currentPanel() {
      if (elPanel.value === "custom") {
        return { name: "직접 입력", w: Math.max(64, +elW.value || 1920), h: Math.max(64, +elH.value || 1080), note: "custom" };
      }
      return PANELS[+elPanel.value];
    }

    function panelIndexById(id) {
      for (var i = 0; i < PANELS.length; i++) {
        if (PANELS[i].id === id) return i;
      }
      return -1;
    }

    function syncFormatButtons() {
      var p = currentPanel();
      formatButtons.forEach(function (b) {
        b.classList.toggle("is-on", p && b.getAttribute("data-st-format") === p.id);
        b.setAttribute("aria-pressed", p && b.getAttribute("data-st-format") === p.id ? "true" : "false");
      });
    }

    function syncPanel() {
      var p = currentPanel();
      var custom = elPanel.value === "custom";
      elW.disabled = elH.disabled = !custom;
      if (!custom) { elW.value = p.w; elH.value = p.h; }
      var box = elCanvas.parentNode;
      /* clientWidth 는 안쪽 여백까지 센다. 담는 칸이 좌우 18px씩 물고
         있어서 36px 더 넓게 잡았고, max-width: 100% 가 폭만 눌러
         16:9 가 1.60 으로 찌그러졌다. 여백을 빼고 잰다. */
      var cs = window.getComputedStyle(box);
      var pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      var maxW = Math.max(80, (box.clientWidth || 720) - pad);
      var maxH = 420;
      var sc = Math.min(maxW / p.w, maxH / p.h, 1);
      elCanvas.width = Math.round(p.w * sc * 2) / 2;
      elCanvas.height = Math.round(p.h * sc * 2) / 2;
      elCanvas.style.width = Math.round(p.w * sc) + "px";
      elCanvas.style.height = Math.round(p.h * sc) + "px";
      syncFormatButtons();
      updateQuote();
    }

    function opts() {
      return {
        asset: $("[data-st-opt='asset']", root).checked,
        custom: $("[data-st-opt='custom']", root).checked,
        rush: $("[data-st-opt='rush']", root).checked,
        player: $("[data-st-opt='player']", root).checked,
        api: $("[data-st-opt='api']", root).checked
      };
    }

    function updateQuote() {
      var p = currentPanel(), sec = Math.max(5, +elSec.value || 30);
      var q = quote(p, sec, opts());
      // 견적서 메일에 지금 화면의 설정을 그대로 실어 보내기 위해 마지막 값을 들고 있는다.
      LAST = { panel: p, sec: sec, q: q, o: opts(), prefs: customerPrefs() };
      elQuote.innerHTML =
        (selectedArtwork ? '<div class="st-q-row"><span>선택 작품</span><b>' + artSummary() + '</b></div>' : '') +
        '<div class="st-q-row"><span>화면 규격</span><b>' + p.w + " × " + p.h + '</b></div>' +
        (p.unknown ? '<div class="st-q-row"><span>규격 확인</span><b>상담 때 확인</b></div>' : '') +
        '<div class="st-q-row"><span>장소</span><b>' + (LAST.prefs.place || "선택 없음") + '</b></div>' +
        '<div class="st-q-row"><span>선호색(상담용)</span><b>' + (LAST.prefs.color || "선택 없음") + '</b></div>' +
        '<div class="st-q-row"><span>재생 길이</span><b>' + sec + '초</b></div>' +
        '<div class="st-q-row"><span>렌더 크레딧</span><b>' + q.credits + ' 크레딧</b></div>' +
        '<div class="st-q-row"><span>옵션 배수</span><b>×' + q.mult + '</b></div>' +
        (q.player ? '<div class="st-q-row"><span>전용 플레이어 1대</span><b>' + comma(q.player) + '원</b></div>' : '') +
        (LAST.o.api ? '<div class="st-q-row"><span>API 연결</span><b>담당자 협의</b></div>' : '') +
        '<div class="st-q-total"><span>예상 금액</span><b>' + comma(q.won) + '원</b></div>' +
        '<p class="st-q-note">1크레딧 = 4K 30초 기준입니다. 렌더 원가가 화면 넓이와 길이에 비례하므로 금액도 같은 기준으로 계산합니다. 부가세 별도이며, 확정 견적은 담당자 확인 후 발행합니다.</p>';
    }

    var gen = new GEN.Gen(elCanvas);
    var spec = null;
    var sceneIdx = 0;
    var history = [];              // 방금 만든 화면들. 좋은 것이 지나가 버리면 안 된다.
    var HISTORY_MAX = 8;
    var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var isPaused = reduceMotion;
    var focusOn = false;

    /* 느낌 열둘은 studio-gen.js 로 옮겼다. 순서가 작품 번호에 박히므로
       play.html(전용 플레이어)도 같은 목록을 봐야 한다. */
    var SCENES = GEN.SCENES;
    /* 내놓는 칸만. 번호는 SCENES 자리 그대로 쓰고, 화면에는 이것만 건다.
       내린 칸도 번호로 불러오면 그대로 그려진다 — 이미 나간 번호다. */
    var LIVE = GEN.LIVE || SCENES.map(function (s2, i) { return i; });
    function pickLive() { return LIVE[Math.floor(Math.random() * LIVE.length)]; }
    var CUSTOM = 31;               // 직접 적은 문장. 번호만으로는 되살릴 수 없다.

    /* 작품 번호 = 느낌 번호(위 5비트) + 씨앗(아래 19비트).
     * 문장 정보가 번호 안에 들어 있어야 붙여넣기로 같은 화면이 나온다.
     *
     * 앞의 BN / BN2 / BN3은 그림을 어느 목록에서 뽑았는지를 가리킨다. */
    /* 작품 번호의 판.
       그림 종류가 늘면 고르는 자리가 밀려서 같은 번호가 다른 그림이 된다.
       결제하면 같은 번호로 그려 준다고 화면에 적어 놨으므로, 늘릴 때마다
       판을 올리고 옛 번호는 옛 목록으로 그린다.
         BN-  1판  기본 14종
         BN2- 2판  + 엔진 56종
         BN3- 3판  + 엔진 78종 (3D·글자·액자·띠그림·색면·낙화까지)
         BN4- 4판  + 식물 5종 + 현대미술 5종
         BN5- 5판  + 벽보 + 얼룩
         BN6- 6판  내놓을 것만 솎았다 (엔진 52종)
         BN7- 7판  활자 넷을 덜고 한글 조판을 세웠다
         BN8- 8판  성긴 것을 재서 걷고(21종) 어려운 것을 들였다(9종)
         BN9- 9판  첫 화면 대표작용 빛의 베일을 들였다 */
    var CODE_V = 9;
    function code(idx, seed, v) {
      var n = (((idx & 31) << 19) | (seed & 0x7FFFF)) >>> 0;
      var vv = v || CODE_V;
      return "BN" + (vv === 1 ? "" : String(vv)) + "-" + n.toString(16).toUpperCase().padStart(6, "0");
    }
    function parseCode(txt) {
      var t = String(txt || "").trim();
      var m = /([0-9A-Fa-f]{6})\s*$/.exec(t);
      if (!m) return null;
      var n = parseInt(m[1], 16) >>> 0;
      /* 판 번호가 없으면 1판으로 본다. 접두어 없이 여섯 자리만 적어 온
         경우도 마찬가지다. 2판부터는 늘 숫자를 달고 나가기 때문이다. */
      var vm = /BN([0-9]+)/i.exec(t);
      return { idx: (n >> 19) & 31, seed: n & 0x7FFFF, v: vm ? parseInt(vm[1], 10) : 1 };
    }
    function newSeed() { return Math.floor(Math.random() * 0x7FFFF); }

    function storyOf(idx) {
      return idx === CUSTOM ? (elStory.value || "").trim() : SCENES[idx].text;
    }

    function prefsLine() {
      var p = customerPrefs();
      return [
        p.place ? "장소: " + p.place : null,
        p.mood ? "분위기: " + p.mood : null,
        p.color ? "선호색: " + p.color : null
      ].filter(Boolean).join(" · ");
    }

    function syncViewControls() {
      var picked = $("[data-st-picked]", root);
      if (elPause) {
        elPause.textContent = isPaused ? "재생" : "일시정지";
        elPause.setAttribute("aria-pressed", isPaused ? "true" : "false");
      }
      if (elFocus) {
        elFocus.textContent = focusOn ? "정보 보기" : "감상 모드";
        elFocus.setAttribute("aria-pressed", focusOn ? "true" : "false");
      }
      if (picked) picked.classList.toggle("is-focus", focusOn);
    }

    /* 주소의 설정표로 처음 한 번 그릴 때만 그 줄을 살려 둔다. */
    var fromUrlSpec = false;

    function make(idx, seed, fromHistory, v, style) {
      if (idx == null) idx = sceneIdx;
      if (v == null) v = CODE_V;          /* 새로 만드는 것은 늘 최신 판 */
      var story = storyOf(idx);
      if (!story) { elStory.focus(); return; }
      sceneIdx = idx;
      var pn = currentPanel();
      var sd = seed == null ? newSeed() : seed;
      spec = GEN.compose(story, sd, pn.w / pn.h, v);
      /* 화면을 새로 뽑으면 도구에서 들고 온 설정표는 더 이상 이 화면이
         아니다. 남겨 두면 손님이 승인한 것과 다른 줄이 우리에게 온다. */
      if (fromUrlSpec) fromUrlSpec = false; else SHEET = "";
      /* 담아 둔 화면에서 왔으면 그때 그린 스타일로. 판 목록이 밀려도
         고객이 본 그림이 그대로 열린다. */
      if (style && GEN.hasStyle(style)) spec.style = style;
      spec.idx = idx;
      spec.v = v;
      isPaused = false;
      gen.set(spec);
      if (reduceMotion) {
        gen.draw(1.7);
        isPaused = true;
      } else {
        gen.start();
      }
      syncViewControls();
      /* 고른 화면을 '현장에 걸어보기'(mockup.js)가 받아 간다. 거기서는
         같은 사양을 면마다 제 비율로 다시 그린다. 여기서 그린 한 장을
         늘려 붙이는 것이 아니다. */
      try {
        document.dispatchEvent(new CustomEvent("bn:picked", { detail: spec }));
      } catch (e) { /* 오래된 브라우저에서는 목업만 조용히 비워 둔다 */ }
      if (!fromHistory) remember(idx, sd, story, spec.ar, v);
      drawHistory();
      markScene();

      elChips.innerHTML = "";
      spec.tags.forEach(function (t) { elChips.appendChild(el("span", "st-chip", t)); });
      var pref = prefsLine();
      if (pref) elChips.appendChild(el("span", "st-chip st-chip-soft", pref));

      elCuts.innerHTML =
        '<div class="st-code-head">' +
        '<p class="st-code-num">' + code(idx, sd, v) + '</p>' +
        '<button type="button" class="st-copy" data-st-copy>번호 복사</button>' +
        '</div>' +
        '<p class="st-code-note">이 번호가 이 화면의 설계도입니다. ' +
        '결제하시면 <b>같은 번호로</b> 화면 규격에 맞춰 고화질로 렌더링해 드립니다.</p>' +
        (idx === CUSTOM
          ? '<p class="st-code-sub">직접 적으신 문장으로 만든 번호입니다. 나중에 부르실 때는 문장도 함께 적어 주세요.</p>'
          : '<p class="st-code-sub">번호를 복사해 두시면 언제든 이 화면으로 돌아옵니다.</p>');

      elGo.textContent = "작품 다시 보기";
      updateQuote();
      /* 어느 경로로 만들었든 큰 화면은 같은 방식으로 연다.
         칸을 눌렀을 때만 열어 두었더니, 번호로 불러오거나 기록을 누르거나
         "저희가 골라 드릴까요"를 누른 경우에는 덮개가 안 뜨고 미리보기가
         본문에 그대로 쌓였다. 좁은 화면에서 페이지가 끝없이 길어진다. */
      showPicked();
    }

    function markScene() {
      /* 버튼 자리(i)와 느낌 번호(idx)가 더는 같지 않다. 내린 칸이
         있어서다. LIVE 로 옮겨 봐야 표시가 맞는다. */
      Array.prototype.forEach.call(root.querySelectorAll(".st-scene"), function (b, i) {
        b.classList.toggle("is-on", LIVE[i] === sceneIdx);
      });
    }

    /* 랜덤으로 돌리다 보면 좋은 것이 지나간다. 여덟 장까지 남겨 둔다. */
    function remember(idx, seed, story, ar, v) {
      history = history.filter(function (h) { return !(h.seed === seed && h.idx === idx); });
      history.unshift({ idx: idx, seed: seed, story: story, ar: ar, v: v || CODE_V });
      if (history.length > HISTORY_MAX) history.pop();
    }

    function drawHistory() {
      if (!elHist) return;
      elHist.innerHTML = "";
      if (history.length < 2) { elHistWrap.hidden = true; return; }
      elHistWrap.hidden = false;
      history.forEach(function (h) {
        var b = el("button", "st-hist-item");
        b.type = "button";
        b.title = code(h.idx, h.seed, h.v) + " 다시 보기";
        if (spec && h.seed === spec.seed && h.idx === spec.idx) b.className += " is-on";
        var c = document.createElement("canvas");
        c.width = 240; c.height = Math.max(80, Math.round(240 / Math.max(0.4, h.ar)));
        if (c.height > 300) { c.height = 300; c.width = Math.round(300 * h.ar); }
        var one = new GEN.Gen(c);
        one.set(GEN.compose(h.story, h.seed, h.ar, h.v));
        one.draw(1.6);
        b.appendChild(c);
        b.appendChild(el("span", null, code(h.idx, h.seed, h.v)));
        b.addEventListener("click", function () { make(h.idx, h.seed, true, h.v); });
        elHist.appendChild(b);
      });
    }

    elPanel.addEventListener("change", function () {
      syncPanel();
      if (spec) make();          // 비율이 바뀌면 어울리는 그림도 달라진다
      wallDraw();                // 보여 주는 열두 장도 그 비율로 다시 그린다
    });
    formatButtons.forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-st-format");
        var idx = panelIndexById(id);
        if (idx >= 0) {
          elPanel.value = String(idx);
          elPanel.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });
    [elW, elH, elSec].forEach(function (n) { n.addEventListener("input", updateQuote); });
    Array.prototype.forEach.call(root.querySelectorAll("[data-st-opt]"), function (n) {
      n.addEventListener("change", updateQuote);
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-st-place] input, [data-st-mood] input, [data-st-color] input"), function (n) {
      n.addEventListener("change", function () {
        updateQuote();
        if (spec) {
          elChips.innerHTML = "";
          spec.tags.forEach(function (t) { elChips.appendChild(el("span", "st-chip", t)); });
          var pref = prefsLine();
          if (pref) elChips.appendChild(el("span", "st-chip st-chip-soft", pref));
        }
      });
    });
    elGo.addEventListener("click", function () { make(); });
    if (elReset) {
      elReset.addEventListener("click", function () {
        Array.prototype.forEach.call(root.querySelectorAll("input[type='radio']"), function (n) {
          n.checked = n.defaultChecked;
        });
        Array.prototype.forEach.call(root.querySelectorAll("[data-st-opt]"), function (n) {
          n.checked = false;
        });
        elStory.value = "";
        elPanel.value = "0";
        elW.value = 3840;
        elH.value = 2160;
        elSec.value = 30;
        spec = null;
        history = [];
        elChips.innerHTML = "";
        elCuts.innerHTML = "";
        if (elHist) elHist.innerHTML = "";
        if (elHistWrap) elHistWrap.hidden = true;
        compareArts = [];
        artSave();
        var first = root.querySelector("[data-art-select]");
        if (first) selectArtwork(artFrom(first), false);
        renderCompare();
        var picked = $("[data-st-picked]", root);
        if (picked) {
          picked.hidden = true;
          picked.classList.remove("is-sheet");
        }
        document.body.classList.remove("st-sheet-open");
        syncPanel();
        wallDraw();
        heartDraw();
        elStat.textContent = "처음 상태로 돌렸습니다. 작품을 다시 골라 주세요.";
      });
    }
    elStory.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) make(CUSTOM);
    });
    elStory.addEventListener("input", function () { sceneIdx = CUSTOM; markScene(); });

    // 느낌 버튼 — 문장을 치지 않아도 계속 만들 수 있어야 한다
    var elScenes = $("[data-st-scenes]", root);
    LIVE.forEach(function (i, n) {
      var sc = SCENES[i];
      var b = el("button", "st-scene");
      b.type = "button";
      b.appendChild(el("b", null, sc.en || sc.ko));
      b.appendChild(el("i", null, n < 9 ? String(n + 1) : (n === 9 ? "0" : "")));
      b.title = sc.ko;
      b.addEventListener("click", function () { elStory.value = ""; make(i); });
      elScenes.appendChild(b);
    });

    /* 표식 하나가 없어졌다고 나머지 화면이 통째로 죽으면 안 된다.
       실제로 버튼을 옮기다가 여기서 멈춰 고르는 자리가 빈 채로 떴다. */
    Array.prototype.forEach.call(root.querySelectorAll("[data-st-random]"), function (elRandom) {
      elRandom.addEventListener("click", function () {
      elStory.value = "";
      make(pickLive());
      if (typeof wallMark === "function") wallMark();
      });
    });

    // 숫자키로도 고를 수 있다. 1~9 그리고 0.
    document.addEventListener("keydown", function (e) {
      if (e.target === elStory || /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key >= "1" && e.key <= "9" && wallItems[+e.key - 1]) {
        var it = wallItems[+e.key - 1];
        elStory.value = "";
        make(it.idx, it.seed, false, it.v, it.style);
      }
      else if (e.key === "0" && wallItems[9]) {
        var it0 = wallItems[9];
        elStory.value = "";
        make(it0.idx, it0.seed, false, it0.v, it0.style);
      }
      else if (e.key === "r" || e.key === "R" || e.key === "ㄱ") {
        elStory.value = "";
        make(pickLive());
      }
    });

    // 번호 복사 · 번호로 불러오기
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-st-copy]");
      if (!b || !spec) return;
      var txt = code(spec.idx, spec.seed, spec.v);
      var done = function () { b.textContent = "복사했습니다"; setTimeout(function () { b.textContent = "번호 복사"; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () { prompt("이 번호를 복사해 두세요", txt); });
      } else { prompt("이 번호를 복사해 두세요", txt); }
    });

    /* 도구에서 넘어온 설정표. 없으면 빈 문자열. */
    var SHEET = "";

    var elLoad = $("[data-st-load]", root);
    var elLoadBtn = $("[data-st-load-go]", root);
    var elLoadMsg = $("[data-st-load-msg]", root);
    function loadCode() {
      var p2 = parseCode(elLoad.value);
      if (!p2) { elLoadMsg.textContent = "BN9-, BN8-, BN7-, BN6-, BN5-, BN4-, BN3-, BN2-, BN- 으로 시작하는 번호를 넣어 주세요."; return; }
      if (p2.idx === CUSTOM && !(elStory.value || "").trim()) {
        elLoadMsg.textContent = "직접 적으신 문장으로 만든 번호입니다. 그 문장을 아래에 적어 주세요.";
        return;
      }
      if (p2.idx !== CUSTOM && p2.idx >= SCENES.length) {
        elLoadMsg.textContent = "확인되지 않는 번호입니다. 다시 확인해 주세요.";
        return;
      }
      if (isSold(p2.idx, p2.seed, p2.v)) {
        elLoadMsg.textContent =
          "이미 다른 곳에 납품된 화면입니다. 같은 화면은 두 곳에 드리지 않습니다. 다른 화면을 골라 주세요.";
        return;
      }
      elLoadMsg.textContent = "";
      elLoad.value = "";
      make(p2.idx, p2.seed, false, p2.v);
    }
    elLoadBtn.addEventListener("click", loadCode);
    elLoad.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); loadCode(); } });

    /* 주소로 들어온 번호. 도구 페이지·API·플레이어가 여기로 보낸다.
         /studio?code=BN5-0AC6F6&style=sa:flyposter
       스타일은 비율 때문에 갈아 끼운 번호에만 붙는다. 붙어 있으면 그 그림으로
       열어야 고객이 도구에서 본 화면이 그대로 나온다. */
    (function () {
      var q = new URLSearchParams(location.search);
      /* 도구에서 손본 설정표. 의뢰 문안에 그대로 실어야 우리가 받아서
         바로 렌더할 수 있다. */
      var sh = (q.get("spec") || "").trim();
      if (sh && sh.indexOf("style=") >= 0) SHEET = sh;
      var raw = (q.get("code") || "").trim();
      if (!raw) return;
      var p3 = parseCode(raw);
      if (!p3 || p3.idx === CUSTOM || p3.idx >= SCENES.length) return;
      var st = q.get("style");
      fromUrlSpec = !!SHEET;
      make(p3.idx, p3.seed, false, p3.v, st && GEN.hasStyle(st) ? st : null);
      var picked = $("[data-st-picked]", root);
      if (picked && picked.scrollIntoView) picked.scrollIntoView({ block: "start" });
    })();

    window.addEventListener("resize", syncPanel);

    // ── 견적서 받기 ────────────────────────────────────────────
    // 가입시키지 않습니다. 이름과 이메일만 받아 지금 화면의 설정을 그대로 실어 보냅니다.
    // 광고성 메일은 정보통신망법 제50조에 따라 사전 동의가 있어야 하므로,
    // 회신 동의와 수신 동의를 반드시 따로 받고 그 결과를 접수 내용에 남깁니다.
    /* 도구를 안 거치고 스튜디오에서 바로 고른 화면도 같은 모양의 줄로 적는다.
       담당자가 두 가지 양식을 구분할 이유가 없다. */
    function specLine() {
      if (!spec) return "(만들기 전)";
      var pn = currentPanel();
      var enc = encodeURIComponent;
      var tones = (spec.palette.ink || []).map(function (h) { return h.replace(/^#/, ""); }).join(",");
      return ["style=" + enc(String(spec.style).replace(/^sa:/, "")),
              "scene=" + spec.idx,
              "seed=" + spec.seed,
              "v=" + (spec.v || CODE_V),
              "ar=" + (pn.w / pn.h).toFixed(6),
              pn.wrap ? "wrap=" + pn.wrap : null,
              "pal=" + enc(spec.palette.id),
              "bg=" + enc(spec.palette.bg),
              "tones=" + enc(tones),
              "w=" + pn.w, "h=" + pn.h].filter(Boolean).join("&");
    }

    function specText(story) {
      if (!LAST) return "(견적을 계산하기 전에 보내셨습니다)";
      var picked = [];
      var art = spec ? code(spec.idx, spec.seed, spec.v) : null;
      if (LAST.o.asset) picked.push("기관 로고·이미지 반영");
      if (LAST.o.custom) picked.push("커스텀 스타일 요청");
      if (LAST.o.rush) picked.push("당일 급행");
      if (LAST.o.player) picked.push("전용 플레이어 1대 (라즈베리파이 5 · 16GB, 작품 설치 후 배송, " + comma(PLAYER_WON) + "원)");
      if (LAST.o.api) picked.push("API 연결 (작품을 주소로 불러오기 · HTML 전달, 협의)");
      var compared = compareArts.map(function (a) { return a.title + " (" + a.kind + ")"; }).join(", ");
      return [
        "선택 작품 참고: " + (selectedArtwork ? selectedArtwork.title + " / " + selectedArtwork.kind : "(없음)"),
        "선택 작품 설명: " + (selectedArtwork ? selectedArtwork.desc : "(없음)"),
        "비교에 담은 작품: " + (compared || "(없음)"),
        "작품 번호: " + (art || "(만들기 전)"),
        "원하시는 화면: " + (story || "(적지 않으심)"),
        "고객 선택 장소: " + (LAST.prefs && LAST.prefs.place ? LAST.prefs.place : "선택 없음"),
        "고객 선택 분위기: " + (LAST.prefs && LAST.prefs.mood ? LAST.prefs.mood : "선택 없음"),
        "고객 선택 선호색(상담용): " + (LAST.prefs && LAST.prefs.color ? LAST.prefs.color : "선택 없음"),
        "엔진 설정(사내 확인용): " + (spec ? spec.style + " / " + spec.palette.id : "-"),
        /* 이 줄 하나면 담당자가 그 자리에서 4K 를 뽑는다.
             node tools/render-studio.mjs "<이 줄>" --name <이름> --dur <초>
           손님이 도구에서 손본 값까지 전부 담겨 있다. */
        "재현용 파라미터: " + (SHEET || specLine()),
        "화면 규격: " + LAST.panel.name + " " + LAST.panel.w + "×" + LAST.panel.h +
          (LAST.panel.unknown ? " (정확한 규격은 상담 때 확인)" : "") +
          (LAST.panel.wrap ? " (한 장으로 그려 모서리에서 " + LAST.panel.wrap + "쪽으로 자름 · 면마다 "
                             + Math.round(LAST.panel.w / LAST.panel.wrap) + "×" + LAST.panel.h + ")" : ""),
        "재생 길이: " + LAST.sec + "초",
        "렌더 크레딧: " + LAST.q.credits + " 크레딧 (옵션 배수 ×" + LAST.q.mult + ") = " + comma(LAST.q.render) + "원",
        "추가 요청: " + (picked.join(", ") || "없음"),
        "예상 금액: " + comma(LAST.q.won) + "원 (부가세 별도" + (LAST.o.api ? " · API 연결은 별도 협의" : "") + ")"
      ].join("\n");
    }

    function say(text, tone) {
      if (!elMsg) return;
      elMsg.textContent = text;
      if (tone) elMsg.setAttribute("data-tone", tone);
      else elMsg.removeAttribute("data-tone");
    }

    if (elForm) {
      elForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var d = new FormData(elForm);
        var name = String(d.get("name") || "").trim();
        var email = String(d.get("email") || "").trim();

        if (!name) { say("이름을 적어 주세요.", "err"); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say("이메일 주소를 다시 확인해 주세요.", "err"); return; }
        if (!d.get("consentRequired")) { say("견적 회신을 위한 수집 동의가 필요합니다.", "err"); return; }

        var marketing = d.get("consentMarketing") ? "동의함" : "동의하지 않음";
        elSend.disabled = true;
        say("보내는 중…");

        fetch("/api/inquiry", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: name,
            email: email,
            phone: String(d.get("phone") || "").trim(),
            organization: String(d.get("organization") || "").trim(),
            service: ["미디어아트 제작 (ArtWork Studio 견적)"],
            page: "studio",
            message: specText((elStory.value || "").trim()) +
              "\n\n[동의 기록] 개인정보 수집·이용: 동의함 / 광고성 정보 수신: " + marketing
          })
        })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
          .then(function () {
            elForm.reset();
            say("접수했습니다. 적어 주신 주소로 견적서를 보내드리겠습니다. (평일 기준)", "ok");
          })
          .catch(function () {
            elSend.disabled = false;
            say("전송이 되지 않았습니다. 010-4292-1999 또는 studio@publicbloom.art로 연락 주세요.", "err");
          });
      });
    }

    /* ── 골라 보는 자리 ───────────────────────────────────────
     *
     * 문장을 적게 하는 것은 "무엇을 원하는지 당신이 정하라"는 뜻이다.
     * 담당자는 미디어아트를 어떻게 만들지 정하려고 우리를 부른 것이지,
     * 그걸 글로 설명하려고 부른 게 아니다. 잘못 적었다고 탓할 수도 없다.
     * 그래서 기본 경로를 "적기"에서 "고르기"로 바꿨다.
     *
     * 무작위 열두 장을 한꺼번에 보여 주면 좋은 그림과 약한 그림이 같은
     * 무게로 섞인다. 첫 화면은 대표작 세 점만 세우고, 선택한 것만 움직인다. */
    function wallCount() {
      var page = CURATED_WALL[curatedPage % CURATED_WALL.length];
      return page ? page.length : 0;
    }
    var elWall = $("[data-st-wall]", root);
    var wallItems = [];
    var curatedPage = 0;
    var CURATED_WALL = [
      [
        { idx: 0, seed: 0x51c23, style: "sa:galleryveil", title: "Veil Current", caption: "빛의 베일 · 로비 미디어월" },
        { idx: 14, seed: 0x62a91, style: "sa:galleryveil", title: "Reed Nocturne", caption: "저녁 갈대 · 휴게 라운지" },
        { idx: 1, seed: 0x44be2, style: "sa:ocean", title: "Blue Field", caption: "깊은 바다 · 긴 화면" }
      ],
      [
        { idx: 27, seed: 0x2f8c1, style: "sa:pojagi", title: "Color Field", caption: "조각보 색면 · 포토존" },
        { idx: 29, seed: 0x399a4, style: "sa:curlflow", title: "Ink Stream", caption: "먹의 흐름 · 세로 화면" },
        { idx: 9, seed: 0x5b7d0, style: "sa:motiongfx", title: "Signal Opening", caption: "모션그래픽 · 이벤트홀" }
      ]
    ];

    /* ── 이미 팔린 번호 ───────────────────────────────────────
     *
     * 한 번호를 두 고객에게 확정 납품하지 않는 쪽으로 간다. 지금 화면에서
     * 클릭하거나 하트로 담는 것은 관심 표시일 뿐이고, 영구 제외가 아니다.
     * 계약·구매 확정 기준은 운영 정책과 서버 작업에서 따로 정해야 한다.
     *
     * 목록은 sold-codes.json 이고 운영자가 확정된 작품 번호를 채운다.
     * 이 로컬 화면은 그 번호와 완전히 같은 코드만 추천에서 뺀다. 비슷한
     * 씨앗·스타일까지 막는 시각 유사성 판정은 별도 백엔드/검수 범위다.
     * 못 읽어도 화면은 그냥 돈다. 목록을 못 읽었다고 스튜디오가 멈추면
     * 팔 수 있는 것까지 못 판다. */
    var soldSet = null;                 /* null = 아직 못 읽음 */
    function isSold(idx, seed, v) {
      if (!soldSet) return false;
      return soldSet[code(idx, seed, v)] === true;
    }
    fetch("./sold-codes.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !Array.isArray(d.codes)) return;
        soldSet = {};
        d.codes.forEach(function (c) {
          var k = typeof c === "string" ? c : (c && c.code);
          if (k) soldSet[String(k).trim().toUpperCase()] = true;
        });
        wallDraw();                     /* 목록이 늦게 와도 팔린 것은 걷어낸다 */
      })
      .catch(function () { /* 목록이 없어도 그냥 판다 */ });

    /* ── 담아 둔 화면 (하트) ──────────────────────────────────
     *
     * 열두 장을 넘기다 보면 앞서 본 마음에 드는 것을 잃어버린다. 씨앗이
     * 매번 새로 나오기 때문에 뒤로 가기로도 못 돌아온다. 하트를 누르면
     * 이 브라우저에 남겨 두었다가 다시 보여 준다.
     *
     * 서버에 두지 않는다. 로그인 없이 쓰는 화면이라 누구 것인지 알 수
     * 없고, 알 필요도 없다. */
    var HEART_KEY = "bomnal.hearts.v1";
    var HEART_MAX = 60;
    var hearts = [];
    try {
      var raw = localStorage.getItem(HEART_KEY);
      if (raw) hearts = JSON.parse(raw) || [];
      if (!Array.isArray(hearts)) hearts = [];
    } catch (e) { hearts = []; }

    function heartSave() {
      try { localStorage.setItem(HEART_KEY, JSON.stringify(hearts.slice(0, HEART_MAX))); }
      catch (e) { /* 사생활 보호 모드면 저장이 막힌다. 이번 방문에만 남는다 */ }
    }
    function heartKey(it) { return it.idx + ":" + it.seed + ":" + (it.v || CODE_V); }
    function heartHas(it) {
      var k = heartKey(it);
      return hearts.some(function (h) { return heartKey(h) === k; });
    }
    function heartToggle(it) {
      var k = heartKey(it);
      var was = hearts.length;
      hearts = hearts.filter(function (h) { return heartKey(h) !== k; });
      if (hearts.length === was) {
        /* 그린 스타일 이름도 같이 남긴다. 판 목록이 밀려도(한 번 그랬다)
           담아 둔 그림은 그 이름으로 다시 그려 그대로 나온다. */
        hearts.unshift({ idx: it.idx, seed: it.seed, v: it.v || CODE_V, ar: it.ar,
                         style: it.style || "", ko: SCENES[it.idx] ? SCENES[it.idx].ko : "" });
        if (hearts.length > HEART_MAX) hearts.pop();
      }
      heartSave();
      heartDraw();
      return heartHas(it);
    }

    function wallDraw() {
      if (!elWall) return;
      var pn = currentPanel();
      var ar = pn.w / pn.h;
      elWall.innerHTML = "";
      wallItems = [];
      var curated = CURATED_WALL[curatedPage % CURATED_WALL.length] || CURATED_WALL[0];
      var n = wallCount();
      for (var i = 0; i < n; i++) {
        var base = curated[i % curated.length];
        var it = {
          idx: base.idx,
          seed: base.seed,
          ar: ar,
          v: CODE_V,
          style: base.style,
          title: base.title,
          caption: base.caption
        };
        if (isSold(it.idx, it.seed, CODE_V)) continue;
        wallItems.push(it);
        elWall.appendChild(wallCell(it));
      }
      if (!wallItems.length) {
        var none = el("p", "st-help");
        none.textContent = "지금 묶음의 작품은 모두 확정된 번호입니다. 다른 큐레이션을 눌러 주세요.";
        elWall.appendChild(none);
      }
      wallMark();
    }

    /** 칸 하나. 그림 한 장 · 이름 · 하트. */
    function wallCell(it) {
      var wrap = el("div", "st-wall-cell");
      /* 손전화의 정사각 칸에서: 16:9 나 4:3 처럼 정사각에 가까운 그림은
         칸을 가득 채우고(가장자리가 조금 잘린다), 1:6 기둥이나 32:9 띠는
         통째로 보인다. 띠를 가득 채우면 한가운데 한 토막만 남아 무슨
         그림인지 알 수 없다. */
      wrap.dataset.fit = (it.ar > 0.6 && it.ar < 2.2) ? "cover" : "contain";
      var b = el("button", "st-wall-item");
      b.type = "button";
      /* 실제 비율 그대로 그린다. 높이만 잘라 맞추면 1:6 기둥이 0.71로
         뭉개져, 현장에서 어떻게 보일지 알 수 없는 그림이 된다.
         세로로 길면 높이를 먼저 묶고 거기서 폭을 구한다. */
      var c = document.createElement("canvas");
      var tw = 300, th = Math.round(tw / it.ar);
      if (th > 260) { th = 260; tw = Math.max(24, Math.round(th * it.ar)); }
      c.width = tw;
      c.height = th;
      b.appendChild(c);
      b.appendChild(el("span", null, it.title || SCENES[it.idx].en || SCENES[it.idx].ko));
      b.title = (it.caption || SCENES[it.idx].ko) + " · 눌러서 크게 보기";
      wrap.appendChild(b);

      var one = new GEN.Gen(c);
      var sp = GEN.compose(SCENES[it.idx].text, it.seed, it.ar, it.v);
      /* 담아 둘 때 적어 둔 스타일이 있고 지금도 그릴 줄 알면 그걸 쓴다.
         compose 는 스타일을 고를 때 난수를 딱 한 번 쓰므로, 스타일만
         바꿔 끼워도 색·느낌·나머지 값은 그대로다. */
      if (it.style && GEN.hasStyle(it.style)) sp.style = it.style;
      it.style = sp.style;
      one.set(sp);
      one.draw(1.7);                 /* 한 장만. 열두 칸이 다 움직이면 아무것도 못 본다 */

      b.addEventListener("click", function () {
        elStory.value = "";
        make(it.idx, it.seed, false, it.v, it.style);
        wallMark();
      });

      /* 하트는 칸을 고르는 것과 다른 일이다. 버튼 안에 버튼을 넣을 수
         없어 형제로 띄운다. */
      var hb = el("button", "st-heart");
      hb.type = "button";
      hb.setAttribute("aria-label", "이 화면 담아두기");
      hb.textContent = "♥";
      hb.classList.toggle("is-on", heartHas(it));
      hb.setAttribute("aria-pressed", heartHas(it) ? "true" : "false");
      hb.addEventListener("click", function (e) {
        e.stopPropagation();
        var on = heartToggle(it);
        hb.classList.toggle("is-on", on);
        hb.setAttribute("aria-pressed", on ? "true" : "false");
      });
      wrap.appendChild(hb);
      return wrap;
    }

    /* ── 담아 둔 화면 다시 보기 ─────────────────────────────── */
    var elHeartWrap = $("[data-st-hearts-wrap]", root);
    var elHearts = $("[data-st-hearts]", root);
    var elHeartCount = $("[data-st-heart-count]", root);

    function heartDraw() {
      if (!elHearts) return;
      if (elHeartCount) elHeartCount.textContent = hearts.length ? String(hearts.length) : "";
      if (elHeartWrap) elHeartWrap.hidden = hearts.length === 0;
      elHearts.innerHTML = "";
      hearts.forEach(function (h) {
        var it = { idx: h.idx, seed: h.seed, v: h.v || CODE_V, ar: h.ar || 16 / 9, style: h.style || "" };
        var cell = wallCell(it);
        /* 담아 둔 뒤에 팔렸을 수 있다. 그대로 두면 살 수 없는 화면을
           계속 보여 주게 된다. */
        if (isSold(it.idx, it.seed, it.v)) {
          cell.classList.add("is-sold");
          cell.appendChild(el("span", "st-sold-tag", "판매 완료"));
        }
        elHearts.appendChild(cell);
      });
    }

    function wallMark() {
      Array.prototype.forEach.call(elWall ? elWall.children : [], function (cell, i) {
        var it = wallItems[i];
        var on = !!(spec && it && spec.seed === it.seed && spec.idx === it.idx);
        var b = cell.querySelector(".st-wall-item");
        if (b) b.classList.toggle("is-on", on);
      });
    }

    /* ── 고른 화면 크게 보기 ──────────────────────────────────
     *
     * 좁은 화면에서는 큰 미리보기를 아래에 붙여 두면 고르는 자리가 저 위로
     * 밀려난다. 한 장 보고 다시 고르러 올라가는 데 두 번 스크롤한다.
     * 그래서 좁을 때는 덮어서 띄우고, 닫으면 고르던 자리에 그대로 있다. */
    var NARROW = 940;
    function isNarrow() { return window.innerWidth <= NARROW; }

    function showPicked() {
      var picked = $("[data-st-picked]", root);
      if (!picked) return;
      picked.hidden = false;
      if (isNarrow()) {
        document.body.classList.add("st-sheet-open");
        picked.classList.add("is-sheet");
        picked.scrollTop = 0;
      } else {
        picked.classList.remove("is-sheet");
        document.body.classList.remove("st-sheet-open");
        /* 이미 눈에 보이면 굳이 옮기지 않는다. 다시 그릴 때마다 화면이
           튀면 값을 만지는 사람이 멀미한다. */
        var stage = root.querySelector(".st-stage");
        if (stage && stage.getBoundingClientRect) {
          var r = stage.getBoundingClientRect();
          var seen = r.top < window.innerHeight * 0.8 && r.bottom > window.innerHeight * 0.2;
          if (!seen && stage.scrollIntoView) stage.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      /* 감춰져 있는 동안에는 담는 칸의 폭이 0이라 720px로 잡아 두었다가,
         보이는 순간 폭에 눌려 16:9가 0.80으로 찌그러졌다. 자리가 잡힌
         뒤에 다시 잰다. */
      requestAnimationFrame(syncPanel);
    }

    function hidePicked() {
      var picked = $("[data-st-picked]", root);
      if (!picked) return;
      picked.classList.remove("is-sheet");
      document.body.classList.remove("st-sheet-open");
      if (isNarrow()) picked.hidden = true;
    }

    var elSheetClose = $("[data-st-sheet-close]", root);
    if (elSheetClose) elSheetClose.addEventListener("click", hidePicked);

    /* 덮개를 닫고 나서 견적으로 간다. 덮개가 덮인 채로 뒤쪽 문서를
       스크롤하면 아무 일도 안 일어난 것처럼 보인다. */
    var elToQuote = $("[data-st-to-quote]", root);
    if (elToQuote) elToQuote.addEventListener("click", function (e) {
      e.preventDefault();
      hidePicked();
      var q = document.getElementById("quote");
      if (q && q.scrollIntoView) q.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hidePicked();
    });
    /* 넓혀 놓고 보면 덮개가 남아 있으면 안 된다 */
    window.addEventListener("resize", function () {
      if (!isNarrow()) {
        var picked = $("[data-st-picked]", root);
        if (picked) picked.classList.remove("is-sheet");
        document.body.classList.remove("st-sheet-open");
      }
    });

    if (elPause) {
      elPause.addEventListener("click", function () {
        if (!spec) return;
        if (isPaused) {
          gen.start();
          isPaused = false;
        } else {
          gen.stop();
          isPaused = true;
        }
        syncViewControls();
      });
    }

    if (elFocus) {
      elFocus.addEventListener("click", function () {
        focusOn = !focusOn;
        syncViewControls();
      });
    }

    var elWallMore = $("[data-st-wall-more]", root);
    if (elWallMore) elWallMore.addEventListener("click", function () {
      curatedPage = (curatedPage + 1) % CURATED_WALL.length;
      wallDraw();
    });

    elStat.textContent =
      "처음에는 검수한 대표작만 보여드립니다. 확정된 작품 번호는 다시 추천하지 않습니다.";
    syncPanel();
    wallDraw();
    heartDraw();
  });
})();
