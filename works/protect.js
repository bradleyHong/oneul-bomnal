/*
 * 작품 화면 보호.
 *
 * 브라우저로 보낸 코드는 원리상 완전히 감출 수 없다. 여기서 하는 일은
 * 우클릭 저장·소스보기·드래그 같은 손쉬운 반출을 막고 저작권을 명시하는 것까지다.
 * 완전한 보호가 필요한 작품은 코드를 보내지 말고 렌더링한 영상(mp4)만 납품한다.
 */
(function () {
  "use strict";

  var NOTICE = "이 화면은 오늘은 봄날(publicbloom.art)의 저작물입니다. 무단 복제·배포·재사용을 금합니다.";

  document.addEventListener("contextmenu", function (e) { e.preventDefault(); }, { capture: true });
  document.addEventListener("dragstart", function (e) { e.preventDefault(); }, { capture: true });
  document.addEventListener("selectstart", function (e) { e.preventDefault(); }, { capture: true });

  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    var ctrl = e.ctrlKey || e.metaKey;
    // 소스보기 · 저장 · 개발자도구 단축키
    if (k === "f12") return e.preventDefault();
    if (ctrl && (k === "u" || k === "s")) return e.preventDefault();
    if (ctrl && e.shiftKey && (k === "i" || k === "j" || k === "c")) return e.preventDefault();
  }, { capture: true });

  if (window.top === window.self) {
    try { console.log("%c" + NOTICE, "color:#e8e4da;background:#111;padding:6px 10px;font-size:13px"); } catch (err) {}
  }
})();
