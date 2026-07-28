import {
  cookieHeader,
  readMembers,
  safeEqual,
  sessionPayload,
  sha256Hex,
  signSession,
} from "./_auth.js";

export const config = { runtime: "edge" };

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return json({ error: "서버에 인증 설정이 없습니다. 관리자에게 문의해주세요." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }

  const id = String(body?.id ?? "").trim();
  const pw = String(body?.pw ?? "");
  if (!id || !pw) return json({ error: "아이디와 비밀번호를 입력해주세요." }, 400);

  const pwHash = await sha256Hex(pw);

  // 1) 관리자
  const adminId = process.env.ADMIN_ID;
  const adminHash = process.env.ADMIN_PW_HASH;
  if (adminId && adminHash && safeEqual(id, adminId) && safeEqual(pwHash, adminHash)) {
    const token = await signSession(sessionPayload({ role: "admin", id, org: "오늘은 봄날" }), secret);
    return json({ ok: true, role: "admin", org: "오늘은 봄날", redirect: "/admin.html" }, 200, {
      "set-cookie": cookieHeader(token),
    });
  }

  // 2) 회원사
  const member = readMembers(process.env).find((m) => safeEqual(String(m.id ?? ""), id));
  if (member && member.pwHash && safeEqual(pwHash, String(member.pwHash))) {
    const token = await signSession(
      sessionPayload({ role: "member", id, org: member.org || id }),
      secret
    );
    return json(
      { ok: true, role: "member", org: member.org || id, redirect: "/client.html" },
      200,
      { "set-cookie": cookieHeader(token) }
    );
  }

  // 아이디 존재 여부를 알려주지 않도록 동일한 메시지를 반환합니다.
  return json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);
}
