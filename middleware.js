import { COOKIE_NAME, readCookie, verifySession } from "./api/_auth.js";

/**
 * 보호 경로 접근을 서버(엣지)에서 차단합니다.
 * 자바스크립트로 메뉴만 숨기는 방식은 보호가 되지 않으므로, 페이지 자체를 여기서 막습니다.
 */
export const config = {
  matcher: ["/admin.html", "/admin", "/client.html", "/client"],
};

const ADMIN_ONLY = ["/admin.html", "/admin"];

export default async function middleware(request) {
  const url = new URL(request.url);
  const secret = process.env.AUTH_SECRET;

  const token = readCookie(request.headers.get("cookie"), COOKIE_NAME);
  const session = secret ? await verifySession(token, secret) : null;

  const needsAdmin = ADMIN_ONLY.includes(url.pathname);

  if (!session || (needsAdmin && session.role !== "admin")) {
    const login = new URL("/login.html", url.origin);
    login.searchParams.set("next", url.pathname);
    if (session && needsAdmin) login.searchParams.set("denied", "1");
    return Response.redirect(login, 307);
  }

  return undefined; // 인증 통과. 원래 요청을 그대로 진행합니다.
}
