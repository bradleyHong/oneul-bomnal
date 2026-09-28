/* 장면 목록. 새 장면은 파일을 하나 만들고 여기 한 줄 더한다.
   렌더 스크립트와 미리보기 화면이 이 순서대로 읽는다. */
(function () {
  var LIST = ["chrome", "moonjar", "crystal", "stones", "gyroid", "ribbon", "colonnade", "ocean", "lanterns", "mountains", "tunnel"];
  /* 동기로 불러온다. 캡처는 __READY__ 를 기다리므로, 목록이 다 올라온 뒤에
     엔진이 장면을 찾아야 한다. document.write 는 파싱 중에만 동기다. */
  LIST.forEach(function (id) {
    document.write('<script src="./scenes/' + id + '.js"><\/script>');
  });
  window.DepthSceneList = LIST;
})();
