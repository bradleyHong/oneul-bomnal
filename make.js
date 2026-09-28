/* 봄날 만들기 — 버튼 넷으로 미디어아트 한 점.
 *
 * 스튜디오는 "고르고 견적 받는" 화면이고, 도구는 "쓰임별로 열둘 늘어놓은"
 * 화면이다. 둘 다 처음 오신 분에게는 아직 많다. 광고를 보고 들어온 사람은
 * 삼 초 안에 무엇을 하는 자리인지 알아야 하고, 그 다음 누를 것이 하나여야
 * 한다.
 *
 * 그래서 이 화면은 이렇게만 둔다.
 *   ① 들어오면 이미 그림이 한 점 돌고 있다 (아무것도 안 물어본다)
 *   ② 손잡이는 넷 — 다시 · 결 · 색 · 규격
 *   ③ 고르는 일은 전부 덮개 한 자리에서 (본문에 손잡이를 늘어놓지 않는다)
 *   ④ 주 버튼은 하나 — 이 화면 받기
 *
 * 만들고 보는 것은 전부 무료다. 값을 받는 것은 도장 없는 4K 영상 파일과
 * 전용 플레이어와 설치뿐이다. 그래서 여기에는 결제도 로그인도 없다.
 *
 * 그림·번호·설정표는 도구 화면(tools.js)과 같은 것을 쓴다. 두 벌로 적어
 * 두면 한쪽만 고쳐져 손님이 본 화면과 우리가 뽑는 4K 가 갈린다.
 * 서버로 가는 것은 "이 화면 받기"에서 손님이 직접 보내실 때뿐이다. */
(function (global) {
  "use strict";
  var GEN = global.BomnalGen;
  var KIT = global.BomnalToolset;
  if (!GEN || !KIT) return;

  var TOOLS = KIT.TOOLS, SIZES = KIT.SIZES, CODE_V = KIT.CODE_V;
  var MOVE_KNOBS = KIT.MOVE_KNOBS, TEX_KNOBS = KIT.TEX_KNOBS;
  var PALS = (GEN.PALETTES || []).concat(GEN.PALETTES_EXTRA || []);
  var MIX_ID = "직접 고른 색";

  function $(q, r) { return (r || document).querySelector(q); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  /* ── 내 데이터 ─────────────────────────────────────────────
   * 손님이 제일 많이 묻는 것이 "우리 데이터로 움직이게 할 수 있나요"다.
   * 할 수 있다. 다만 두 갈래로 갈리고, 그 차이를 숨기면 안 된다.
   *
   *   지금 바로  Open-Meteo. 인증키가 없고 브라우저에서 바로 불린다.
   *              이 화면에서 진짜 값이 들어와 그림이 그 자리에서 바뀐다.
   *   협의 후    공공데이터포털(data.go.kr)·기관 내부 시스템. 인증키가
   *              필요하고 브라우저 직접 호출(CORS)이 막혀 있다. 납품 때
   *              서버 중계를 한 겹 둔다.
   *
   * 어느 쪽이든 인증키는 이 브라우저 밖으로 나가지 않는다. 우리 서버로도
   * 안 보낸다. 미리보기는 손님 브라우저가 직접 부르고, 안 되면 안 된다고
   * 적는다 — 되는 척하고 값을 지어내면 그건 시연이 아니라 거짓말이다. */
  var FIELDS = [
    { id: "pm2_5", ko: "초미세먼지", unit: "㎍/㎥", lo: 0,  hi: 75,  src: "air" },
    { id: "pm10",  ko: "미세먼지",   unit: "㎍/㎥", lo: 0,  hi: 150, src: "air" },
    { id: "temperature_2m",      ko: "기온", unit: "℃", lo: -10, hi: 35, src: "weather" },
    { id: "relative_humidity_2m", ko: "습도", unit: "%",  lo: 20,  hi: 100, src: "weather" },
    { id: "wind_speed_10m",      ko: "바람", unit: "km/h", lo: 0, hi: 40, src: "weather" }
  ];
  function fieldOf(id) {
    for (var i = 0; i < FIELDS.length; i++) if (FIELDS[i].id === id) return FIELDS[i];
    return FIELDS[0];
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("make");
    if (!root) return;

    var elStage   = $(".mk-stage", root);
    var elCanvas  = $("[data-mk-canvas]", root);
    var elCode    = $("[data-mk-code]", root);
    var elHeart   = $("[data-mk-heart]", root);
    var elGetBtn  = $("[data-mk-open='get']", root);
    var elKept    = $("[data-mk-kept]", root);
    var elKeptRow = $("[data-mk-kept-row]", root);
    var elKeptN   = $("[data-mk-kept-n]", root);
    var sheet     = $("[data-mk-sheet]");
    var sheetIn   = $(".mk-sheet-in", sheet);
    var sheetTtl  = $("[data-mk-sheet-title]", sheet);
    var sheetBody = $("[data-mk-sheet-body]", sheet);

    var kindIx = 0;                 /* 도구 묶음. 0은 파사드다 */
    var sizeIx = 0;
    var palId = null;               /* null 이면 저절로 */
    var mix = { id: MIX_ID, bg: "#0d1420", ink: ["#ffd6e7", "#ffb3d1", "#c9f0d8", "#fff2b8", "#ffffff"] };
    var tune = {};                  /* 손님이 직접 돌린 값 */
    var live = { on: false, place: null, field: "pm2_5", val: null, norm: null, note: "" };
    var shot = null;
    var gen = new GEN.Gen(elCanvas);

    /* ── 캔버스 크기 ───────────────────────────────────────
       규격에 따라 비율이 달라진다. 기둥(1:6)을 16:9 칸에 늘려 넣으면
       손님이 보는 것과 벽에 걸리는 것이 다른 그림이 된다. */
    function fit() {
      var sz = SIZES[sizeIx], ar = sz.w / sz.h;
      var maxW = Math.min(1180, (elStage.clientWidth || 980) - 4);
      var maxH = Math.max(240, Math.round((global.innerHeight || 800) * 0.56));
      var w = maxW, h = Math.round(w / ar);
      if (h > maxH) { h = maxH; w = Math.round(h * ar); }
      elCanvas.width = Math.max(64, w);
      elCanvas.height = Math.max(64, h);
    }

    /* ── 값 → 손잡이 ───────────────────────────────────────
       실시간 값 하나를 0~1 로 편 뒤 손잡이 셋에 얹는다. 손님이 직접
       돌린 자리는 건드리지 않는다 — 직접 돌린 것이 언제나 이긴다. */
    function liveTune(base) {
      if (!live.on || live.norm == null) return base;
      var out = {}, k;
      for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
      var n = live.norm;
      if (out.density  == null) out.density  = Math.round(18 + n * 72);
      if (out.contrast == null) out.contrast = Math.round(38 + n * 50);
      if (out.speed    == null) out.speed    = Math.round(22 + n * 62);
      return out;
    }
    function tuneCount() {
      var n = 0, k;
      for (k in tune) if (tune[k] != null) n++;
      return n;
    }
    function effTune() {
      var t = liveTune(tune);
      var n = 0, k;
      for (k in t) if (t[k] != null) n++;
      return n ? t : null;
    }

    /* ── 그리기 ────────────────────────────────────────────── */
    function draw(s) {
      shot = s;
      var sz = SIZES[sizeIx];
      shot.ar = sz.w / sz.h;
      shot.style = s.spec.style;
      /* 저절로 뽑힌 색을 따로 적어 둔다. "저절로"로 되돌아갈 자리가
         없으면 손님이 한 번 고른 색이 그대로 눌러앉는다. */
      if (!s.basePal) s.basePal = s.spec.palette;
      s.spec.palette = s.basePal;
      if (palId === MIX_ID) s.spec.palette = { id: MIX_ID, bg: mix.bg, ink: mix.ink.slice() };
      else if (palId) {
        for (var i = 0; i < PALS.length; i++) if (PALS[i].id === palId) s.spec.palette = PALS[i];
      }
      s.spec.tune = effTune();
      global.__MK_SPEC = s.spec;         /* 검사용 — 지금 화면의 사양 그대로 */
      gen.set(s.spec).start();
      paintLabels();
    }

    function paintLabels() {
      if (!shot) return;
      var num = KIT.code(shot.idx, shot.seed);
      elCode.innerHTML = "";
      elCode.appendChild(el("b", null, num));
      var tail = shot.forced
        ? " · 그림 " + KIT.bare(shot.style) + " (이 비율에는 번호와 함께 적어 주세요)"
        : (effTune() ? " · 손보신 화면입니다" : " · 이 번호만으로 어디서나 같은 화면");
      elCode.appendChild(el("span", null, tail));
      tag("kind", TOOLS[kindIx].ko);
      tag("size", SIZES[sizeIx].ko);
      tag("pal", palId ? palId : "저절로");
      tag("tune", tuneCount() ? tuneCount() + "가지 손봄" : "속도·밀도·대비까지 직접");
      tag("live", live.on && live.val != null
        ? live.place.ko + " " + fieldOf(live.field).ko + " " + live.val + fieldOf(live.field).unit + " 물림"
        : "우리 지역 미세먼지·기온을 물릴 수 있습니다");
      markHeart();
    }
    function tag(name, txt) {
      var n = root.querySelector("[data-mk-tag='" + name + "']");
      if (n) n.textContent = txt;
    }

    function spin() {
      var sz = SIZES[sizeIx];
      draw(KIT.spin(TOOLS[kindIx], sz.w / sz.h));
    }
    function redraw() {                 /* 같은 화면을 값만 바꿔 다시 */
      if (!shot) return spin();
      fit();
      draw(shot);
    }

    /* ── 담아두기 ──────────────────────────────────────────
       스튜디오·도구와 같은 자리에 적는다. 여기서 담은 것이 저쪽
       "담아 두신 화면"에 그대로 보인다. 이 브라우저에만 남는다. */
    var HEART_KEY = "bomnal.hearts.v1", HEART_MAX = 24;
    function heartsRead() {
      try {
        var a = JSON.parse(localStorage.getItem(HEART_KEY) || "[]");
        return Array.isArray(a) ? a : [];
      } catch (e) { return []; }
    }
    function heartsWrite(a) {
      try { localStorage.setItem(HEART_KEY, JSON.stringify(a.slice(0, HEART_MAX))); } catch (e) { /* 꽉 찼으면 그만둔다 */ }
    }
    function heartKey(it) { return it.idx + ":" + it.seed + ":" + (it.v || CODE_V); }
    function heartHas() {
      if (!shot) return false;
      var me = heartKey({ idx: shot.idx, seed: shot.seed, v: CODE_V });
      return heartsRead().some(function (x) { return heartKey(x) === me; });
    }
    function markHeart() {
      var on = heartHas();
      elHeart.classList.toggle("is-on", on);
      elHeart.setAttribute("aria-pressed", on ? "true" : "false");
      elHeart.textContent = on ? "♥ 담았습니다" : "♥ 담아두기";
      paintKept();
    }

    /* 담아 둔 화면을 작은 칸으로 다시 그린다. 칸마다 그 번호로 한 장만
       그린다 — 돌리면 열두 칸이 동시에 돌아 느린 기기에서 화면이 끊긴다. */
    function paintKept() {
      var a = heartsRead();
      elKept.hidden = !a.length;
      if (!a.length) return;
      elKeptN.textContent = a.length + "점";
      elKeptRow.innerHTML = "";
      a.slice(0, 12).forEach(function (it) {
        var b = el("button", null);
        b.type = "button";
        b.title = KIT.code(it.idx, it.seed) + " 되돌리기";
        b.setAttribute("aria-label", b.title);
        var c = document.createElement("canvas");
        c.width = 232; c.height = 132;
        b.appendChild(c);
        elKeptRow.appendChild(b);
        var sp = GEN.compose(GEN.SCENES[it.idx].text, it.seed, 16 / 9, it.v || CODE_V);
        if (it.style && GEN.hasStyle(KIT.PREFIX + it.style)) sp.style = KIT.PREFIX + it.style;
        sp.idx = it.idx; sp.v = it.v || CODE_V;
        var one = new GEN.Gen(c);
        one.set(sp);
        one.draw(1.7);          /* 한 장만. 열두 칸이 다 돌면 느린 기기에서 화면이 끊긴다 */
        b.addEventListener("click", function () {
          var back = GEN.compose(GEN.SCENES[it.idx].text, it.seed, SIZES[sizeIx].w / SIZES[sizeIx].h,
                                 it.v || CODE_V);
          if (it.style && GEN.hasStyle(KIT.PREFIX + it.style)) back.style = KIT.PREFIX + it.style;
          back.idx = it.idx; back.v = it.v || CODE_V;
          draw({ idx: it.idx, seed: it.seed, spec: back, forced: false });
          global.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
    }
    elHeart.addEventListener("click", function () {
      if (!shot) return;
      var a = heartsRead();
      var me = heartKey({ idx: shot.idx, seed: shot.seed, v: CODE_V });
      var kept = a.filter(function (x) { return heartKey(x) !== me; });
      if (kept.length === a.length) {
        kept.unshift({ idx: shot.idx, seed: shot.seed, v: CODE_V, ar: shot.ar,
                       style: KIT.bare(shot.style) });
      }
      heartsWrite(kept);
      markHeart();
    });

    /* ── 덮개 ──────────────────────────────────────────────── */
    var openName = null;
    function openSheet(name) {
      var b = BUILD[name];
      if (!b) return;
      openName = name;
      sheetTtl.textContent = b.title;
      sheetBody.innerHTML = "";
      b.build(sheetBody);
      sheet.hidden = false;
      document.body.classList.add("mk-locked");
      var first = sheetIn.querySelector("button, select, input");
      if (first) first.focus();
    }
    function closeSheet() {
      sheet.hidden = true;
      openName = null;
      document.body.classList.remove("mk-locked");
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-mk-close]"), function (b) {
      b.addEventListener("click", closeSheet);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !sheet.hidden) closeSheet();
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-mk-open]"), function (b) {
      b.addEventListener("click", function () { openSheet(b.getAttribute("data-mk-open")); });
    });
    $("[data-mk-again]", root).addEventListener("click", spin);

    /* 칩 한 줄 만들기 — 고르는 모양이 늘 같아야 배우는 데가 없다 */
    function chips(host, items, isOn, onPick) {
      var wrap = el("div", "mk-chips");
      items.forEach(function (it) {
        var b = el("button", "mk-chip");
        b.type = "button";
        b.appendChild(el("b", null, it.ko));
        if (it.sub) b.appendChild(el("span", null, it.sub));
        if (isOn(it)) b.classList.add("is-on");
        b.addEventListener("click", function () { onPick(it); });
        wrap.appendChild(b);
      });
      host.appendChild(wrap);
      return wrap;
    }
    function note(host, txt) { host.appendChild(el("p", "mk-note", txt)); }

    var BUILD = {};

    /* ① 결 — 어떤 그림인가. 기술 이름(점군·홀로그램)은 안 보여 준다. */
    BUILD.kind = { title: "어떤 결로 만들까요", build: function (host) {
      note(host, "누르면 그 결로 한 점 바로 나옵니다. 마음에 안 들면 “다시”를 몇 번이든 누르세요.");
      chips(host, TOOLS.map(function (t, i) { return { i: i, ko: t.ko, sub: t.desc }; }),
        function (it) { return it.i === kindIx; },
        function (it) { kindIx = it.i; spin(); closeSheet(); });
    } };

    /* ② 색 — 이름표가 아니라 색 자체를 고른다 */
    BUILD.pal = { title: "색을 고르세요", build: function (host) {
      note(host, "안 고르시면 화면마다 어울리는 색이 저절로 붙습니다. 기관 색이 정해져 있으면 아래에서 직접 넣으세요.");
      var wrap = el("div", "mk-pals");
      function swatch(p, on, pick) {
        var b = el("button", "mk-pal");
        b.type = "button";
        if (on) b.classList.add("is-on");
        var bar = el("span", "mk-pal-bar");
        bar.style.background = p.bg;
        (p.ink || []).slice(0, 4).forEach(function (h) {
          var d = el("i");
          d.style.background = h;
          bar.appendChild(d);
        });
        b.appendChild(bar);
        b.appendChild(el("span", "mk-pal-name", p.id));
        b.addEventListener("click", pick);
        wrap.appendChild(b);
      }
      swatch({ id: "저절로", bg: "#10131a", ink: ["#7d8aa3", "#9fb0cc", "#d6e0f2", "#ffffff"] },
        !palId, function () { palId = null; redraw(); closeSheet(); });
      PALS.forEach(function (p) {
        swatch(p, palId === p.id, function () { palId = p.id; redraw(); closeSheet(); });
      });
      host.appendChild(wrap);

      var mine = el("div", "mk-mine");
      mine.appendChild(el("h3", "mk-h3", "우리 기관 색으로"));
      var row = el("div", "mk-mine-row");
      var keys = ["bg", 0, 1, 2, 3];
      keys.forEach(function (k) {
        var inp = document.createElement("input");
        inp.type = "color";
        inp.value = k === "bg" ? mix.bg : (mix.ink[k] || "#ffffff");
        inp.setAttribute("aria-label", k === "bg" ? "바탕색" : "빛깔 " + k);
        inp.addEventListener("input", function () {
          if (k === "bg") mix.bg = inp.value; else mix.ink[k] = inp.value;
          palId = MIX_ID; redraw();
        });
        row.appendChild(inp);
      });
      mine.appendChild(row);
      var hexRow = el("div", "mk-mine-hex");
      var hex = document.createElement("input");
      hex.type = "text";
      hex.placeholder = "#0d1420 #ffd6e7 #ffb3d1 … 붙여넣기";
      hex.addEventListener("change", function () {
        var got = String(hex.value).match(/#?[0-9a-fA-F]{6}/g) || [];
        if (!got.length) return;
        got = got.map(function (h) { return h[0] === "#" ? h : "#" + h; });
        mix.bg = got[0];
        mix.ink = got.slice(1).concat(mix.ink).slice(0, 5);
        palId = MIX_ID;
        redraw();
        closeSheet();
      });
      hexRow.appendChild(hex);
      mine.appendChild(hexRow);
      note(mine, "브랜드 색 코드를 그대로 붙여넣으셔도 됩니다. 맨 앞이 바탕색입니다.");
      host.appendChild(mine);
    } };

    /* ③ 규격 — 숫자가 아니라 "어디에 거는가"로 고른다 */
    BUILD.size = { title: "어느 화면에 거시나요", build: function (host) {
      note(host, "규격을 바꾸면 그 비율에 어울리는 화면으로 다시 그립니다. 늘려 붙이는 것이 아닙니다.");
      chips(host, SIZES.map(function (s, i) {
        return { i: i, ko: s.ko, sub: s.w + "×" + s.h + (s.wrap ? " · 모서리에서 " + s.wrap + "쪽" : "") };
      }), function (it) { return it.i === sizeIx; },
        function (it) { sizeIx = it.i; fit(); spin(); closeSheet(); });
    } };

    /* ④ 더 손보기 — 원하는 분만. 처음부터 들이밀면 "네가 정해라"가 된다. */
    BUILD.tune = { title: "더 손보기", build: function (host) {
      note(host, "안 건드리시면 화면에 어울리는 값이 저절로 들어갑니다. 건드린 자리만 그 값이 이깁니다.");
      var groups = [["움직임", MOVE_KNOBS], ["질감", TEX_KNOBS]];
      groups.forEach(function (g) {
        host.appendChild(el("h3", "mk-h3", g[0]));
        g[1].forEach(function (k) {
          var line = el("label", "mk-knob");
          var head = el("span", "mk-knob-head");
          head.appendChild(el("b", null, k.ko));
          var val = el("span", "mk-knob-val", tune[k.id] == null ? "저절로" : String(tune[k.id]));
          head.appendChild(val);
          line.appendChild(head);
          var r = document.createElement("input");
          r.type = "range"; r.min = 0; r.max = 100; r.step = 1;
          r.value = tune[k.id] == null ? 50 : tune[k.id];
          r.setAttribute("aria-label", k.ko + " · " + k.help);
          r.addEventListener("input", function () {
            tune[k.id] = +r.value;
            val.textContent = r.value;
            redraw();
          });
          line.appendChild(r);
          line.appendChild(el("span", "mk-knob-help", k.help));
          host.appendChild(line);
        });
      });
      var reset = el("button", "mk-btn", "전부 저절로로 되돌리기");
      reset.type = "button";
      reset.addEventListener("click", function () { tune = {}; redraw(); closeSheet(); });
      host.appendChild(reset);
    } };

    /* ⑤ 내 데이터 ──────────────────────────────────────────── */
    BUILD.live = { title: "내 데이터로 움직이기", build: function (host) {
      var KITAPI = global.BomnalApiKit;
      note(host, "우리 지역의 실시간 값을 그림에 물립니다. 값이 높을수록 화면이 빽빽하고 빠르게 움직입니다. "
                + "인증키는 이 브라우저 밖으로 나가지 않습니다 — 우리 서버로도 보내지 않습니다.");

      /* ㉠ 지금 바로 — 인증키 없이 브라우저에서 바로 불리는 것 */
      host.appendChild(el("h3", "mk-h3", "지금 바로 · 인증키 없이"));
      var row = el("div", "mk-live-row");
      var sel = document.createElement("select");
      sel.setAttribute("aria-label", "지역");
      (KITAPI ? KITAPI.PLACES : []).forEach(function (grp) {
        var og = document.createElement("optgroup");
        og.label = grp[0];
        grp[1].forEach(function (p) {
          var o = document.createElement("option");
          o.value = p[1] + "," + p[2];
          o.textContent = grp[0].replace(/(광역시|특별시|그 밖)/, "") + " " + p[0];
          o.dataset.ko = o.textContent.trim();
          og.appendChild(o);
        });
        sel.appendChild(og);
      });
      if (live.place) sel.value = live.place.v;
      row.appendChild(sel);
      host.appendChild(row);

      chips(host, FIELDS.map(function (f) { return { id: f.id, ko: f.ko }; }),
        function (it) { return it.id === live.field; },
        function (it) { live.field = it.id; pull(); });

      var out = el("p", "mk-live-out", live.on && live.val != null
        ? live.place.ko + " " + fieldOf(live.field).ko + " " + live.val + fieldOf(live.field).unit
        : "지역을 고르고 값을 누르면 지금 값이 들어옵니다.");
      host.appendChild(out);

      var acts = el("div", "mk-live-acts");
      var go = el("button", "mk-btn is-primary", "지금 값 불러와 물리기");
      go.type = "button";
      go.addEventListener("click", pull);
      acts.appendChild(go);
      var off = el("button", "mk-btn", "떼어내기");
      off.type = "button";
      off.addEventListener("click", function () {
        live.on = false; live.val = null; live.norm = null;
        out.textContent = "떼어냈습니다. 화면은 저절로 값으로 돌아갑니다.";
        redraw();
      });
      acts.appendChild(off);
      host.appendChild(acts);

      function pull() {
        if (!KITAPI) { out.textContent = "지역표를 불러오지 못했습니다."; return; }
        var o = sel.options[sel.selectedIndex];
        if (!o) return;
        var ll = o.value.split(",");
        var f = fieldOf(live.field);
        var u = KITAPI.urls(ll[0], ll[1]);
        out.textContent = "불러오는 중…";
        fetch(u[f.src === "air" ? "air" : "weather"])
          .then(function (r) { return r.json(); })
          .then(function (j) {
            var v = j && j.current ? j.current[f.id] : null;
            if (v == null) throw new Error("no value");
            live.on = true;
            live.place = { ko: o.dataset.ko || o.textContent, v: o.value };
            live.val = v;
            live.norm = Math.max(0, Math.min(1, (v - f.lo) / (f.hi - f.lo)));
            out.textContent = live.place.ko + " " + f.ko + " " + v + f.unit
              + " · 화면에 물렸습니다";
            redraw();
          })
          .catch(function () {
            out.textContent = "지금은 값을 못 불러왔습니다. 잠시 뒤 다시 눌러 주세요.";
          });
      }

      /* ㉡ 우리 기관 자료 — 인증키가 필요한 쪽. 되는 척하지 않는다. */
      host.appendChild(el("h3", "mk-h3", "우리 기관 자료 · 인증키가 있는 API"));
      note(host, "공공데이터포털(data.go.kr) 인증키 API와 기관 내부 시스템은 브라우저에서 바로 못 부릅니다"
                + "(CORS). 아래에 넣어 보시면 되는지 여기서 바로 확인해 드리고, 막히면 납품 때 "
                + "서버 중계를 한 겹 둡니다. 중계 구간은 기관 자료가 밖으로 나가지 않도록 기관 정책에 맞춰 설계합니다.");
      var krow = el("div", "mk-live-row mk-live-col");
      var kUrl = document.createElement("input");
      kUrl.type = "url";
      kUrl.placeholder = "https://apis.data.go.kr/... (주소)";
      kUrl.setAttribute("aria-label", "API 주소");
      var kKey = document.createElement("input");
      kKey.type = "text";
      kKey.placeholder = "인증키 (이 브라우저에만 남습니다)";
      kKey.setAttribute("aria-label", "인증키");
      try {
        kUrl.value = localStorage.getItem("bomnal.make.url") || "";
        kKey.value = localStorage.getItem("bomnal.make.key") || "";
      } catch (e) { /* 막혀 있으면 빈 채로 둔다 */ }
      krow.appendChild(kUrl);
      krow.appendChild(kKey);
      host.appendChild(krow);
      var kOut = el("p", "mk-live-out", "");
      host.appendChild(kOut);
      var kGo = el("button", "mk-btn", "여기서 불러보기");
      kGo.type = "button";
      kGo.addEventListener("click", function () {
        var u = String(kUrl.value || "").trim();
        if (!/^https:\/\//.test(u)) { kOut.textContent = "https:// 로 시작하는 주소를 넣어 주세요."; return; }
        try {
          localStorage.setItem("bomnal.make.url", u);
          localStorage.setItem("bomnal.make.key", String(kKey.value || ""));
        } catch (e) { /* 안 되면 저장만 안 한다 */ }
        var full = u + (u.indexOf("?") < 0 ? "?" : "&")
                 + "serviceKey=" + encodeURIComponent(String(kKey.value || ""));
        kOut.textContent = "불러오는 중…";
        fetch(full)
          .then(function (r) { return r.text(); })
          .then(function (t) {
            var n = (t.match(/-?\d+(\.\d+)?/) || [])[0];
            kOut.textContent = n != null
              ? "불렸습니다. 첫 숫자 " + n + " 를 읽었습니다. 어느 값을 쓸지는 납품 때 함께 정합니다."
              : "불리기는 했는데 숫자를 못 찾았습니다. 응답 모양을 보내 주시면 맞춰 드립니다.";
          })
          .catch(function () {
            kOut.textContent = "브라우저에서 직접은 막혔습니다(CORS). 이 API는 납품 때 서버 중계를 한 겹 두면 됩니다. "
                             + "아래 “이 화면 받기”에 주소만 적어 보내 주세요 — 인증키는 보내지 마세요.";
          });
      });
      host.appendChild(kGo);

      note(host, "물려서 납품하시면, 플레이어가 켜질 때마다 그 시각의 값으로 다시 그립니다. "
               + "영상 파일로만 받으시면 만드신 시점의 값으로 굳습니다.");
    } };

    /* ⑥ 이 화면 받기 — 무료로 가져가는 길과 값을 받는 길을 한 자리에 */
    BUILD.get = { title: "이 화면 받기", build: function (host) {
      if (!shot) { note(host, "화면을 먼저 만들어 주세요."); return; }
      var sz = SIZES[sizeIx];
      var num = KIT.code(shot.idx, shot.seed);
      var sh = KIT.sheetOf(shot, sz, liveTune(tune));

      var head = el("div", "mk-get-head");
      head.appendChild(el("b", null, num));
      head.appendChild(el("span", null, sz.ko + " · " + sz.w + "×" + sz.h));
      host.appendChild(head);

      /* 무료 — 지금 바로 */
      host.appendChild(el("h3", "mk-h3", "무료로 지금"));
      var free = el("div", "mk-get-row");
      var png = el("button", "mk-btn", "PNG 내려받기 (시연본 도장)");
      png.type = "button";
      png.addEventListener("click", function () {
        var a = document.createElement("a");
        a.href = elCanvas.toDataURL("image/png");
        a.download = num + ".png";
        a.click();
      });
      free.appendChild(png);
      var play = el("a", "mk-btn", "전체 화면으로 틀어 보기");
      play.href = "./play?code=" + num + "&w=" + sz.w + "&h=" + sz.h
                + (shot.forced ? "&style=" + encodeURIComponent(KIT.bare(shot.style)) : "");
      play.target = "_blank";
      play.rel = "noopener";
      free.appendChild(play);
      host.appendChild(free);
      note(host, "만들고 보시는 것은 전부 무료입니다. PNG에는 시연본 도장이 찍혀 나갑니다.");

      /* 값을 받는 것 — 정찰가를 그대로 적는다 */
      host.appendChild(el("h3", "mk-h3", "값을 받는 것"));
      var tbl = el("div", "mk-price");
      [["도장 없는 4K 영상 1편", "100만원", "확정 후 평일 24시간 이내"],
       ["사계절 4편", "390만원", "가장 많이 찾는 구성"],
       ["1년 10편 커스텀", "900만원", "편당 90만원 · 기관 색·로고 템플릿 등록"],
       ["전용 플레이어 (라즈베리파이 5)", "150만원", "HDMI만 꽂으면 켤 때마다 저절로 재생"],
       ["미디어아트 박스 대여", "기본 3일 500만원", "콘텐츠 제작·설치·철거 포함"]].forEach(function (r) {
        var line = el("div", "mk-price-row");
        line.appendChild(el("b", null, r[0]));
        line.appendChild(el("span", "mk-price-val", r[1]));
        line.appendChild(el("span", "mk-price-sub", r[2]));
        tbl.appendChild(line);
      });
      host.appendChild(tbl);
      note(host, "모든 금액은 부가세 별도입니다. LED 패널·전광판 설치와 빔프로젝터 미디어파사드 시공은 "
               + "벽면과 현장 조건에 따라 달라져 실측 후 산정합니다.");

      /* 보내기 — 이름과 이메일만 */
      var form = document.createElement("form");
      form.className = "mk-form";
      form.appendChild(el("h3", "mk-h3", "이 화면 그대로 보내기"));
      form.appendChild(el("p", "mk-note", "이름과 이메일만 적어 주세요. 위 설정이 그대로 실려 갑니다. "
        + "저희가 같은 번호로 뽑아 회신드립니다."));
      function field(label, name, type, req) {
        var l = el("label", "mk-field");
        l.appendChild(el("span", null, label));
        var i = document.createElement("input");
        i.type = type; i.name = name;
        if (req) i.required = true;
        l.appendChild(i);
        form.appendChild(l);
        return i;
      }
      field("이름 *", "name", "text", true);
      field("이메일 *", "email", "email", true);
      field("기관·상호", "organization", "text", false);
      field("연락처", "phone", "tel", false);
      /* 물릴 데이터 주소를 적어 보내실 자리. 인증키는 여기 적지 마시라고
         분명히 적는다 — 이 칸은 우리 메일로 그대로 간다. */
      var more = el("label", "mk-field");
      more.appendChild(el("span", null, "하고 싶은 말 · 물릴 데이터 주소 (인증키는 적지 마세요)"));
      var ta = document.createElement("textarea");
      ta.name = "note"; ta.rows = 3;
      ta.placeholder = "예) 로비 미디어월 한 대, 우리 도서관 대출 수 API 주소는 https://apis.data.go.kr/... 입니다";
      more.appendChild(ta);
      form.appendChild(more);
      var cons = el("label", "mk-consent");
      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.required = true; cb.name = "consent";
      cons.appendChild(cb);
      cons.appendChild(el("span", null,
        "(필수) 회신을 위해 이름·이메일·연락처를 수집하는 데 동의합니다. 회신이 끝나면 6개월 뒤 파기합니다."));
      form.appendChild(cons);
      var send = el("button", "mk-btn is-primary", "이 화면 보내기");
      send.type = "submit";
      form.appendChild(send);
      var msg = el("p", "mk-form-msg", "");
      msg.setAttribute("role", "status");
      msg.setAttribute("aria-live", "polite");
      form.appendChild(msg);

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var d = new FormData(form);
        var name = String(d.get("name") || "").trim();
        var email = String(d.get("email") || "").trim();
        if (!name || !email) { msg.textContent = "이름과 이메일을 적어 주세요."; return; }
        send.disabled = true;
        msg.textContent = "보내는 중…";
        fetch("/api/inquiry", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: name,
            email: email,
            phone: String(d.get("phone") || "").trim(),
            organization: String(d.get("organization") || "").trim(),
            service: ["미디어아트 제작 (봄날 만들기 · 손님이 만든 화면)"],
            page: "make",
            message: [
              "작품 번호: " + num,
              "결: " + TOOLS[kindIx].en + " (" + TOOLS[kindIx].ko + ")",
              "화면 규격: " + sz.ko + " " + sz.w + "×" + sz.h +
                (sz.wrap ? " (한 장으로 그려 모서리에서 " + sz.wrap + "쪽으로 자름)" : ""),
              "색: " + (palId || "저절로"),
              "손본 항목: " + (tuneCount() ? tuneCount() + "개" : "없음(저절로)"),
              /* 인증키는 절대 싣지 않는다. 주소와 "무엇을 물렸는지"만 적는다. */
              "하고 싶은 말: " + (String(d.get("note") || "").trim() || "-"),
              "실시간 값: " + (live.on && live.val != null
                ? live.place.ko + " " + fieldOf(live.field).ko + " " + live.val + fieldOf(live.field).unit
                  + " (Open-Meteo · 인증키 없음)"
                : "없음"),
              "",
              "재현용 파라미터:",
              sh,
              "",
              "  node tools/render-studio.mjs \"" + sh + "\" --name " + num + " --dur " + (tune.dur || 30),
              "",
              "[동의 기록] 개인정보 수집·이용: 동의함"
            ].join("\n")
          })
        })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
          .then(function () {
            msg.textContent = "보냈습니다. 평일 24시간 이내에 회신드립니다.";
            form.reset();
          })
          .catch(function () {
            send.disabled = false;
            msg.textContent = "보내지 못했습니다. help@publicbloom.art 로 작품 번호 " + num + " 를 적어 보내 주세요.";
          });
      });
      host.appendChild(form);

      /* 설정표 — 우리에게 전화로 불러 주실 분을 위해 */
      var det = document.createElement("details");
      det.className = "mk-sheetline";
      det.appendChild(el("summary", null, "설정표 (전화로 주문하실 때 이 줄을 불러 주세요)"));
      var pre = el("pre", null, sh);
      det.appendChild(pre);
      host.appendChild(det);
    } };

    /* ── 시작 ──────────────────────────────────────────────── */
    fit();
    spin();

    var rt;
    global.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { redraw(); }, 200);
    });
  });
})(window);
