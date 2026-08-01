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

    // 2단계: 폼을 원래 주소(formsubmit.co)로 그대로 제출한다.
    //
    // 다만 submit()은 예외를 던지지 않고 그냥 페이지를 떠난다. 그 주소가 막혀 있으면
    // 브라우저 오류 화면이 뜨고, 담당자가 적어 둔 내용은 통째로 사라진다.
    // 관공서 망에서 외부 폼 서비스가 차단되는 경우가 있어 실제로 일어날 수 있는 일이다.
    // 그래서 떠나기 전에 입력값을 저장해 두고, 먼저 닿을 수 있는 주소인지 확인한다.
    if (form.action && !form.action.includes("/api/inquiry")) {
      try {
        sessionStorage.setItem("bomnal_inquiry_draft", JSON.stringify(payload));
      } catch {
        /* 저장 못 해도 진행한다. */
      }
      let reachable = true;
      try {
        // no-cors라 응답 내용은 볼 수 없지만, 연결 자체가 막히면 예외가 난다.
        await fetch(form.action, { method: "HEAD", mode: "no-cors", signal: AbortSignal.timeout(5000) });
      } catch {
        reachable = false;
      }
      if (reachable) {
        form.submit();
        return;
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
  if (new URLSearchParams(location.search).get("sent") === "1") {
    show(successBox);
    try {
      sessionStorage.removeItem("bomnal_inquiry_draft");
    } catch {
      /* 무시 */
    }
  } else {
    // 전송하다 페이지를 떠났다 돌아온 경우, 적어 둔 내용을 되살린다.
    // 다시 처음부터 타이핑하게 만들면 그대로 이탈한다.
    try {
      const draft = JSON.parse(sessionStorage.getItem("bomnal_inquiry_draft") || "null");
      if (draft && !form.organization.value) {
        for (const key of ["organization", "name", "phone", "email", "message"]) {
          if (form[key] && draft[key]) form[key].value = draft[key];
        }
        if (draft.budget) {
          const hit = [...form.querySelectorAll("[name=budget]")].find((r) => r.value === draft.budget);
          if (hit) hit.checked = true;
        }
        for (const v of draft.service || []) {
          const hit = [...form.querySelectorAll("[name=service]")].find((c) => c.value === v);
          if (hit) hit.checked = true;
        }
      }
    } catch {
      /* 복원 실패해도 빈 폼으로 계속 쓸 수 있다. */
    }
  }
})();
