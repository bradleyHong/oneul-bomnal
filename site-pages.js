const proposalButtons = document.querySelectorAll("[data-proposal]");
const proposalPanels = document.querySelectorAll("[data-panel]");

proposalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.proposal;
    proposalButtons.forEach((item) => item.classList.toggle("active", item === button));
    proposalPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === target);
    });
  });
});

const contactForm = document.querySelector("#contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(contactForm);
    const services = form.getAll("service").join(", ") || "선택 없음";
    const body = [
      `기관이름: ${form.get("organization") || ""}`,
      `담당자 성함: ${form.get("name") || ""}`,
      `연락처: ${form.get("phone") || ""}`,
      `이메일: ${form.get("email") || ""}`,
      `사업영역: ${services}`,
      `예산: ${form.get("budget") || ""}`,
      "",
      "문의 내용:",
      form.get("message") || "",
    ].join("\n");
    const subject = encodeURIComponent("[오늘은 봄날] 공공 프로젝트 문의");
    window.location.href = `mailto:hello@oneulbomnal.kr?subject=${subject}&body=${encodeURIComponent(body)}`;
  });
}
