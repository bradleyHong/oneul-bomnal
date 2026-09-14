/*
 * 패널 미리보기 — 우리 영상을 실제 LED 화면 사진에 끼워 넣는다.
 *
 * "현장에 걸면 어떻게 보이나"는 말로 설명이 안 된다. 사진 속 화면 자리에
 * 영상을 원근 그대로 눕혀 얹으면 한 번에 보인다.
 *
 * 화면 자리(quad)는 촬영본에 마젠타로 칠해 두었고, 굽는 자리에서 그 색만
 * 골라 네 꼭짓점을 뽑아 assets/panel/panels.json 에 적었다. 웹에 나가는
 * 사진은 그 자리를 '꺼진 화면' 색으로 덮은 것이라 마젠타가 보일 일은 없다.
 * 영상이 끝내 안 붙어도 꺼진 화면으로 보이지 고장으로 보이지 않는다.
 *
 * 재생기는 한 대만 쓴다. 넷을 한꺼번에 붙이면 손전화가 감당을 못 하고,
 * 무엇보다 한 번에 하나만 보게 하는 것이 이 화면이 하려는 말이다.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-panel-preview]");
  if (!root) return;

  var VIMEO = "https://player.vimeo.com";
  var stage = root.querySelector("[data-panel-stage]");
  var img = root.querySelector(".panel-photo");
  var frame = root.querySelector(".panel-screen");
  var plates = [];
  var films = [];
  var plate = 0, film = 0;

  try {
    plates = JSON.parse(root.dataset.panels || "[]");
    films = JSON.parse(root.dataset.films || "[]");
  } catch (e) { return; }
  if (!plates.length || !films.length) return;

  /* ── 원근 ─────────────────────────────────────────────────
     정면으로 놓인 직사각형을 사진 속 사각형 자리로 보내는 3×3 행렬.
     CSS 는 4×4 를 열 우선으로 받으므로 자리를 옮겨 적는다. */
  function homography(src, dst) {
    var a = [], b = [], i;
    for (i = 0; i < 4; i++) {
      var s = src[i], d = dst[i];
      a.push([s[0], s[1], 1, 0, 0, 0, -s[0] * d[0], -s[1] * d[0]]);
      a.push([0, 0, 0, s[0], s[1], 1, -s[0] * d[1], -s[1] * d[1]]);
      b.push(d[0], d[1]);
    }
    /* 가우스 소거. 8×8 이라 그냥 푼다. */
    for (i = 0; i < 8; i++) {
      var p = i;
      for (var r = i + 1; r < 8; r++) if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r;
      if (Math.abs(a[p][i]) < 1e-9) return null;
      var t = a[i]; a[i] = a[p]; a[p] = t;
      var tb = b[i]; b[i] = b[p]; b[p] = tb;
      for (var r2 = 0; r2 < 8; r2++) {
        if (r2 === i) continue;
        var f = a[r2][i] / a[i][i];
        if (!f) continue;
        for (var c = i; c < 8; c++) a[r2][c] -= f * a[i][c];
        b[r2] -= f * b[i];
      }
    }
    var h = [];
    for (i = 0; i < 8; i++) h.push(b[i] / a[i][i]);
    h.push(1);
    return h;
  }

  function toMatrix3d(h) {
    return "matrix3d(" + [
      h[0], h[3], 0, h[6],
      h[1], h[4], 0, h[7],
      0, 0, 1, 0,
      h[2], h[5], 0, h[8]
    ].join(",") + ")";
  }

  /* 사진 속 사각형의 실제 가로세로비. 원근이 눌러 놓은 것을 그대로 쓰면
     영상이 옆으로 찌그러진다. 위·아래 변의 길이 평균으로 어림한다 —
     LED 패널은 정면에 가깝게 찍혀 이 어림이 잘 맞는다. */
  function ratioOf(q, W, H) {
    var p = q.map(function (v) { return [v[0] * W, v[1] * H]; });
    var top = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]);
    var bot = Math.hypot(p[3][0] - p[2][0], p[3][1] - p[2][1]);
    var lef = Math.hypot(p[2][0] - p[0][0], p[2][1] - p[0][1]);
    var rig = Math.hypot(p[3][0] - p[1][0], p[3][1] - p[1][1]);
    return ((top + bot) / 2) / Math.max(1, (lef + rig) / 2);
  }

  function place() {
    var W = img.clientWidth, H = img.clientHeight;
    if (!W || !H) return;
    var q = plates[plate].quad.map(function (p) { return [p[0] * W, p[1] * H]; });
    /* 눕히기 전의 크기. 크게 잡을수록 또렷하지만 재생기가 무거워진다.
       사진 위에서는 이만하면 화소가 안 보인다. */
    var ratio = ratioOf(plates[plate].quad, W, H);
    var sw = Math.max(120, Math.min(720, Math.round(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]))));
    var sh = Math.max(60, Math.round(sw / ratio));
    var h = homography([[0, 0], [sw, 0], [0, sh], [sw, sh]], q);
    if (!h) return;
    frame.style.width = sw + "px";
    frame.style.height = sh + "px";
    frame.style.transformOrigin = "0 0";
    frame.style.transform = toMatrix3d(h);
  }

  function mount() {
    var f = films[film];
    var el = frame.querySelector("iframe");
    var src = VIMEO + "/video/" + f.id + (f.hash ? "?h=" + f.hash + "&" : "?") +
              "background=1&autoplay=1&loop=1&muted=1&autopause=0&dnt=1";
    if (!el) {
      el = document.createElement("iframe");
      el.setAttribute("frameborder", "0");
      el.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
      el.setAttribute("tabindex", "-1");
      el.setAttribute("aria-hidden", "true");
      frame.appendChild(el);
    }
    el.title = f.name;
    if (el.src !== src) el.src = src;
  }

  function paintPlate() {
    var p = plates[plate];
    img.src = p.image;
    img.alt = p.label + "에 " + films[film].name + "을 얹은 미리보기";
    img.width = p.size[0];
    img.height = p.size[1];
    root.querySelectorAll("[data-plate]").forEach(function (b) {
      var on = +b.dataset.plate === plate;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var cap = root.querySelector("[data-panel-cap]");
    if (cap) cap.textContent = p.label + " · " + p.place;
    if (img.complete) place();
  }

  function paintFilm() {
    root.querySelectorAll("[data-film-pick]").forEach(function (b) {
      var on = +b.dataset.filmPick === film;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    mount();
  }

  root.addEventListener("click", function (e) {
    var p = e.target.closest("[data-plate]");
    if (p) { plate = +p.dataset.plate; paintPlate(); return; }
    var f = e.target.closest("[data-film-pick]");
    if (f) { film = +f.dataset.filmPick; paintFilm(); paintPlate(); }
  });

  img.addEventListener("load", place);
  if (global_ResizeObserver()) {
    var ro = new ResizeObserver(place);
    ro.observe(stage);
  } else {
    window.addEventListener("resize", place);
  }
  function global_ResizeObserver() { return typeof ResizeObserver !== "undefined"; }

  paintPlate();

  /* 재생기는 화면에 들어왔을 때만 붙인다. 첫 화면 아래에 있어 보이지도
     않는 것 때문에 남의 집 재생기를 미리 부를 이유가 없다. */
  var slow = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (slow && slow.matches) { paintFilm = function () {}; return; }
  if (!window.IntersectionObserver) { paintFilm(); return; }
  var io = new IntersectionObserver(function (es) {
    if (!es.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    paintFilm();
  }, { rootMargin: "25% 0px" });
  io.observe(root);
})();

/*
 * 구역이 올라오며 드러난다.
 *
 * 흰 종이로 바꾸면서 판이 조용해졌다. 조용한 것은 좋은데, 스크롤해도
 * 아무 일이 없으면 정지된 인쇄물로 읽힌다. 미디어아트를 파는 자리다.
 *
 * 크게 움직이지 않는다 — 14px 올라오면서 흐림이 걷히는 정도다. 한 번만
 * 일어나고 다시는 안 한다. 되돌아 올라갈 때 또 움직이면 멀미가 난다.
 *
 * 움직임을 줄여 달라고 한 분에게는 아무것도 안 건다. 자바스크립트가
 * 막히거나 IntersectionObserver 가 없어도 글은 그대로 보인다 — 감추는
 * 것은 CSS 가 아니라 이 스크립트가 붙이는 클래스다.
 */
(function () {
  "use strict";

  var slow = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (slow && slow.matches) return;
  if (!window.IntersectionObserver) return;

  var els = document.querySelectorAll(
    ".home2-cred, .artwork-stage-head, .artwork-stage .film," +
    " .panel-section .section-head, .panel-wrap," +
    " .works-section .section-head, .offer-section .section-head, .offer-card," +
    " .more-section .section-head, .more-grid, .inquiry-section > div"
  );
  if (!els.length) return;

  var io = new IntersectionObserver(function (list) {
    list.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.02 });

  Array.prototype.forEach.call(els, function (el, i) {
    el.classList.add("will-in");
    /* 한 줄에 여러 칸이 있으면 아주 조금씩 어긋나게 올린다. 다 같이
       올라오면 판 하나가 통째로 움직이는 것으로 보인다. */
    el.style.setProperty("--in-delay", (i % 4) * 60 + "ms");
    io.observe(el);
  });
})();
