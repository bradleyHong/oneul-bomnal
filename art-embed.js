/*
 * 작품 화면 켜고 끄기.
 *
 * 라이브 캔버스를 한 페이지에 여러 개 띄우면 노트북 팬이 돈다. 그래서
 * 기본은 정지 이미지이고, 눌렀을 때만 실제 코드가 돌아간다. 화면에서
 * 멀어지면 다시 이미지로 돌려 CPU를 놓아준다.
 *
 * data-art  : 작품 주소 (iframe으로 띄운다)
 * data-auto : 있으면 화면에 들어올 때 자동으로 켠다 (상단 시계용)
 */
(function () {
  "use strict";

  var screens = document.querySelectorAll("[data-art]");
  if (!screens.length) return;

  function mount(box) {
    if (box.querySelector("iframe")) return;
    var f = document.createElement("iframe");
    f.src = box.dataset.art;
    f.title = box.dataset.artTitle || "미디어아트 화면";
    f.setAttribute("scrolling", "no");
    f.setAttribute("loading", "eager");
    box.appendChild(f);
    box.classList.add("is-live");
    /* 자동으로 켜진 화면의 버튼이 "재생"이라고 남아 있으면
       눌러도 안 켜지는 것처럼 보인다. */
    var b = box.querySelector(".art-play");
    if (b) b.textContent = b.dataset.off || "멈추기";
  }

  function unmount(box) {
    var f = box.querySelector("iframe");
    if (!f) return;
    f.remove();                       // src를 비우는 것만으로는 루프가 멈추지 않는다
    box.classList.remove("is-live");
  }

  screens.forEach(function (box) {
    var btn = box.querySelector(".art-play");
    if (btn) {
      btn.addEventListener("click", function () {
        if (box.classList.contains("is-live")) { unmount(box); btn.textContent = btn.dataset.on || "실시간으로 보기"; }
        else { mount(box); btn.textContent = btn.dataset.off || "멈추기"; }
      });
    }
  });

  if (!("IntersectionObserver" in window)) {
    // 관찰자가 없으면 자동 재생만 켠다
    document.querySelectorAll("[data-art][data-auto]").forEach(mount);
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var box = e.target;
      if (e.isIntersecting) {
        if (box.hasAttribute("data-auto")) mount(box);
      } else if (!box.dataset.keep) {
        unmount(box);
        var btn = box.querySelector(".art-play");
        if (btn) btn.textContent = btn.dataset.on || "실시간으로 보기";
      }
    });
  }, { rootMargin: "120px 0px" });

  screens.forEach(function (box) { io.observe(box); });
})();
