export const config = { runtime: "edge" };

/**
 * 오늘은 봄날 TV — Google 로그인.
 *
 *   POST /api/tv-login   { credential: "<Google ID 토큰>" }
 *   → 200 { ok, name, setup }  + 180일짜리 TV 쿠키
 *   → 403 구독 명단에 없는 계정 / 구독 기간이 끝난 계정
 *
 *   DELETE /api/tv-login  → 로그아웃 (쿠키 지움)
 */
import { signSession } from "./_auth.js";
import {
  verifyGoogleIdToken, readTvMembers, tvCookieHeader, TV_SESSION_DAYS,
} from "./_google.js";

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const today = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export default async function handler(req) {
  if (req.method === "DELETE") {
    return json({ ok: true }, 200, { "set-cookie": tvCookieHeader("", { clear: true }) });
  }
  if (req.method !== "POST") return json({ error: "POST 만 받습니다." }, 405);

  const secret = process.env.AUTH_SECRET;
  if (!secret) return json({ error: "서버 설정이 끝나지 않았습니다." }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: "요청 형식이 맞지 않습니다." }, 400); }

  let who;
  try { who = await verifyGoogleIdToken(body && body.credential); }
  catch { return json({ error: "Google 확인에 실패했습니다. 잠시 뒤 다시 시도해 주세요." }, 502); }
  if (!who) return json({ error: "Google 로그인을 확인하지 못했습니다." }, 401);

  const member = readTvMembers()[who.email];
  if (!member) {
    // 누가 들어오려 했는지는 남긴다. 구독 문의로 이어질 수 있는 사람이다.
    console.log("[tv-login] 명단에 없음", who.email);
    return json({ error: "구독 회원으로 등록된 계정이 아닙니다.", email: who.email }, 403);
  }
  if (member.until && today() > member.until) {
    return json({ error: "구독 기간이 끝났습니다.", until: member.until }, 403);
  }

  const token = await signSession(
    { role: "tv", id: who.email, org: member.name || "", exp: Date.now() + TV_SESSION_DAYS * 86400 * 1000 },
    secret
  );
  return json(
    { ok: true, name: member.name || who.name || who.email, setup: member.setup || "led" },
    200,
    { "set-cookie": tvCookieHeader(token) }
  );
}
