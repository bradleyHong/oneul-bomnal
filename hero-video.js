/*
 * 첫 화면의 최신 작업 영상.
 *
 * 남의 집 재생기(Vimeo)를 마크업에 바로 박아 두면, 브라우저가 첫 화면을
 * 그리기도 전에 그쪽 서버를 부르러 간다. 제목 글자가 그만큼 늦게 뜬다.
 * 그래서 페이지가 한숨 돌린 뒤에 붙인다.
 *
 * 붙기 전에는 어두운 바탕과 제목만 보인다. 그 상태로도 화면이 완성되어
 * 보이도록 배경을 칠해 두었다.
 */
(function () {
  "use strict";

  var box = document.querySelector("[data-hero-video]");
  if (!box) return;

  var id = String(box.dataset.heroVideo || "").replace(/[^0-9]/g, "");
  if (!id) return;

  /* 움직임을 줄여 달라고 한 사람에게는 배경 영상을 붙이지 않는다.
     첫 화면에서 크게 움직이는 것은 어지럼증을 일으킨다. */
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (still && still.matches) return;

  function mount() {
    if (box.querySelector("iframe")) return;
    var f = document.createElement("iframe");
    /* background=1 이면 재생 단추도 로고도 없이 소리 없이 돌기만 한다.
       배경으로 쓰라고 만들어 둔 방식이다. */
    f.src = "https://player.vimeo.com/video/" + id +
            "?background=1&autoplay=1&loop=1&muted=1&autopause=0&dnt=1";
    f.className = "home2-vimeo";
    f.title = box.dataset.heroTitle || "최신 작업 영상";
    f.setAttribute("frameborder", "0");
    f.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
    f.setAttribute("tabindex", "-1");
    f.setAttribute("aria-hidden", "true");
    box.appendChild(f);
  }

  /* 재생이 실제로 시작됐다는 신호를 받은 뒤에만 보여 준다.
     load 이벤트로 판단하면 안 된다. 영상이 비공개이거나 네트워크가 막혀
     오류 화면이 떠도 load 는 똑같이 발생한다. 실제로 그렇게 해 보니
     첫 화면에 회색 판이 그대로 걸렸다.
     재생 신호가 끝내 안 오면 어두운 바탕만 남는다 — 그 상태로도 화면은
     완성되어 보인다. */
  window.addEventListener("message", function (e) {
    if (e.origin !== "https://player.vimeo.com") return;
    var d = e.data;
    if (typeof d === "string") { try { d = JSON.parse(d); } catch (err) { return; } }
    if (!d) return;
    var f = box.querySelector("iframe");
    if (!f || !f.contentWindow) return;
    if (d.event === "ready") {
      /* 준비됐다는 말만으로는 부족하다. 정말 그림이 나오는 순간을 기다린다. */
      f.contentWindow.postMessage({ method: "addEventListener", value: "play" }, "https://player.vimeo.com");
      f.contentWindow.postMessage({ method: "addEventListener", value: "timeupdate" }, "https://player.vimeo.com");
    } else if (d.event === "play" || d.event === "timeupdate") {
      box.classList.add("is-playing");
    }
  });

  /* 첫 그림이 다 그려진 뒤에 붙인다. requestIdleCallback 이 없는 브라우저도
     있으므로 타이머로 받아 둔다. */
  function later() {
    if (window.requestIdleCallback) window.requestIdleCallback(mount, { timeout: 2500 });
    else setTimeout(mount, 1200);
  }
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later);
})();
