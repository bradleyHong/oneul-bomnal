#!/usr/bin/env node
/**
 * 비밀번호 → SHA-256 해시 변환기
 *
 * 서버에는 비밀번호 평문을 저장하지 않고 이 해시만 환경변수에 넣습니다.
 *
 * 사용법:
 *   node tools/hash-password.mjs '내가정한비밀번호'
 *
 * 관리자:
 *   출력된 해시를 Vercel 환경변수 ADMIN_PW_HASH 에 넣습니다.
 *
 * 회원사:
 *   MEMBER_ACCOUNTS 에 아래 형태의 JSON 배열로 넣습니다.
 *   [{"id":"bukgu","org":"대구 북구청","pwHash":"<여기에 해시>"}]
 */
import { createHash, randomBytes } from "node:crypto";

const pw = process.argv[2];

if (!pw) {
  console.log("사용법: node tools/hash-password.mjs '비밀번호'\n");
  console.log("AUTH_SECRET 용 임의 문자열이 필요하면 아래 값을 사용하세요:");
  console.log(randomBytes(32).toString("hex"));
  process.exit(0);
}

console.log(createHash("sha256").update(pw, "utf8").digest("hex"));
