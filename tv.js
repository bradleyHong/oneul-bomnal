/* 오늘은 봄날 TV
 *
 * 구독자 화면에서 몇 달씩 켜 두는 페이지다. 사람이 붙어 있지 않다고 보고 만든다.
 *
 *   1. 입장 열쇠(?k=)로 /api/tv 에 오늘의 작품을 묻는다. 열쇠는 이 브라우저에 기억한다
 *   2. 비메오 영상을 버튼·로고 없이 반복 재생한다 (background=1)
 *   3. 서울 자정이 지나면 다음 작품을 뒤에서 미리 띄워 두었다가 겹쳐 넘긴다
 *   4. 재생이 멈추면 스스로 다시 띄운다. 인터넷이 잠깐 끊겨도 마지막 작품은 계속 돈다
 *   5. 여러 화면(HDMI 2·3번)이 꽂혀 있으면 어느 화면에 띄울지 고른다
 *
 * 조작: 두 번 누르기 = 전체화면 켜고 끄기 · F 전체화면 · D 상태 보기
 */
(function () {
  "use strict";

  var KEY_STORE = "bomnal.tv.key";
  var PROG_STORE = "bomnal.tv.program";
  var SCREEN_STORE = "bomnal.tv.screen";
  var STALL_MS = 45000;          // 이만큼 재생이 멈춰 있으면 영상을 다시 띄운다
  var RECHECK_MS = 30 * 60000;   // 30분마다 구독 상태를 다시 본다 (해지된 화면을 끄려고)
  var VIMEO = "https://player.vimeo.com";

  var $ = function (q) { return document.querySelector(q); };
  var layers = Array.prototype.slice.call(document.querySelectorAll("[data-tv-layer]"));
  var panel = $("[data-tv-panel]"), gate = $("[data-tv-gate]"), diag = $("[data-tv-diag]");
  var caption = $("[data-tv-caption]");

  var state = {
    key: "", program: null, active: 0, playingId: "",
    lastTick: 0, readyAt: 0, ticked: false, reloads: 0, errors: [], screen: null,
  };

  /* ── 열쇠 ──────────────────────────────────────────────── */
  function store(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }

  function readKey() {
    var q = new URLSearchParams(location.search).get("k");
    if (q) {
      store(KEY_STORE, q.trim());
      // 주소창에 열쇠를 남겨 두지 않는다. 옆 사람이 화면 사진을 찍어도 새지 않게.
      history.replaceState(null, "", location.pathname);
      return q.trim();
    }
    return load(KEY_STORE);
  }

  /* ── 편성 받아 오기 ────────────────────────────────────── */
  function fetchProgram() {
    return fetch("/api/tv?k=" + encodeURIComponent(state.key), { cache: "no-store" })
      .then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, status: r.status, data: d }; });
      });
  }

  function apply(prog) {
    state.program = prog;
    store(PROG_STORE, JSON.stringify(prog));
    var t = prog.today;
    $("[data-tv-date]").textContent = (prog.name ? prog.name + " · " : "") + prog.date;
    $("[data-tv-title]").textContent = t.title;
    $("[data-tv-sub]").textContent =
      (t.kind === "ai" ? "AI 영상 · " : "") + "내일은 「" + prog.tomorrow.title + "」로 바뀝니다.";
    if (t.vimeo !== state.playingId) play(t);
    scheduleNextDay(prog.nextChangeAt);
  }

  function refresh(first) {
    return fetchProgram().then(function (res) {
      if (res.ok) { apply(res.data); return true; }
      if (res.status === 401 || res.status === 403) {
        // 열쇠가 틀렸거나 구독이 끝났다. 화면을 멈추고 입장 화면으로 돌린다.
        stopAll();
        showGate(res.data && res.data.error);
        return false;
      }
      throw new Error("server " + res.status);
    }).catch(function (e) {
      note("편성을 받지 못함: " + e.message);
      // 인터넷이 끊겼다. 처음 켜진 것이면 마지막으로 받아 둔 편성으로 돈다.
      if (first) {
        var cached = load(PROG_STORE);
        if (cached) { try { apply(JSON.parse(cached)); } catch (x) {} }
      }
      return !!state.program;
    });
  }

  var dayTimer = 0;
  function scheduleNextDay(iso) {
    clearTimeout(dayTimer);
    var wait = new Date(iso).getTime() - Date.now();
    if (!(wait > 0)) wait = 60000;
    // 모든 화면이 같은 초에 몰려 묻지 않게 1분 안에서 흩는다
    dayTimer = setTimeout(function () { refresh(false); }, wait + Math.floor(Math.random() * 60000));
  }

  /* ── 재생 ──────────────────────────────────────────────── */
  function embedUrl(id) {
    return VIMEO + "/video/" + encodeURIComponent(id) +
      "?background=1&loop=1&autopause=0&muted=1&dnt=1&quality=auto&playsinline=1";
  }

  /* 다음 작품은 보이지 않는 겹에 먼저 띄우고, 재생이 시작된 뒤에 겹쳐 넘긴다.
     먼저 바꾸면 영상을 받는 동안 검은 화면이 로비에 걸린다. */
  function play(item) {
    var next = 1 - state.active;
    var host = layers[next];
    host.innerHTML = "";
    host.classList.toggle("is-portrait", item.ratio === "9:16");
    var f = document.createElement("iframe");
    f.src = embedUrl(item.vimeo);
    f.allow = "autoplay; fullscreen; picture-in-picture";
    f.setAttribute("title", item.title);
    f.setAttribute("tabindex", "-1");
    host.appendChild(f);
    host.dataset.vimeo = item.vimeo;
    state.pending = { idx: next, item: item, frame: f, at: Date.now() };
    // 비메오가 신호를 못 보내는 환경을 대비해 12초 뒤에는 그냥 넘긴다
    setTimeout(function () { if (state.pending && state.pending.frame === f) commit(); }, 12000);
  }

  function commit() {
    var p = state.pending;
    if (!p) return;
    state.pending = null;
    layers[p.idx].classList.add("is-on");
    layers[state.active].classList.remove("is-on");
    var old = layers[state.active];
    setTimeout(function () { if (!old.classList.contains("is-on")) old.innerHTML = ""; }, 3000);
    state.active = p.idx;
    state.playingId = p.item.vimeo;
    state.lastTick = Date.now();
    state.readyAt = Date.now();
    state.ticked = false;
    showCaption(p.item);
  }

  function stopAll() {
    layers.forEach(function (l) { l.innerHTML = ""; l.classList.remove("is-on"); });
    state.playingId = "";
  }

  function reloadCurrent(why) {
    var t = state.program && state.program.today;
    if (!t) return;
    state.reloads += 1;
    note("다시 띄움: " + why);
    state.playingId = "";
    play(t);
  }

  var capTimer = 0;
  function showCaption(item) {
    caption.innerHTML = "";
    caption.appendChild(document.createTextNode(item.title));
    if (item.kind === "ai") {
      var s = document.createElement("small"); s.textContent = "AI 영상"; caption.appendChild(s);
    }
    caption.hidden = false;
    requestAnimationFrame(function () { caption.classList.add("is-on"); });
    clearTimeout(capTimer);
    capTimer = setTimeout(function () { caption.classList.remove("is-on"); }, 8000);
  }

  /* 비메오가 보내는 신호를 듣는다. 재생 시간이 흐르는 동안이 살아 있는 것이다. */
  window.addEventListener("message", function (e) {
    if (e.origin !== VIMEO) return;
    var d = e.data;
    if (typeof d === "string") { try { d = JSON.parse(d); } catch (x) { return; } }
    if (!d || !d.event) return;
    var src = e.source;
    if (d.event === "ready") {
      ["timeupdate", "error"].forEach(function (ev) {
        src.postMessage(JSON.stringify({ method: "addEventListener", value: ev }), VIMEO);
      });
    } else if (d.event === "timeupdate") {
      if (state.pending && state.pending.frame.contentWindow === src) commit();
      if (layers[state.active].querySelector("iframe") &&
          layers[state.active].querySelector("iframe").contentWindow === src) { state.lastTick = Date.now(); state.ticked = true; }
    } else if (d.event === "error") {
      note("비메오 오류: " + ((d.data && d.data.message) || "알 수 없음"));
    }
  });

  setInterval(function () {
    if (!state.playingId || document.visibilityState !== "visible") return;
    /* 신호를 한 번도 받지 못한 화면은 감시하지 않는다. 신호를 못 보내는 환경에서
       멀쩡히 도는 영상을 1분마다 다시 띄우는 것이 멈춘 화면보다 더 나쁘다. */
    if (!state.ticked) return;
    if (Date.now() - state.readyAt < 30000) return;
    if (Date.now() - state.lastTick > STALL_MS) reloadCurrent("재생 멈춤");
  }, 10000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") state.lastTick = Date.now();
  });
  setInterval(function () { if (state.key) refresh(false); }, RECHECK_MS);

  /* ── 화면 고르기 (HDMI 2·3번) ─────────────────────────────
     크롬·엣지는 연결된 화면 목록을 알려 준다(창 관리 권한). 고른 화면은
     기억해 두었다가 다음에 '화면 켜기'를 누르면 그 화면에 띄운다. */
  var screens = [];
  function canPick() { return "getScreenDetails" in window; }

  function listScreens() {
    return window.getScreenDetails().then(function (det) {
      screens = det.screens.slice().sort(function (a, b) { return a.left - b.left || a.top - b.top; });
      return screens;
    });
  }

  function screenName(s, i) {
    return (i + 1) + "번 화면" + (s.isPrimary ? " · 기본" : "");
  }

  function renderScreens() {
    var ul = $("[data-tv-screens]");
    ul.innerHTML = "";
    var saved = load(SCREEN_STORE);
    screens.forEach(function (s, i) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      var id = s.label + "|" + s.width + "x" + s.height;
      if (id === saved) b.classList.add("is-picked");
      b.innerHTML = "<span></span><small></small>";
      b.firstChild.textContent = screenName(s, i);
      b.lastChild.textContent = (s.label ? s.label + " · " : "") + s.width + "×" + s.height;
      b.addEventListener("click", function () {
        store(SCREEN_STORE, id);
        state.screen = s;
        goFullscreen(s);
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
    ul.hidden = false;
  }

  function savedScreen() {
    var saved = load(SCREEN_STORE);
    if (!saved || !screens.length) return null;
    for (var i = 0; i < screens.length; i++) {
      if (screens[i].label + "|" + screens[i].width + "x" + screens[i].height === saved) return screens[i];
    }
    return null;
  }

  /* ── 전체화면 ──────────────────────────────────────────── */
  function goFullscreen(scr) {
    var el = document.documentElement;
    var opts = scr ? { screen: scr, navigationUI: "hide" } : { navigationUI: "hide" };
    var p = el.requestFullscreen ? el.requestFullscreen(opts) : null;
    if (p && p.catch) p.catch(function (e) { note("전체화면 거부: " + e.message); });
    panel.hidden = true;
    document.body.classList.add("is-playing");
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else goFullscreen(state.screen || savedScreen());
  }

  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement && state.program && gate.hidden) {
      // 전체화면이 풀리면 처음 화면을 다시 보여 준다. 작품은 그 뒤에서 계속 돈다.
      panel.hidden = false;
      document.body.classList.remove("is-playing");
    }
  });
  document.addEventListener("dblclick", toggleFullscreen);
  document.addEventListener("keydown", function (e) {
    if (e.target && e.target.tagName === "INPUT") return;
    if (e.key === "f" || e.key === "F" || e.key === "ㄹ") toggleFullscreen();
    if (e.key === "d" || e.key === "D" || e.key === "ㅇ") { diag.hidden = !diag.hidden; renderDiag(); }
  });

  $("[data-tv-go]").addEventListener("click", function () {
    if (canPick() && screens.length) goFullscreen(savedScreen());
    else goFullscreen(null);
  });

  var pickBtn = $("[data-tv-pick]");
  if (canPick()) {
    pickBtn.hidden = false;
    pickBtn.addEventListener("click", function () {
      listScreens().then(renderScreens).catch(function (e) {
        note("화면 목록을 받지 못함: " + e.message);
        pickBtn.textContent = "화면 목록 권한을 허용해 주세요";
      });
    });
    // 이미 허용해 둔 기계라면 묻지 않고 목록을 미리 받아 둔다
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "window-management" }).then(function (p) {
        if (p.state === "granted") listScreens().catch(function () {});
      }).catch(function () {});
    }
  }

  /* ── 입장 화면 ─────────────────────────────────────────── */
  function showGate(msg) {
    panel.hidden = true;
    gate.hidden = false;
    document.body.classList.remove("is-playing");
    if (msg) $("[data-tv-gate-msg]").textContent = msg;
    store(KEY_STORE, null);
  }
  $("[data-tv-gate-form]").addEventListener("submit", function (e) {
    e.preventDefault();
    var k = new FormData(e.target).get("k");
    if (!k) return;
    state.key = String(k).trim();
    store(KEY_STORE, state.key);
    gate.hidden = true;
    start();
  });

  /* ── 상태 보기 (D) ─────────────────────────────────────── */
  function note(m) {
    state.errors.unshift(new Date().toTimeString().slice(0, 8) + " " + m);
    state.errors = state.errors.slice(0, 8);
    if (window.console) console.warn("[tv]", m);
  }
  function renderDiag() {
    if (diag.hidden) return;
    var p = state.program || {};
    var row = function (a, b) { return "<div><span>" + a + "</span><b>" + b + "</b></div>"; };
    var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    diag.innerHTML =
      row("구독", esc(p.name || "-")) +
      row("오늘", esc(p.today ? p.today.title : "-")) +
      row("내일", esc(p.tomorrow ? p.tomorrow.title : "-")) +
      row("재생 신호", state.lastTick ? Math.round((Date.now() - state.lastTick) / 1000) + "초 전" : "-") +
      row("다시 띄운 횟수", state.reloads) +
      row("화면", state.screen ? esc(state.screen.label || "선택됨") : "기본") +
      row("연결", navigator.onLine ? "온라인" : "오프라인") +
      (state.errors.length ? "<p>" + state.errors.map(esc).join("<br>") + "</p>" : "");
  }
  setInterval(renderDiag, 1000);

  /* ── 시작 ──────────────────────────────────────────────── */
  function start() {
    panel.hidden = false;
    refresh(true).then(function (ok) {
      if (!ok && !state.program) $("[data-tv-title]").textContent = "작품을 불러오지 못했습니다";
    });
  }

  state.key = readKey();
  if (!state.key) showGate();
  else start();
})();
