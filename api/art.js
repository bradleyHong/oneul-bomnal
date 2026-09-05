export const config = { runtime: "edge" };

/**
 * 작품 번호 → 재생 주소.
 *
 * "API 연결" 옵션의 실체다. 귀사 시스템이나 다른 플레이어가 작품 번호 하나로
 * 작품을 불러오게 한다. 작품은 HTML(play.html)로 전달되고, 그 안에서 우리
 * 엔진이 그때그때 그린다. 영상 파일을 주고받지 않는다.
 *
 *   GET /api/art?code=BN4-0AC6F6
 *   → { code, version, scene, seed, licensed, player, preview }
 *
 * 번호는 공개 정보다(화면에 찍혀 있다). 여기서 새어 나갈 것은 없다.
 * 팔린 번호인지는 sold-codes.json 에서 본다. 안 팔린 번호도 열어 주되,
 * play.html 이 "시연본" 도장을 찍는다.
 */

const SITE_ORIGIN = "https://publicbloom.art";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });

/* studio.js 의 code()/parseCode() 와 같은 규칙.
   위 5비트 느낌 번호, 아래 19비트 씨앗. 앞의 BN·BN2·BN3·BN4 는 판. */
function parseCode(raw) {
  const t = String(raw || "").trim().toUpperCase();
  const m = /^(BN(\d*))-([0-9A-F]{6})$/.exec(t);
  if (!m) return null;
  const n = parseInt(m[3], 16) >>> 0;
  return { code: `${m[1]}-${m[3]}`, version: m[2] ? parseInt(m[2], 10) : 1,
           scene: (n >> 19) & 31, seed: n & 0x7ffff };
}

export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "GET 만 받습니다" }, 405);
  const url = new URL(request.url);
  const p = parseCode(url.searchParams.get("code"));
  if (!p) return json({ error: "작품 번호 형식이 아닙니다. 예) BN4-0AC6F6" }, 400);

  let licensed = false;
  try {
    const r = await fetch(`${SITE_ORIGIN}/sold-codes.json`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      licensed = Array.isArray(d.codes) && d.codes.some((c) => String(c.code || c).toUpperCase() === p.code);
    }
  } catch { /* 목록을 못 읽으면 시연본으로 연다 */ }

  const w = url.searchParams.get("w"), h = url.searchParams.get("h");
  const size = w && h ? `&w=${encodeURIComponent(w)}&h=${encodeURIComponent(h)}` : "";
  return json({
    code: p.code,
    version: p.version,
    scene: p.scene,
    seed: p.seed,
    licensed,
    /* 이 주소를 전체 화면으로 열면 작품이 돈다. iframe 으로 넣어도 된다. */
    player: `${SITE_ORIGIN}/play?code=${p.code}${size}`,
    preview: `${SITE_ORIGIN}/studio?code=${p.code}`,
    note: licensed
      ? "계약된 번호입니다. 도장 없이 재생됩니다."
      : "아직 계약되지 않은 번호입니다. 시연본 도장이 찍혀 재생됩니다.",
  });
}
