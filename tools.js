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
  var CODE_V = 7;
  var PREFIX = "sa:";

  /* ── 도구 ─────────────────────────────────────────────────
   * 도구 하나는 "엔진 그림 몇 종"을 묶은 것이다. 묶는 기준은 기술이 아니라
   * 쓰임이다. 고객은 "점군"과 "홀로그램"의 차이를 알 이유가 없다.
   * 알아야 하는 것은 "3D 모형을 코드로 다시 그린 화면"이라는 것뿐이다. */
  var TOOLS = [
    { id: "poster", en: "poster", ko: "벽보", desc: "면·망점·활자. 인쇄물의 문법",
      styles: ["flyposter", "hardedge"] },
    { id: "hangeul", en: "hangeul", ko: "한글", desc: "획으로 짜는 한글 판면",
      styles: ["hangul", "jamo"] },
    { id: "tide", en: "tide", ko: "물결", desc: "밀려오고 번지는 것",
      styles: ["ocean", "wave", "ripple"] },
    { id: "petal", en: "petal", ko: "꽃눈", desc: "떨어지고 피는 것",
      styles: ["petalfall", "blossom", "dandelion", "bloom"] },
    { id: "brush", en: "brush", ko: "붓질", desc: "손으로 그은 자국",
      styles: ["impasto", "inkwash", "hanji"] },
    { id: "arcade", en: "arcade", ko: "회랑", desc: "화면 안으로 들어간다",
      styles: ["renaissance", "anamorph", "tunnel"] },
    { id: "lumen", en: "lumen", ko: "빛알", desc: "어둠 위의 빛",
      styles: ["constellation", "crystal", "aurora"] },
    { id: "weave", en: "weave", ko: "결", desc: "겹치고 쌓이는 결",
      styles: ["weave", "thread", "topo", "terrace"] },
    { id: "mesh", en: "mesh", ko: "뼈대", desc: "3D 모형을 코드로 다시 그린다",
      styles: ["wire", "pointcloud", "chiaroscuro"] },
    { id: "field", en: "field", ko: "색면", desc: "색과 면만",
      styles: ["stripe", "desordre", "frieze", "swiss", "pop"] },
    { id: "flora", en: "flora", ko: "풀", desc: "자라는 것",
      styles: ["reed", "leafvein", "phyllo", "bamboo", "branch"] },
    { id: "grid", en: "grid", ko: "도시", desc: "격자와 신호",
      styles: ["isocity", "circuit", "slitscan", "dotmatrix", "blinds", "magnet"] }
  ];



  /* 규격. 스튜디오의 PANELS 와 같은 비율을 쓴다. */
  var SIZES = [
    { id: "wide169", ko: "가로 16:9", w: 3840, h: 2160 },
    { id: "vert916", ko: "세로 9:16", w: 1080, h: 1920 },
    { id: "ultra329", ko: "띠 32:9", w: 3840, h: 1080 },
    { id: "column16", ko: "기둥 1:6", w: 360, h: 2160 },
    /* 두 면 기둥. 모서리를 사이에 두고 두 면이 함께 보이는 자리다.
       면마다 따로 돌리면 같은 그림이 두 번 걸린 것으로 보인다 — 기둥
       하나가 아니라 화면 두 대다. 펼친 폭으로 한 장을 그려 드리고
       모서리에서 반씩 잘라 거는 것이 맞다. */
    { id: "column2", ko: "기둥 2면 · 모서리", w: 1512, h: 2160, wrap: 2 },
    { id: "square", ko: "정사각", w: 2048, h: 2048 }
  ];

  /* ── 손잡이 ───────────────────────────────────────────────
   * 손님이 돌릴 수 있는 값. 안 건드리면 "저절로" 로 두고, 느낌에서 뽑은
   * 값이 그대로 간다. 건드린 자리만 그 값이 이긴다.
   *
   * 여기 적힌 이름은 엔진이 쓰는 이름과 같다. 그래야 설정표 한 줄이
   * 그대로 4K 렌더로 넘어간다. 이름을 바꾸면 그 고리가 끊긴다. */
  var MOVE_KNOBS = [
    { id: "speed",    ko: "속도",  help: "움직이는 빠르기" }
  ];
  var TEX_KNOBS = [
    { id: "density",  ko: "밀도",  help: "빽빽한 정도" },
    { id: "scale",    ko: "크기",  help: "무늬 하나의 크기" },
    { id: "contrast", ko: "대비",  help: "밝고 어두움의 차" },
    { id: "glow",     ko: "번짐",  help: "빛이 퍼지는 정도" },
    { id: "grain",    ko: "결",    help: "알갱이의 굵기" },
    { id: "accent",   ko: "색조",  help: "포인트 색이 도는 정도" }
  ];
  var KNOBS = MOVE_KNOBS.concat(TEX_KNOBS);
  var MOTIONS = [["drift", "흐름"], ["pulse", "숨"], ["orbit", "회전"], ["still", "정지"]];
  var SYMS = [[1, "없음"], [2, "2겹"], [4, "4겹"], [6, "6겹"]];
  /* 납품 길이. 설정표에 실어 보내면 우리가 그 길이로 뽑는다. */
  var DURS = [[15, "15초"], [30, "30초"], [60, "60초"]];

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
    /* 이 비율에서 실제로 뽑히는 것만 남긴다. 판을 솎으면 도구 묶음에도
       빠진 이름이 남는데, 거르지 않으면 아래 "갈아 끼우기"가 그 이름을
       되살려 솎아낸 그림이 도구로 다시 나온다. */
    var pool = GEN.pool ? GEN.pool(CODE_V, ar) : null;
    var ok = pool ? tool.styles.filter(function (id) { return pool.indexOf(PREFIX + id) >= 0; })
                  : tool.styles.slice();
    if (!ok.length && pool) {
      /* 이 비율에 이 도구의 그림이 하나도 없다(기둥에 회랑 같은 경우).
         그때는 판에 남아 있는 것 중에서 고른다. 없는 그림을 억지로
         세우지 않는다. */
      ok = tool.styles.filter(function (id) { return GEN.hasStyle(PREFIX + id); });
      var even = GEN.pool(CODE_V, 16 / 9);
      ok = ok.filter(function (id) { return even.indexOf(PREFIX + id) >= 0; });
    }
    if (!ok.length) ok = tool.styles.slice();
    for (i = 0; i < 400; i++) {
      idx = Math.floor(Math.random() * scenes.length);
      seed = newSeed();
      sp = GEN.compose(scenes[idx].text, seed, ar, CODE_V);
      if (ok.indexOf(bare(sp.style)) >= 0) {
        sp.idx = idx; sp.v = CODE_V;
        return { idx: idx, seed: seed, spec: sp, forced: false };
      }
    }
    idx = Math.floor(Math.random() * scenes.length);
    seed = newSeed();
    sp = GEN.compose(scenes[idx].text, seed, ar, CODE_V);
    var want = PREFIX + ok[Math.floor(Math.random() * ok.length)];
    if (GEN.hasStyle(want)) sp.style = want;
    sp.idx = idx; sp.v = CODE_V;
    return { idx: idx, seed: seed, spec: sp, forced: true };
  }

  /* ── 설정표 ───────────────────────────────────────────────
   * 손님 화면을 그대로 4K 로 뽑는 데 필요한 전부를 한 줄에 담는다.
   * 색은 이름이 아니라 색 자체를 싣는다. 색판 이름표가 바뀌어도
   * 납품본은 같은 색으로 나와야 하기 때문이다.
   *
   *   node tools/render-studio.mjs "<이 줄>" --name 봄날로비 --dur 30
   *
   * 이 줄만 있으면 우리 쪽에서 바로 렌더해 보낼 수 있다. */
  function sheetOf(shot, sz, tune) {
    var sp = shot.spec;
    var q = [];
    var add = function (k, v) { q.push(k + "=" + encodeURIComponent(String(v))); };
    add("style", bare(sp.style));
    add("scene", shot.idx);
    add("seed", shot.seed);
    add("v", CODE_V);
    add("ar", (sz.w / sz.h).toFixed(6));
    add("pal", sp.palette.id);
    add("bg", sp.palette.bg);
    add("tones", (sp.palette.ink || []).map(function (h) { return h.replace(/^#/, ""); }).join(","));
    KNOBS.forEach(function (k) { if (tune[k.id] != null) add(k.id, tune[k.id]); });
    if (tune.motion) add("motion", tune.motion);
    if (tune.symmetry != null) add("symmetry", tune.symmetry);
    if (tune.invert != null) add("invert", tune.invert ? 1 : 0);
    add("w", sz.w); add("h", sz.h);
    if (sz.wrap) add("wrap", sz.wrap);   /* 모서리에서 몇 쪽으로 자를지 */
    add("dur", tune.dur || 30);
    return q.join("&");
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

    var elTune = $("[data-tl-tune]", root);
    var elTuneTag = $("[data-tl-tune-tag]", root);
    var elPal = $("[data-tl-pal]", root);
    var elKnobs = $("[data-tl-knobs]", root);
    var elPicks = $("[data-tl-picks]", root);
    var elSheet = $("[data-tl-sheet]", root);

    var stage = null;          /* 지금 열린 도구 */
    var sizeIx = 0;
    var shot = null;           /* 지금 뽑아 둔 한 점 */
    var tune = {};             /* 손님이 돌린 값. 빈 것은 "저절로" */
    var palId = null;          /* 손님이 고른 색. null 이면 저절로 */
    var gen = new GEN.Gen(elCanvas);

    /* ① 도구 목록 — 칸마다 그 도구가 만든 그림 한 장 */
    TOOLS.forEach(function (tool) {
      var b = el("button", "tl-card");
      b.type = "button";
      var c = document.createElement("canvas");
      c.width = 320; c.height = 180;
      b.appendChild(c);
      var t = el("span", "tl-card-name", tool.en);
      b.appendChild(t);
      b.appendChild(el("span", "tl-card-desc", tool.ko + " · " + tool.desc));
      b.title = tool.en + " · " + tool.desc;
      elGrid.appendChild(b);

      var one = new GEN.Gen(c);
      var s = spin(tool, 16 / 9);
      one.set(s.spec);
      one.draw(1.7);           /* 한 장만. 열두 칸이 다 움직이면 아무것도 못 본다 */

      b.addEventListener("click", function () { open(tool); });
    });

    /* ② 손보기 — 색판, 미닫이 여섯, 움직임, 대칭, 밝은 바탕 */
    var PALS = (GEN.PALETTES || []).concat(GEN.PALETTES_EXTRA || []);
    var elMix = $("[data-tl-mix]", root);
    var elMixRow = $("[data-tl-mix-row]", root);
    var elMixHex = $("[data-tl-mix-hex]", root);
    /* 손님이 직접 섞는 색. 기관 브랜드 색이 정해진 곳이 많다. */
    var MIX_ID = "직접 고른 색";
    var mix = { id: MIX_ID, bg: "#0d1420", ink: ["#ffd6e7", "#ffb3d1", "#c9f0d8", "#fff2b8", "#ffffff"] };
    function palChip(p) {
      var b = el("button", "tl-chip");
      b.type = "button";
      b.title = p ? p.id : "저절로";
      if (p) {
        b.style.background = p.bg;
        var sw = el("span", "tl-chip-sw");
        (p.ink || []).slice(0, 4).forEach(function (c) {
          var d = el("i"); d.style.background = c; sw.appendChild(d);
        });
        b.appendChild(sw);
      }
      b.appendChild(el("span", "tl-chip-ko", p ? p.id : "저절로"));
      b.addEventListener("click", function () {
        palId = p ? p.id : null;
        markTune();
        redraw();
      });
      return b;
    }
    elPal.appendChild(palChip(null));
    PALS.forEach(function (p) { elPal.appendChild(palChip(p)); });

    /* 직접 만들기 — 누르면 색 고르는 칸이 열린다 */
    var mixChip = el("button", "tl-chip tl-chip-mix");
    mixChip.type = "button";
    mixChip.title = "색을 직접 고릅니다";
    mixChip.appendChild(el("span", "tl-chip-ko", "직접 만들기"));
    mixChip.addEventListener("click", function () {
      palId = MIX_ID;
      elMix.hidden = false;
      markTune();
      redraw();
    });
    elPal.appendChild(mixChip);

    /* 색 고르는 칸 다섯: 바탕 하나와 색 넷 */
    var MIX_LABELS = ["바탕", "색 1", "색 2", "색 3", "색 4"];
    var mixInputs = [];
    MIX_LABELS.forEach(function (ko, i) {
      var w = el("label", "tl-mix-one");
      w.appendChild(el("span", null, ko));
      var inp = document.createElement("input");
      inp.type = "color";
      inp.value = i === 0 ? mix.bg : mix.ink[i - 1];
      inp.setAttribute("aria-label", ko);
      inp.addEventListener("input", function () {
        if (i === 0) mix.bg = inp.value; else mix.ink[i - 1] = inp.value;
        mix.ink[4] = mix.ink[3];
        palId = MIX_ID;
        syncMixHex();
        markTune();
        redraw();
      });
      w.appendChild(inp);
      mixInputs.push(inp);
      elMixRow.appendChild(w);
    });
    function syncMixHex() {
      if (document.activeElement === elMixHex) return;
      elMixHex.value = [mix.bg].concat(mix.ink.slice(0, 4)).join(" ");
    }
    /* 색 번호를 붙여 넣어도 되게. 기관 지침서에는 늘 #RRGGBB 로 적혀 있다. */
    elMixHex.addEventListener("input", function () {
      var hx = (elMixHex.value.match(/#?[0-9a-fA-F]{6}/g) || [])
        .map(function (h) { return "#" + h.replace(/^#/, "").toLowerCase(); });
      if (hx.length < 2) return;
      mix.bg = hx[0];
      for (var i = 0; i < 4; i++) mix.ink[i] = hx[i + 1] || hx[hx.length - 1];
      mix.ink[4] = mix.ink[3];
      mixInputs.forEach(function (inp, i) { inp.value = i === 0 ? mix.bg : mix.ink[i - 1]; });
      palId = MIX_ID;
      markTune();
      redraw();
    });
    syncMixHex();

    function addKnob(box, k) {
      var wrap = el("label", "tl-knob");
      wrap.appendChild(el("span", "tl-knob-ko", k.ko));
      var input = document.createElement("input");
      input.type = "range"; input.min = "5"; input.max = "95"; input.step = "1";
      input.value = "50";
      input.setAttribute("aria-label", k.ko + " · " + k.help);
      var num = el("b", "tl-knob-num", "저절로");
      input.addEventListener("input", function () {
        tune[k.id] = +input.value;
        num.textContent = input.value;
        markTune();
        redraw();
      });
      wrap.appendChild(input);
      wrap.appendChild(num);
      wrap.dataset.knob = k.id;
      box.appendChild(wrap);
    }
    var elKnobsMove = $("[data-tl-knobs-move]", root);
    MOVE_KNOBS.forEach(function (k) { addKnob(elKnobsMove, k); });
    TEX_KNOBS.forEach(function (k) { addKnob(elKnobs, k); });

    function pickRow(label, items, get, set) {
      var row = el("div", "tl-pick");
      row.appendChild(el("span", "tl-pick-ko", label));
      var box = el("span", "tl-pick-box");
      items.forEach(function (it) {
        var b = el("button", "tl-pick-b", it[1]);
        b.type = "button";
        b.dataset.val = String(it[0]);
        b.addEventListener("click", function () { set(it[0]); markTune(); redraw(); });
        box.appendChild(b);
      });
      row.appendChild(box);
      row.dataset.get = label;
      row._get = get;
      elPicks.appendChild(row);
      return row;
    }
    var rowMotion = pickRow("움직임", [["", "저절로"]].concat(MOTIONS),
      function () { return tune.motion || ""; },
      function (v) { if (v) tune.motion = v; else delete tune.motion; });
    var rowSym = pickRow("대칭", [["", "저절로"]].concat(SYMS),
      function () { return tune.symmetry == null ? "" : tune.symmetry; },
      function (v) { if (v === "") delete tune.symmetry; else tune.symmetry = +v; });
    var rowInv = pickRow("바탕", [["", "저절로"], [0, "어둡게"], [1, "밝게"]],
      function () { return tune.invert == null ? "" : (tune.invert ? 1 : 0); },
      function (v) { if (v === "") delete tune.invert; else tune.invert = !!+v; });
    var rowDur = pickRow("길이", DURS,
      function () { return tune.dur || 30; },
      function (v) { tune.dur = +v; });

    function tuneCount() {
      var n = 0;
      for (var k in tune) if (k !== "dur") n++;
      return n + (palId ? 1 : 0);
    }
    function markTune() {
      var n = tuneCount();
      elTuneTag.textContent = n ? "손본 것 " + n + "개" : "저절로";
      elTuneTag.classList.toggle("is-on", n > 0);
      Array.prototype.forEach.call(elPal.children, function (b, i) {
        var id = i === 0 ? null : (i <= PALS.length ? PALS[i - 1].id : MIX_ID);
        b.classList.toggle("is-on", id === palId);
      });
      Array.prototype.forEach.call(elKnobs.children, function (w) {
        var on = tune[w.dataset.knob] != null;
        w.classList.toggle("is-on", on);
        if (!on) $(".tl-knob-num", w).textContent = "저절로";
      });
      [rowMotion, rowSym, rowInv, rowDur].forEach(function (row) {
        var cur = String(row._get());
        Array.prototype.forEach.call($(".tl-pick-box", row).children, function (b) {
          b.classList.toggle("is-on", b.dataset.val === cur);
        });
      });
    }

    $("[data-tl-reset]", root).addEventListener("click", function () {
      tune = {}; palId = null;
      elMix.hidden = true;
      Array.prototype.forEach.call(elKnobs.children, function (w) {
        $("input", w).value = "50";
      });
      markTune();
      redraw();
    });

    /* 손잡이만 바뀌었을 때는 번호를 새로 뽑지 않는다. 같은 작품을 손보는
       중인데 번호가 바뀌면 무엇을 보고 있는지 알 수 없다. */
    function redraw() {
      if (!stage || !shot) return;
      draw(shot, true);
    }

    /* ③ 규격 단추 */
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

    function draw(s, keepCode) {
      shot = s;
      var sz = SIZES[sizeIx];
      shot.ar = sz.w / sz.h;
      shot.ko = GEN.SCENES[s.idx].ko;
      shot.style = s.spec.style;
      /* 손님이 고른 색·손잡이를 사양에 얹는다. 겹·번짐·알갱이까지 같은
         길로 그려지므로, 여기서 본 화면이 그대로 납품본이 된다. */
      /* 저절로 뽑힌 색을 따로 적어 둔다. "처음으로" 를 눌렀을 때
         돌아갈 자리가 없으면 손님이 고른 색이 그대로 눌러앉는다. */
      if (!s.basePal) s.basePal = s.spec.palette;
      s.spec.palette = s.basePal;
      if (palId === MIX_ID) s.spec.palette = { id: MIX_ID, bg: mix.bg, ink: mix.ink.slice() };
      else if (palId) {
        for (var i = 0; i < PALS.length; i++) if (PALS[i].id === palId) s.spec.palette = PALS[i];
      }
      s.spec.tune = tuneCount() ? tune : null;
      /* 검사용 — 지금 화면에 쓰고 있는 사양을 그대로 내놓는다.
         납품 화면이 설정표로 같은 그림을 만드는지 견줄 때 쓴다. */
      global.__TL_SPEC = s.spec;
      gen.set(s.spec).start();
      var num = code(s.idx, s.seed);
      var q = "code=" + num + (s.forced ? "&style=" + encodeURIComponent(s.style) : "");
      var sheet = sheetOf(s, sz, tune);
      elCode.innerHTML = "";
      elCode.appendChild(el("b", null, num));
      elCode.appendChild(el("span", null,
        tuneCount() ? " · 손보신 화면입니다. 아래 설정표를 함께 주세요"
                    : (s.forced ? " · 그림 " + bare(s.style) + " (이 비율에는 번호와 함께 적어야 되살아납니다)"
                                : " · 이 번호만으로 어디서나 같은 화면")));
      if (elSheet) elSheet.textContent = sheet;
      elQuote.href = "./studio?" + q + "&spec=" + encodeURIComponent(sheet);
      elPlay.href = "./play?" + q + "&w=" + sz.w + "&h=" + sz.h;
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
      markTune();
      elName.textContent = tool.en;
      elDesc.textContent = tool.ko + " · " + tool.desc;
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
      /* 화면에서 손본 그대로 받아 가셔야 한다 */
      if (palId === MIX_ID) sp.palette = { id: MIX_ID, bg: mix.bg, ink: mix.ink.slice() };
      else if (palId) for (var pi = 0; pi < PALS.length; pi++) if (PALS[pi].id === palId) sp.palette = PALS[pi];
      /* 색을 안 고르셨으면 compose 가 뽑은 색 그대로 간다 */
      sp.tune = tuneCount() ? tune : null;
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

    var elCopy = $("[data-tl-copy]", root);
    if (elCopy) elCopy.addEventListener("click", function () {
      var txt = elSheet ? elSheet.textContent : "";
      if (!txt) return;
      var done = function () {
        elCopy.textContent = "복사했습니다";
        setTimeout(function () { elCopy.textContent = "복사"; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () { prompt("이 줄을 복사해 두세요", txt); });
      } else { prompt("이 줄을 복사해 두세요", txt); }
    });

    /* ── 바로 보내기 ─────────────────────────────────────────
     * 손본 설정을 들고 스튜디오로 건너가지 않아도 되게 여기서 바로 받는다.
     * 보내는 것은 설정표 한 줄과 연락처뿐이다. 그 줄이 곧 주문서다 —
     * 우리는 받아서 render-studio 에 그대로 넣으면 된다. */
    var elSendForm = $("[data-tl-form]", root);
    var elSendBtn = $("[data-tl-send]", root);
    var elSendMsg = $("[data-tl-msg]", root);
    function sendSay(t, tone) {
      if (!elSendMsg) return;
      elSendMsg.textContent = t;
      if (tone) elSendMsg.setAttribute("data-tone", tone);
      else elSendMsg.removeAttribute("data-tone");
    }
    if (elSendForm) elSendForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!shot) { sendSay("먼저 화면을 하나 뽑아 주세요.", "err"); return; }
      var d = new FormData(elSendForm);
      var name = String(d.get("name") || "").trim();
      var email = String(d.get("email") || "").trim();
      if (!name) { sendSay("이름을 적어 주세요.", "err"); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { sendSay("이메일 주소를 다시 확인해 주세요.", "err"); return; }
      if (!d.get("consentRequired")) { sendSay("회신을 위한 수집 동의가 필요합니다.", "err"); return; }
      var sz = SIZES[sizeIx];
      var sheet = elSheet ? elSheet.textContent : "";
      elSendBtn.disabled = true;
      sendSay("보내는 중…");
      fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: String(d.get("phone") || "").trim(),
          organization: String(d.get("organization") || "").trim(),
          service: ["미디어아트 제작 (봄날 도구 · 손님이 손본 설정)"],
          page: "tools",
          message: [
            "도구: " + (stage ? stage.en + " (" + stage.ko + ")" : "-"),
            "작품 번호: " + code(shot.idx, shot.seed),
            "화면 규격: " + sz.ko + " " + sz.w + "×" + sz.h +
              (sz.wrap ? " (한 장으로 그려 모서리에서 " + sz.wrap + "쪽으로 자름 · 면마다 "
                         + Math.round(sz.w / sz.wrap) + "×" + sz.h + ")" : ""),
            "재생 길이: " + (tune.dur || 30) + "초",
            "손본 항목: " + (tuneCount() ? tuneCount() + "개" : "없음(저절로)"),
            "색: " + (palId || "저절로"),
            "",
            "재현용 파라미터:",
            sheet,
            "",
            "  node tools/render-studio.mjs \"" + sheet + "\" --name " + code(shot.idx, shot.seed) +
              " --dur " + (tune.dur || 30),
            "",
            "[동의 기록] 개인정보 수집·이용: 동의함"
          ].join("\n")
        })
      })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
        .then(function () {
          elSendForm.reset();
          sendSay("받았습니다. 이 화면 그대로 4K로 뽑아 평일 24시간 이내에 보내드리겠습니다.", "ok");
        })
        .catch(function () {
          elSendBtn.disabled = false;
          sendSay("전송이 되지 않았습니다. 010-4292-1999 또는 studio@publicbloom.art 로 연락 주세요.", "err");
        });
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
