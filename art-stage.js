/*
 * 지금 돌아가는 화면 — 한 번에 하나, 매시 정각에 교대.
 *
 * 화면 넷을 한 줄에 늘어놓으면 하나하나가 우표만 해진다. 담당자는
 * 로비 미디어월에 걸릴 크기로 보고 싶은 것이지 섬네일을 보러 온 게
 * 아니다. 그래서 한 번에 하나만 크게 띄운다.
 *
 * 어느 것을 띄울지는 시각으로 정한다. 무작위로 하면 새로고침할 때마다
 * 바뀌어 산만하고, 고정하면 두 번째 방문에도 같은 그림이다. 시각으로
 * 나누면 오전에 본 사람과 오후에 본 사람이 다른 작품을 보게 된다.
 *
 * 켜고 끄는 일은 art-embed.js가 한다. 여기서는 어느 칸을 보이게 할지만
 * 정한다. 안 보이는 칸은 화면에 걸리지 않으니 art-embed가 알아서 iframe을
 * 걷어간다 — 화면 밖 작품이 계속 도는 일은 없다.
 */
(function () {
  "use strict";

  var stage = document.querySelector("[data-art-stage]");
  if (!stage) return;

  var slides = [].slice.call(stage.querySelectorAll("[data-slide]"));
  var picks = [].slice.call(document.querySelectorAll("[data-pick]"));
  var note = document.querySelector("[data-stage-note]");
  if (slides.length < 2) return;

  var HOUR = 3600000;
  var timer = 0;
  var manual = false;               /* 직접 고른 뒤에는 자동 교대를 멈춘다 */

  /* 시각으로 정한다. 표준시가 어디든 정각마다 하나씩 넘어간다. */
  function hourIndex() {
    return Math.floor(Date.now() / HOUR) % slides.length;
  }

  function show(i) {
    slides.forEach(function (fig, n) {
      var on = n === i;
      fig.classList.toggle("is-on", on);
      /* 넘어간 화면의 iframe은 바로 걷는다. 관찰자를 기다리면
         잠깐이지만 두 화면이 같이 돈다. */
      if (!on) {
        var f = fig.querySelector("iframe");
        if (f) {
          f.remove();
          var box = fig.querySelector("[data-art]");
          if (box) box.classList.remove("is-live");
          var b = fig.querySelector(".art-play");
          if (b) b.textContent = b.dataset.on || "재생";
        }
      }
    });
    picks.forEach(function (btn, n) {
      var on = n === i;
      btn.classList.toggle("is-on", on);
      if (on) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
  }

  /* 다음 정각까지 남은 만큼만 기다린다. 한 시간씩 더하면 조금씩 밀린다. */
  function schedule() {
    clearTimeout(timer);
    if (manual) return;
    timer = setTimeout(function () {
      show(hourIndex());
      tellNext();
      schedule();
    }, HOUR - (Date.now() % HOUR) + 800);
  }

  function tellNext() {
    if (!note) return;
    if (manual) { note.textContent = "직접 고르셨으니 화면을 그대로 둡니다."; return; }
    var d = new Date(Date.now() + (HOUR - (Date.now() % HOUR)));
    note.textContent = "다음 화면 " + ("0" + d.getHours()).slice(-2) + ":00, 매시 정각에 넘어갑니다.";
  }

  picks.forEach(function (btn, n) {
    btn.addEventListener("click", function () {
      manual = true;
      clearTimeout(timer);
      show(n);
      tellNext();
    });
  });

  show(hourIndex());
  tellNext();
  schedule();
})();
