#!/usr/bin/env node
/**
 * assets/mesh/*.json 을 모아 studio-meshes.js 한 장으로 만든다.
 *
 * 브라우저에서 fetch 로 읽지 않는다. 납품 렌더(works/studio-art.html)는
 * 파일 주소로 열릴 때도 있어 fetch 가 막힌다. 스크립트로 넣으면 어디서
 * 열든 똑같이 동작한다.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "assets/mesh");
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();

const out = {};
let verts = 0, tris = 0;
for (const f of files) {
  const d = JSON.parse(readFileSync(join(dir, f), "utf8"));
  out[d.source] = { name: d.name, q: d.quant, v: d.verts, t: d.tris };
  verts += d.verts.length / 3;
  tris += d.tris.length / 3;
}

const body = `/* 3D 뼈대 — tools/build-meshes.mjs 가 만든다. 손으로 고치지 말 것.
 *
 * 꼭짓점과 삼각형만 들어 있다. 출처와 라이선스는
 * assets/mesh/LICENSE.md 에 적혀 있다. 전부 CC0 다.
 */
window.StudioMeshes = ${JSON.stringify(out)};
window.StudioMeshIds = ${JSON.stringify(Object.keys(out))};
`;
writeFileSync(join(root, "studio-meshes.js"), body);
console.log(`studio-meshes.js — 모델 ${files.length}개 · 꼭짓점 ${verts} · 삼각형 ${tris}`);
