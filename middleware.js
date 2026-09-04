import { COOKIE_NAME, readCookie, verifySession } from "./api/_auth.js";

/**
 * 보호 경로 접근을 서버(엣지)에서 차단합니다.
 * 자바스크립트로 메뉴만 숨기는 방식은 보호가 되지 않으므로, 페이지 자체를 여기서 막습니다.
 */
export const config = {
  matcher: ["/admin.html", "/admin", "/client.html", "/client", "/studio.html", "/studio"],
};

const ADMIN_ONLY = ["/admin.html", "/admin"];

export default async function middleware(request) {
  const url = new URL(request.url);
  const secret = process.env.AUTH_SECRET;

  const token = readCookie(request.headers.get("cookie"), COOKIE_NAME);
  const session = secret ? await verifySession(token, secret) : null;

  const needsAdmin = ADMIN_ONLY.includes(url.pathname);

  if (!session || (needsAdmin && session.role !== "admin")) {
    // cleanUrls가 켜져 있어 /login.html은 다시 /login으로 308을 한 번 더 탄다.
    // 처음부터 확장자 없는 주소로 보내 왕복을 줄인다.
    const login = new URL("/login", url.origin);
    login.searchParams.set("next", url.pathname);
    if (session && needsAdmin) login.searchParams.set("denied", "1");
    // 쿠키는 들고 왔는데 세션이 없다는 것은 만료되었거나 위조된 경우다.
    // 아무 설명 없이 로그인 화면만 뜨면 방금 로그인한 사람은 영문을 모른다.
    else if (!session && token) login.searchParams.set("expired", "1");
    return Response.redirect(login, 307);
  }

  return undefined; // 인증 통과. 원래 요청을 그대로 진행합니다.
}
