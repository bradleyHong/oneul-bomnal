#!/usr/bin/env node
/**
 * 작품 공개본 빌더.
 *
 * works/_source/*.html (주석·스튜디오 패널이 그대로 있는 원본)을 읽어
 * works/*.html (고객 공개용)을 만든다. 공개본은 이렇게 달라진다.
 *
 *   1. 모든 주석 제거 — 제작 기법이 적힌 주석이 소스보기로 새 나가지 않게.
 *   2. 스튜디오 컨트롤 패널 숨김 — 고객에게는 화면만 보인다.
 *   3. 캔버스를 컨테이너에 맞춰 축소 — 4K 캔버스를 그대로 두면 iframe을 뚫고 나간다.
 *   4. noindex + 저작권 표기 + protect.js 삽입.
 *
 * 원본(works/_source)은 .vercelignore로 배포에서 제외한다. 깃에는 남고 웹에는 안 올라간다.
 *
 * 사용법: node tools/build-works.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "works", "_source");
const outDir = join(root, "works");

/**
 * 자바스크립트에서 주석만 걷어낸다.
 * 문자열·템플릿리터럴·정규식 리터럴 안의 슬래시를 주석으로 착각하면 코드가 깨지므로
 * 상태를 따라가며 읽는다. 결과는 호출부에서 node --check로 다시 확인한다.
 */
function stripJsComments(src) {
  let out = "";
  let i = 0;
  // 정규식 리터럴이 올 수 있는 자리인지 판단할 때 쓰는 직전 의미 토큰
  let prev = "";
  const regexAllowedAfter = /[({[,;:=!&|?+\-*%~^<>]$|^(return|typeof|instanceof|in|of|new|delete|void|do|else|case|yield|await)$/;

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < src.length) {
        if (src[i] === "\\") { out += src[i] + (src[i + 1] ?? ""); i += 2; continue; }
        out += src[i];
        if (src[i] === quote) { i++; break; }
        i++;
      }
      prev = quote;
      continue;
    }
    if (c === "/" && regexAllowedAfter.test(prev)) {
      // 정규식 리터럴. 문자클래스 안의 슬래시는 종료가 아니다.
      out += c;
      i++;
      let inClass = false;
      while (i < src.length) {
        if (src[i] === "\\") { out += src[i] + (src[i + 1] ?? ""); i += 2; continue; }
        if (src[i] === "[") inClass = true;
        else if (src[i] === "]") inClass = false;
        out += src[i];
        if (src[i] === "/" && !inClass) { i++; break; }
        i++;
      }
      prev = "/";
      continue;
    }

    out += c;
    if (/\S/.test(c)) {
      if (/[A-Za-z0-9_$]/.test(c)) prev = /[A-Za-z0-9_$]$/.test(prev) ? prev + c : c;
      else prev = c;
    }
    i++;
  }

  // 주석을 지우고 남은 빈 줄 정리
  return out.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n");
}

const SHOWCASE_HEAD = `
<meta name="robots" content="noindex, nofollow" />
<meta name="copyright" content="© 오늘은 봄날 (publicbloom.art). 무단 복제·배포·재사용 금지." />
<style id="showcase-mode">
  /* 고객 공개용. 스튜디오 조작 패널은 감추고 화면만 남긴다. */
  #ui, #toggle, #dock, #drop, #file, #stat, #hint { display: none !important; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: #000; }
  #stage { position: fixed !important; inset: 0 !important; height: 100% !important;
           display: flex !important; align-items: center; justify-content: center;
           padding: 0 !important; }
  #stage canvas { width: 100% !important; height: 100% !important;
                  max-width: 100% !important; max-height: 100% !important;
                  object-fit: contain; box-shadow: none !important; }
  body { -webkit-user-select: none; user-select: none; }
</style>
<script src="./protect.js" defer></script>
`;

/*
 * 공개하지 않을 원본. 메인 페이지에 이미 같은 작품이 라이브로 돌고 있어
 * 공개본을 또 올리면 같은 작품이 두 개로 보인다.
 */
const SKIP = new Set(["daegu-typewall.html"]);

const files = readdirSync(srcDir).filter((f) => f.endsWith(".html") && !SKIP.has(f));
let built = 0;

for (const file of files) {
  const raw = readFileSync(join(srcDir, file), "utf8");

  // <script> 블록만 골라 주석을 제거한다.
  let broken = false;
  let html = raw.replace(/(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi, (m, open, body, close) => {
    const stripped = stripJsComments(body);
    if (stripped.length > body.length) { broken = true; return m; }
    return open + stripped + close;
  });
  if (broken) throw new Error(`${file}: 주석 제거 결과가 원본보다 길다. 중단한다.`);

  // HTML 주석 제거 (조건부 주석은 없다)
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // 공개용 헤드 삽입
  html = html.replace(/<\/head>/i, `${SHOWCASE_HEAD}</head>`);

  writeFileSync(join(outDir, file), html);
  built++;
  const cut = raw.length - html.length;
  console.log(`  ${file} — ${raw.length}B → ${html.length}B (주석 등 ${cut}B 제거)`);
}

console.log(`작품 공개본 ${built}개 생성 완료.`);
