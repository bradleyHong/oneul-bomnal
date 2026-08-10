/* 봄날 미디어박스 플레이어
 *
 * 관공서 LED 패널 뒤에 붙은 미디어박스에서 브라우저 전체화면으로 띄워두고
 * 몇 달을 그대로 돌리는 프로그램이다. 사람이 붙어 있지 않다는 전제로 만든다.
 *
 * 설계 원칙
 *   1. 스스로 복구한다. 한 작품이 죽어도 다음 작품으로 넘어가고 계속 돈다.
 *   2. 인터넷이 끊겨도 마지막 정상 재생목록으로 계속 돈다.
 *   3. 고장을 겉으로 드러내지 않는다. 로비에 오류 문구가 떠 있으면 안 된다.
 *   4. 현장에서 키보드 없이도 된다. 켜면 바로 재생이다.
 *
 * 설정은 주소 뒤에 붙인다.
 *   /player?site=대구북구청&list=spring,air,typewall&dwell=90&hours=08-20
 */
(function () {
  "use strict";

  /* ── 기본 재생 목록 ─────────────────────────────────────────── */

  var BUILT_IN = {
    spring: { title: "봄날 시계", note: "대구 날씨·시간", url: "./art-spring.html" },
    air: { title: "오늘의 공기", note: "실시간 미세먼지", url: "./art-air.html" },
    typewall: { title: "타이포 월", note: "다국어 인사", url: "./art-typewall.html" }
  };

  var DEFAULTS = {
    site: "봄날 미디어박스",
    list: ["spring", "air", "typewall"],
    dwell: 90, // 작품당 재생 시간(초)
    hours: null, // "08-20" 형식. 없으면 24시간 재생
    fade: 1200 // 전환 시간(ms)
  };

  /* 한 작품이 이 시간 안에 뜨지 않으면 포기하고 넘어간다. */
  var LOAD_TIMEOUT_MS = 20000;
  /* 맥박이 이 시간 이상 끊기면 화면이 얼어붙은 것으로 본다. */
  var BEAT_TIMEOUT_MS = 12000;
  /* 하루에 한 번 페이지를 새로 읽는다. 오래 켜두면 메모리가 쌓인다. */
  var DAILY_RELOAD_MS = 24 * 60 * 60 * 1000;
  /* 재생목록 캐시 자리 */
  var CACHE_KEY = "bomnal.player.playlist";

  var IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i;

  /* ── 설정 읽기 ──────────────────────────────────────────────── */

  function readConfig() {
    var q = new URLSearchParams(location.search);
    var cfg = {
      site: q.get("site") || DEFAULTS.site,
      dwell: clampNumber(q.get("dwell"), DEFAULTS.dwell, 5, 3600),
      fade: clampNumber(q.get("fade"), DEFAULTS.fade, 0, 5000),
      hours: parseHours(q.get("hours")),
      items: []
    };

    var raw = (q.get("list") || "").split(",").map(trim).filter(Boolean);
    if (!raw.length) raw = DEFAULTS.list.slice();
    cfg.items = raw.map(resolveItem).filter(Boolean);

    // 주소에 아무것도 못 건졌으면 마지막으로 잘 돌던 목록을 쓴다.
    if (!cfg.items.length) {
      var cached = readCache();
      if (cached && cached.length) cfg.items = cached;
    }
    if (!cfg.items.length) cfg.items = DEFAULTS.list.map(resolveItem);

    return cfg;
  }

  function resolveItem(token) {
    if (!token) return null;
    if (BUILT_IN[token]) {
      return {
        key: token,
        title: BUILT_IN[token].title,
        note: BUILT_IN[token].note,
        url: BUILT_IN[token].url,
        kind: "page",
        sameOrigin: true
      };
    }
    // 내장 목록에 없으면 주소로 본다. HTML이든 이미지든 재생한다.
    var url = token;
    var sameOrigin = true;
    try {
      var resolved = new URL(url, location.href);
      sameOrigin = resolved.origin === location.origin;
      url = resolved.href;
    } catch (err) {
      return null; // 주소로 읽히지 않으면 재생목록에서 뺀다.
    }
    return {
      key: url,
      title: shortLabel(url),
      note: sameOrigin ? "" : "외부 페이지",
      url: url,
      kind: IMAGE_RE.test(url) ? "image" : "page",
      sameOrigin: sameOrigin
    };
  }

  function parseHours(value) {
    if (!value) return null;
    var m = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(String(value).trim());
    if (!m) return null;
    var from = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    var to = Math.min(24, Math.max(0, parseInt(m[2], 10)));
    if (from === to) return null;
    return { from: from, to: to };
  }

  function clampNumber(value, fallback, min, max) {
    var n = parseFloat(value);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function trim(s) { return String(s).trim(); }

  function shortLabel(url) {
    try {
      var u = new URL(url, location.href);
      var name = u.pathname.split("/").filter(Boolean).pop() || u.hostname;
      return decodeURIComponent(name).replace(/\.(html?|png|jpe?g|gif|webp|avif|svg)$/i, "");
    } catch (err) {
      return "콘텐츠";
    }
  }

  /* ── 재생목록 캐시 ──────────────────────────────────────────── */
  /* 인터넷이 끊긴 채로 박스가 재부팅돼도 마지막 목록으로 돌게 한다. */

  function writeCache(items) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(items.map(function (i) { return i.key; })));
    } catch (err) { /* 저장 공간이 막혀 있어도 재생은 계속한다. */ }
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw).map(resolveItem).filter(Boolean);
    } catch (err) {
      return null;
    }
  }

  /* ── 상태 ───────────────────────────────────────────────────── */

  var cfg = readConfig();
  var state = {
    index: -1,
    paused: false,
    startedAt: Date.now(),
    shownAt: 0,
    lastBeat: 0,
    beatsSeen: false, // 맥박을 한 번이라도 받았는가
    fps: 0,
    advanceTimer: null,
    loadTimer: null,
    skips: 0,
    errors: [],
    resting: false // 운영시간 밖이라 화면을 쉬는 중
  };

  var stage = document.getElementById("stage");
  var layers = [document.getElementById("layerA"), document.getElementById("layerB")];
  var active = 0;
  var diag = document.getElementById("diagnostics");

  /* ── 재생 ───────────────────────────────────────────────────── */

  function show(nextIndex, reason) {
    if (!cfg.items.length) return;

    clearTimeout(state.advanceTimer);
    clearTimeout(state.loadTimer);

    state.index = ((nextIndex % cfg.items.length) + cfg.items.length) % cfg.items.length;
    var item = cfg.items[state.index];
    var back = layers[1 - active];

    back.innerHTML = "";
    state.beatsSeen = false;
    state.lastBeat = Date.now();

    var node;
    if (item.kind === "image") {
      node = document.createElement("img");
      node.alt = "";
      node.decoding = "async";
    } else {
      node = document.createElement("iframe");
      // 외부 페이지는 최소 권한으로 가둔다. 우리 페이지는 그대로 둬야
      // 맥박 postMessage가 같은 출처로 오간다.
      if (!item.sameOrigin) {
        node.setAttribute("sandbox", "allow-scripts");
        node.setAttribute("referrerpolicy", "no-referrer");
      }
      node.setAttribute("scrolling", "no");
      node.setAttribute("title", item.title);
    }

    var settled = false;
    function settle(ok, why) {
      if (settled) return;
      settled = true;
      clearTimeout(state.loadTimer);
      if (ok) {
        swapTo(1 - active);
        state.shownAt = Date.now();
        state.lastBeat = Date.now();
        scheduleAdvance();
        writeCache(cfg.items);
      } else {
        noteError(item.title + " — " + why);
        state.skips += 1;
        // 목록 전체가 죽었을 때 무한 반복을 막는다.
        if (state.skips <= cfg.items.length) {
          show(state.index + 1, "load-failed");
        } else {
          // 한 바퀴 다 실패했다. 잠깐 쉬었다 처음부터 다시 시도한다.
          state.skips = 0;
          state.advanceTimer = setTimeout(function () { show(0, "retry-cycle"); }, 30000);
        }
      }
      renderDiagnostics();
    }

    node.addEventListener("load", function () { settle(true, "loaded"); });
    node.addEventListener("error", function () { settle(false, "불러오기 실패"); });
    state.loadTimer = setTimeout(function () { settle(false, "응답 없음"); }, LOAD_TIMEOUT_MS);

    function launch() {
      if (settled) return;
      node.src = item.url;
      back.appendChild(node);
    }

    // iframe은 404·500 응답을 받아도 "불러오기 성공"으로 친다.
    // 서버가 돌려준 오류 페이지를 그대로 띄우기 때문이다.
    // 그래서 화면에 올리기 전에 응답 상태를 먼저 확인한다.
    // 이 확인을 빼면 로비 LED에 'File not found'가 몇 분씩 떠 있게 된다.
    if (item.kind === "page" && item.sameOrigin) {
      fetch(item.url)
        .then(function (res) {
          if (!res.ok) settle(false, "서버 응답 " + res.status);
          else launch();
        })
        .catch(function () {
          // 통신 자체가 안 되는 경우다. 인터넷이 끊겼어도 브라우저 캐시로
          // 재생이 이어질 수 있으니 여기서 포기하지 않고 일단 띄워본다.
          launch();
        });
    } else {
      launch();
    }
  }

  function swapTo(next) {
    layers[next].classList.add("is-active");
    layers[active].classList.remove("is-active");
    var stale = layers[active];
    active = next;
    // 페이드가 끝난 뒤에 비운다. 먼저 비우면 전환 중에 검은 화면이 스친다.
    setTimeout(function () {
      if (layers[active] !== stale) stale.innerHTML = "";
    }, cfg.fade + 200);
  }

  function scheduleAdvance() {
    clearTimeout(state.advanceTimer);
    if (state.paused || cfg.items.length < 2) return;
    state.advanceTimer = setTimeout(function () {
      state.skips = 0;
      show(state.index + 1, "dwell");
    }, cfg.dwell * 1000);
  }

  /* ── 맥박 감시 ──────────────────────────────────────────────── */
  /* 아트 페이지가 1초마다 보내는 신호가 끊기면 화면이 멈춘 것이다. */

  window.addEventListener("message", function (event) {
    if (event.origin !== location.origin) return;
    var data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "bomnal:beat") {
      state.lastBeat = Date.now();
      state.beatsSeen = true;
      state.fps = data.frames || 0;
    } else if (data.type === "bomnal:error") {
      noteError(shortLabel(data.href || "") + " — " + data.message);
    }
  });

  function watchdog() {
    if (state.paused || state.resting) return;

    // 화면이 잠들거나 창이 뒤로 가면 브라우저가 애니메이션을 멈춘다.
    // 이때 맥박이 끊기는 건 고장이 아니라 정상이다.
    // 이걸 구분하지 않으면 멀쩡한 화면을 계속 넘겨버린다.
    if (document.visibilityState !== "visible") return;

    var item = cfg.items[state.index];
    if (!item) return;

    // 맥박을 보낼 수 없는 콘텐츠(외부 페이지·이미지)는 감시 대상이 아니다.
    // 신호가 없다고 멀쩡한 화면을 넘기면 안 된다.
    if (item.kind === "image" || !item.sameOrigin) return;
    if (!state.beatsSeen) return;

    if (Date.now() - state.lastBeat > BEAT_TIMEOUT_MS) {
      noteError(item.title + " — 화면 멈춤, 다음으로 넘김");
      state.beatsSeen = false;
      show(state.index + 1, "frozen");
    }
  }

  function noteError(message) {
    state.errors.unshift({ at: new Date(), message: message });
    state.errors = state.errors.slice(0, 12);
    // 콘솔에도 남긴다. 원격 접속으로 들어왔을 때 이걸 본다.
    console.warn("[player]", message);
  }

  /* ── 운영시간 ───────────────────────────────────────────────── */
  /* 청사 문 닫은 뒤에도 패널을 켜둘 이유가 없다. 번인도 줄어든다. */

  function withinHours() {
    if (!cfg.hours) return true;
    var h = new Date().getHours();
    var from = cfg.hours.from;
    var to = cfg.hours.to;
    return from < to ? h >= from && h < to : h >= from || h < to;
  }

  function checkHours() {
    var open = withinHours();
    if (open === !state.resting) return; // 바뀐 게 없다
    state.resting = !open;
    document.body.classList.toggle("is-resting", state.resting);
    if (state.resting) {
      clearTimeout(state.advanceTimer);
      layers.forEach(function (l) { l.innerHTML = ""; });
    } else {
      show(state.index + 1, "hours-open");
    }
    renderDiagnostics();
  }

  /* ── 진단 화면 ──────────────────────────────────────────────── */
  /* D를 누르면 뜬다. 평소에는 보이지 않는다. */

  function renderDiagnostics() {
    if (!diag || diag.hidden) return;
    var item = cfg.items[state.index] || {};
    var uptime = Math.floor((Date.now() - state.startedAt) / 1000);
    diag.innerHTML =
      "<h2>" + esc(cfg.site) + "</h2>" +
      row("재생 중", esc(item.title || "-") + " (" + (state.index + 1) + "/" + cfg.items.length + ")") +
      row("상태", state.resting ? "운영시간 외 — 대기" : state.paused ? "일시정지" : "재생 중") +
      row("작품당", cfg.dwell + "초") +
      row("운영시간", cfg.hours ? cfg.hours.from + "시–" + cfg.hours.to + "시" : "24시간") +
      row("가동", formatUptime(uptime)) +
      row("맥박", state.beatsSeen
        ? Math.round((Date.now() - state.lastBeat) / 1000) + "초 전 · 초당 " + state.fps + "프레임"
        : "해당 없음") +
      row("연결", navigator.onLine ? "온라인" : "오프라인 (캐시 재생)") +
      "<h3>최근 기록</h3>" +
      (state.errors.length
        ? "<ul>" + state.errors.map(function (e) {
            return "<li><time>" + e.at.toTimeString().slice(0, 8) + "</time>" + esc(e.message) + "</li>";
          }).join("") + "</ul>"
        : "<p class=\"ok\">기록된 문제 없음</p>") +
      "<p class=\"hint\">D 진단 · Space 일시정지 · ← → 이동 · F 전체화면</p>";
  }

  function row(label, value) {
    return "<div class=\"drow\"><span>" + label + "</span><b>" + value + "</b></div>";
  }

  function formatUptime(sec) {
    var d = Math.floor(sec / 86400);
    var h = Math.floor((sec % 86400) / 3600);
    var m = Math.floor((sec % 3600) / 60);
    if (d) return d + "일 " + h + "시간";
    if (h) return h + "시간 " + m + "분";
    return m + "분";
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ── 조작 ───────────────────────────────────────────────────── */

  document.addEventListener("keydown", function (event) {
    var key = event.key;
    if (key === "d" || key === "D" || key === "ㅇ") {
      diag.hidden = !diag.hidden;
      renderDiagnostics();
    } else if (key === " ") {
      event.preventDefault();
      state.paused = !state.paused;
      if (state.paused) clearTimeout(state.advanceTimer);
      else scheduleAdvance();
      renderDiagnostics();
    } else if (key === "ArrowRight") {
      state.skips = 0;
      show(state.index + 1, "manual");
    } else if (key === "ArrowLeft") {
      state.skips = 0;
      show(state.index - 1, "manual");
    } else if (key === "f" || key === "F" || key === "ㄹ") {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(function () {});
    }
  });

  // 마우스를 잠깐 움직이면 커서가 보였다가 다시 숨는다.
  var cursorTimer = null;
  document.addEventListener("mousemove", function () {
    document.body.classList.remove("hide-cursor");
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(function () {
      document.body.classList.add("hide-cursor");
    }, 3000);
  });

  /* ── 시작 ───────────────────────────────────────────────────── */

  document.title = cfg.site + " · 봄날 미디어박스";
  document.body.classList.add("hide-cursor");
  layers.forEach(function (l) { l.style.transitionDuration = cfg.fade + "ms"; });

  setInterval(watchdog, 2000);
  setInterval(checkHours, 30000);
  setInterval(renderDiagnostics, 1000);

  // 하루에 한 번 통째로 새로 읽는다. 긴 가동에서 쌓이는 것들을 털어낸다.
  setTimeout(function () { location.reload(); }, DAILY_RELOAD_MS);

  // 화면이 다시 켜졌을 때. 잠든 동안 쌓인 공백을 고장으로 세지 않도록
  // 맥박 시계를 지금으로 되돌린 뒤에 감시를 재개한다.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      state.lastBeat = Date.now();
      renderDiagnostics();
    }
  });

  // 인터넷이 돌아오면 다음 전환에서 최신 콘텐츠를 다시 받는다.
  window.addEventListener("online", function () { renderDiagnostics(); });
  window.addEventListener("offline", function () { renderDiagnostics(); });

  checkHours();
  if (!state.resting) show(0, "boot");
})();
