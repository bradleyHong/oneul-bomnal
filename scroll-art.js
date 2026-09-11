/*
 * 스크롤이 그림을 민다.
 *
 * 우리 작품은 renderFrame(n) 하나로 그려진다. 같은 n 이면 언제 그려도
 * 같은 그림이다. 그래서 미리 뽑아 둔 프레임을 스크롤 위치에 맞춰
 * 골라 그리면, 손가락이 미는 만큼 그림이 움직인다.
 *
 * 그림 엔진을 그대로 올리면 219KB 에 매 초 계산까지 붙는다. 첫 화면이
 * 장식 하나 때문에 늦어질 이유가 없다. 프레임은 한 장에 5~12KB 다.
 *
 * 마크업
 *   <div class="sart" data-scroll-art="./assets/frames/x.webp"
 *        data-frames="48" data-cols="8" data-cell="960x540"
 *        data-mode="sticky|pass">
 *     <img class="sart-poster" src="...-poster.webp" ... >
 *     <canvas class="sart-canvas"></canvas>
 *   </div>
 *
 * 프레임 파일은 tools/build-frames.mjs 가 만든다.
 */
(function () {
  "use strict";

  var boxes = [].slice.call(document.querySelectorAll("[data-scroll-art]"));
  if (!boxes.length || !window.requestAnimationFrame) return;

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var items = [];
  var ticking = false;

  function setup(box) {
    var cell = String(box.dataset.cell || "").split("x");
    var cw = +cell[0], ch = +cell[1];
    var cols = +box.dataset.cols, frames = +box.dataset.frames;
    if (!(cw > 0 && ch > 0 && cols > 0 && frames > 0)) return null;

    var canvas = box.querySelector(".sart-canvas");
    if (!canvas || !canvas.getContext) return null;

    return {
      box: box, canvas: canvas, ctx: canvas.getContext("2d"),
      cw: cw, ch: ch, cols: cols, frames: frames,
      mode: box.dataset.mode === "sticky" ? "sticky" : "pass",
      sheet: null, last: -1, sized: 0,
    };
  }

  /* 캔버스의 실제 화소 수는 CSS 크기 × 화면 배율이다. 배율을 그대로
     따르면 3배 화면에서 넓이가 9배가 되어 그리는 값이 비싸진다. 2배에서
     끊는다. 원본 프레임보다 크게 그려 봐야 없는 해상도가 생기지 않는다. */
  function resize(it) {
    /* 캔버스가 자리 전체를 채우지 않을 수도 있다(가운데 정렬, 높이 제한).
       자리가 아니라 캔버스 자신의 크기를 재야 한다. */
    var r = it.canvas.getBoundingClientRect();
    if (!r.width) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(Math.min(r.width * dpr, it.cw * 2));
    var h = Math.round(w * it.ch / it.cw);
    if (it.canvas.width === w && it.canvas.height === h) return true;
    it.canvas.width = w;
    it.canvas.height = h;
    it.last = -1;               // 크기가 바뀌면 다시 그려야 한다
    return true;
  }

  function progress(it) {
    var r = it.box.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (it.mode === "sticky") {
      /* 키가 큰 자리 안에서 화면이 붙어 있는 동안의 진행도. */
      var span = r.height - vh;
      if (span <= 0) return 0;
      return Math.min(1, Math.max(0, -r.top / span));
    }
    /* 지나가며 도는 것. 아래에서 올라와 위로 빠질 때까지가 한 바퀴다. */
    var span2 = vh + r.height;
    if (span2 <= 0) return 0;
    return Math.min(1, Math.max(0, (vh - r.top) / span2));
  }

  function draw(it, p) {
    if (!it.sheet) return;
    var n = Math.round(p * (it.frames - 1));
    if (n === it.last) return;              // 같은 장이면 다시 그리지 않는다
    if (!resize(it)) return;
    it.last = n;
    var sx = (n % it.cols) * it.cw;
    var sy = Math.floor(n / it.cols) * it.ch;
    it.ctx.drawImage(it.sheet, sx, sy, it.cw, it.ch,
                     0, 0, it.canvas.width, it.canvas.height);
    it.box.classList.add("is-drawn");
  }

  function tick() {
    ticking = false;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.sheet) draw(it, progress(it));
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(tick);
  }

  function load(it) {
    if (it.sheet || it.loading) return;
    it.loading = true;
    var img = new Image();
    img.decoding = "async";
    img.onload = function () {
      /* 붙여 둔 숫자와 실제 그림이 어긋나면 엉뚱한 칸을 그린다.
         조용히 포기하고 포스터만 남긴다. 틀린 그림보다 낫다. */
      if (img.naturalWidth !== it.cols * it.cw) return;
      it.sheet = img;
      it.last = -1;
      draw(it, still && still.matches ? 0.5 : progress(it));
    };
    img.src = it.box.dataset.scrollArt;
  }

  boxes.forEach(function (box) {
    var it = setup(box);
    if (it) items.push(it);
  });
  if (!items.length) return;

  /* 화면에 들어오기 한 뼘 전부터 받아 둔다. 눈에 닿는 순간 이미 있어야
     한다. 전부 미리 받으면 첫 화면이 그만큼 무거워진다. */
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var it = items.filter(function (x) { return x.box === e.target; })[0];
        if (it) { load(it); io.unobserve(e.target); }
      });
    }, { rootMargin: "80% 0px" });
    items.forEach(function (it) { io.observe(it.box); });
  } else {
    items.forEach(load);
  }

  /* 움직임을 줄여 달라고 한 사람에게는 한 장만 보여 준다. 스크롤에
     묶지 않는다. 스크롤마다 그림이 바뀌는 것은 어지럼증을 일으킨다. */
  if (still && still.matches) return;

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", function () {
    items.forEach(function (it) { it.last = -1; });
    onScroll();
  }, { passive: true });
  onScroll();
})();
