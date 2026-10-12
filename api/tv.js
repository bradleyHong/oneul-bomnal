export const config = { runtime: "edge" };

/**
 * 오늘은 봄날 TV — 구독자 화면에 오늘의 작품을 내준다.
 *
 *   GET /api/tv?k=<입장 열쇠>
 *   → { name, date, today: {vimeo,title,kind,ratio}, tomorrow: {title}, nextChangeAt }
 *
 * 열쇠는 Vercel 환경변수 TV_KEYS 에 둔다 (저장소는 공개라 여기 적으면 안 된다).
 *   TV_KEYS = {"열쇠": {"name": "구미코 로비", "until": "2027-10-31", "ratio": "16:9"}}
 *   until  이 날짜가 지나면 화면이 꺼진다. 구독이 끝난 손님 화면을 끄는 자리다.
 *   ratio  손님 화면 방향. 세로 사이니지면 "9:16"
 *
 * 구독자 DB 와 로그인이 붙으면 TV_KEYS 대신 DB 를 본다. 응답 모양은 그대로 둔다.
 *
 * 하루의 경계는 서울 자정이다. 모든 구독자가 같은 날 같은 작품을 받는다.
 */
import { LIBRARY } from "./_tv-library.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const SEOUL_MS = 9 * 60 * 60 * 1000;

/* 서울 날짜를 "1970-01-01 이후 몇 번째 날"로 센다. 편성표의 줄 번호가 된다. */
function seoulDay(now) {
  return Math.floor((now + SEOUL_MS) / 86400000);
}
function seoulDate(day) {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

function keys() {
  try {
    return JSON.parse(process.env.TV_KEYS || "{}");
  } catch {
    return {};
  }
}

export default async function handler(req) {
  const url = new URL(req.url);
  const k = (url.searchParams.get("k") || "").trim();
  if (!k) return json({ error: "입장 열쇠가 필요합니다." }, 401);

  const sub = keys()[k];
  if (!sub) return json({ error: "등록되지 않은 열쇠입니다." }, 401);

  const now = Date.now();
  const day = seoulDay(now);
  if (sub.until && seoulDate(day) > sub.until) {
    return json({ error: "구독 기간이 끝났습니다.", until: sub.until }, 403);
  }

  /* 손님 화면 방향에 맞는 작품만 고른다. 없으면 가로 작품으로 대신한다. */
  const ratio = sub.ratio || "16:9";
  let pool = LIBRARY.filter((it) => it.ratio === ratio);
  if (!pool.length) pool = LIBRARY.filter((it) => it.ratio === "16:9");
  if (!pool.length) return json({ error: "편성할 작품이 없습니다." }, 503);

  const today = pool[day % pool.length];
  const tomorrow = pool[(day + 1) % pool.length];
  const nextChangeAt = new Date((day + 1) * 86400000 - SEOUL_MS).toISOString();

  return json({
    name: sub.name || "",
    date: seoulDate(day),
    today,
    tomorrow: { title: tomorrow.title, kind: tomorrow.kind },
    nextChangeAt,
    library: pool.length,
  });
}
