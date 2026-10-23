/* 오늘은 봄날 TV
 *
 * 구독자 화면에서 몇 달씩 켜 두는 페이지다. 사람이 붙어 있지 않다고 보고 만든다.
 *
 *   1. Google 로그인(또는 입장 코드)으로 /api/tv 에 오늘의 작품을 묻는다
 *   2. 비메오 영상을 버튼·로고 없이 반복 재생한다 (background=1)
 *   3. 서울 자정이 지나면 다음 작품을 뒤에서 미리 띄워 두었다가 겹쳐 넘긴다
 *   4. 재생이 멈추면 스스로 다시 띄운다
 *   5. 화면 종류별 설정 — 이 기계에 저장되어 껐다 켜도 그대로다
 *        LED      화면 채우기 · 색 조절
 *        빔 1대    꼭짓점 4개 맞추기 · 가리개 · 색 조절
 *        빔 2대    두 화면에 나눠 쏘고 겹친 곳을 녹이기 · 화면별 꼭짓점·색 조절
 *
 * 조작: S 화면 설정 · 두 번 누르기/F 전체화면 · D 재생 상태
 */
(function () {
  "use strict";

  var GOOGLE_CLIENT_ID = "958687510814-g3lr95nt532ka52mbfagbgm4p8fvr473.apps.googleusercontent.com";
  var KEY_STORE = "bomnal.tv.key";
  var PROG_STORE = "bomnal.tv.program";
  var SCREEN_STORE = "bomnal.tv.screen";
  var SETUP_STORE = "bomnal.tv.setup.v1";
  var STALL_MS = 45000;          // 이만큼 재생이 멈춰 있으면 영상을 다시 띄운다
  var RECHECK_MS = 30 * 60000;   // 30분마다 구독 상태를 다시 본다 (해지된 화면을 끄려고)
  var VIMEO = "https://player.vimeo.com";

  var $ = function (q) { return document.querySelector(q); };
  var stage = $("[data-tv-stage]");
  var panel = $("[data-tv-panel]"), gate = $("[data-tv-gate]"), diag = $("[data-tv-diag]");
  var caption = $("[data-tv-caption]"), setupBox = $("[data-tv-setup]");
  var gateMsg = $("[data-tv-gate-msg]");

  var state = {
    key: "", program: null, playingId: "", active: 0, pending: null,
    lastTick: 0, readyAt: 0, ticked: false, reloads: 0, errors: [], screen: null,
    times: [{ t: 0, at: 0 }, { t: 0, at: 0 }], editing: false, editOut: 0,
  };

  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }

  /* ── 화면 설정 ─────────────────────────────────────────────
     좌표는 출력 구역 크기에 대한 비율(0~1)로 둔다. 해상도가 바뀌어도 그대로 맞는다. */
  function defaultOut() {
    return {
      corners: [[0, 0], [1, 0], [1, 1], [0, 1]],   // 왼쪽 위 · 오른쪽 위 · 오른쪽 아래 · 왼쪽 아래
      color: { bright: 100, contrast: 100, sat: 100, temp: 0 },
      masks: [],
    };
  }
  function defaultSetup(mode) {
    return { mode: mode || "led", overlap: 12, grid: false, outs: [defaultOut(), defaultOut()] };
  }
  var setup = (function () {
    try { var s = JSON.parse(load(SETUP_STORE)); if (s && s.outs && s.mode) return s; } catch (e) {}
    return null;
  })();
  function saveSetup() { store(SETUP_STORE, JSON.stringify(setup)); }
  function outCount() { return setup && setup.mode === "beam2" ? 2 : 1; }

  /* ── 출력 구역 ─────────────────────────────────────────────
     구역마다: 비틀리는 판(warp) 안에 영상 두 겹 + 격자 + 겹침 녹이기 + 색온도,
     그 위에 가리개와 꼭짓점 손잡이. */
  var outs = [];
  function el(cls, parent) { var d = document.createElement("div"); d.className = cls; if (parent) parent.appendChild(d); return d; }
  function buildOutputs() {
    stage.innerHTML = "";
    outs = [];
    for (var i = 0; i < outCount(); i++) {
      var o = el("tv-out", stage);
      var w = el("tv-warp", o);
      var l0 = el("tv-layer", w), l1 = el("tv-layer", w);
      var grid = el("tv-grid", w), blend = el("tv-blend", w), tint = el("tv-tint", w);
      var masks = el("tv-masks", o), handles = el("tv-handles", o);
      outs.push({ el: o, warp: w, layers: [l0, l1], grid: grid, blend: blend, tint: tint, masks: masks, handles: handles });
    }
    state.active = 0;
    state.playingId = "";
    state.pending = null;
    layout();
  }

  /* 네 꼭짓점으로 원근 변환(호모그래피) 행렬을 만든다. WebGL 없이 CSS 하나로 비튼다. */
  function adj(m) {
    return [m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
            m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
            m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3]];
  }
  function mul(a, b) {
    var c = [];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
      var s = 0; for (var k = 0; k < 3; k++) s += a[3*i+k] * b[3*k+j]; c[3*i+j] = s;
    }
    return c;
  }
  function mulv(m, v) { return [m[0]*v[0]+m[1]*v[1]+m[2]*v[2], m[3]*v[0]+m[4]*v[1]+m[5]*v[2], m[6]*v[0]+m[7]*v[1]+m[8]*v[2]]; }
  function basis(p) {   // p: 네 점 (왼위, 오위, 왼아래, 오아래)
    var m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
    var v = mulv(adj(m), [p[3][0], p[3][1], 1]);
    return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
  }
  function matrix3d(w, h, dst) {
    var s = [[0, 0], [w, 0], [0, h], [w, h]];
    var d = [dst[0], dst[1], dst[3], dst[2]];   // 저장 순서(시계 방향)를 기저 순서로 바꾼다
    var t = mul(basis(d), adj(basis(s)));
    for (var i = 0; i < 9; i++) t[i] /= t[8];
    return "matrix3d(" + [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]].join(",") + ")";
  }

  /* 겹친 부분 녹이기. 프로젝터 빛은 감마가 있어 직선으로 줄이면 겹친 곳이 밝게 뜬다.
     두 화면의 빛을 더해 1이 되도록 감마(2.2)를 거꾸로 걸어 단계를 만든다. */
  function blendGradient(toRight) {
    var stops = [];
    for (var i = 0; i <= 10; i++) {
      var x = i / 10;                                   // 0 = 겹침 시작, 1 = 화면 가장자리
      var a = 1 - Math.pow(1 - x, 1 / 2.2);
      stops.push("rgba(0,0,0," + a.toFixed(3) + ") " + (x * 100) + "%");
    }
    return "linear-gradient(" + (toRight ? "to right" : "to left") + "," + stops.join(",") + ")";
  }

  function layout() {
    if (!setup || !outs.length) return;
    var W = window.innerWidth, H = window.innerHeight;
    var n = outs.length, ow = W / n;
    var ov = n > 1 ? Math.max(0, Math.min(30, setup.overlap)) / 100 : 0;
    var item = state.program && state.program.today;
    var aspect = item && item.ratio === "9:16" ? 9 / 16 : 16 / 9;
    var VW = ow * (n - (n - 1) * ov);                  // 두 화면이 함께 그리는 가상 화면 폭
    var fw, fh;                                         // 빈 띠 없이 채우는 영상 크기
    if (VW / H > aspect) { fw = VW; fh = VW / aspect; } else { fh = H; fw = H * aspect; }

    outs.forEach(function (o, i) {
      var cfg = setup.outs[i] || (setup.outs[i] = defaultOut());
      o.el.style.left = (i * ow) + "px"; o.el.style.width = ow + "px"; o.el.style.height = H + "px";
      o.warp.style.width = ow + "px"; o.warp.style.height = H + "px";
      var dst = cfg.corners.map(function (c) { return [c[0] * ow, c[1] * H]; });
      o.warp.style.transform = setup.mode === "led" ? "none" : matrix3d(ow, H, dst);

      var shift = i * ow * (1 - ov);                    // 이 구역이 가상 화면의 어디부터 보여 주는지
      Array.prototype.forEach.call(o.warp.querySelectorAll("iframe, video"), function (f) {
        f.style.width = fw + "px"; f.style.height = fh + "px";
        f.style.left = ((VW - fw) / 2 - shift) + "px"; f.style.top = ((H - fh) / 2) + "px";
      });

      var c = cfg.color;
      o.warp.style.filter = "brightness(" + c.bright / 100 + ") contrast(" + c.contrast / 100 + ") saturate(" + c.sat / 100 + ")";
      var u = Math.abs(c.temp);
      o.tint.style.background = c.temp >= 0
        ? "rgb(255," + Math.round(255 - 0.6 * u) + "," + Math.round(255 - 1.5 * u) + ")"
        : "rgb(" + Math.round(255 - 1.5 * u) + "," + Math.round(255 - 0.6 * u) + ",255)";
      o.tint.hidden = c.temp === 0;

      o.blend.hidden = !(n > 1 && ov > 0);
      if (!o.blend.hidden) {
        var bw = ow * ov;
        o.blend.style.width = bw + "px";
        o.blend.style.left = i === 0 ? (ow - bw) + "px" : "0px";
        o.blend.style.background = blendGradient(i === 0);
      }
      o.grid.hidden = !(setup.grid && state.editing);

      renderMasks(o, cfg, ow, H);
      renderHandles(o, cfg, i, ow, H);
    });
  }
  window.addEventListener("resize", layout);

  /* 가리개 — 창문·기둥·간판 자리를 검게 뺀다. 프로젝터 화면 기준이라 비틀림과 따로 논다. */
  function renderMasks(o, cfg, ow, H) {
    o.masks.innerHTML = "";
    cfg.masks.forEach(function (m, mi) {
      var d = el("tv-mask", o.masks);
      d.style.left = m.x * ow + "px"; d.style.top = m.y * H + "px";
      d.style.width = m.w * ow + "px"; d.style.height = m.h * H + "px";
      if (!state.editing) return;
      var grip = document.createElement("span"); grip.className = "tv-mask-grip"; d.appendChild(grip);
      drag(d, function (dx, dy, resize) {
        if (resize) { m.w = Math.max(0.02, m.w + dx / ow); m.h = Math.max(0.02, m.h + dy / H); }
        else { m.x += dx / ow; m.y += dy / H; }
        d.style.left = m.x * ow + "px"; d.style.top = m.y * H + "px";
        d.style.width = m.w * ow + "px"; d.style.height = m.h * H + "px";
      }, grip);
      d.addEventListener("dblclick", function (e) { e.stopPropagation(); cfg.masks.splice(mi, 1); saveSetup(); layout(); });
    });
  }

  /* 꼭짓점 손잡이 — 설정 중에, 빔 화면에서만 보인다. */
  var CORNER_NAMES = ["왼쪽 위", "오른쪽 위", "오른쪽 아래", "왼쪽 아래"];
  function renderHandles(o, cfg, i, ow, H) {
    o.handles.innerHTML = "";
    if (!state.editing || setup.mode === "led") return;
    cfg.corners.forEach(function (c, ci) {
      var h = document.createElement("span");
      h.className = "tv-handle" + (state.editOut === i ? " is-on" : "");
      h.style.left = c[0] * ow + "px"; h.style.top = c[1] * H + "px";
      h.title = CORNER_NAMES[ci];
      drag(h, function (dx, dy) {
        c[0] += dx / ow; c[1] += dy / H;
        h.style.left = c[0] * ow + "px"; h.style.top = c[1] * H + "px";
        o.warp.style.transform = matrix3d(ow, H, cfg.corners.map(function (p) { return [p[0] * ow, p[1] * H]; }));
      });
      o.handles.appendChild(h);
    });
  }

  function drag(target, onMove, resizeGrip) {
    target.addEventListener("pointerdown", function (e) {
      e.preventDefault(); e.stopPropagation();
      var resize = !!resizeGrip && e.target === resizeGrip;
      var x = e.clientX, y = e.clientY;
      target.setPointerCapture(e.pointerId);
      function mv(ev) { onMove(ev.clientX - x, ev.clientY - y, resize); x = ev.clientX; y = ev.clientY; }
      function up() {
        target.removeEventListener("pointermove", mv); target.removeEventListener("pointerup", up);
        saveSetup(); layout();
      }
      target.addEventListener("pointermove", mv); target.addEventListener("pointerup", up);
    });
  }

  /* ── 설정 판 ───────────────────────────────────────────── */
  var MODE_NAMES = { led: "LED · 모니터", beam1: "빔프로젝터 1대", beam2: "빔프로젝터 2대" };
  function renderSetup() {
    if (!setupBox || setupBox.hidden) return;
    var o = setup.outs[state.editOut] || setup.outs[0];
    var c = o.color;
    var beam = setup.mode !== "led";
    function seg(v) { return '<button type="button" data-mode="' + v + '" class="' + (setup.mode === v ? "is-on" : "") + '">' + MODE_NAMES[v] + '</button>'; }
    function outBtn(i) { return '<button type="button" data-out="' + i + '" class="' + (state.editOut === i ? "is-on" : "") + '">' + (i + 1) + '번 화면</button>'; }
    function slider(k, label, v, min, max, unit) {
      return '<label class="tv-slider"><span>' + label + ' <b>' + v + unit + '</b></span>' +
        '<input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" value="' + v + '"></label>';
    }
    setupBox.innerHTML =
      '<h2>화면 설정</h2>' +
      '<div class="tv-seg" role="group" aria-label="화면 종류">' + seg("led") + seg("beam1") + seg("beam2") + '</div>' +
      (setup.mode === "beam2"
        ? '<div class="tv-seg">' + outBtn(0) + outBtn(1) + '</div>' +
          slider("overlap", "두 화면이 겹치는 폭", setup.overlap, 0, 30, "%") +
          '<button type="button" class="tv-sbtn" data-act="span">두 화면에 걸쳐 창 띄우기</button>'
        : '') +
      (beam
        ? '<p class="tv-shint">화면 모서리의 동그라미를 끌어 벽 모양에 맞추세요.</p>' +
          '<div class="tv-srow"><button type="button" class="tv-sbtn" data-act="grid">' + (setup.grid ? "격자 끄기" : "격자 보기") + '</button>' +
          '<button type="button" class="tv-sbtn" data-act="reset">꼭짓점 처음으로</button></div>' +
          '<div class="tv-srow"><button type="button" class="tv-sbtn" data-act="mask">가리개 추가</button>' +
          '<button type="button" class="tv-sbtn" data-act="clearmask">가리개 모두 지우기</button></div>' +
          '<p class="tv-shint">가리개는 끌어서 옮기고, 오른쪽 아래 모서리로 크기를 바꾸고, 두 번 누르면 지웁니다.</p>'
        : '<p class="tv-shint">LED와 모니터는 화면을 빈틈없이 채웁니다. 색만 맞추면 됩니다.</p>') +
      '<h3>색' + (setup.mode === "beam2" ? " · " + (state.editOut + 1) + "번 화면" : "") + '</h3>' +
      slider("bright", "밝기", c.bright, 40, 160, "") +
      slider("contrast", "대비", c.contrast, 50, 150, "") +
      slider("sat", "채도", c.sat, 0, 200, "") +
      slider("temp", "색온도 (차갑게 ↔ 따뜻하게)", c.temp, -50, 50, "") +
      '<div class="tv-srow"><button type="button" class="tv-sbtn" data-act="colorreset">색 처음으로</button>' +
      '<button type="button" class="tv-sbtn is-primary" data-act="close">닫기</button></div>' +
      '<p class="tv-shint">설정은 이 기계에 바로 저장됩니다. 다시 열려면 S 키를 누르세요.</p>' +
      '<div class="tv-srow"><button type="button" class="tv-sbtn is-quiet" data-act="logout">로그아웃</button></div>';
  }

  if (setupBox) {
    setupBox.addEventListener("input", function (e) {
      var k = e.target.getAttribute("data-k"); if (!k) return;
      var v = +e.target.value;
      if (k === "overlap") setup.overlap = v; else setup.outs[state.editOut].color[k] = v;
      e.target.previousElementSibling.querySelector("b").textContent = v + (k === "overlap" ? "%" : "");
      layout(); saveSetup();
    });
    setupBox.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var mode = b.getAttribute("data-mode"), out = b.getAttribute("data-out"), act = b.getAttribute("data-act");
      var o = setup.outs[state.editOut];
      if (mode) {
        setup.mode = mode; state.editOut = 0; saveSetup(); buildOutputs();
        if (state.program) play(state.program.today);
      }
      else if (out != null) { state.editOut = +out; layout(); }
      else if (act === "grid") { setup.grid = !setup.grid; layout(); }
      else if (act === "reset") { o.corners = defaultOut().corners; layout(); }
      else if (act === "mask") { o.masks.push({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 }); layout(); }
      else if (act === "clearmask") { o.masks = []; layout(); }
      else if (act === "colorreset") { o.color = defaultOut().color; layout(); }
      else if (act === "span") { spanScreens(); }
      else if (act === "logout") { logout(); return; }
      else if (act === "close") { toggleSetup(false); return; }
      saveSetup(); renderSetup();
    });
  }

  function toggleSetup(on) {
    if (!setupBox || !setup) return;
    state.editing = on == null ? setupBox.hidden : on;
    setupBox.hidden = !state.editing;
    document.body.classList.toggle("is-editing", state.editing);
    if (state.editing) { panel.hidden = true; renderSetup(); }
    else if (!document.fullscreenElement) panel.hidden = false;
    layout();
  }

  /* 빔 2대: 연결된 두 화면에 걸친 창을 띄운다(크롬·엣지, 창 관리 권한).
     무인 상자는 이 버튼 대신 키오스크 실행 옵션으로 두 화면에 펼친다. */
  function spanScreens() {
    if (!("getScreenDetails" in window)) { note("이 브라우저는 화면 목록을 알려 주지 않습니다"); return; }
    window.getScreenDetails().then(function (d) {
      var s = d.screens.slice().sort(function (a, b) { return a.left - b.left; }).slice(0, 2);
      if (s.length < 2) { note("화면이 하나만 연결되어 있습니다"); return; }
      var left = s[0].left, top = Math.min(s[0].top, s[1].top);
      var width = s[1].left + s[1].width - s[0].left, height = Math.max(s[0].height, s[1].height);
      window.open(location.pathname, "bomnaltv",
        "popup,left=" + left + ",top=" + top + ",width=" + width + ",height=" + height);
    }).catch(function (e) { note("화면 목록 권한이 없습니다: " + e.message); });
  }

  /* ── 로그인 ─────────────────────────────────────────────── */
  function readKey() {
    var q = new URLSearchParams(location.search).get("k");
    if (q) { store(KEY_STORE, q.trim()); history.replaceState(null, "", location.pathname); return q.trim(); }
    return load(KEY_STORE);
  }

  function showGate(msg) {
    panel.hidden = true; gate.hidden = false;
    document.body.classList.remove("is-playing");
    if (msg) gateMsg.textContent = msg;
    mountGoogle();
  }

  var googleMounted = false;
  function mountGoogle() {
    var slot = $("[data-tv-google]");
    if (googleMounted || !slot) return;
    googleMounted = true;
    var s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = function () {
      if (!window.google || !google.accounts) return;
      google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onGoogle, auto_select: true });
      google.accounts.id.renderButton(slot, { theme: "filled_black", size: "large", shape: "pill", text: "signin_with", locale: "ko" });
    };
    s.onerror = function () { note("Google 로그인 스크립트를 받지 못함"); };
    document.head.appendChild(s);
  }

  function onGoogle(resp) {
    gateMsg.textContent = "확인하는 중…";
    fetch("/api/tv-login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ credential: resp.credential }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) {
          gateMsg.textContent = (res.d.error || "로그인하지 못했습니다.") + (res.d.email ? " (" + res.d.email + ")" : "");
          return;
        }
        gate.hidden = true;
        start();
      })
      .catch(function () { gateMsg.textContent = "연결이 원활하지 않습니다. 잠시 뒤 다시 시도해 주세요."; });
  }

  function logout() {
    fetch("/api/tv-login", { method: "DELETE" }).then(function () {}, function () {}).then(function () {
      store(KEY_STORE, null); store(PROG_STORE, null);
      if (window.google && google.accounts) google.accounts.id.disableAutoSelect();
      location.reload();
    });
  }

  $("[data-tv-gate-form]").addEventListener("submit", function (e) {
    e.preventDefault();
    var k = new FormData(e.target).get("k"); if (!k) return;
    state.key = String(k).trim(); store(KEY_STORE, state.key);
    gate.hidden = true; start();
  });

  /* ── 편성 ──────────────────────────────────────────────── */
  function fetchProgram() {
    var qs = [];
    if (state.key) qs.push("k=" + encodeURIComponent(state.key));
    var w = new URLSearchParams(location.search).get("w");   // 시연: /tv?w=light-jellyfish
    if (w) qs.push("w=" + encodeURIComponent(w));
    var url = "/api/tv" + (qs.length ? "?" + qs.join("&") : "");
    return fetch(url, { cache: "no-store", credentials: "same-origin" })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, status: r.status, data: d }; }); });
  }

  function apply(prog) {
    state.program = prog;
    store(PROG_STORE, JSON.stringify(prog));
    if (!setup) { setup = defaultSetup(prog.setup); saveSetup(); }
    if (!outs.length) buildOutputs();
    var t = prog.today;
    $("[data-tv-date]").textContent = (prog.name ? prog.name + " · " : "") + prog.date;
    $("[data-tv-title]").textContent = t.title;
    $("[data-tv-sub]").textContent = (t.kind === "ai" ? "AI 영상 · " : "") + "내일은 「" + prog.tomorrow.title + "」로 바뀝니다.";
    $("[data-tv-mode]").textContent = MODE_NAMES[setup.mode] + " 설정";
    if (itemId(t) !== state.playingId) play(t);
    scheduleNextDay(prog.nextChangeAt);
  }

  function refresh(first) {
    return fetchProgram().then(function (res) {
      if (res.ok) { apply(res.data); return true; }
      if (res.status === 401 || res.status === 403) {
        stopAll(); store(KEY_STORE, null); state.key = ""; state.program = null;
        showGate(res.status === 403 ? res.data.error : null);
        return false;
      }
      throw new Error("server " + res.status);
    }).catch(function (e) {
      note("편성을 받지 못함: " + e.message);
      if (first && !state.program) { var c = load(PROG_STORE); if (c) { try { apply(JSON.parse(c)); } catch (x) {} } }
      return !!state.program;
    });
  }

  var dayTimer = 0;
  function scheduleNextDay(iso) {
    clearTimeout(dayTimer);
    var wait = new Date(iso).getTime() - Date.now();
    if (!(wait > 0)) wait = 60000;
    // 모든 화면이 같은 초에 서버를 두드리지 않게 1분 안에서 흩는다
    dayTimer = setTimeout(function () { refresh(false); }, wait + Math.floor(Math.random() * 60000));
  }

  /* ── 재생 ──────────────────────────────────────────────── */
  function embedUrl(id) {
    return VIMEO + "/video/" + encodeURIComponent(id) + "?background=1&loop=1&autopause=0&muted=1&dnt=1&quality=auto&playsinline=1";
  }

  /* 작품은 두 가지로 온다. vimeo(비메오 잠긴 영상) 또는 file(우리 사이트에 둔 mp4).
     파일은 남의 재생기 없이 <video> 로 바로 돌린다. 반복·음소거·자동재생. */
  function itemId(item) { return item ? (item.vimeo || item.file || "") : ""; }

  function videoEl(item, i, layer) {
    var v = document.createElement("video");
    v.src = item.file;
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.preload = "auto";
    v.setAttribute("aria-label", item.title);
    v.addEventListener("timeupdate", function () {
      if (state.pending && layer === state.pending.idx && i === 0) commit();
      if (layer === state.active) {
        state.times[i] = { t: v.currentTime, at: Date.now() };
        if (i === 0) { state.lastTick = Date.now(); state.ticked = true; }
      }
    });
    v.addEventListener("error", function () { note("영상 파일 오류: " + item.file); });
    var p = v.play(); if (p && p.catch) p.catch(function (e) { note("자동재생 막힘: " + e.message); });
    return v;
  }

  /* 다음 작품은 보이지 않는 겹에 구역마다 먼저 띄우고, 재생이 시작되면 겹쳐 넘긴다. */
  function play(item) {
    if (!outs.length) buildOutputs();
    var next = state.playingId ? 1 - state.active : state.active;
    var frames = outs.map(function (o, i) {
      var host = o.layers[next];
      host.innerHTML = "";
      var f;
      if (item.file) {
        f = videoEl(item, i, next);
      } else {
        f = document.createElement("iframe");
        f.src = embedUrl(item.vimeo);
        f.allow = "autoplay; fullscreen; picture-in-picture";
      }
      f.setAttribute("title", item.title + (outs.length > 1 ? " " + (i + 1) : ""));
      f.setAttribute("tabindex", "-1");
      host.appendChild(f);
      return f;
    });
    state.pending = { idx: next, item: item, frames: frames };
    layout();
    // 재생 신호가 오지 않아도 12초 뒤에는 넘긴다 (화면이 가려진 탭 등)
    setTimeout(function () { if (state.pending && state.pending.frames === frames) commit(); }, 12000);
  }

  function commit() {
    var p = state.pending; if (!p) return;
    state.pending = null;
    var prev = state.active;
    outs.forEach(function (o) {
      o.layers[p.idx].classList.add("is-on");
      if (prev !== p.idx) {
        var old = o.layers[prev];
        old.classList.remove("is-on");
        setTimeout(function () { if (!old.classList.contains("is-on")) old.innerHTML = ""; }, 3000);
      }
    });
    state.active = p.idx; state.playingId = itemId(p.item);
    state.lastTick = Date.now(); state.readyAt = Date.now(); state.ticked = false;
    state.times = [{ t: 0, at: 0 }, { t: 0, at: 0 }];
    showCaption(p.item);
  }

  function stopAll() {
    outs.forEach(function (o) { o.layers.forEach(function (l) { l.innerHTML = ""; l.classList.remove("is-on"); }); });
    state.playingId = ""; state.pending = null;
  }

  function reloadCurrent(why) {
    var t = state.program && state.program.today; if (!t) return;
    state.reloads += 1; note("다시 띄움: " + why); play(t);
  }

  var capTimer = 0;
  function showCaption(item) {
    caption.innerHTML = ""; caption.appendChild(document.createTextNode(item.title));
    if (item.kind === "ai") { var s = document.createElement("small"); s.textContent = "AI 영상"; caption.appendChild(s); }
    caption.hidden = false;
    requestAnimationFrame(function () { caption.classList.add("is-on"); });
    clearTimeout(capTimer); capTimer = setTimeout(function () { caption.classList.remove("is-on"); }, 8000);
  }

  function frameInfo(win) {
    for (var i = 0; i < outs.length; i++) for (var l = 0; l < 2; l++) {
      var f = outs[i].layers[l].querySelector("iframe");
      if (f && f.contentWindow === win) return { out: i, layer: l, frame: f };
    }
    return null;
  }
  function post(frame, method, value) {
    var msg = value === undefined ? { method: method } : { method: method, value: value };
    try { frame.contentWindow.postMessage(JSON.stringify(msg), VIMEO); } catch (e) {}
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== VIMEO) return;
    var d = e.data;
    if (typeof d === "string") { try { d = JSON.parse(d); } catch (x) { return; } }
    if (!d || !d.event) return;
    var info = frameInfo(e.source); if (!info) return;
    if (d.event === "ready") {
      ["timeupdate", "error"].forEach(function (ev) { post(info.frame, "addEventListener", ev); });
    } else if (d.event === "timeupdate") {
      if (state.pending && info.layer === state.pending.idx && info.out === 0) commit();
      if (info.layer === state.active) {
        state.times[info.out] = { t: (d.data && d.data.seconds) || 0, at: Date.now() };
        if (info.out === 0) { state.lastTick = Date.now(); state.ticked = true; }
      }
    } else if (d.event === "error") {
      note("비메오 오류: " + ((d.data && d.data.message) || "알 수 없음"));
    }
  });

  /* 빔 2대: 두 영상이 같은 순간을 보여야 겹친 곳이 두 겹으로 보이지 않는다.
     1번 화면을 기준으로 2번 화면이 0.12초 넘게 어긋나면 당긴다. */
  setInterval(function () {
    if (outs.length < 2 || !state.playingId) return;
    var a = state.times[0], b = state.times[1], now = Date.now();
    if (!a.at || !b.at || now - a.at > 2000 || now - b.at > 2000) return;
    var ta = a.t + (now - a.at) / 1000, tb = b.t + (now - b.at) / 1000;
    var v = outs[1].layers[state.active].querySelector("video");
    if (v) {
      // 파일은 15초마다 처음으로 돈다. 차이를 한 바퀴 안에서 잰다 (14.9초와 0.1초는 0.2초 차이)
      var dur = v.duration || 0; if (!dur) return;
      var d = Math.abs(ta - tb) % dur; d = Math.min(d, dur - d);
      if (d > 0.12) v.currentTime = (ta + 0.05) % dur;
      return;
    }
    if (Math.abs(ta - tb) > 0.12) {
      var f = outs[1].layers[state.active].querySelector("iframe");
      if (f) post(f, "setCurrentTime", ta + 0.05);
    }
  }, 4000);

  /* 감시: 재생 신호가 한 번이라도 온 뒤에만 멈춤을 판단한다 (가려진 탭은 신호를 안 보낸다) */
  setInterval(function () {
    if (!state.playingId || document.visibilityState !== "visible" || !state.ticked) return;
    if (Date.now() - state.readyAt < 30000) return;
    if (Date.now() - state.lastTick > STALL_MS) reloadCurrent("재생 멈춤");
  }, 10000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") state.lastTick = Date.now(); });
  setInterval(function () { if (state.program) refresh(false); }, RECHECK_MS);

  /* ── 화면 고르기 · 전체화면 ─────────────────────────────── */
  var screens = [];
  function canPick() { return "getScreenDetails" in window; }
  function screenId(s) { return s.label + "|" + s.width + "x" + s.height; }
  function listScreens() {
    return window.getScreenDetails().then(function (det) {
      screens = det.screens.slice().sort(function (a, b) { return a.left - b.left || a.top - b.top; });
      return screens;
    });
  }
  function renderScreens() {
    var ul = $("[data-tv-screens]"); ul.innerHTML = "";
    var saved = load(SCREEN_STORE);
    screens.forEach(function (s, i) {
      var li = document.createElement("li"), b = document.createElement("button");
      b.type = "button";
      if (screenId(s) === saved) b.classList.add("is-picked");
      b.innerHTML = "<span></span><small></small>";
      b.firstChild.textContent = (i + 1) + "번 화면" + (s.isPrimary ? " · 기본" : "");
      b.lastChild.textContent = (s.label ? s.label + " · " : "") + s.width + "×" + s.height;
      b.addEventListener("click", function () { store(SCREEN_STORE, screenId(s)); state.screen = s; goFullscreen(s); });
      li.appendChild(b); ul.appendChild(li);
    });
    ul.hidden = false;
  }
  function savedScreen() {
    var saved = load(SCREEN_STORE);
    for (var i = 0; i < screens.length; i++) if (screenId(screens[i]) === saved) return screens[i];
    return null;
  }
  function goFullscreen(scr) {
    var root = document.documentElement;
    var opts = scr ? { screen: scr, navigationUI: "hide" } : { navigationUI: "hide" };
    var p = root.requestFullscreen ? root.requestFullscreen(opts) : null;
    if (p && p.catch) p.catch(function (e) { note("전체화면 거부: " + e.message); });
    panel.hidden = true; document.body.classList.add("is-playing");
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else goFullscreen(state.screen || savedScreen());
  }
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement && state.program && gate.hidden && !state.editing) {
      panel.hidden = false; document.body.classList.remove("is-playing");
    }
  });
  document.addEventListener("dblclick", function () { if (!state.editing) toggleFullscreen(); });
  document.addEventListener("keydown", function (e) {
    if (e.target && e.target.tagName === "INPUT" && e.target.type !== "range") return;
    var k = e.key;
    if (k === "f" || k === "F" || k === "ㄹ") toggleFullscreen();
    else if (k === "d" || k === "D" || k === "ㅇ") { diag.hidden = !diag.hidden; renderDiag(); }
    else if (k === "s" || k === "S" || k === "ㄴ") { if (state.program) toggleSetup(); }
    else if (k === "Escape" && state.editing) toggleSetup(false);
  });

  $("[data-tv-go]").addEventListener("click", function () { goFullscreen(canPick() && screens.length ? savedScreen() : null); });
  $("[data-tv-setup-open]").addEventListener("click", function () { toggleSetup(true); });
  var pickBtn = $("[data-tv-pick]");
  if (canPick()) {
    pickBtn.hidden = false;
    pickBtn.addEventListener("click", function () {
      listScreens().then(renderScreens).catch(function (e) {
        note("화면 목록을 받지 못함: " + e.message);
        pickBtn.textContent = "화면 목록 권한을 허용해 주세요";
      });
    });
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "window-management" })
        .then(function (p) { if (p.state === "granted") listScreens().catch(function () {}); })
        .catch(function () {});
    }
  }

  /* ── 상태 보기 (D) ─────────────────────────────────────── */
  function note(m) {
    state.errors.unshift(new Date().toTimeString().slice(0, 8) + " " + m);
    state.errors = state.errors.slice(0, 8);
    if (window.console) console.warn("[tv]", m);
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function renderDiag() {
    if (diag.hidden) return;
    var p = state.program || {};
    var row = function (a, b) { return "<div><span>" + a + "</span><b>" + b + "</b></div>"; };
    diag.innerHTML =
      row("구독", esc(p.name || "-")) +
      row("로그인", p.via === "google" ? esc(p.email) : (p.via === "key" ? "입장 코드" : "-")) +
      row("화면 설정", setup ? MODE_NAMES[setup.mode] : "-") +
      row("오늘", esc(p.today ? p.today.title : "-")) +
      row("내일", esc(p.tomorrow ? p.tomorrow.title : "-")) +
      row("재생 신호", state.lastTick ? Math.round((Date.now() - state.lastTick) / 1000) + "초 전" : "-") +
      (outs.length > 1 && state.times[1].at ? row("두 화면 차이", Math.abs(state.times[0].t - state.times[1].t).toFixed(2) + "초") : "") +
      row("다시 띄운 횟수", state.reloads) +
      row("연결", navigator.onLine ? "온라인" : "오프라인") +
      (state.errors.length ? "<p>" + state.errors.map(esc).join("<br>") + "</p>" : "");
  }
  setInterval(renderDiag, 1000);

  /* ── 시작 ──────────────────────────────────────────────── */
  function start() {
    panel.hidden = false;
    refresh(true).then(function (ok) {
      if (!ok && !state.program && gate.hidden) $("[data-tv-title]").textContent = "작품을 불러오지 못했습니다";
    });
  }

  state.key = readKey();
  start();   // 로그인 쿠키가 있으면 바로 돈다. 없으면 /api/tv 가 401 을 주고 로그인 화면이 뜬다.
})();
