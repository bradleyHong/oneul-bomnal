#!/usr/bin/env node
/**
 * 판매된 작품 번호를 잠근다.
 *
 * 한 화면을 두 곳에 팔면 안 된다. 기관 A의 로비에 걸린 화면이 기관 B의
 * 외벽에도 걸려 있으면, 우리가 판 것이 "그 화면"이 아니었다는 뜻이 된다.
 *
 *   node tools/mark-sold.mjs BN2-0AC6F6 "구미시청"
 *   node tools/mark-sold.mjs --list
 *   node tools/mark-sold.mjs --remove BN2-0AC6F6      (계약 취소 등)
 *
 * 잠근 뒤 배포해야 실제로 막힌다. 이 파일은 사이트가 그대로 읽는다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "sold-codes.json");
const db = JSON.parse(readFileSync(file, "utf8"));
db.codes = Array.isArray(db.codes) ? db.codes : [];

const args = process.argv.slice(2);
const norm = (s) => String(s || "").trim().toUpperCase();
/** 화면이 내는 형식만 받는다. 손으로 적다 한 글자 틀리면 엉뚱한 번호가 잠긴다. */
const VALID = /^BN2?-[0-9A-F]{6}$/;

const save = () => {
  db.updated = new Date().toISOString().slice(0, 10);
  writeFileSync(file, JSON.stringify(db, null, 2) + "\n");
};

if (args[0] === "--list" || args.length === 0) {
  if (!db.codes.length) console.log("잠긴 번호가 없습니다.");
  else db.codes.forEach((c) => console.log(`  ${c.code}  ${c.at}  ${c.to || ""}`));
  console.log(`\n모두 ${db.codes.length}개 · 갱신 ${db.updated}`);
  process.exit(0);
}

if (args[0] === "--remove") {
  const code = norm(args[1]);
  const before = db.codes.length;
  db.codes = db.codes.filter((c) => c.code !== code);
  if (db.codes.length === before) { console.log(`${code} 는 목록에 없습니다.`); process.exit(1); }
  save();
  console.log(`${code} 를 풀었습니다. 이제 다시 나옵니다.`);
  process.exit(0);
}

const code = norm(args[0]);
if (!VALID.test(code)) {
  console.log(`형식이 다릅니다: ${code}\n화면에 나오는 그대로 적어 주세요. 예) BN2-0AC6F6`);
  process.exit(1);
}
if (db.codes.some((c) => c.code === code)) {
  console.log(`${code} 는 이미 잠겨 있습니다.`);
  process.exit(0);
}
db.codes.push({ code, at: new Date().toISOString().slice(0, 10), to: args[1] || "" });
db.codes.sort((a, b) => (a.code < b.code ? -1 : 1));
save();
console.log(`${code} 를 잠갔습니다${args[1] ? ` (${args[1]})` : ""}. 배포해야 실제로 막힙니다.`);
