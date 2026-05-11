/* 햄버거 메뉴 */
const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.getElementById('main-nav');
if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    mainNav.classList.toggle('open', !expanded);
    navToggle.setAttribute('aria-label', !expanded ? '메뉴 닫기' : '메뉴 열기');
  });
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false');
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-label', '메뉴 열기');
    });
  });
  document.addEventListener('click', (e) => {
    if (!navToggle.contains(e.target) && !mainNav.contains(e.target)) {
      navToggle.setAttribute('aria-expanded', 'false');
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-label', '메뉴 열기');
    }
  });
}

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
    window.location.href = `mailto:visionpencil@gmail.com?subject=${subject}&body=${encodeURIComponent(body)}`;
  });
}
