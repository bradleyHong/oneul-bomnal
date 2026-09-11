/* 봄날 도구 — 한 번 누르면 한 점.
 *
 * 스튜디오는 기계 한 대다. 규격을 고르고, 옵션을 켜고, 열두 칸에서 하나를
 * 고른다. 그 앞에 앉은 사람은 "무엇을 원하는가"를 먼저 정해야 한다.
 *
 * 도구는 반대다. 쓰임이 먼저 정해져 있고, 사람은 도구만 고른다.
 * 「벽보」를 누르면 벽보가 나온다. 마음에 안 들면 또 누른다. 끝이다.
 * (playgrnd 의 작은 도구들이 이 방식이다. 기계 하나 대신 도구 마흔 개.)
 *
 * 그림은 스튜디오와 같은 엔진으로 그린다. 도구는 "이 도구가 만드는 그림"의
 * 목록을 들고, 그 목록에 드는 번호가 나올 때까지 번호를 뽑는다. 그래서
 * 여기서 나온 번호는 스튜디오·전용 플레이어·API 어디에 넣어도 같은 그림이다.
 *
 * 서버로 가는 것은 없다. 담아 둔 화면은 이 브라우저에만 남는다. */
(function (global) {
  "use strict";
  var GEN = global.BomnalGen;
  if (!GEN) return;

  /* 스튜디오와 같은 판이어야 한다. 여기서 뽑은 번호를 저기 붙여 넣기 때문이다. */
  var CODE_V = 5;
  var PREFIX = "sa:";

  /* ── 도구 ─────────────────────────────────────────────────
   * 도구 하나는 "엔진 그림 몇 종"을 묶은 것이다. 묶는 기준은 기술이 아니라
   * 쓰임이다. 고객은 "점군"과 "홀로그램"의 차이를 알 이유가 없다.
   * 알아야 하는 것은 "3D 모형을 코드로 다시 그린 화면"이라는 것뿐이다. */
  var TOOLS = [
    { id: "poster", ko: "벽보", desc: "면·망점·활자. 인쇄물의 문법",
      styles: ["flyposter", "hardedge"] },
    { id: "water", ko: "물결", desc: "밀려오고 번지는 것",
      styles: ["ocean", "wave", "ripple", "moire"] },
    { id: "petal", ko: "꽃눈", desc: "떨어지고 피는 것",
      styles: ["petalfall", "blossom", "dandelion", "bloom"] },
    { id: "brush", ko: "붓질", desc: "손으로 그은 자국",
      styles: ["impasto", "inkwash", "hand", "smoke"] },
    { id: "room", ko: "회랑", desc: "화면 안으로 들어간다",
      styles: ["renaissance", "anamorph", "tunnel", "flythrough"] },
    { id: "type", ko: "활자", desc: "글자로만 그린 화면",
      styles: ["jamo", "pdu", "asciiart", "segment", "barcode"] },
    { id: "light", ko: "빛알", desc: "어둠 위의 빛",
      styles: ["constellation", "crystal", "aurora", "neonsign"] },
    { id: "grain", ko: "결", desc: "겹치고 쌓이는 결",
      styles: ["weave", "thread", "topo", "terrace"] },
    { id: "mesh", ko: "뼈대", desc: "3D 모형을 코드로 다시 그린다",
      styles: ["wire", "pointcloud", "hologram", "chiaroscuro"] },
    { id: "field", ko: "색면", desc: "색과 면만",
      styles: ["stripe", "chevron", "bars", "plasma", "desordre"] },
    { id: "grass", ko: "풀", desc: "자라는 것",
      styles: ["reed", "leafvein", "phyllo", "bamboo"] },
    { id: "city", ko: "도시", desc: "격자와 신호",
      styles: ["isocity", "circuit", "warp", "slitscan"] }
  ];

  /* 규격. 스튜디오의 PANELS 와 같은 비율을 쓴다. */
  var SIZES = [
    { id: "wide169", ko: "가로 16:9", w: 3840, h: 2160 },
    { id: "vert916", ko: "세로 9:16", w: 1080, h: 1920 },
    { id: "ultra329", ko: "띠 32:9", w: 3840, h: 1080 },
    { id: "column16", ko: "기둥 1:6", w: 360, h: 2160 },
    { id: "square", ko: "정사각", w: 2048, h: 2048 }
  ];

  function $(q, r) { return (r || document).querySelector(q); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function bare(styleId) { return String(styleId || "").replace(/^sa:/, ""); }
  function code(idx, seed) {
    var n = (((idx & 31) << 19) | (seed & 0x7FFFF)) >>> 0;
    return "BN" + CODE_V + "-" + n.toString(16).toUpperCase().padStart(6, "0");
  }
  function newSeed() { return Math.floor(Math.random() * 0x7FFFF); }

  /* ── 한 점 뽑기 ───────────────────────────────────────────
   * 번호를 무작위로 뽑아 이 도구의 그림이 나올 때까지 돌린다. 그래야
   * 나온 번호가 번호만으로 되살아난다(스타일을 따로 안 적어도 된다).
   * 비율에 따라 그 도구의 그림이 후보에 하나도 없을 수 있다 — 기둥에
   * 회랑을 걸면 그렇다. 그때는 스타일을 갈아 끼우고 번호 옆에 같이
   * 적어 준다. 갈아 끼워도 색·씨앗·나머지 값은 그대로다. */
  function spin(tool, ar) {
    var scenes = GEN.SCENES, i, idx, seed, sp;
    for (i = 0; i < 400; i++) {
      idx = Math.floor(Math.random() * scenes.length);
      seed = newSeed();
      sp = GEN.compose(scenes[idx].text, seed, ar, CODE_V);
      if (tool.styles.indexOf(bare(sp.style)) >= 0) {
        sp.idx = idx; sp.v = CODE_V;
        return { idx: idx, seed: seed, spec: sp, forced: false };
      }
    }
    idx = Math.floor(Math.random() * scenes.length);
    seed = newSeed();
    sp = GEN.compose(scenes[idx].text, seed, ar, CODE_V);
    var want = PREFIX + tool.styles[Math.floor(Math.random() * tool.styles.length)];
    if (GEN.hasStyle(want)) sp.style = want;
    sp.idx = idx; sp.v = CODE_V;
    return { idx: idx, seed: seed, spec: sp, forced: true };
  }

  /* ── 담아두기 ─────────────────────────────────────────────
   * 스튜디오와 같은 자리에 같은 모양으로 적는다. 여기서 담은 것이
   * 스튜디오 "담아 두신 화면"에 그대로 보인다. */
  var HEART_KEY = "bomnal.hearts.v1", HEART_MAX = 24;
  function heartsRead() {
    try {
      var raw = localStorage.getItem(HEART_KEY);
      var a = raw ? JSON.parse(raw) : [];
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function heartsWrite(a) {
    try { localStorage.setItem(HEART_KEY, JSON.stringify(a.slice(0, HEART_MAX))); } catch (e) {}
  }
  function heartKey(it) { return it.idx + ":" + it.seed + ":" + (it.v || CODE_V); }
  function heartHas(it) {
    var k = heartKey(it), a = heartsRead(), i;
    for (i = 0; i < a.length; i++) if (heartKey(a[i]) === k) return true;
    return false;
  }
  function heartToggle(it) {
    var k = heartKey(it), a = heartsRead(), out = [], i, hit = false;
    for (i = 0; i < a.length; i++) {
      if (heartKey(a[i]) === k) { hit = true; continue; }
      out.push(a[i]);
    }
    if (!hit) out.unshift({ idx: it.idx, seed: it.seed, v: CODE_V, ar: it.ar,
                            style: it.style || "", ko: it.ko || "" });
    heartsWrite(out);
    return !hit;
  }

  /* ── 화면 ─────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("tools");
    if (!root) return;
    var elHome = $("[data-tl-home]", root);
    var elStage = $("[data-tl-stage]", root);
    var elGrid = $("[data-tl-grid]", root);
    var elName = $("[data-tl-name]", root);
    var elDesc = $("[data-tl-desc]", root);
    var elSizes = $("[data-tl-sizes]", root);
    var elCanvas = $("[data-tl-canvas]", root);
    var elCode = $("[data-tl-code]", root);
    var elHeart = $("[data-tl-heart]", root);
    var elQuote = $("[data-tl-quote]", root);
    var elPlay = $("[data-tl-play]", root);

    var stage = null;          /* 지금 열린 도구 */
    var sizeIx = 0;
    var shot = null;           /* 지금 뽑아 둔 한 점 */
    var gen = new GEN.Gen(elCanvas);

    /* ① 도구 목록 — 칸마다 그 도구가 만든 그림 한 장 */
    TOOLS.forEach(function (tool) {
      var b = el("button", "tl-card");
      b.type = "button";
      var c = document.createElement("canvas");
      c.width = 320; c.height = 180;
      b.appendChild(c);
      var t = el("span", "tl-card-name", tool.ko);
      b.appendChild(t);
      b.appendChild(el("span", "tl-card-desc", tool.desc));
      b.title = tool.ko + " · " + tool.desc;
      elGrid.appendChild(b);

      var one = new GEN.Gen(c);
      var s = spin(tool, 16 / 9);
      one.set(s.spec);
      one.draw(1.7);           /* 한 장만. 열두 칸이 다 움직이면 아무것도 못 본다 */

      b.addEventListener("click", function () { open(tool); });
    });

    /* ② 규격 단추 */
    SIZES.forEach(function (sz, i) {
      var b = el("button", "tl-size", sz.ko);
      b.type = "button";
      b.addEventListener("click", function () {
        sizeIx = i;
        markSizes();
        fit();
        draw(spin(stage, SIZES[sizeIx].w / SIZES[sizeIx].h));
      });
      elSizes.appendChild(b);
    });
    function markSizes() {
      Array.prototype.forEach.call(elSizes.children, function (b, i) {
        b.classList.toggle("is-on", i === sizeIx);
        b.setAttribute("aria-pressed", i === sizeIx ? "true" : "false");
      });
    }

    /* 캔버스를 이 규격의 비율로, 화면에 들어가는 크기로 잡는다.
       비율을 뭉개면 현장에서 어떻게 보일지 알 수 없는 그림이 된다. */
    function fit() {
      var sz = SIZES[sizeIx], ar = sz.w / sz.h;
      var maxW = Math.min(980, (elStage.clientWidth || 980) - 4);
      var maxH = Math.max(240, Math.round((global.innerHeight || 800) * 0.56));
      var w = maxW, h = Math.round(w / ar);
      if (h > maxH) { h = maxH; w = Math.round(h * ar); }
      elCanvas.width = Math.max(64, w);
      elCanvas.height = Math.max(64, h);
    }

    function draw(s) {
      shot = s;
      shot.ar = SIZES[sizeIx].w / SIZES[sizeIx].h;
      shot.ko = GEN.SCENES[s.idx].ko;
      shot.style = s.spec.style;
      gen.set(s.spec).start();
      var num = code(s.idx, s.seed);
      var q = "code=" + num + (s.forced ? "&style=" + encodeURIComponent(s.style) : "");
      elCode.innerHTML = "";
      elCode.appendChild(el("b", null, num));
      elCode.appendChild(el("span", null,
        s.forced ? " · 그림 " + bare(s.style) + " (이 비율에는 번호와 함께 적어야 되살아납니다)"
                 : " · 이 번호만으로 어디서나 같은 화면"));
      elQuote.href = "./studio?" + q;
      elPlay.href = "./play?" + q + "&w=" + SIZES[sizeIx].w + "&h=" + SIZES[sizeIx].h;
      markHeart();
    }
    function markHeart() {
      var on = shot && heartHas(shot);
      elHeart.classList.toggle("is-on", !!on);
      elHeart.setAttribute("aria-pressed", on ? "true" : "false");
      elHeart.textContent = on ? "♥ 담았습니다" : "♥ 담아두기";
    }

    function open(tool) {
      stage = tool;
      elName.textContent = tool.ko;
      elDesc.textContent = tool.desc;
      markSizes();
      elHome.hidden = true;
      elStage.hidden = false;
      fit();
      draw(spin(tool, SIZES[sizeIx].w / SIZES[sizeIx].h));
      global.scrollTo(0, 0);
    }
    function close() {
      elStage.hidden = true;
      elHome.hidden = false;
      stage = null;
    }

    $("[data-tl-back]", root).addEventListener("click", close);
    $("[data-tl-spin]", root).addEventListener("click", function () {
      if (stage) draw(spin(stage, SIZES[sizeIx].w / SIZES[sizeIx].h));
    });
    elHeart.addEventListener("click", function () {
      if (!shot) return;
      heartToggle(shot);
      markHeart();
    });

    /* PNG — 화면에 보이는 크기가 아니라 규격의 절반쯤으로 다시 그려 준다.
       미리보기 캔버스를 그대로 내보내면 로비 화면에 걸 수 없는 크기가 나간다.
       도장은 찍어서 내보낸다. 도장 없는 것은 계약하신 분께만 드린다. */
    $("[data-tl-png]", root).addEventListener("click", function () {
      if (!shot) return;
      var sz = SIZES[sizeIx];
      var long = 1920;
      var sc = Math.min(1, long / Math.max(sz.w, sz.h));
      var cv = document.createElement("canvas");
      cv.width = Math.max(64, Math.round(sz.w * sc));
      cv.height = Math.max(64, Math.round(sz.h * sc));
      var g2 = new GEN.Gen(cv);
      g2.mark = "시연본 · 봄날퍼블릭아트";
      var sp = GEN.compose(GEN.SCENES[shot.idx].text, shot.seed, sz.w / sz.h, CODE_V);
      if (shot.style && GEN.hasStyle(shot.style)) sp.style = shot.style;
      sp.idx = shot.idx; sp.v = CODE_V;
      g2.set(sp);
      g2.draw(1.7);
      var name = code(shot.idx, shot.seed) + "_" + sz.id + ".png";
      cv.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      }, "image/png");
    });

    /* 스페이스로 다시 뽑고, Esc 로 목록으로. 도구는 손이 빨라야 한다. */
    document.addEventListener("keydown", function (e) {
      if (!stage) return;
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        draw(spin(stage, SIZES[sizeIx].w / SIZES[sizeIx].h));
      } else if (e.key === "Escape") {
        close();
      }
    });

    var rt;
    global.addEventListener("resize", function () {
      if (!stage) return;
      clearTimeout(rt);
      rt = setTimeout(function () {
        fit();
        if (shot) { gen.set(shot.spec).start(); }
      }, 200);
    });
  });
})(window);
