/* 스크롤에 붙는 나타남과, 떠 있는 차림표.
 *
 * 애플 홈페이지가 하는 일은 사실 둘뿐이다. 칸이 화면에 들어오면 한 번
 * 떠오르고, 위쪽 차림표가 첫 화면 위에서는 비어 있다가 스크롤하면
 * 재질이 된다. 나머지는 활자와 여백이 한다.
 *
 * 여기서는 그 둘만 한다. 칸마다 다른 연출을 넣으면 사이트가 아니라
 * 슬라이드쇼가 되고, 읽으러 온 사람이 기다리게 된다.
 *
 * 규칙 셋.
 *   ① 한 번만 나타나고 다시 숨기지 않는다 — 되돌아 올라갔을 때 읽던
 *      글이 사라지는 것은 연출이 아니라 고장이다
 *   ② 스크롤에 손을 대지 않는다. 가로채면 그 순간 브라우저 것이 아니게 된다
 *   ③ 움직임을 줄여 달라고 했으면 떠오르지 않고 그냥 켜진다
 */
(function (global) {
  "use strict";

  var doc = document;
  var still = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── 나타남 ──────────────────────────────────────────────
     어디에 붙일지는 여기서 정한다. 마크업에 손을 안 대는 편이 낫다 —
     붙이는 규칙이 한 자리에 모여 있어야 "왜 이 칸만 안 뜨나"를 안 찾는다. */
  var PICK = [
    ".home2-cred li",
    ".artwork-stage-head > *",
    ".ref-films .film",
    ".works-section .section-head > *",
    ".works-section .ref-grid > *",
    ".offer-section .section-head > *",
    ".offer-section .offer-card",
    ".more-section li",
    ".inquiry-section .section-head > *",
    ".reel-body > *"
  ];

  var targets = [];
  PICK.forEach(function (sel) {
    var group = doc.querySelectorAll(sel);
    Array.prototype.forEach.call(group, function (n, i) {
      if (n.hasAttribute("data-rise")) return;
      n.setAttribute("data-rise", "");
      /* 한 줄 안에서만 순서를 어긋나게 준다. 넷을 넘기면 마지막 것이
         화면에 있는데도 아직 안 떠 있어 고장으로 보인다. */
      n.style.setProperty("--rise-i", String(Math.min(i, 3)));
      targets.push(n);
    });
  });

  if (still) {
    targets.forEach(function (n) { n.classList.add("is-in"); });
  } else if ("IntersectionObserver" in global) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);          /* 한 번만. 다시 숨기지 않는다 */
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    targets.forEach(function (n) { io.observe(n); });
  } else {
    /* 오래된 브라우저에서는 그냥 켜 둔다. 안 보이는 것보다 낫다. */
    targets.forEach(function (n) { n.classList.add("is-in"); });
  }

  /* ── 떠 있는 차림표 ──────────────────────────────────────
     첫 화면 위에서는 비워 두고, 내려가면 재질이 된다. 판단은 한 곳에서
     한 번만 — 스크롤마다 스타일을 만지면 그것이 곧 버벅임이다. */
  var nav = doc.querySelector(".site-nav");
  if (nav) {
    var top = true;
    var tick = false;
    var mark = function () {
      tick = false;
      var now = (global.scrollY || 0) < 24;
      if (now === top) return;
      top = now;
      nav.classList.toggle("is-top", top);
    };
    nav.classList.add("is-top");
    global.addEventListener("scroll", function () {
      if (tick) return;
      tick = true;
      global.requestAnimationFrame(mark);
    }, { passive: true });
    mark();
  }
})(window);
