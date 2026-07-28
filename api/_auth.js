/**
 * 오늘은 봄날 인증 공통 모듈
 *
 * - 비밀번호는 서버에 평문으로 두지 않고 SHA-256 해시(환경변수)로만 보관합니다.
 * - 로그인 성공 시 HMAC 서명된 세션 쿠키를 발급하고, 미들웨어가 이 서명을 검증합니다.
 * - 환경변수가 없으면 로그인을 거부합니다(fail closed).
 *
 * 필요한 환경변수
 *   AUTH_SECRET       : 쿠키 서명용 임의의 긴 문자열
 *   ADMIN_ID          : 관리자 아이디
 *   ADMIN_PW_HASH     : 관리자 비밀번호의 SHA-256 hex
 *   MEMBER_ACCOUNTS   : 회원사 계정 JSON 배열
 *                       [{"id":"bukgu","org":"대구 북구청","pwHash":"<sha256 hex>"}]
 */

export const COOKIE_NAME = "bomnal_session";
const SESSION_HOURS = 12;

const enc = new TextEncoder();

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return toHex(digest);
}

/** 타이밍 공격을 피하기 위해 길이·내용 비교를 상수 시간으로 수행합니다. */
export function safeEqual(a, b) {
  const x = String(a ?? "");
  const y = String(b ?? "");
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

const dec = new TextDecoder();

/** 바이트 배열을 base64url 문자열로 변환합니다. */
function bytesToB64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str) {
  const pad = str.length % 4 ? "=".repeat(4 - (str.length % 4)) : "";
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// 기관명 등 한글이 포함되므로 반드시 UTF-8로 인코딩한 뒤 base64를 적용합니다.
// (btoa는 Latin-1 범위 밖 문자를 만나면 예외를 던집니다.)
const b64url = (str) => bytesToB64url(enc.encode(str));
const b64urlDecode = (str) => dec.decode(b64urlToBytes(str));

/** payload를 서명해 "base64url(payload).base64url(signature)" 형태의 토큰을 만듭니다. */
export async function signSession(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return `${body}.${bytesToB64url(new Uint8Array(sig))}`;
}

/** 서명과 만료를 검증하고, 유효하면 payload를 반환합니다. */
export async function verifySession(token, secret) {
  if (!token || !secret) return null;
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  try {
    const key = await hmacKey(secret);
    const expected = await crypto.subtle.sign("HMAC", key, enc.encode(body));
    const expectedB64 = bytesToB64url(new Uint8Array(expected));
    if (!safeEqual(sig, expectedB64)) return null;
    const payload = JSON.parse(b64urlDecode(body));
    if (!payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionPayload({ role, id, org }) {
  return { role, id, org: org ?? "", exp: Date.now() + SESSION_HOURS * 3600 * 1000 };
}

export function cookieHeader(token, { clear = false } = {}) {
  const base = `${COOKIE_NAME}=${clear ? "" : token}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  return clear ? `${base}; Max-Age=0` : `${base}; Max-Age=${SESSION_HOURS * 3600}`;
}

export function readCookie(cookieString, name) {
  if (!cookieString) return null;
  for (const part of cookieString.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

/** 환경변수의 회원사 계정 목록을 안전하게 읽습니다. */
export function readMembers(env) {
  try {
    const parsed = JSON.parse(env.MEMBER_ACCOUNTS || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
