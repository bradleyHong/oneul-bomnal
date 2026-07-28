export const config = { runtime: "edge" };

/**
 * 문의 접수 창구.
 *
 * 지금까지는 브라우저가 formsubmit.co로 직접 던지는 구조라, 그쪽이 죽거나
 * 계정이 활성화되지 않았으면 문의가 그대로 증발했습니다. 담당자는 성공 화면만
 * 보고 떠나고 우리는 문의가 있었다는 사실조차 몰랐습니다.
 *
 * 그래서 접수를 서버에서 한 번 받습니다. 메일 전송이 실패하더라도
 * 접수 기록은 Vercel 로그에 반드시 남습니다. 최소한 "언제 누가 무엇을 보냈다"는
 * 사라지지 않습니다.
 *
 * 필요한 환경변수 (없어도 동작합니다)
 * - RESEND_API_KEY / INQUIRY_FROM / INQUIRY_TO : 셋 다 있으면 Resend로 직접 발송
 * - INQUIRY_FORWARD_URL : 없으면 아래 기본 formsubmit 주소로 전달
 */

const DEFAULT_FORWARD = "https://formsubmit.co/ajax/visionpencil@gmail.com";
const MAX = 4000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const clean = (v) => String(v ?? "").trim().slice(0, MAX);

/** 폼 인코딩과 JSON 양쪽을 받는다. 자바스크립트가 없는 환경도 통과시키기 위해서다. */
async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return await request.json();
  const form = await request.formData();
  const out = {};
  for (const [k, v] of form.entries()) {
    if (out[k] === undefined) out[k] = v;
    else if (Array.isArray(out[k])) out[k].push(v);
    else out[k] = [out[k], v];
  }
  return out;
}

function normalize(raw) {
  const services = raw.service;
  return {
    organization: clean(raw.organization),
    name: clean(raw.name),
    phone: clean(raw.phone),
    email: clean(raw.email),
    services: (Array.isArray(services) ? services : services ? [services] : []).map(clean),
    budget: clean(raw.budget),
    message: clean(raw.message),
    page: clean(raw.page),
  };
}

function asText(d, receivedAt) {
  return [
    `기관이름: ${d.organization}`,
    `담당자 성함: ${d.name}`,
    `연락처: ${d.phone}`,
    `이메일: ${d.email}`,
    `관심 항목: ${d.services.join(", ") || "선택 없음"}`,
    `희망 대수: ${d.budget || "미선택"}`,
    "",
    "문의 내용:",
    d.message || "(내용 없음)",
    "",
    `접수 시각: ${receivedAt}`,
    `유입 페이지: ${d.page || "-"}`,
  ].join("\n");
}

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function sendViaResend(env, d, text) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.INQUIRY_FROM,
      to: [env.INQUIRY_TO],
      reply_to: d.email || undefined,
      subject: `[오늘은 봄날] ${d.organization || "공공 프로젝트"} 문의 · ${d.name || "담당자"}`,
      text,
      html: `<pre style="font:14px/1.7 -apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

async function forward(url, d, text) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      _subject: `[오늘은 봄날] ${d.organization || "공공 프로젝트"} 문의`,
      _template: "table",
      _replyto: d.email,
      기관이름: d.organization,
      담당자: d.name,
      연락처: d.phone,
      이메일: d.email,
      관심항목: d.services.join(", ") || "선택 없음",
      희망대수: d.budget || "미선택",
      문의내용: d.message,
      유입페이지: d.page,
      전문: text,
    }),
  });
  if (!res.ok) throw new Error(`forward ${res.status}`);
}

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);

  let raw;
  try {
    raw = await readBody(request);
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }

  // 허니팟 · 사람은 볼 수 없는 칸이라 값이 차 있으면 봇이다.
  // 봇에게 실패를 알려주면 우회를 시도하므로 성공한 것처럼 응답하고 버린다.
  if (clean(raw._honey) || clean(raw._gotcha)) return json({ ok: true });

  const d = normalize(raw);
  if (!d.organization || !d.name || !d.phone || !d.email) {
    return json({ error: "기관이름, 담당자 성함, 연락처, 이메일은 필수입니다." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    return json({ error: "이메일 주소를 다시 확인해주세요." }, 400);
  }

  const receivedAt = new Date().toISOString();
  const text = asText(d, receivedAt);

  // 무슨 일이 있어도 접수 기록은 남긴다. 메일 경로가 전부 막혀도
  // Vercel 로그에서 "누가 언제 무엇을 보냈는지" 복구할 수 있다.
  console.log("[inquiry]", JSON.stringify({ receivedAt, ...d }));

  const env = process.env;
  const errors = [];

  if (env.RESEND_API_KEY && env.INQUIRY_FROM && env.INQUIRY_TO) {
    try {
      await sendViaResend(env, d, text);
      return json({ ok: true });
    } catch (e) {
      errors.push(`resend: ${e.message}`);
    }
  }

  try {
    await forward(env.INQUIRY_FORWARD_URL || DEFAULT_FORWARD, d, text);
    return json({ ok: true });
  } catch (e) {
    errors.push(`forward: ${e.message}`);
  }

  // 메일은 못 보냈지만 접수 자체는 로그에 남았다.
  // 담당자에게는 성공이라고 말하지 않고 다른 연락 수단을 안내한다.
  console.error("[inquiry] 발송 실패", JSON.stringify({ receivedAt, errors }));
  return json({ error: "메일 발송에 실패했습니다.", recorded: true }, 502);
}
