/**
 * Google 로그인 확인.
 *
 * 브라우저가 Google 에서 받아 온 ID 토큰(JWT)을 Google 이 공개한 서명 키로 검사한다.
 * 비밀 키(클라이언트 보안 비밀번호)는 쓰지 않는다. 서버에 둘 비밀이 없으니 샐 것도 없다.
 *
 * 확인하는 것
 *   - 서명이 Google 키로 된 것인가 (RS256)
 *   - 발급자가 Google 인가 (iss)
 *   - 우리 사이트용으로 발급된 것인가 (aud = 클라이언트 ID)
 *   - 만료되지 않았는가 (exp)
 *   - 이메일이 Google 에서 확인된 주소인가 (email_verified)
 */

export const GOOGLE_CLIENT_ID =
  "958687510814-g3lr95nt532ka52mbfagbgm4p8fvr473.apps.googleusercontent.com";

const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

let cachedKeys = null;
let cachedAt = 0;

async function googleKeys() {
  // Google 은 키를 며칠마다 돌린다. 한 시간 동안만 기억한다.
  if (cachedKeys && Date.now() - cachedAt < 3600 * 1000) return cachedKeys;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error("google keys " + res.status);
  cachedKeys = (await res.json()).keys || [];
  cachedAt = Date.now();
  return cachedKeys;
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const decodeJson = (part) => JSON.parse(new TextDecoder().decode(b64urlToBytes(part)));

/** 통과하면 { email, name, sub } 를, 아니면 null 을 돌려준다. */
export async function verifyGoogleIdToken(idToken) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) return null;
  let header, payload;
  try {
    header = decodeJson(parts[0]);
    payload = decodeJson(parts[1]);
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;

  const jwk = (await googleKeys()).find((k) => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!ok) return null;

  const now = Math.floor(Date.now() / 1000);
  if (!ISSUERS.includes(payload.iss)) return null;
  if (payload.aud !== GOOGLE_CLIENT_ID) return null;
  if (!(payload.exp > now)) return null;
  if (payload.email_verified !== true && payload.email_verified !== "true") return null;
  if (!payload.email) return null;

  return { email: String(payload.email).toLowerCase(), name: payload.name || "", sub: payload.sub };
}

/**
 * 구독 회원 명단. Vercel 환경변수 TV_MEMBERS 에 둔다 (저장소는 공개라 여기 적지 않는다).
 *
 *   TV_MEMBERS = {
 *     "담당자@기관.kr": { "name": "구미코 로비", "until": "2027-10-31",
 *                        "setup": "led" | "beam1" | "beam2", "ratio": "16:9" }
 *   }
 *
 * until 이 지나면 화면이 꺼진다. setup 은 처음 켤 때의 화면 설정 종류다.
 */
export function readTvMembers() {
  try {
    const raw = JSON.parse(process.env.TV_MEMBERS || "{}");
    const out = {};
    for (const [k, v] of Object.entries(raw)) out[String(k).toLowerCase()] = v || {};
    return out;
  } catch {
    return {};
  }
}

/* TV 상자는 몇 달씩 켜 둔다. 관리자 로그인(12시간)과 따로 오래 가는 쿠키를 쓴다.
   구독이 끝났는지는 쿠키가 아니라 매번 명단에서 확인하므로 길어도 안전하다. */
export const TV_COOKIE = "bomnal_tv";
export const TV_SESSION_DAYS = 180;

export function tvCookieHeader(token, { clear = false } = {}) {
  const base = `${TV_COOKIE}=${clear ? "" : token}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  return clear ? `${base}; Max-Age=0` : `${base}; Max-Age=${TV_SESSION_DAYS * 86400}`;
}
