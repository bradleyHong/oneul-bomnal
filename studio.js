/**
 * 오늘은 봄날 · 봄날 스튜디오 (고객 화면)
 *
 * 흐름
 *   ① 만들고 싶은 장면을 한국어로 적는다
 *   ② 화면 규격을 고른다 (프리셋 또는 직접 입력)
 *   ③ 라이브러리에서 어울리는 컷을 골라 5초 시연본을 만든다
 *   ④ 견적을 확인하고 의뢰한다
 *
 * 시연본은 대표 프레임 위에 제너러티브 레이어를 얹어 그립니다.
 * 원본 영상은 사내에 있고, 최종 고화질 렌더링도 사내에서 수행합니다.
 * 화면에 워터마크가 항상 찍히며 저장 기능은 두지 않습니다.
 */
(function () {
  "use strict";

  var LIB = null;
  var WATERMARK = "봄날퍼블릭아트";

  /* ── 화면 규격 프리셋 ─────────────────────────────── */
  var PANELS = [
    { id: "wide169", name: "가로형 · 로비 미디어월", w: 3840, h: 2160, note: "16:9" },
    { id: "vert916", name: "세로형 · 안내 사이니지", w: 1080, h: 1920, note: "9:16" },
    { id: "ultra329", name: "와이드형 · 외벽 전광판", w: 3840, h: 960, note: "32:9" },
    { id: "column16", name: "기둥형 · 세로 긴 화면", w: 340, h: 2040, note: "1:6" },
    { id: "square", name: "정사각 · 포토존", w: 2048, h: 2048, note: "1:1" }
  ];

  /* ── 한국어 낱말 → 태그 + 시각 특징 목표 ─────────────
   *  tags 는 폴더 분류, want 는 썸네일에서 잰 값(밝기·채도·대비·복잡도),
   *  hue 는 12개 색상대 중 선호하는 칸이다. 픽셀을 봐야 "빛"과 "빨간 차"가 갈린다. */
  var LEX = [
    { re: /바다|파도|물|해변|해양|웨이브/, tags: ["바다", "물", "파도", "웨이브"],
      hue: [5, 6, 7], want: { sat: .45, light: .40 } },
    { re: /하늘|구름|바람|공기/, tags: ["자연", "풍경"],
      hue: [6, 7], want: { light: .58, busy: .06 } },
    { re: /빛|조명|반짝|보케|야간|밤/, tags: ["빛", "光", "보케", "조명"],
      hue: null, want: { light: .22, contrast: .28, busy: .10 } },
    { re: /봄|꽃|벚꽃|화사|따뜻|산뜻/, tags: ["자연", "풍경"],
      hue: [0, 1, 11], want: { sat: .55, light: .55 } },
    { re: /숲|나무|초록|자연|산/, tags: ["자연", "풍경", "제주"],
      hue: [3, 4], want: { sat: .45 } },
    { re: /도시|빌딩|거리|야경/, tags: ["도시", "건축", "유럽"],
      hue: null, want: { busy: .16, light: .30 } },
    { re: /기하|블록|큐브|패턴|규칙/, tags: ["기하", "블록", "큐브"],
      hue: null, want: { busy: .18, contrast: .32 } },
    { re: /글리치|노이즈|디지털|왜곡|사이버/, tags: ["글리치", "노이즈", "디지털", "왜곡"],
      hue: null, want: { busy: .22, contrast: .35, sat: .5 } },
    { re: /우주|별|은하|SF|미래/, tags: ["우주", "SF", "별", "미래"],
      hue: [7, 8], want: { light: .18, contrast: .3 } },
    { re: /그라데이션|그라디언트|부드럽|은은|잔잔/, tags: ["그라디언트", "색", "부드러움"],
      hue: null, want: { busy: .04, contrast: .18 } },
    { re: /전통|한국|단청|오방|고분|유산/, tags: ["안동", "전통", "한국"],
      hue: [0, 1, 2], want: { sat: .5 } },
    { re: /전시|미디어아트|작품/, tags: ["미디어아트", "전시", "실험"], hue: null, want: {} },
    { re: /사람|인물|운동|움직임/, tags: ["운동", "인물", "역동"], hue: null, want: { busy: .14 } },
    { re: /어둡|검|깊|고요|차분/, tags: [], hue: null, want: { light: .18 } },
    { re: /밝|환하|하양|맑/, tags: [], hue: null, want: { light: .62 } }
  ];

  var MOOD = [
    { re: /고요|차분|느리|잔잔|평온/, speed: 0.45, density: 0.5 },
    { re: /경쾌|빠르|활기|역동|신나/, speed: 1.7, density: 1.3 },
    { re: /웅장|장엄|묵직/, speed: 0.7, density: 1.5 },
    { re: /화사|밝|따뜻|산뜻/, speed: 1.0, density: 1.1 }
  ];

  function $(q, r) { return (r || document).querySelector(q); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  /* ── 스토리 해석 ──────────────────────────────────── */
  function readStory(text) {
    var tags = [], hues = [], want = {}, cnt = {};
    LEX.forEach(function (r) {
      if (!r.re.test(text)) return;
      tags = tags.concat(r.tags);
      if (r.hue) hues = hues.concat(r.hue);
      Object.keys(r.want || {}).forEach(function (k) {
        want[k] = (want[k] || 0) + r.want[k];
        cnt[k] = (cnt[k] || 0) + 1;
      });
    });
    Object.keys(want).forEach(function (k) { want[k] /= cnt[k]; });
    var speed = 1.0, density = 1.0;
    MOOD.forEach(function (m) {
      if (m.re.test(text)) { speed = m.speed; density = m.density; }
    });
    return { tags: tags, hues: hues, want: want, speed: speed, density: density };
  }

  /** 원하는 색상대가 이 컷에서 얼마나 차지하는가 (0~1) */
  function hueMatch(f, hues) {
    if (!f || !f.hist || !hues.length) return 0;
    var v = 0;
    for (var i = 0; i < hues.length; i++) v += f.hist[hues[i]] || 0;
    return Math.min(1, v);
  }

  /** 잰 값과 원하는 값의 거리 (0~1, 가까울수록 1) */
  function featMatch(f, want) {
    var ks = Object.keys(want);
    if (!f || !ks.length) return 0;
    var acc = 0;
    ks.forEach(function (k) { acc += 1 - Math.min(1, Math.abs((f[k] || 0) - want[k]) / 0.35); });
    return acc / ks.length;
  }

  /** 스토리에 맞는 컷을 점수순으로 고른다.
   *  태그가 맞는 것을 먼저 채우고, 모자랄 때만 라이브러리 전체에서 보충한다.
   *  무작위 가중치는 동점을 흔드는 정도로만 둔다. */
  function selectCuts(story, n) {
    var read = readStory(story);
    var scored = LIB.items.map(function (it) {
      var s = 0;
      read.tags.forEach(function (t) {
        if (it.tags.indexOf(t) >= 0) s += 4;
        if (it.cat.indexOf(t) >= 0) s += 3;
      });
      s += hueMatch(it.f, read.hues) * 5;
      s += featMatch(it.f, read.want) * 6;              // 픽셀에서 잰 값이 가장 무겁다
      return { it: it, s: s, j: Math.random() };
    });
    var hit = scored.filter(function (x) { return x.s > 0; });
    var rest = scored.filter(function (x) { return x.s === 0; });
    var byScore = function (a, b) { return (b.s - a.s) || (a.j - b.j); };
    hit.sort(byScore);
    rest.sort(function (a, b) { return a.j - b.j; });

    var out = [], perCat = {};
    function take(list, cap) {
      for (var i = 0; i < list.length && out.length < n; i++) {
        var c = list[i].it;
        if ((perCat[c.cat] || 0) >= cap) continue;      // 한 분류가 화면을 독점하지 않게
        perCat[c.cat] = (perCat[c.cat] || 0) + 1;
        out.push(c);
      }
    }
    take(hit, 2);
    if (out.length < n) take(hit, n);                   // 맞는 게 적으면 제한을 푼다
    if (out.length < n) take(rest, 2);
    return { cuts: out, read: read, matched: hit.length };
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

  /* ── 시연본 렌더 ──────────────────────────────────── */
  function Preview(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.imgs = [];
    this.raf = 0;
    this.t0 = 0;
    this.parts = [];
  }

  Preview.prototype.load = function (cuts, cb) {
    var self = this, left = cuts.length;
    this.imgs = [];
    if (!left) return cb();
    cuts.forEach(function (c, i) {
      var im = new Image();
      im.onload = im.onerror = function () {
        self.imgs[i] = im.naturalWidth ? im : null;
        if (--left === 0) cb();
      };
      im.src = "./assets/lib/" + c.id + ".jpg";
    });
  };

  Preview.prototype.seed = function (read, panel) {
    var n = Math.round(90 * read.density);
    this.parts = [];
    for (var i = 0; i < n; i++) {
      this.parts.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0012 * read.speed,
        vy: (Math.random() - 0.5) * 0.0012 * read.speed,
        r: 0.4 + Math.random() * 1.8,
        a: 0.25 + Math.random() * 0.5
      });
    }
    this.speed = read.speed;
  };

  Preview.prototype.start = function () {
    var self = this;
    cancelAnimationFrame(this.raf);
    this.t0 = performance.now();
    (function loop(now) {
      var t = ((now - self.t0) / 1000) % 5;        // 5초 반복
      self.draw(t);
      self.raf = requestAnimationFrame(loop);
    })(performance.now());
  };

  Preview.prototype.stop = function () { cancelAnimationFrame(this.raf); };

  Preview.prototype.draw = function (t) {
    var ctx = this.ctx, W = this.cv.width, H = this.cv.height;
    var imgs = this.imgs.filter(Boolean);
    ctx.fillStyle = "#0b0e13";
    ctx.fillRect(0, 0, W, H);

    if (imgs.length) {
      var per = 5 / imgs.length;
      var idx = Math.min(imgs.length - 1, Math.floor(t / per));
      var nxt = (idx + 1) % imgs.length;
      var local = (t - idx * per) / per;
      var fade = local > 0.75 ? (local - 0.75) / 0.25 : 0;
      drawCover(ctx, imgs[idx], W, H, 1 - fade);
      if (fade > 0) drawCover(ctx, imgs[nxt], W, H, fade);
    }

    // 제너러티브 레이어 — 에셋 위가 아니라 에셋을 재료로 얹는 층
    ctx.globalCompositeOperation = "screen";
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x += 1; if (p.x > 1) p.x -= 1;
      if (p.y < 0) p.y += 1; if (p.y > 1) p.y -= 1;
      var puls = 0.6 + 0.4 * Math.sin(t * 1.6 * this.speed + i);
      ctx.globalAlpha = p.a * puls * 0.55;
      ctx.fillStyle = "#eaf2ff";
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r * (W / 900), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // 워터마크 — 시연본임을 항상 알린다
    var fs = Math.max(13, Math.round(W / 34));
    ctx.font = "700 " + fs + "px Pretendard, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillText(WATERMARK, W - 15, H - 15);
    ctx.fillStyle = "rgba(255,255,255,.88)";
    ctx.fillText(WATERMARK, W - 16, H - 16);

    ctx.textAlign = "left";
    ctx.font = "600 " + Math.round(fs * 0.62) + "px Pretendard, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.fillText("시연본 · 5초 반복", 16, H - 16);
  };

  function drawCover(ctx, im, W, H, alpha) {
    if (!im) return;
    var sc = Math.max(W / im.width, H / im.height);
    var dw = im.width * sc, dh = im.height * sc;
    ctx.globalAlpha = alpha;
    ctx.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
  }

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

    var preview = new Preview(elCanvas);

    function make() {
      if (!LIB) return;
      var story = (elStory.value || "").trim();
      if (!story) { elStory.focus(); return; }
      elGo.disabled = true;
      elGo.textContent = "고르는 중…";

      var sel = selectCuts(story, 5);
      preview.seed(sel.read, currentPanel());

      elCuts.innerHTML = "";
      sel.cuts.forEach(function (c) {
        var fig = el("figure", "st-cut");
        var im = el("img");
        im.src = "./assets/lib/" + c.id + ".jpg";
        im.alt = c.cat + " 소재";
        im.loading = "lazy";
        fig.appendChild(im);
        fig.appendChild(el("figcaption", null, c.cat));
        elCuts.appendChild(fig);
      });

      elChips.innerHTML = "";
      var chips = sel.read.tags.slice(0, 6);
      if (!chips.length) chips = ["전체 라이브러리에서 고름"];
      chips.forEach(function (t) { elChips.appendChild(el("span", "st-chip", t)); });

      preview.load(sel.cuts, function () {
        preview.start();
        elGo.disabled = false;
        elGo.textContent = "다시 만들기";
      });
    }

    elPanel.addEventListener("change", syncPanel);
    [elW, elH, elSec].forEach(function (n) { n.addEventListener("input", updateQuote); });
    Array.prototype.forEach.call(root.querySelectorAll("[data-st-opt]"), function (n) {
      n.addEventListener("change", updateQuote);
    });
    elGo.addEventListener("click", make);
    elStory.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) make();
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-st-example]"), function (b) {
      b.addEventListener("click", function () { elStory.value = b.textContent; make(); });
    });
    window.addEventListener("resize", syncPanel);

    // ── 견적서 받기 ────────────────────────────────────────────
    // 가입시키지 않습니다. 이름과 이메일만 받아 지금 화면의 설정을 그대로 실어 보냅니다.
    // 광고성 메일은 정보통신망법 제50조에 따라 사전 동의가 있어야 하므로,
    // 회신 동의와 수신 동의를 반드시 따로 받고 그 결과를 접수 내용에 남깁니다.
    function specText(story) {
      if (!LAST) return "(견적을 계산하기 전에 보내셨습니다)";
      var picked = [];
      if (LAST.o.asset) picked.push("기관 로고·이미지 반영");
      if (LAST.o.custom) picked.push("커스텀 스타일 요청");
      if (LAST.o.rush) picked.push("당일 급행");
      return [
        "원하시는 화면: " + (story || "(적지 않으심)"),
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

    fetch("./assets/library.json")
      .then(function (r) { return r.json(); })
      .then(function (j) {
        LIB = j;
        elStat.textContent =
          "라이브러리 " + comma(j.totalInLibrary) + "편 중 " + j.items.length +
          "편을 화면에 올려 두었습니다 · 분류 " + j.categories.length + "개";
        syncPanel();
      })
      .catch(function () {
        elStat.textContent = "라이브러리를 불러오지 못했습니다. 새로고침해 주세요.";
      });
  });
})();
