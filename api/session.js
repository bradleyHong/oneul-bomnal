import { COOKIE_NAME, readCookie, verifySession } from "./_auth.js";

export const config = { runtime: "edge" };

/** 현재 로그인 상태를 반환합니다. 헤더의 메뉴 노출에 사용됩니다. */
export default async function handler(request) {
  const secret = process.env.AUTH_SECRET;
  const token = readCookie(request.headers.get("cookie"), COOKIE_NAME);
  const session = await verifySession(token, secret);

  return new Response(
    JSON.stringify(
      session
        ? { loggedIn: true, role: session.role, org: session.org, id: session.id }
        : { loggedIn: false }
    ),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}
