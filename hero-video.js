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

  /* 공개 목록에 올리지 않은 영상은 주소 뒤에 붙은 열쇠말까지 넘겨야
     재생기가 열어 준다. 번호만 넘기면 "비공개 영상" 판이 뜬다. */
  var key = String(box.dataset.heroHash || "").replace(/[^0-9a-z]/gi, "");

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
            (key ? "?h=" + key + "&" : "?") +
            "background=1&autoplay=1&loop=1&muted=1&autopause=0&dnt=1";
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

/*
 * 작업 영상 카드.
 *
 * 세 편을 마크업에 미리 박아 두면 이 페이지가 남의 집 재생기를 셋이나
 * 함께 불러온다. 아래쪽에 있어 보이지도 않는 것 때문에 첫 화면이 늦다.
 *
 * 그래서 누른 그 카드만 재생기로 바뀐다. 누르기 전에는 색과 글자뿐이라
 * 내려받는 것이 없다. 썸네일 그림조차 없다.
 *
 * 처음에는 "재생 신호를 받은 뒤에만 재생기를 보여 준다"로 두었다.
 * 회색 판이 걸리는 것을 막으려던 것인데, 그게 더 나쁜 고장을 만들었다.
 *
 * 히어로는 muted 로 돌아 자동재생이 늘 허용되고 신호가 온다. 이 카드들은
 * 소리가 있어 자동재생이 거부될 수 있고, 그러면 신호가 오지 않는다.
 * 신호가 없으니 빗장이 안 열리고, 누른 사람에게는 아무 일도 일어나지
 * 않은 것처럼 보였다. 실제로 "안 들어갔다"는 말을 들었다.
 *
 * 고칠 자리는 "기다린다"가 아니라 "무엇을 기다리는가"였다. play 가
 * 아니라 ready 를 기다리면 된다. ready 는 재생기가 자리를 잡았다는
 * 접속 인사라 자동재생 허가와 상관없이 곧바로 온다.
 *
 * 그래서 ready 에 연다. 회색 판이 스치는 일도 없다. 2.5초 안에 인사조차
 * 없으면(비공개·방화벽·embed 도메인 차단) 카드를 원래대로 되돌린다.
 * 'Vimeo에서 보기' 는 마크업에 늘 들어 있어 그때도 길이 남는다.
 */
(function () {
  "use strict";

  var cards = document.querySelectorAll("[data-film]");
  if (!cards.length) return;

  var VIMEO = "https://player.vimeo.com";

  /* 어느 재생기가 어느 카드 것인지 붙여 둔다. 창 전체로 오는 신호라
     보낸 쪽을 되짚을 방법이 이것뿐이다. */
  var mounted = [];

  window.addEventListener("message", function (e) {
    if (e.origin !== VIMEO) return;
    var d = e.data;
    if (typeof d === "string") { try { d = JSON.parse(d); } catch (err) { return; } }
    if (!d) return;

    for (var i = 0; i < mounted.length; i++) {
      var m = mounted[i];
      if (!m.frame.contentWindow || m.frame.contentWindow !== e.source) continue;
      /* 인사를 받았으면 거기 재생기가 있는 것이다. 그때 연다.
         play 를 기다리면 소리 있는 영상에서 자동재생이 거부될 때
         영영 열리지 않는다 — 처음에 그렇게 해서 안 열렸다. */
      if (!m.alive) {
        m.alive = true;
        clearTimeout(m.timer);
        m.box.classList.add("is-playing");
        m.btn.setAttribute("tabindex", "-1");
        m.btn.setAttribute("aria-hidden", "true");
        var n = m.btn.querySelector("small");
        if (n && m.note) n.textContent = m.note;
      }
      if (d.event === "ready") {
        m.frame.contentWindow.postMessage({ method: "addEventListener", value: "play" }, VIMEO);
        m.frame.contentWindow.postMessage({ method: "addEventListener", value: "timeupdate" }, VIMEO);
      }
      if ((d.event === "play" || d.event === "timeupdate") && !m.moved) {
        /* 눌러서 연 사람은 지금 이 영상을 보려던 참이다. 화면이 실제로
           나온 뒤에 초점을 넘긴다. */
        m.moved = true;
        m.frame.focus();
      }
      return;
    }
  });

  /* 카드에 무엇이 든 영상인지 보이게 한다.
     썸네일을 저장소에 미리 넣어 둘 수가 없다 — 만드는 자리에서는
     vimeo 에 닿지 못한다. 손님의 브라우저는 닿으므로 그 자리에서
     oEmbed 로 받아 건다. 못 받으면 지금까지처럼 색과 글자만 남는다. */
  function poster(btn) {
    var box = btn.parentNode;
    if (!box || box.querySelector(".film-poster") || !window.fetch) return;
    var id = String(btn.dataset.film || "").replace(/[^0-9]/g, "");
    if (!id) return;
    var key = String(btn.dataset.filmHash || "").replace(/[^0-9a-z]/gi, "");
    var page = "https://vimeo.com/" + id + (key ? "/" + key : "");
    fetch("https://vimeo.com/api/oembed.json?width=960&url=" + encodeURIComponent(page))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.thumbnail_url || box.querySelector(".film-poster")) return;
        var img = new Image();
        img.className = "film-poster";
        img.alt = "";
        img.decoding = "async";
        img.addEventListener("load", function () {
          if (box.querySelector(".film-poster")) return;
          box.insertBefore(img, box.firstChild);
          box.classList.add("has-poster");
        });
        img.src = d.thumbnail_url;
      })
      .catch(function () { /* 못 받으면 카드는 원래 모습대로 */ });
  }

  /* 화면에 들어오기 한 뼘 전에 받는다. 넷을 한꺼번에 받으면 아래쪽에
     있어 보이지도 않는 것 때문에 첫 화면이 늦어진다. */
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        poster(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: "60% 0px" });
    Array.prototype.forEach.call(cards, function (b) { io.observe(b); });
  } else {
    Array.prototype.forEach.call(cards, poster);
  }

  /** 카드 하나를 재생기로 바꾼다.
      bg 가 참이면 소리 없이 저절로 도는 배경 재생기다. 단추도 로고도 없다. */
  function open(btn, bg) {
      var box = btn.parentNode;
      if (!box || box.querySelector("iframe")) return;

      var id = String(btn.dataset.film || "").replace(/[^0-9]/g, "");
      if (!id) return;

      /* 히어로와 같은 이유로 열쇠말을 함께 넘긴다. */
      var key = String(btn.dataset.filmHash || "").replace(/[^0-9a-z]/gi, "");
      var name = btn.querySelector(".film-name");

      var f = document.createElement("iframe");
      f.src = VIMEO + "/video/" + id +
              (key ? "?h=" + key + "&" : "?") +
              (bg ? "background=1&autoplay=1&loop=1&muted=1&autopause=0&dnt=1"
                  : "autoplay=1&title=0&byline=0&portrait=0&dnt=1");
      f.title = name ? name.textContent.trim() : "작업 영상";
      f.setAttribute("frameborder", "0");
      f.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
      if (bg) {
        /* 배경으로 도는 것은 눌러서 볼 것이 아니다. 초점이 여기 걸리면
           탭으로 넘어가다 재생기 속에 갇힌다. 옆의 'Vimeo에서 보기' 가
           제 길이다. */
        f.setAttribute("tabindex", "-1");
        f.setAttribute("aria-hidden", "true");
      } else {
        f.setAttribute("allowfullscreen", "");
      }

      box.appendChild(f);
      /* 아직 보여 주지 않는다. 재생기가 인사할 때까지 카드가 그대로
         있어야 반쯤 그려진 회색 판이 스치지 않는다. */
      var m = { box: box, btn: btn, frame: f, moved: bg, alive: false };
      mounted.push(m);

      /* 인사가 올 때까지 카드는 그대로다. 아무 표시가 없으면 누른 사람은
         눌리지 않았다고 생각하고 또 누른다. 작은 글씨만 바꿔 둔다. */
      var note = btn.querySelector("small");
      if (note && !bg) { m.note = note.textContent; note.textContent = "불러오는 중…"; }

      /* 재생기가 인사조차 하지 않으면 거기 아무것도 없는 것이다.
         비공개 영상이거나, 기관 방화벽이 vimeo 를 막았거나, 이 영상의
         '어디에 embed 할 수 있는가' 설정이 우리 도메인을 막고 있다.
         회색 판을 남겨 두는 대신 카드를 되돌리고 직접 열 길을 낸다. */
      m.timer = setTimeout(function () {
        if (m.alive) return;
        box.classList.remove("is-playing");
        box.classList.add("is-stuck");
        btn.removeAttribute("tabindex");
        btn.removeAttribute("aria-hidden");
        if (f.parentNode) f.parentNode.removeChild(f);
        var n2 = btn.querySelector("small");
        if (n2) n2.textContent = "여기서는 열리지 않습니다 · Vimeo에서 보기";

        /* 'Vimeo에서 보기' 는 마크업에 늘 들어 있다. 재생 중에만 감춰
           두었던 것이므로 is-playing 을 뗀 것으로 다시 보인다. */
      }, 4500);
  }

  Array.prototype.forEach.call(cards, function (btn) {
    btn.addEventListener("click", function () { open(btn, false); });
  });

  /* ── 저절로 도는 자리 ──────────────────────────────────────
     첫 화면 아래의 Artwork 셋은 눌러 주기를 기다리지 않는다. 화면에
     들어오면 소리 없이 돌기 시작한다.

     그래도 셋을 한꺼번에 붙이지는 않는다. 남의 집 재생기 셋이 동시에
     도는 것은 손전화에서 감당이 안 되고, 무엇보다 첫 화면이 늦어진다.
     보이는 것만 붙이고, 화면을 벗어나면 떼어 낸다. 다시 들어오면 다시
     붙는다 — 처음부터 다시 도는 셈인데, 5초짜리 반복이라 티가 안 난다.

     움직임을 줄여 달라고 한 분에게는 붙이지 않는다. 그 화면에서는
     지금까지처럼 썸네일 위의 재생 단추를 눌러 보시면 된다. */
  var slow = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var auto = document.querySelectorAll("[data-films-auto] [data-film]");
  if (auto.length && window.IntersectionObserver && !(slow && slow.matches)) {
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var btn = e.target, box = btn.parentNode;
        if (e.isIntersecting) { open(btn, true); return; }
        /* 나갔으면 떼어 낸다. 기다리던 시계도 같이 끈다. */
        var f2 = box && box.querySelector("iframe");
        if (!f2) return;
        for (var i = mounted.length - 1; i >= 0; i--) {
          if (mounted[i].frame !== f2) continue;
          clearTimeout(mounted[i].timer);
          mounted.splice(i, 1);
        }
        f2.parentNode.removeChild(f2);
        box.classList.remove("is-playing");
        btn.removeAttribute("tabindex");
        btn.removeAttribute("aria-hidden");
      });
    }, { rootMargin: "10% 0px" });
    Array.prototype.forEach.call(auto, function (b) { io2.observe(b); });
  }
})();

/*
 * 실적 흐름.
 *
 * 사진 아홉 장을 두 벌 이어 붙여 왼쪽으로 흘린다. 그 자체는 CSS 가 다
 * 한다. 여기서 하는 일은 하나뿐이다 — 언제 시작할지.
 *
 * lazy 로 걸어 둔 사진은 화면 가까이 와야 받아진다. 그런데 이 줄은
 * 스크롤이 아니라 transform 으로 지나간다. 브라우저는 스크롤할 때
 * 다시 재지, 애니메이션이 도는 동안 다시 재지 않는다. 그래서 열여덟
 * 장 중 여섯 장만 받아지고 나머지는 빈 칸으로 지나갔다. 실측했다.
 *
 * 줄이 화면 가까이 오면 그때 전부 eager 로 바꿔 받고, 다 받은 뒤에
 * 흐르기 시작한다. 첫 화면에서는 아무것도 안 받는다.
 */
(function () {
  "use strict";

  var flow = document.querySelector(".ref-flow");
  if (!flow) return;
  var imgs = flow.querySelectorAll("img");
  if (!imgs.length) return;

  function start() {
    Array.prototype.forEach.call(imgs, function (im) { im.loading = "eager"; });
    /* 다 받을 때까지 기다린다. 받으면서 흐르면 빈 칸이 지나간다.
       한 장이라도 끝내 안 오면(느린 망) 2초 뒤 그냥 시작한다. */
    var left = imgs.length;
    var went = false;
    function go() { if (went) return; went = true; flow.classList.add("is-live"); }
    Array.prototype.forEach.call(imgs, function (im) {
      if (im.complete && im.naturalWidth) { if (--left <= 0) go(); return; }
      im.addEventListener("load", function () { if (--left <= 0) go(); });
      im.addEventListener("error", function () { if (--left <= 0) go(); });
    });
    setTimeout(go, 2000);
  }

  if (!window.IntersectionObserver) { start(); return; }
  var io = new IntersectionObserver(function (es) {
    if (!es.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    start();
  }, { rootMargin: "40% 0px" });
  io.observe(flow);
})();
