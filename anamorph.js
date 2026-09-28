/* 첫 화면의 아나모픽 모서리.
 *
 * 우리가 파는 것은 "두 면을 한 덩어리로 보이게 하는 일"이다. 기둥 두 면에
 * 같은 영상을 두 번 걸면 화면 두 대로 보이고, 한 장으로 그려 모서리에서
 * 잘라 걸면 기둥 하나가 된다. 그 차이가 이 회사의 기술이다.
 *
 * 그러면 홈페이지 첫 화면이 그 일을 직접 해 보이는 것이 맞다. 사진도
 * 영상도 아니고, 지금 이 브라우저가 우리 엔진으로 넓은 한 장을 그려
 * 모서리에서 반씩 잘라 두 면에 건다. 스크롤하면 모서리가 펴져 띠 한 장이
 * 된다 — 기둥 두 면과 32:9 외벽이 같은 한 장이라는 것을 말 대신 보인다.
 *
 * 애플 홈페이지의 결을 따랐다. 규칙은 넷이다.
 *   ① 스크롤에 1:1 로 붙는다. 시간으로 도는 연출이 아니다
 *   ② 값은 늘 지금 화면의 값에서 출발한다(끊고 잡아도 튀지 않는다)
 *   ③ 합성 친화 속성만 건드린다 — transform 과 opacity 뿐
 *   ④ 움직임을 줄여 달라고 한 사람에게는 펴진 한 장을 가만히 보여 준다
 */
(function (global) {
  "use strict";

  var root = document.querySelector("[data-anam]");
  if (!root) return;

  var box = root.querySelector("[data-anam-box]");
  var cvL = root.querySelector("[data-anam-l]");
  var cvR = root.querySelector("[data-anam-r]");
  var hero = root.closest(".home2-hero");
  var body = hero && hero.querySelector(".home2-body");
  if (!box || !cvL || !cvR || !hero) return;

  var mqStill = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)");
  var still = !!(mqStill && mqStill.matches);
  var mqFine = global.matchMedia && global.matchMedia("(hover: hover) and (pointer: fine)");

  /* ── 그림 ────────────────────────────────────────────────
     엔진이 없으면(스크립트가 늦거나 막히면) 아무것도 안 한다. CSS 가
     칠해 둔 바탕이 그대로 남아 첫 화면은 여전히 완성되어 보인다. */
  var GEN = global.BomnalGen;
  var off = null, gen = null, ctxL = null, ctxR = null;
  var faceW = 0, faceH = 0, dpr = 1;

  /* 첫 화면은 연출이다. 무작위로 뽑으면 어떤 날은 좋고 어떤 날은 허전하다.
     씨앗·그림·색·손잡이를 전부 박아 둔다 — 누가 언제 들어와도 같은
     화면을 본다. 색은 "짙은 쪽빛" 이다. 바탕이 거의 검고 빛깔이 하나뿐인
     색판이라, 이 위에 흰 글자를 얹어도 글자가 먼저 읽힌다. 첫 화면은
     그림을 보는 자리이자 읽는 자리다 — 둘 다 되어야 한다. */
  var HERO = {
    text: "밤안개를 가르는 빛기둥",
    seed: 480271,
    style: "sa:beam",
    pal: "짙은 쪽빛",
    v: 9,
    /* 기본값 그대로 두면 빛이 화면을 하얗게 덮는다. 벽에 거는 것이 아니라
       글자 뒤에 까는 것이라, 대비와 번짐을 내리고 천천히 돌린다. */
    tune: { contrast: 46, glow: 26, density: 38, speed: 30, grain: 14 }
  };

  function palById(id) {
    var all = (GEN.PALETTES || []).concat(GEN.PALETTES_EXTRA || []);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function makeSpec(ar) {
    if (!GEN || !GEN.compose) return null;
    var sp = GEN.compose(HERO.text, HERO.seed, ar, HERO.v);
    if (GEN.hasStyle(HERO.style)) sp.style = HERO.style;
    var pal = palById(HERO.pal);
    if (pal) sp.palette = pal;
    sp.tune = HERO.tune;
    sp.idx = 0; sp.v = HERO.v;
    return sp;
  }

  function sizeUp() {
    var r = root.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    /* 한 면의 크기. 모서리를 가운데 두고 좌우로 반씩 나눈다. */
    var w = Math.round(r.width * 0.5), h = Math.round(r.height);
    /* 4K 로 그릴 자리가 아니다. 글자 뒤에 까는 배경이고, 원근으로
       기울어져 있어 화소가 그대로 보이지도 않는다. 밀도는 1.5 까지만
       따라가고 한 면을 760 화소에서 끊는다. 여기서 두 배를 쓰면 그리는
       넓이가 네 배가 되고, 그 값은 노트북 선풍기 소리로 나온다. */
    dpr = Math.min(1.5, global.devicePixelRatio || 1);
    var pw = Math.min(760, Math.round(w * dpr));
    var ph = Math.min(760, Math.round(h * dpr));
    if (pw === faceW && ph === faceH && off) return true;
    faceW = Math.max(16, pw); faceH = Math.max(16, ph);
    cvL.width = faceW; cvL.height = faceH;
    cvR.width = faceW; cvR.height = faceH;
    ctxL = cvL.getContext("2d");
    ctxR = cvR.getContext("2d");
    if (!GEN) return false;
    /* 넓은 한 장. 두 면을 붙인 넓이로 그려야 모서리에서 무늬가 이어진다. */
    off = off || document.createElement("canvas");
    off.width = faceW * 2; off.height = faceH;
    gen = new GEN.Gen(off);
    /* 시연본 도장은 "아직 값을 안 받은 번호"에 찍는 것이다. 여기는 우리
       홈페이지의 우리 그림이고 번호도 안 내건다. 도장을 찍으면 첫 화면이
       미완성으로 보인다. */
    gen.mark = "";
    var sp = makeSpec((faceW * 2) / faceH);
    if (!sp) return false;
    gen.set(sp);
    return true;
  }

  /* ── 스크롤 ──────────────────────────────────────────────
     첫 화면 높이를 한 바퀴로 잡고 0~1 로 편다. 이 값 하나가 모서리가
     펴지는 정도·밀어 넣는 정도·글자가 비켜나는 정도를 전부 정한다. */
  function progress() {
    var top = hero.getBoundingClientRect().top;
    var span = Math.max(1, hero.offsetHeight - global.innerHeight);
    return Math.min(1, Math.max(0, -top / span));
  }

  /* 화면에 지금 보이는 값에서 출발해 목표로 다가간다. 스크롤을 놓자마자
     값을 갈아 끼우면 한 프레임 튄다. 프레임 간격을 곱해 두어 120Hz
     화면에서 두 배로 빨라지지 않게 한다. */
  var cur = { p: 0, mx: 0, my: 0 };
  var aim = { p: 0, mx: 0, my: 0 };
  function ease(a, b, k, dt) { return a + (b - a) * (1 - Math.pow(1 - k, dt * 60)); }

  /* ── 손가락·마우스 ───────────────────────────────────────
     누르는 자리가 아니라 보는 자리다. 아주 조금만 따라 움직인다.
     많이 움직이면 글자가 읽히지 않는다. */
  if (!still && mqFine && mqFine.matches) {
    global.addEventListener("pointermove", function (e) {
      aim.mx = (e.clientX / global.innerWidth - 0.5) * 2;
      aim.my = (e.clientY / global.innerHeight - 0.5) * 2;
    }, { passive: true });
    global.addEventListener("pointerleave", function () { aim.mx = 0; aim.my = 0; }, { passive: true });
  }

  /* ── 돌리기 ──────────────────────────────────────────────
     화면 밖으로 나가면 멈춘다. 안 보이는 그림을 계속 그리면 노트북
     배터리만 닳는다. */
  var live = true, running = false, t0 = 0, last = 0, artAt = 0;
  /* 그림은 초당 서른 장이면 충분하다(우리가 파는 영상도 5초 150장이다).
     기울기와 자리는 스크롤에 붙어야 하니 프레임마다 고치고, 그림만
     솎는다. 둘을 같이 묶으면 스크롤이 그림 속도에 끌려간다. */
  var ART_MS = 1000 / 30;

  if ("IntersectionObserver" in global) {
    new IntersectionObserver(function (es) {
      live = es[0].isIntersecting;
      if (live && !running) kick();
    }, { rootMargin: "120px" }).observe(root);
  }

  var OPEN = 46;                    /* 모서리가 벌어진 각. 두 면이 직각을 이룬다 */

  function paint(now) {
    running = true;
    if (!live) { running = false; return; }
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;

    aim.p = progress();
    cur.p = ease(cur.p, aim.p, 0.18, dt);
    cur.mx = ease(cur.mx, aim.mx, 0.10, dt);
    cur.my = ease(cur.my, aim.my, 0.10, dt);

    var p = cur.p;
    /* 모서리가 펴진다. 46도(모서리) → 0도(펼친 한 장).
       펴는 일은 앞쪽 4분의 3에서 끝내고, 나머지는 펴진 한 장을 보는
       시간으로 둔다. 끝까지 펴고 있으면 다 편 그림을 볼 틈이 없다. */
    var f = Math.min(1, p / 0.74);
    var open = OPEN * (1 - f);
    /* 접혀 있을 때는 비스듬해 좁아 보인다. 펴지면서 그만큼 다가온다 —
       늘리는 것이 아니라 가로세로를 같이 키운다. 한 쪽만 늘리면
       "늘려 붙이지 않는다"는 우리 말과 어긋난다. */
    var sc = 1 + f * 0.12 + (p - f) * 0.05;
    var ry = cur.mx * 5 - p * 2;
    var rx = -cur.my * 3 + p * 1.5;

    box.style.setProperty("--open", open.toFixed(2) + "deg");
    box.style.setProperty("--lit", (1 - f).toFixed(3));
    box.style.setProperty("--ry", ry.toFixed(2) + "deg");
    box.style.setProperty("--rx", rx.toFixed(2) + "deg");
    box.style.setProperty("--sc", sc.toFixed(4));
    /* 펴진 뒤에는 글자가 비켜난다. 다음 칸으로 넘어가는 자리다. */
    if (body) {
      var out = Math.max(0, (p - 0.78) / 0.22);
      body.style.setProperty("--out", out.toFixed(3));
    }

    if (gen && now - artAt >= ART_MS) {
      artAt = now;
      var t = ((now - t0) / 1000) % 5;
      gen.draw(t);
      /* 한 장을 반씩 잘라 두 면에 건다. 늘려 붙이는 것이 아니라
         같은 그림의 왼쪽과 오른쪽이다. 그래서 모서리에서 이어진다. */
      ctxL.drawImage(off, 0, 0, faceW, faceH, 0, 0, faceW, faceH);
      ctxR.drawImage(off, faceW, 0, faceW, faceH, 0, 0, faceW, faceH);
    }
    global.requestAnimationFrame(paint);
  }

  function kick() {
    if (running) return;
    t0 = t0 || performance.now();
    last = performance.now();
    global.requestAnimationFrame(paint);
  }

  function boot() {
    if (!sizeUp()) {
      /* 엔진이 아직이면 한 번 더 기다렸다 붙인다. defer 순서가 바뀌어도
         첫 화면이 비지 않게. */
      if (!GEN) { GEN = global.BomnalGen; if (GEN) return void setTimeout(boot, 60); }
    }
    root.classList.add("is-on");
    if (still) {
      /* 움직임을 줄여 달라고 한 사람에게는 펴진 한 장을 가만히 보여 준다.
         어지럼증을 일으키는 것은 회전과 시차지, 그림이 아니다. */
      box.style.setProperty("--open", "0deg");
      box.style.setProperty("--lit", "0");
      box.style.setProperty("--ry", "0deg");
      box.style.setProperty("--rx", "0deg");
      box.style.setProperty("--sc", "1");
      if (gen) { gen.draw(1.7);
        ctxL.drawImage(off, 0, 0, faceW, faceH, 0, 0, faceW, faceH);
        ctxR.drawImage(off, faceW, 0, faceW, faceH, 0, 0, faceW, faceH); }
      return;
    }
    kick();
  }

  var rt;
  global.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { sizeUp(); }, 180);
  }, { passive: true });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
