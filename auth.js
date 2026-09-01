/**
 * 로그인 상태에 따라 헤더 메뉴를 조정합니다.
 *
 * 주의: 이 스크립트는 화면 표시만 담당합니다. 실제 접근 차단은 middleware.js가
 * 서버(엣지)에서 수행하므로, 메뉴가 보이지 않아도 보호는 유지됩니다.
 */
(() => {
  const NAV_SELECTOR = "#main-nav, .site-nav nav";

  async function fetchSession() {
    try {
      const res = await fetch("/api/session", { cache: "no-store" });
      if (!res.ok) return { loggedIn: false };
      return await res.json();
    } catch {
      return { loggedIn: false };
    }
  }

  function makeLink(href, text, cls) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    if (cls) a.className = cls;
    return a;
  }

  function bindLogout(root = document) {
    root.querySelectorAll("[data-logout]").forEach((el) => {
      if (el.dataset.logoutBound) return;
      el.dataset.logoutBound = "1";
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await fetch("/api/logout", { method: "POST" });
        } catch {
          /* 실패해도 로그인 화면으로 보냅니다. */
        }
        location.href = "/";
      });
    });
  }

  async function applyNav() {
    const nav = document.querySelector(NAV_SELECTOR);
    const session = await fetchSession();

    document.body.dataset.authRole = session.loggedIn ? session.role : "guest";

    if (!nav) {
      bindLogout();
      return;
    }

    // 중복 삽입 방지
    nav.querySelectorAll("[data-auth-link]").forEach((el) => el.remove());

    if (!session.loggedIn) {
      const login = makeLink("./login", "로그인", "nav-auth-login");
      login.dataset.authLink = "guest";
      nav.appendChild(login);
      bindLogout();
      return;
    }

    if (session.role === "admin") {
      const admin = makeLink("./admin", "관제 프로그램", "nav-auth-admin");
      admin.dataset.authLink = "admin";
      nav.appendChild(admin);
    } else {
      const client = makeLink("./client", "회원사 페이지", "nav-auth-member");
      client.dataset.authLink = "member";
      nav.appendChild(client);
    }

    // 제작 AX는 관리자와 회원사 담당자가 같이 씁니다.
    const studio = makeLink("./ax-studio", "제작 AX", "nav-auth-studio");
    studio.dataset.authLink = "studio";
    nav.appendChild(studio);

    const who = document.createElement("a");
    who.href = "#";
    who.className = "nav-auth-logout";
    who.dataset.authLink = "logout";
    who.dataset.logout = "1";
    who.textContent = `${session.org || session.id} 로그아웃`;
    nav.appendChild(who);

    bindLogout();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyNav);
  } else {
    applyNav();
  }
})();
