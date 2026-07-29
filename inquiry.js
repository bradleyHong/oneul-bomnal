/**
 * 문의폼 전송.
 *
 * 담당자가 "보냈다"고 생각했는데 아무 데도 도착하지 않는 상황을 막는 것이
 * 이 파일의 목적입니다. 세 겹으로 받습니다.
 *
 *   1) /api/inquiry 로 보냅니다. 서버가 접수 기록을 남기고 메일을 발송합니다.
 *   2) 실패하면 폼을 원래 방식(formsubmit.co)으로 그대로 제출합니다.
 *   3) 그것도 막히면 메일 앱을 열어 내용을 채워 줍니다. 최소한 담당자 손에는 남습니다.
 *
 * 자바스크립트가 꺼져 있으면 이 파일이 아예 실행되지 않고
 * 폼의 action 속성대로 평소처럼 제출됩니다.
 */
(() => {
  const form = document.querySelector("#contactForm");
  if (!form) return;

  const button = form.querySelector('button[type="submit"]');
  const successBox = form.querySelector(".form-success");
  const errorBox = form.querySelector(".form-error");
  const buttonLabel = button ? button.textContent : "";

  const show = (box, text) => {
    if (!box) return;
    if (text) box.textContent = text;
    box.hidden = false;
    box.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const hide = (box) => {
    if (box) box.hidden = true;
  };

  const collect = () => {
    const data = new FormData(form);
    return {
      organization: data.get("organization") || "",
      name: data.get("name") || "",
      phone: data.get("phone") || "",
      email: data.get("email") || "",
      service: data.getAll("service"),
      budget: data.get("budget") || "",
      message: data.get("message") || "",
      _honey: data.get("_honey") || "",
      page: location.pathname + location.hash,
    };
  };

  /** 마지막 수단 · 메일 앱에 내용을 채워 연다. */
  const openMailApp = (payload) => {
    const body = [
      `기관이름: ${payload.organization}`,
      `담당자 성함: ${payload.name}`,
      `연락처: ${payload.phone}`,
      `이메일: ${payload.email}`,
      `관심 항목: ${payload.service.join(", ") || "선택 없음"}`,
      `희망 대수: ${payload.budget || "미선택"}`,
      "",
      "문의 내용:",
      payload.message || "",
    ].join("\n");
    const subject = encodeURIComponent("[오늘은 봄날] 공공 프로젝트 문의");
    window.location.href = `mailto:visionpencil@gmail.com?subject=${subject}&body=${encodeURIComponent(body)}`;
  };

  form.addEventListener("submit", async (event) => {
    // 브라우저 기본 검사를 통과하지 못하면 그대로 둔다.
    if (typeof form.reportValidity === "function" && !form.reportValidity()) return;

    event.preventDefault();
    hide(successBox);
    hide(errorBox);

    if (button) {
      button.disabled = true;
      button.textContent = "보내는 중…";
    }

    const payload = collect();
    let sent = false;

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      sent = res.ok;
    } catch {
      // 네트워크 실패 · 아래 대체 경로로 넘어간다.
    }

    if (sent) {
      form.reset();
      show(successBox);
      if (button) {
        button.disabled = false;
        button.textContent = buttonLabel;
      }
      return;
    }

    // 2단계: 폼을 원래 주소로 그대로 제출한다.
    // submit()은 이 핸들러를 다시 부르지 않으므로 무한 반복되지 않는다.
    if (form.action && !form.action.includes("/api/inquiry")) {
      try {
        form.submit();
        return;
      } catch {
        // 아래 3단계로
      }
    }

    // 3단계
    if (button) {
      button.disabled = false;
      button.textContent = buttonLabel;
    }
    show(
      errorBox,
      "전송이 원활하지 않습니다. 메일 앱을 열어 내용을 담아드릴게요. 열리지 않으면 010-4292-1999로 연락 주세요."
    );
    openMailApp(payload);
  });

  // formsubmit이 _next로 되돌려보낸 경우에도 성공 문구를 보여준다.
  if (new URLSearchParams(location.search).get("sent") === "1") show(successBox);
})();
