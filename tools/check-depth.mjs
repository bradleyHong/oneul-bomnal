#!/usr/bin/env node
/**
 * 깊이(3D) 장면 검사.
 *
 *   · 목록(depth/scenes/index.js)에 적힌 장면이 전부 있고, 이름·색판·셰이더를 갖췄는가
 *   · 셰이더가 컴파일되는가 — GLSL 은 오타 하나면 장면이 통째로 검게 나온다
 *   · 5초 완전 루프인가 — 149→0 의 변화가 보통 장 사이 변화와 비슷한가
 *
 * 작은 화면(320×180)으로 장면마다 네 장만 그린다. 몇 초면 끝난다.
 * WebGL2 를 못 여는 곳(그래픽 없는 서버 등)에서는 건너뛴다.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  try { ({ chromium } = await import("playwright-core")); }
  catch { console.log("playwright 가 없어 건너뜁니다."); process.exit(0); }
}

const list = /var LIST = \[([^\]]*)\]/.exec(readFileSync(join(root, "depth/scenes/index.js"), "utf8"));
const ids = list ? [...list[1].matchAll(/"([a-z0-9-]+)"/g)].map(m => m[1]) : [];
const fails = [];
for (const id of ids) {
  if (!existsSync(join(root, "depth/scenes", id + ".js"))) fails.push(`${id}.js 가 없다 (목록에만 있다)`);
}

const MIME = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer((req, res) => {
  const p = join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""));
  if (!p.startsWith(root) || !existsSync(p)) { res.statusCode = 404; return res.end(); }
  res.setHeader("content-type", MIME[p.slice(p.lastIndexOf("."))] || "application/octet-stream");
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const CHROME = process.env.CHROMIUM_PATH ||
  (existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome") ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : null);
const browser = await chromium.launch({
  ...(CHROME ? { executablePath: CHROME } : {}),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"]
});

const rows = [];
for (const id of ids) {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/depth/index.html?capture=1&scene=${id}&w=320&h=180&aa=1`);
  try {
    await page.waitForFunction("window.__READY__===true || !!window.__ERROR__", null, { timeout: 90000 });
  } catch { fails.push(`${id}: 준비가 안 된다(시간 초과)`); await page.close(); continue; }
  const err = await page.evaluate(() => window.__ERROR__ || null);
  if (err) {
    if (/WebGL2 를 못 연다/.test(err)) { console.log("WebGL2 를 못 열어 건너뜁니다."); await browser.close(); server.close(); process.exit(0); }
    fails.push(`${id}: ${err.split("\n")[0].slice(0, 200)}`); await page.close(); continue;
  }
  const meta = await page.evaluate(k => { const s = window.DepthScenes[k]; return s && { en: s.en, ko: s.ko, pals: (s.pals || []).length, glsl: !!s.glsl }; }, id);
  if (!meta || !meta.en || !meta.ko || !meta.pals || !meta.glsl) fails.push(`${id}: 이름·색판·셰이더 중 빠진 것이 있다`);
  const r = await page.evaluate(() => {
    const c = document.getElementById("c"), g = c.getContext("webgl2");
    const px = n => { window.renderFrame(n); const a = new Uint8Array(320 * 180 * 4); g.readPixels(0, 0, 320, 180, g.RGBA, g.UNSIGNED_BYTE, a); return a; };
    const f147 = px(147), f148 = px(148), f149 = px(149), f0 = px(0);
    const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4 * 3); };
    let lum = 0; for (let i = 0; i < f0.length; i += 4) lum += f0[i] + f0[i + 1] + f0[i + 2];
    return { seam: diff(f149, f0), normal: (diff(f147, f148) + diff(f148, f149)) / 2, lum: lum / (f0.length / 4 * 3) };
  });
  await page.close();
  /* 알갱이가 장마다 바뀌어 보통 변화가 0 이 되지 않는다. 그 몫을 빼고 견준다. */
  const ratio = (r.seam + .5) / (r.normal + .5);
  if (ratio > 2.2) fails.push(`${id}: 이음매에서 튄다 (149→0 이 보통의 ${ratio.toFixed(2)}배)`);
  if (r.lum < 1.5) fails.push(`${id}: 거의 새까맣다 (평균 밝기 ${r.lum.toFixed(1)}) — 셰이더가 아무것도 못 그린다`);
  rows.push(`  ${id.padEnd(10)} ${meta ? meta.ko : "?"}  이음매 ${ratio.toFixed(2)}배 · 밝기 ${r.lum.toFixed(0)}`);
}
await browser.close();
server.close();

console.log(rows.join("\n"));
if (fails.length) {
  console.log("");
  for (const f of fails) console.log("  실패  " + f);
  console.log(`\n깊이 검사 실패: ${fails.length}건`);
  process.exit(1);
}
console.log(`\n깊이 검사 통과. 장면 ${ids.length}개 · 전부 컴파일 · 5초 완전 루프`);
