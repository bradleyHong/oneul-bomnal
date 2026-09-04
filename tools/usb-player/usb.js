/* 봄날 미디어박스 · USB 플레이어
 *
 * 현장에서 담당자가 하는 일은 USB를 꽂는 것 하나다. 그다음은 전부 여기서 한다.
 *
 * 원칙은 기존 미디어박스 플레이어와 같다.
 *   1. 스스로 복구한다. 한 편이 안 열려도 다음 편으로 넘어가고 계속 돈다.
 *   2. 고장을 겉으로 드러내지 않는다. 로비에 오류 문구가 떠 있으면 안 된다.
 *   3. 사람이 안 붙어 있어도 몇 달을 돈다.
 *
 * 여기서 더한 것.
 *   4. USB를 갈아 끼우면 알아서 갈아탄다. 재부팅이 필요 없다.
 *   5. 화면 맞추기(채우기·회전·좌우반전)를 상자에 저장한다. 현장마다 벽이 다르다.
 *   6. 영상 한 편이면 이어붙이지 않고 그대로 반복한다. 앞과 뒤가 끊기지 않는다.
 *
 * 주소 뒤에 붙이는 설정
 *   ?hours=08-20   그 시간에만 켠다
 *   ?fit=cover&rotate=90&fliph=1   화면 맞추기를 미리 지정 (저장값보다 우선)
 */
(function () {
  "use strict";

  var POLL_MS = 3000;        // USB가 바뀌었는지 보는 주기
  var RETRY_MS = 5000;       // 틀 것이 하나도 없을 때 다시 보는 주기
  var FADE_MS = 420;         // 겹쳐 넘기는 시간 (usb.css와 같아야 한다)
  var GIVE_UP = 12000;       // 이 시간 안에 안 열리면 포기하고 다음으로
  var DAILY_RELOAD_MS = 24 * 60 * 60 * 1000;
  var STORE = "bomnal.usb.view";

  var DEFAULTS = { fit: "contain", rotate: "0", flipH: "0", flipV: "0", dwell: "15" };

  var stage = document.getElementById("stage");
  var vids = [document.getElementById("v0"), document.getElementById("v1")];
  var img = document.getElementById("im0");
  var notice = document.getElementById("notice");
  var settings = document.getElementById("settings");
  var diag = document.getElementById("diag");
  var diagBody = document.getElementById("diagBody");

  var view = load();
  var list = [];
  var rev = -1;
  var meta = { label: null, cached: false, mounted: false };
  var idx = -1;
  var slot = 0;              // 지금 보이는 영상 칸
  var paused = false;
  var timer = null, guard = null;
  var fails = 0;             // 연달아 실패한 횟수. 전부 실패하면 쉬었다 다시 본다.
  var started = null;
  var lastError = null;
  var hours = null;
  var sleeping = false;

  /* ── 저장된 화면 설정 ─────────────────────────────────── */
  function load() {
    var v = {};
    Object.keys(DEFAULTS).forEach(function (k) { v[k] = DEFAULTS[k]; });
    try {
      var raw = JSON.parse(localStorage.getItem(STORE) || "{}");
      Object.keys(DEFAULTS).forEach(function (k) {
        if (raw[k] != null) v[k] = String(raw[k]);
      });
    } catch (e) { /* 저장소를 못 읽어도 기본값으로 돈다 */ }

    var q = new URLSearchParams(location.search);   // 주소로 준 값이 우선한다
    if (q.get("fit")) v.fit = q.get("fit");
    if (q.get("rotate")) v.rotate = q.get("rotate");
    if (q.get("fliph")) v.flipH = q.get("fliph");
    if (q.get("flipv")) v.flipV = q.get("flipv");
    if (q.get("dwell")) v.dwell = q.get("dwell");
    return v;
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(view)); } catch (e) { /* 무시 */ }
  }

  function applyView() {
    stage.dataset.fit = view.fit;
    stage.dataset.rotate = view.rotate;
    stage.dataset.fliph = view.flipH;
    stage.dataset.flipv = view.flipV;
    Array.prototype.forEach.call(settings.querySelectorAll("[data-set]"), function (group) {
      var key = group.dataset.set;
      Array.prototype.forEach.call(group.querySelectorAll("button"), function (b) {
        b.classList.toggle("is-on", String(view[key]) === b.dataset.v);
      });
    });
  }

  /* ── 운영 시간 ────────────────────────────────────────── */
  (function readHours() {
    var q = new URLSearchParams(location.search).get("hours");
    var m = q && /^(\d{1,2})-(\d{1,2})$/.exec(q);
    if (m) hours = [+m[1], +m[2]];
  })();

  function withinHours() {
    if (!hours) return true;
    var h = new Date().getHours(), a = hours[0], b = hours[1];
    return a <= b ? (h >= a && h < b) : (h >= a || h < b);   // 22-06처럼 자정을 넘는 경우
  }

  /* ── 화면 ─────────────────────────────────────────────── */
  function showNotice(on, title, body) {
    notice.hidden = !on;
    if (on) {
      notice.querySelector(".notice-title").textContent = title;
      notice.querySelector(".notice-body").textContent = body;
      vids.forEach(function (v) { v.classList.remove("is-on"); try { v.pause(); } catch (e) {} });
      img.classList.remove("is-on");
    }
  }

  function clearTimers() {
    clearTimeout(timer); timer = null;
    clearTimeout(guard); guard = null;
  }

  /** 한 편을 보여준다. 열리지 않으면 기다리지 않고 다음으로 넘어간다. */
  function show(n, why) {
    clearTimers();
    if (!list.length) { showNotice(true, "USB를 꽂아 주세요", "영상이 담긴 USB를 연결하면 바로 재생됩니다."); return; }
    if (!withinHours()) { sleep(); return; }

    idx = ((n % list.length) + list.length) % list.length;
    var item = list[idx];
    showNotice(false);

    // 이 시간 안에 못 열면 고장으로 보고 넘어간다
    guard = setTimeout(function () { fail("열리지 않음: " + item.name); }, GIVE_UP);

    if (item.kind === "image") return showImage(item);
    return showVideo(item);
  }

  function showImage(item) {
    var probe = new Image();
    probe.onload = function () {
      clearTimeout(guard); guard = null;
      img.src = probe.src;
      img.classList.add("is-on");
      vids.forEach(function (v) { v.classList.remove("is-on"); });
      setTimeout(function () { vids.forEach(function (v) { try { v.pause(); } catch (e) {} }); }, FADE_MS);
      ok();
      if (list.length > 1) timer = setTimeout(next, (+view.dwell || 15) * 1000);
    };
    probe.onerror = function () { fail("사진을 열지 못함: " + item.name); };
    probe.src = item.url;
  }

  function showVideo(item) {
    var back = vids[slot ^ 1];
    var single = list.length === 1;

    back.onerror = null;
    back.onended = null;
    back.loop = single;              // 한 편뿐이면 이어붙이지 않고 그대로 반복한다
    back.muted = true;
    back.src = item.url;

    back.oncanplay = function () {
      back.oncanplay = null;
      clearTimeout(guard); guard = null;
      var p = back.play();
      if (p && p.catch) p.catch(function () { /* 자동재생이 막히면 아래 onerror로 온다 */ });

      back.classList.add("is-on");
      img.classList.remove("is-on");
      var front = vids[slot];
      front.classList.remove("is-on");
      setTimeout(function () {
        try { front.pause(); front.removeAttribute("src"); front.load(); } catch (e) {}
      }, FADE_MS);
      slot ^= 1;
      ok();
    };
    back.onerror = function () { fail("영상을 열지 못함: " + item.name); };
    if (!single) back.onended = function () { next(); };
    back.load();
  }

  function ok() {
    fails = 0;
    lastError = null;
    if (!started) started = Date.now();
    renderDiag();
  }

  /** 한 편이 안 되면 다음으로. 전부 안 되면 잠시 쉬었다 다시 본다. */
  function fail(msg) {
    clearTimers();
    lastError = msg;
    fails++;
    renderDiag();
    if (fails >= Math.max(list.length, 1)) {
      fails = 0;
      timer = setTimeout(function () { show(idx + 1, "retry"); }, RETRY_MS);
      return;
    }
    show(idx + 1, "fail");
  }

  function next() { if (!paused) show(idx + 1, "auto"); }

  /* ── 운영 시간 밖 ─────────────────────────────────────── */
  function sleep() {
    sleeping = true;
    showNotice(true, "", "");
    notice.hidden = false;
    notice.querySelector(".notice-title").textContent = "";
    notice.querySelector(".notice-body").textContent = "";
    timer = setTimeout(function () {
      sleeping = false;
      show(idx, "wake");
    }, 60000);                        // 1분마다 시간이 됐는지 본다
  }

  /* ── USB 지켜보기 ─────────────────────────────────────── */
  function poll() {
    fetch("/playlist.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        meta = { label: j.label, cached: !!j.cached, mounted: !!j.mounted };
        if (j.rev === rev) { renderDiag(); return; }
        rev = j.rev;
        list = j.items || [];
        idx = -1;
        fails = 0;
        started = null;
        if (list.length) show(0, "reload");
        else showNotice(true, "USB를 꽂아 주세요", "영상이 담긴 USB를 연결하면 바로 재생됩니다.");
        renderDiag();
      })
      .catch(function () {
        // 서버가 잠깐 안 붙어도 지금 틀고 있는 것은 계속 돈다. 화면을 건드리지 않는다.
      })
      .then(function () { setTimeout(poll, POLL_MS); });
  }

  /* ── 상태 화면 ────────────────────────────────────────── */
  function renderDiag() {
    if (diag.hidden) return;
    var cur = list[idx];
    var rows = [
      ["USB", meta.mounted ? (meta.label || "연결됨") : (meta.cached ? "없음 (복사본 재생)" : "없음")],
      ["재생 목록", list.length + "편"],
      ["지금", cur ? (idx + 1) + " / " + list.length + " · " + cur.name : "없음"],
      ["화면", view.fit + " · " + view.rotate + "° · 좌우" + (view.flipH === "1" ? "반전" : "정상")
        + " · 상하" + (view.flipV === "1" ? "반전" : "정상")],
      ["운영 시간", hours ? hours[0] + "시–" + hours[1] + "시" + (sleeping ? " (지금은 쉬는 중)" : "") : "24시간"],
      ["멈춤", paused ? "예" : "아니오"],
      ["연속 재생", started ? Math.floor((Date.now() - started) / 60000) + "분" : "-"],
      ["마지막 오류", lastError || "없음"]
    ];
    diagBody.innerHTML = rows.map(function (r) {
      return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(String(r[1])) + "</dd>";
    }).join("");
  }

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ── 조작 ─────────────────────────────────────────────── */
  settings.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-v]");
    if (!b) return;
    var key = b.parentNode.dataset.set;
    view[key] = b.dataset.v;
    save();
    applyView();
    if (key === "dwell" && list[idx] && list[idx].kind === "image") show(idx, "dwell");
  });

  document.addEventListener("keydown", function (e) {
    var k = e.key;
    if (k === "s" || k === "S" || k === "ㄴ") {
      settings.hidden = !settings.hidden;
      if (!settings.hidden) diag.hidden = true;
    } else if (k === "d" || k === "D" || k === "ㅇ") {
      diag.hidden = !diag.hidden;
      if (!diag.hidden) settings.hidden = true;
      renderDiag();
    } else if (k === "f" || k === "F" || k === "ㄹ") {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(function () {});
    } else if (k === "ArrowRight") {
      show(idx + 1, "manual");
    } else if (k === "ArrowLeft") {
      show(idx - 1, "manual");
    } else if (k === " ") {
      e.preventDefault();
      paused = !paused;
      var v = vids[slot];
      if (paused) { clearTimeout(timer); try { v.pause(); } catch (err) {} }
      else { try { v.play(); } catch (err) {} next(); }
      renderDiag();
    }
  });

  /* ── 얼음 감시 ────────────────────────────────────────────
   * 화면이 멈추는 원인은 대부분 고장이 아니라 브라우저가 스스로 재생을
   * 멈춘 것이다. 화면 보호기가 뜨거나, 창이 가려지거나, 전원 관리가
   * 끼어들면 그렇게 된다. 그래서 시간이 흐르는지 직접 세어 본다.
   * 두 번 연달아 안 흐르면 고장으로 보고 다음 편으로 넘어간다. */
  var lastT = -1, stalls = 0;
  setInterval(function () {
    if (paused || sleeping || !list.length) return;
    var v = vids[slot];
    if (!v || !v.classList.contains("is-on")) return;
    if (list[idx] && list[idx].kind === "image") return;   // 사진은 시간이 흐르지 않는다

    var now = v.currentTime;
    if (v.paused || (now === lastT && v.readyState >= 3)) {
      try { v.play(); } catch (e) { /* 다음 차례에 다시 본다 */ }
      if (++stalls >= 2) { stalls = 0; lastError = "멈춤 감지 · 다음 편으로"; show(idx + 1, "stall"); }
    } else {
      stalls = 0;
    }
    lastT = now;
  }, 5000);

  // 화면이 다시 보이게 되면 곧바로 이어서 튼다
  document.addEventListener("visibilitychange", function () {
    if (document.hidden || paused || sleeping) return;
    var v = vids[slot];
    if (v && v.classList.contains("is-on")) { try { v.play(); } catch (e) {} }
  });

  // 마우스를 잠깐 움직이면 커서가 보였다가 다시 숨는다
  var cursorTimer = null;
  document.addEventListener("mousemove", function () {
    document.body.classList.remove("hide-cursor");
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(function () { document.body.classList.add("hide-cursor"); }, 2500);
  });
  document.body.classList.add("hide-cursor");

  // 하루에 한 번 새로 읽는다. 오래 켜 두면 메모리가 쌓인다.
  setTimeout(function () { location.reload(); }, DAILY_RELOAD_MS);

  applyView();
  poll();
})();
