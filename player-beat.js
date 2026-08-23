/* 봄날 미디어박스 — 재생 맥박(heartbeat)
 *
 * 아트 페이지에 얹어두면 부모 플레이어에게 "나 그리고 있다"를 계속 알린다.
 * 페이지가 멈추면 requestAnimationFrame도 같이 멈추므로 신호가 끊긴다.
 * 플레이어는 그 끊김을 보고 다음 작품으로 넘어간다.
 *
 * 화면이 얼어붙는 고장은 로드 실패와 달리 겉으로는 멀쩡해 보인다.
 * 관공서 로비에서 며칠씩 같은 프레임이 걸려 있는 사고를 막으려면
 * "떴는가"가 아니라 "지금도 그리고 있는가"를 봐야 한다.
 */
(function () {
  "use strict";

  // 플레이어 iframe 안이 아니면 할 일이 없다. 직접 열어본 경우다.
  if (window.parent === window) return;

  var BEAT_MS = 1000; // 1초에 한 번이면 충분하다. 더 자주 보내도 얻는 게 없다.
  var last = 0;
  var frames = 0;

  function beat(now) {
    frames += 1;
    if (now - last >= BEAT_MS) {
      try {
        window.parent.postMessage(
          {
            type: "bomnal:beat",
            href: location.pathname,
            // 지난 1초 동안 그린 프레임 수. 60에 가까우면 정상이고
            // 한 자리로 떨어져 있으면 화면이 버거워하고 있다는 뜻이다.
            frames: frames,
            at: now
          },
          location.origin
        );
      } catch (err) {
        /* 부모가 다른 출처면 조용히 포기한다. 재생 자체를 막을 이유는 없다. */
      }
      last = now;
      frames = 0;
    }
    requestAnimationFrame(beat);
  }

  requestAnimationFrame(beat);

  // 스크립트 오류도 부모에게 알린다. 현장에서 콘솔을 열어볼 사람은 없다.
  window.addEventListener("error", function (event) {
    try {
      window.parent.postMessage(
        {
          type: "bomnal:error",
          href: location.pathname,
          message: String((event && event.message) || "unknown error")
        },
        location.origin
      );
    } catch (err) {
      /* 무시 */
    }
  });
})();
