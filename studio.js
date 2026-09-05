/**
 * 오늘은 봄날 · 봄날 스튜디오 (고객 화면)
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
    { id: "ultra329", name: "와이드형 · 외벽 전광판", w: 3840, h: 960, note: "32:9" },
    { id: "column16", name: "기둥형 · 세로 긴 화면", w: 340, h: 2040, note: "1:6" },
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

  function quote(panel, seconds, opts) {
    var credits = (panel.w * panel.h * seconds) / BASE_PIXELSEC;
    credits = Math.max(0.5, Math.round(credits * 10) / 10);
    var mult = 1;
    if (opts.asset) mult *= 1.2;
    if (opts.custom) mult *= 1.6;
    if (opts.rush) mult *= 1.5;
    var won = Math.round(credits * mult * CREDIT_WON / 10000) * 10000;
    return { credits: credits, mult: Math.round(mult * 100) / 100, won: won };
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
    var elCanvas = $("[data-st-canvas]", root);
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

    function syncPanel() {
      var p = currentPanel();
      var custom = elPanel.value === "custom";
      elW.disabled = elH.disabled = !custom;
      if (!custom) { elW.value = p.w; elH.value = p.h; }
      var box = elCanvas.parentNode;
      var maxW = box.clientWidth || 720;
      var maxH = 420;
      var sc = Math.min(maxW / p.w, maxH / p.h, 1);
      elCanvas.width = Math.round(p.w * sc * 2) / 2;
      elCanvas.height = Math.round(p.h * sc * 2) / 2;
      elCanvas.style.width = Math.round(p.w * sc) + "px";
      elCanvas.style.height = Math.round(p.h * sc) + "px";
      updateQuote();
    }

    function opts() {
      return {
        asset: $("[data-st-opt='asset']", root).checked,
        custom: $("[data-st-opt='custom']", root).checked,
        rush: $("[data-st-opt='rush']", root).checked
      };
    }

    function updateQuote() {
      var p = currentPanel(), sec = Math.max(5, +elSec.value || 30);
      var q = quote(p, sec, opts());
      // 견적서 메일에 지금 화면의 설정을 그대로 실어 보내기 위해 마지막 값을 들고 있는다.
      LAST = { panel: p, sec: sec, q: q, o: opts() };
      elQuote.innerHTML =
        '<div class="st-q-row"><span>화면 규격</span><b>' + p.w + " × " + p.h + '</b></div>' +
        '<div class="st-q-row"><span>재생 길이</span><b>' + sec + '초</b></div>' +
        '<div class="st-q-row"><span>렌더 크레딧</span><b>' + q.credits + ' 크레딧</b></div>' +
        '<div class="st-q-row"><span>옵션 배수</span><b>×' + q.mult + '</b></div>' +
        '<div class="st-q-total"><span>예상 금액</span><b>' + comma(q.won) + '원</b></div>' +
        '<p class="st-q-note">1크레딧 = 4K 30초 기준입니다. 렌더 원가가 화면 넓이와 길이에 비례하므로 금액도 같은 기준으로 계산합니다. 부가세 별도이며, 확정 견적은 담당자 확인 후 발행합니다.</p>';
    }

    var gen = new GEN.Gen(elCanvas);
    var spec = null;
    var sceneIdx = 0;
    var history = [];              // 방금 만든 화면들. 좋은 것이 지나가 버리면 안 된다.
    var HISTORY_MAX = 8;

    /* 느낌 열둘. 순서는 작품 번호에 박히므로 바꾸거나 중간에 끼워 넣지 않는다.
     * 새로 만들면 뒤에 붙인다. */
    var SCENES = [
      { ko: "봄빛 리본",   text: "로비 미디어월에 걸 봄바람 빛 리본, 따뜻하고 화사하게" },
      { ko: "바다 물결",   text: "바다와 파도, 잔잔하게 흐르는 로비 화면" },
      { ko: "겨울 눈",     text: "겨울 밤 도심 전광판, 눈송이 내리는 화면, 차분하게" },
      { ko: "전통 단청",   text: "고분군 야간 포토존, 전통 색감으로 웅장하게" },
      { ko: "도시 야경",   text: "도시 야경 네온 전광판, 경쾌하게" },
      { ko: "우주 별빛",   text: "우주와 별빛, 고요하게 흐르는 밤하늘" },
      { ko: "숲 초록",     text: "숲과 나무, 초록빛으로 산뜻하게" },
      { ko: "노을",        text: "노을 지는 저녁, 은은하게" },
      { ko: "수묵 여백",   text: "수묵 담백한 여백, 묵직하게" },
      { ko: "형광 사이버", text: "형광 사이버 글리치, 강렬하게" },
      { ko: "안개 하늘",   text: "안개 낀 하늘과 바람결, 몽환적으로" },
      { ko: "빛 번짐",     text: "빛줄기 번짐, 은은하고 잔잔하게" }
    ];
    var CUSTOM = 31;               // 직접 적은 문장. 번호만으로는 되살릴 수 없다.

    /* 작품 번호 = 느낌 번호(위 5비트) + 씨앗(아래 19비트).
     * 문장 정보가 번호 안에 들어 있어야 붙여넣기로 같은 화면이 나온다. */
    function code(idx, seed) {
      var v = (((idx & 31) << 19) | (seed & 0x7FFFF)) >>> 0;
      return "BN-" + v.toString(16).toUpperCase().padStart(6, "0");
    }
    function parseCode(txt) {
      var m = /([0-9A-Fa-f]{6})\s*$/.exec(String(txt || "").trim());
      if (!m) return null;
      var v = parseInt(m[1], 16) >>> 0;
      return { idx: (v >> 19) & 31, seed: v & 0x7FFFF };
    }
    function newSeed() { return Math.floor(Math.random() * 0x7FFFF); }

    function storyOf(idx) {
      return idx === CUSTOM ? (elStory.value || "").trim() : SCENES[idx].text;
    }

    function make(idx, seed, fromHistory) {
      if (idx == null) idx = sceneIdx;
      var story = storyOf(idx);
      if (!story) { elStory.focus(); return; }
      sceneIdx = idx;
      var pn = currentPanel();
      var sd = seed == null ? newSeed() : seed;
      spec = GEN.compose(story, sd, pn.w / pn.h);
      spec.idx = idx;
      gen.set(spec).start();
      if (!fromHistory) remember(idx, sd, story, spec.ar);
      drawHistory();
      markScene();

      elChips.innerHTML = "";
      spec.tags.forEach(function (t) { elChips.appendChild(el("span", "st-chip", t)); });

      elCuts.innerHTML =
        '<div class="st-code-head">' +
        '<p class="st-code-num">' + code(idx, sd) + '</p>' +
        '<button type="button" class="st-copy" data-st-copy>번호 복사</button>' +
        '</div>' +
        '<p class="st-code-note">이 번호가 이 화면의 설계도입니다. ' +
        '결제하시면 <b>같은 번호로</b> 화면 규격에 맞춰 고화질로 렌더링해 드립니다.</p>' +
        (idx === CUSTOM
          ? '<p class="st-code-sub">직접 적으신 문장으로 만든 번호입니다. 나중에 부르실 때는 문장도 함께 적어 주세요.</p>'
          : '<p class="st-code-sub">번호를 복사해 두시면 언제든 이 화면으로 돌아옵니다.</p>');

      elGo.textContent = "다시 만들기";
      updateQuote();
    }

    function markScene() {
      Array.prototype.forEach.call(root.querySelectorAll(".st-scene"), function (b, i) {
        b.classList.toggle("is-on", i === sceneIdx);
      });
    }

    /* 랜덤으로 돌리다 보면 좋은 것이 지나간다. 여덟 장까지 남겨 둔다. */
    function remember(idx, seed, story, ar) {
      history = history.filter(function (h) { return !(h.seed === seed && h.idx === idx); });
      history.unshift({ idx: idx, seed: seed, story: story, ar: ar });
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
        b.title = code(h.idx, h.seed) + " 다시 보기";
        if (spec && h.seed === spec.seed && h.idx === spec.idx) b.className += " is-on";
        var c = document.createElement("canvas");
        c.width = 240; c.height = Math.max(80, Math.round(240 / Math.max(0.4, h.ar)));
        if (c.height > 300) { c.height = 300; c.width = Math.round(300 * h.ar); }
        var one = new GEN.Gen(c);
        one.set(GEN.compose(h.story, h.seed, h.ar));
        one.draw(1.6);
        b.appendChild(c);
        b.appendChild(el("span", null, code(h.idx, h.seed)));
        b.addEventListener("click", function () { make(h.idx, h.seed, true); });
        elHist.appendChild(b);
      });
    }

    elPanel.addEventListener("change", function () {
      syncPanel();
      if (spec) make();          // 비율이 바뀌면 어울리는 그림도 달라진다
    });
    [elW, elH, elSec].forEach(function (n) { n.addEventListener("input", updateQuote); });
    Array.prototype.forEach.call(root.querySelectorAll("[data-st-opt]"), function (n) {
      n.addEventListener("change", updateQuote);
    });
    elGo.addEventListener("click", function () { make(); });
    elStory.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) make(CUSTOM);
    });
    elStory.addEventListener("input", function () { sceneIdx = CUSTOM; markScene(); });

    // 느낌 버튼 — 문장을 치지 않아도 계속 만들 수 있어야 한다
    var elScenes = $("[data-st-scenes]", root);
    SCENES.forEach(function (sc, i) {
      var b = el("button", "st-scene");
      b.type = "button";
      b.appendChild(el("b", null, sc.ko));
      b.appendChild(el("i", null, i < 9 ? String(i + 1) : (i === 9 ? "0" : "")));
      b.addEventListener("click", function () { elStory.value = ""; make(i); });
      elScenes.appendChild(b);
    });

    $("[data-st-random]", root).addEventListener("click", function () {
      elStory.value = "";
      make(Math.floor(Math.random() * SCENES.length));
    });

    // 숫자키로도 고를 수 있다. 1~9 그리고 0.
    document.addEventListener("keydown", function (e) {
      if (e.target === elStory || /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key >= "1" && e.key <= "9") { elStory.value = ""; make(+e.key - 1); }
      else if (e.key === "0") { elStory.value = ""; make(9); }
      else if (e.key === "r" || e.key === "R" || e.key === "ㄱ") {
        elStory.value = "";
        make(Math.floor(Math.random() * SCENES.length));
      }
    });

    // 번호 복사 · 번호로 불러오기
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-st-copy]");
      if (!b || !spec) return;
      var txt = code(spec.idx, spec.seed);
      var done = function () { b.textContent = "복사했습니다"; setTimeout(function () { b.textContent = "번호 복사"; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () { prompt("이 번호를 복사해 두세요", txt); });
      } else { prompt("이 번호를 복사해 두세요", txt); }
    });

    var elLoad = $("[data-st-load]", root);
    var elLoadBtn = $("[data-st-load-go]", root);
    var elLoadMsg = $("[data-st-load-msg]", root);
    function loadCode() {
      var p2 = parseCode(elLoad.value);
      if (!p2) { elLoadMsg.textContent = "BN- 으로 시작하는 번호를 넣어 주세요."; return; }
      if (p2.idx === CUSTOM && !(elStory.value || "").trim()) {
        elLoadMsg.textContent = "직접 적으신 문장으로 만든 번호입니다. 그 문장을 아래에 적어 주세요.";
        return;
      }
      if (p2.idx !== CUSTOM && p2.idx >= SCENES.length) {
        elLoadMsg.textContent = "확인되지 않는 번호입니다. 다시 확인해 주세요.";
        return;
      }
      elLoadMsg.textContent = "";
      elLoad.value = "";
      make(p2.idx, p2.seed);
    }
    elLoadBtn.addEventListener("click", loadCode);
    elLoad.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); loadCode(); } });

    window.addEventListener("resize", syncPanel);

    // ── 견적서 받기 ────────────────────────────────────────────
    // 가입시키지 않습니다. 이름과 이메일만 받아 지금 화면의 설정을 그대로 실어 보냅니다.
    // 광고성 메일은 정보통신망법 제50조에 따라 사전 동의가 있어야 하므로,
    // 회신 동의와 수신 동의를 반드시 따로 받고 그 결과를 접수 내용에 남깁니다.
    function specText(story) {
      if (!LAST) return "(견적을 계산하기 전에 보내셨습니다)";
      var picked = [];
      var art = spec ? code(spec.idx, spec.seed) : null;
      if (LAST.o.asset) picked.push("기관 로고·이미지 반영");
      if (LAST.o.custom) picked.push("커스텀 스타일 요청");
      if (LAST.o.rush) picked.push("당일 급행");
      return [
        "작품 번호: " + (art || "(만들기 전)"),
        "원하시는 화면: " + (story || "(적지 않으심)"),
        "엔진 설정(사내 확인용): " + (spec ? spec.style + " / " + spec.palette.id : "-"),
        "화면 규격: " + LAST.panel.name + " " + LAST.panel.w + "×" + LAST.panel.h,
        "재생 길이: " + LAST.sec + "초",
        "렌더 크레딧: " + LAST.q.credits + " 크레딧 (옵션 배수 ×" + LAST.q.mult + ")",
        "추가 요청: " + (picked.join(", ") || "없음"),
        "예상 금액: " + comma(LAST.q.won) + "원 (부가세 별도)"
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
            service: ["미디어아트 제작 (봄날 스튜디오 견적)"],
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

    elStat.textContent =
      "누를 때마다 새 화면이 나옵니다. 같은 문장이라도 매번 다르게 그립니다.";
    syncPanel();
  });
})();
