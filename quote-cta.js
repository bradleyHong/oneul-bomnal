/* 견적문의 상시 버튼
 *
 * 공공기관 담당자는 페이지를 한참 읽어 내려간 뒤에 문의를 결정합니다.
 * 그때 상단 메뉴까지 되돌아가게 하지 않고, 화면 오른쪽 아래에 계속 띄워둡니다.
 *
 * 각 페이지 HTML을 건드리지 않고 이 파일 하나로 붙입니다.
 */
(function () {
  "use strict";

  // 견적문의 페이지에는 폼이 이미 화면에 있으므로 띄우지 않는다.
  // 같은 자리에 겹쳐서 입력을 가리기만 한다.
  var path = location.pathname.replace(/\.html$/, "");
  if (path === "/quote") return;

  function mount() {
    if (document.querySelector(".quote-fab")) return;

    var a = document.createElement("a");
    a.className = "quote-fab";
    a.href = "./quote";
    a.setAttribute("aria-label", "견적문의하기");
    a.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M4 5h16v11H8l-4 4V5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
      "</svg>" +
      "<span>견적문의</span>";

    // 같은 페이지에 문의 폼이 있으면 페이지를 새로 열지 않고 그 폼으로 데려간다.
    // 스크롤은 브라우저에 맡긴다. styles.css의 scroll-behavior가 부드럽게 처리하고,
    // 자바스크립트로 가로채면 스크롤이 막혔을 때 버튼이 통째로 먹통이 된다.
    var form = document.getElementById("inquiry-form");
    if (form) a.href = "#inquiry-form";

    document.body.appendChild(a);

    // 문의 폼이 이미 화면에 보이는 동안에는 버튼을 숨긴다.
    // 폼 위에 같은 버튼이 떠 있으면 무엇을 눌러야 할지 헷갈린다.
    if (form && "IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            a.classList.toggle("is-hidden", entry.isIntersecting);
          });
        },
        { rootMargin: "-20% 0px -20% 0px" }
      ).observe(form);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
