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
const formSuccess = document.querySelector(".form-success");
if (formSuccess && new URLSearchParams(window.location.search).get("sent") === "1") {
  formSuccess.hidden = false;
  formSuccess.scrollIntoView({ block: "center" });
}

const sitePreviewModal = document.querySelector("#sitePreviewModal");
const sitePreviewImage = document.querySelector("#sitePreviewImage");
const sitePreviewTitle = document.querySelector("#sitePreviewTitle");
const sitePreviewLink = document.querySelector("#sitePreviewLink");

function closeSitePreview() {
  if (!sitePreviewModal) return;
  sitePreviewModal.hidden = true;
  document.body.style.overflow = "";
  if (sitePreviewImage) sitePreviewImage.removeAttribute("src");
}

document.querySelectorAll("[data-site-url]").forEach((card) => {
  const openPreview = () => {
    const url = card.dataset.siteUrl;
    const image = card.dataset.siteImage;
    const title = card.dataset.siteTitle || card.textContent.trim();
    if (!sitePreviewModal || !sitePreviewImage || !sitePreviewTitle || !sitePreviewLink || !url || !image) return;
    sitePreviewTitle.textContent = title;
    sitePreviewImage.src = image;
    sitePreviewImage.alt = `${title} 메인 화면 미리보기`;
    sitePreviewLink.href = url;
    sitePreviewModal.hidden = false;
    document.body.style.overflow = "hidden";
  };
  card.addEventListener("click", openPreview);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPreview();
    }
  });
});

document.querySelectorAll("[data-modal-close]").forEach((button) => {
  button.addEventListener("click", closeSitePreview);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSitePreview();
});

if (contactForm && !contactForm.action.includes("formsubmit.co")) {
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
