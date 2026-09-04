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
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });

/**
 * 같은 IP의 연속 실패를 제한합니다.
 *
 * 제한이 없을 때 실패 20회가 150ms에 끝나는 것을 확인했습니다. 계정이 몇 개뿐이라
 * 흔한 비밀번호를 대입하면 뚫릴 수 있는 속도입니다.
 *
 * 엣지 함수는 인스턴스가 여러 개라 이 메모리 계수기는 완벽한 차단이 아닙니다.
 * 다만 한 인스턴스에서 초당 수백 번 시도하는 것은 막아 주고, 실패에 지연을 주어
 * 전체 시도 속도를 크게 떨어뜨립니다. 계정 수가 늘면 KV 같은 공용 저장소로 옮겨야 합니다.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 8;
const attempts = new Map();

function clientKey(request) {
  const fwd = request.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

function tooMany(key) {
  const rec = attempts.get(key);
  if (!rec) return 0;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(key);
    return 0;
  }
  return rec.count;
}

function noteFail(key) {
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else rec.count += 1;
  // 오래된 기록이 쌓이지 않게 정리합니다.
  if (attempts.size > 5000) {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [k, v] of attempts) if (v.first < cutoff) attempts.delete(k);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);

  const key = clientKey(request);
  const fails = tooMany(key);
  if (fails >= MAX_FAILS) {
    return json(
      { error: "로그인 시도가 너무 많습니다. 10분 후에 다시 시도해주세요." },
      429,
      { "retry-after": "600" }
    );
  }

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
    attempts.delete(key); // 성공하면 실패 기록을 지웁니다.
    const token = await signSession(sessionPayload({ role: "admin", id, org: "오늘은 봄날" }), secret);
    return json({ ok: true, role: "admin", org: "오늘은 봄날", redirect: "/admin.html" }, 200, {
      "set-cookie": cookieHeader(token),
    });
  }

  // 2) 회원사
  const member = readMembers(process.env).find((m) => safeEqual(String(m.id ?? ""), id));
  if (member && member.pwHash && safeEqual(pwHash, String(member.pwHash))) {
    attempts.delete(key);
    const token = await signSession(
      sessionPayload({ role: "member", id, org: member.org || id }),
      secret
    );
    return json(
      { ok: true, role: "member", org: member.org || id, redirect: "/studio.html" },
      200,
      { "set-cookie": cookieHeader(token) }
    );
  }

  // 실패는 기록하고, 대입 속도를 떨어뜨리기 위해 조금 지연시킵니다.
  noteFail(key);
  await sleep(400 + fails * 250);

  // 아이디 존재 여부를 알려주지 않도록 동일한 메시지를 반환합니다.
  return json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);
}
