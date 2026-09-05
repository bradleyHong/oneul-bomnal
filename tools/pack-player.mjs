#!/usr/bin/env node
/**
 * 작품 하나를 HTML 한 장으로 싼다 — 전용 플레이어와 API 고객에게 주는 파일.
 *
 *   node tools/pack-player.mjs BN4-0AC6F6 [--w 3840 --h 1080] [--text "직접 적은 문장"]
 *   → dist/player/BN4-0AC6F6.html
 *
 * play.html 에 스크립트 석 장(뼈대·엔진·생성기)을 안에 넣고 번호를 박는다.
 * 파일 하나라 USB 로도, 메일로도 간다. 인터넷 없이 file:// 로 열어도 돈다.
 * 계약된 번호이면 license.json 을 같이 박아 도장이 안 찍힌다.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const code = (args[0] || "").toUpperCase();
if (!/^BN\d*-[0-9A-F]{6}$/.test(code)) {
  console.log("쓰는 법:  node tools/pack-player.mjs BN4-0AC6F6 [--w 3840 --h 1080] [--text \"문장\"]");
  process.exit(1);
}
const opt = (k) => { const i = args.indexOf("--" + k); return i > 0 ? args[i + 1] : ""; };

const read = (f) => readFileSync(join(root, f), "utf8");
let html = read("play.html");
for (const f of ["studio-meshes.js", "studio-engine.js", "studio-gen.js"]) {
  const src = read(f).replace(/<\/script>/gi, "<\\/script>");
  /* 주소 뒤의 ?v= 캐시 표지는 무시한다 */
  html = html.replace(new RegExp(`<script src="\\./${f.replace(".", "\\.")}(\\?[^"]*)?"></script>`),
                      () => `<script>/* ${f} */\n${src}\n</script>`);
}

/* 계약된 번호면 목록을 안에 박는다. fetch 가 file:// 에서 막히므로 미리 넣는다. */
const sold = JSON.parse(read("sold-codes.json"));
const licensed = (sold.codes || []).some((c) => String(c.code || c).toUpperCase() === code);
const baked = { code, w: opt("w"), h: opt("h"), text: opt("text"), licensed };
html = html.replace("<script>\n/* 봄날 플레이어",
  `<script>window.BOMNAL_BAKED = ${JSON.stringify(baked)};</script>\n<script>\n/* 봄날 플레이어`);
/* play.html 은 주소의 파라미터를 읽는다. 박힌 값이 있으면 그걸 먼저 쓴다. */
html = html.replace("var q = new URLSearchParams(location.search);",
  `var q = new URLSearchParams(location.search);
  if (window.BOMNAL_BAKED) { var B = window.BOMNAL_BAKED;
    if (!q.get("code")) q.set("code", B.code);
    if (B.w && !q.get("w")) q.set("w", B.w); if (B.h && !q.get("h")) q.set("h", B.h);
    if (B.text && !q.get("text")) q.set("text", B.text); }`);
html = html.replace("  function licensed(done) {",
  `  function licensed(done) {
    if (window.BOMNAL_BAKED && window.BOMNAL_BAKED.licensed) return done(true);`);

mkdirSync(join(root, "dist/player"), { recursive: true });
const out = join(root, "dist/player", code + ".html");
writeFileSync(out, html);
console.log(`${out}  (${Math.round(html.length / 1024)}KB · ${licensed ? "계약본 · 도장 없음" : "시연본 · 도장 찍힘"})`);
