/* AI 영상 의뢰 접수.
   기존 문의 창구(/api/inquiry)를 그대로 쓴다. 새 통로를 파면 관리할 곳이
   둘이 되고, 하나는 반드시 잊힌다. 대신 항목을 사람이 읽는 순서로 묶어
   본문에 담는다. */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector("[data-av-form]");
    if (!form) return;
    var btn = form.querySelector("[data-av-send]");
    var msg = form.querySelector("[data-av-msg]");

    function say(t, tone) {
      msg.textContent = t;
      if (tone) msg.setAttribute("data-tone", tone);
      else msg.removeAttribute("data-tone");
    }
    function val(n) { return String((new FormData(form)).get(n) || "").trim(); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var org = val("organization"), name = val("name"), email = val("email");
      if (!org) { say("기관·상호를 적어 주세요.", "err"); return; }
      if (!name) { say("담당자 성함을 적어 주세요.", "err"); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say("이메일 주소를 다시 확인해 주세요.", "err"); return; }
      if (!(new FormData(form)).get("consentRequired")) { say("견적 회신을 위한 수집 동의가 필요합니다.", "err"); return; }

      var marketing = (new FormData(form)).get("consentMarketing") ? "동의함" : "동의하지 않음";
      var body = [
        "영상 길이: " + val("length"),
        "",
        "캐릭터: " + (val("character") || "-"),
        "배경: " + (val("background") || "-"),
        "스토리라인: " + (val("story") || "-"),
        "꼭 들어가야 하는 대사: " + (val("lines") || "-"),
        "현장 화면·공간 크기: " + (val("screen") || "-"),
        "그 밖에: " + (val("etc") || "-"),
        "",
        "[동의 기록] 개인정보 수집·이용: 동의함 / 광고성 정보 수신: " + marketing
      ].join("\n");

      btn.disabled = true;
      say("보내는 중…");
      fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organization: org, name: name, email: email, phone: val("phone"),
          service: ["AI 미디어아트 영상 제작"], budget: val("length"),
          page: "ai-video", message: body
        })
      })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
        .then(function () {
          form.reset();
          say("접수했습니다. 영업일 이틀 안에 견적과 일정을 보내드리겠습니다. 자료 파일은 회신 메일에 붙여 주세요.", "ok");
        })
        .catch(function () {
          btn.disabled = false;
          say("전송이 되지 않았습니다. 010-4292-1999 또는 studio@publicbloom.art로 보내 주세요.", "err");
        });
    });
  });
})();
