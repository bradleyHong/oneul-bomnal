#!/usr/bin/env node
/**
 * 고객이 만든 설정 → 4K 납품본.
 *
 * 온 미디어아트 에디트(/studio)에서 고객이 고른 조합은 URL 쿼리 한 줄로 온다.
 * 그 줄을 그대로 여기 넣으면 고객이 화면에서 본 그림이 4K로 나온다.
 * 미리보기와 납품본이 같은 파일(works/studio-art.html)을 쓰기 때문에
 * "고른 것과 받은 것이 다르다"는 일이 생길 자리가 없다.
 *
 *   node tools/render-studio.mjs "style=aurora&palette=gogh&seed=4821937&..." \
 *        --name 봄날로비 --dur 20 --fps 30
 *
 * 의뢰 메일에 붙어 온 "재현용 파라미터" 줄을 따옴표로 감싸 그대로 넘기면 된다.
 *
 * 필요한 것: playwright(또는 playwright-core) + ffmpeg
 * 결과: output/<이름>_4k_<fps>p.mp4
 */
import { mkdirSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ── 인자 읽기 ────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const spec = argv.find((a) => !a.startsWith("--") && a.includes("="));
if (!spec) {
  console.error(`
고객 설정을 넘겨주세요.

  node tools/render-studio.mjs "style=aurora&palette=gogh&seed=4821937&density=50&..." --name 봄날로비

의뢰 메일의 "재현용 파라미터" 줄을 따옴표로 감싸 그대로 붙이면 됩니다.

  --name  <이름>   결과 파일 이름 (기본: studio)
  --dur   <초>     길이 (기본: 20)
  --fps   <숫자>   초당 프레임 (기본: 30)
  --w --h <픽셀>   해상도 직접 지정 (기본: 설정에 담긴 값, 없으면 3840×2160)
  --codec <h264|hevc|prores>  기본 h264
  --keep           프레임 PNG를 지우지 않는다
`);
  process.exit(1);
}

const q = new URLSearchParams(spec);
const NAME  = flag("name", "studio");
const FPS   = +flag("fps", 30);
/* 설정표에 길이가 적혀 있으면 그것이 기본. 손님이 도구에서 고른 값이다. */
const DUR   = +flag("dur", +q.get("dur") || 20);
const W     = +flag("w", +q.get("w") || 3840);
const H     = +flag("h", +q.get("h") || 2160);
const CODEC = flag("codec", "h264");
const KEEP  = argv.includes("--keep");
const TOTAL = Math.round(FPS * DUR);

/* 고객이 넘긴 값 중 해상도·길이만 우리가 다시 정한다.
   나머지(스타일·색·시드·조절값)는 손대지 않는다. 손대는 순간
   고객이 승인한 그림이 아니게 된다. */
q.set("capture", "1");
q.set("w", String(W));
q.set("h", String(H));
q.set("fps", String(FPS));
q.set("dur", String(DUR));
if (!q.get("seed")) {
  console.error("설정에 seed가 없습니다. 시드가 없으면 같은 그림을 다시 뽑을 수 없습니다.");
  process.exit(1);
}

const outDir = join(root, "output");
const frameDir = join(root, "frames", NAME);
mkdirSync(outDir, { recursive: true });
mkdirSync(frameDir, { recursive: true });

/* 어느 화면으로 그릴지.
 *
 * 설정표에 tones(색) 나 scene(느낌 번호) 이 들어 있으면 스튜디오·도구가
 * 내준 것이다. 그건 봄날 껍데기까지 얹어 그려야 손님이 승인한 화면과
 * 같아진다 — studio-deliver.html 이 그 길이다.
 * 옛 설정줄(엔진 값만 있는 것)은 예전처럼 studio-art.html 로 간다. */
const viaGen = q.get("tones") !== null || q.get("scene") !== null || q.get("gen") === "1";
const artFile = viaGen ? "studio-deliver.html" : "studio-art.html";
const artPath = join(root, "works", artFile);
if (!existsSync(artPath)) {
  console.error(`works/${artFile} 이 없습니다.`);
  process.exit(1);
}
console.log(`그리는 화면: works/${artFile}`);

/* 두 면 기둥. 한 장으로 그려 놓고 모서리에서 잘라 건다.
   자르는 일은 인코딩 뒤에 한 번 더 돌리면 되므로 여기서는 안내만 한다 —
   자동으로 잘라 버리면 "펼친 한 장"을 확인할 길이 없어진다. */
const WRAP = +(q.get("wrap") || 0);
if (WRAP > 1) {
  console.log(`두 면 기둥입니다. 펼친 한 장을 뽑은 뒤 모서리에서 ${WRAP}쪽으로 자르세요:`);
  console.log(`  ffmpeg -i <결과.mp4> -filter_complex ` +
    `"[0:v]crop=iw/${WRAP}:ih:0:0[l];[0:v]crop=iw/${WRAP}:ih:iw/${WRAP}:0[r]" ` +
    `-map "[l]" 왼면.mp4 -map "[r]" 오른면.mp4`);
}

/* ── 프레임 뽑기 ──────────────────────────────────────────── */
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    console.error("playwright 가 없습니다.  npm i -D playwright  후 다시 실행하세요.");
    process.exit(1);
  }
}

const exePath = process.env.CHROMIUM_PATH;   // 없으면 playwright 기본 브라우저
console.log(`\n${NAME} · ${W}×${H} · ${FPS}fps · ${DUR}초 (${TOTAL}프레임)`);
console.log(`설정  ${spec.slice(0, 120)}${spec.length > 120 ? "…" : ""}\n`);

const browser = await chromium.launch({
  ...(exePath ? { executablePath: exePath } : {}),
  args: ["--force-color-profile=srgb", "--disable-lcd-text", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto("file://" + artPath + "?" + q.toString());
await page.waitForFunction("window.__READY__ === true", { timeout: 30000 });

/* 첫 프레임을 한 번 버린다.
   크로미움은 캔버스에 처음 그릴 때 래스터라이저를 데운다. 그래서 같은
   renderFrame(0)이라도 페이지를 연 직후의 첫 장만 채널당 최대 6/255
   어긋난다. 로직 문제가 아니라 브라우저 사정이다. 그런데 우리 납품본은
   완전 루프라 첫 장과 마지막 장이 정확히 같아야 한다. 한 장을 미리
   그려 버리고 시작하면 0번 프레임도 나머지와 같은 조건에서 나온다. */
await page.evaluate(() => window.renderFrame(0));

const t0 = Date.now();
for (let n = 0; n < TOTAL; n++) {
  await page.evaluate((i) => window.renderFrame(i), n);
  await page.locator("#c").screenshot({
    path: join(frameDir, `f_${String(n).padStart(5, "0")}.png`),
  });
  if (n % 30 === 0 || n === TOTAL - 1) {
    const done = n + 1;
    const per = (Date.now() - t0) / done / 1000;
    const left = Math.round(per * (TOTAL - done));
    process.stdout.write(
      `\r  ${done}/${TOTAL} (${((done / TOTAL) * 100).toFixed(1)}%) · 남은 시간 약 ${left}초    `
    );
  }
}
await browser.close();
console.log("\n  프레임 완료.\n");

/* ── 인코딩 ───────────────────────────────────────────────── */
const enc = {
  h264:   ["-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
           "-movflags", "+faststart"],
  /* LED·사이니지 송출용. 어두운 그라데이션의 계단(밴딩)이 눈에 띄게 줄어든다. */
  hevc:   ["-c:v", "libx265", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p10le",
           "-tag:v", "hvc1"],
  prores: ["-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le"],
}[CODEC];
if (!enc) { console.error(`모르는 코덱: ${CODEC} (h264 · hevc · prores)`); process.exit(1); }

const ext = CODEC === "prores" ? "mov" : "mp4";
const outFile = join(outDir, `${NAME}_4k_${FPS}p${CODEC === "h264" ? "" : "_" + CODEC}.${ext}`);
const ff = spawnSync("ffmpeg", [
  "-y", "-framerate", String(FPS),
  "-i", join(frameDir, "f_%05d.png"),
  ...enc, outFile,
], { stdio: ["ignore", "ignore", "inherit"] });

if (ff.error || ff.status !== 0) {
  console.error("\nffmpeg 실행에 실패했습니다. 프레임은 남겨 둡니다:", frameDir);
  process.exit(1);
}

/* ── 기록 ─────────────────────────────────────────────────── */
writeFileSync(join(outDir, `${NAME}.NOTES.md`), [
  `# ${NAME}`,
  "",
  `- 렌더: ${new Date().toISOString()}`,
  `- 해상도: ${W}×${H} · ${FPS}fps · ${DUR}초 · 코덱 ${CODEC}`,
  `- 시드: ${q.get("seed")}`,
  "",
  "## 재현용 파라미터",
  "",
  "```",
  spec,
  "```",
  "",
  "같은 줄을 다시 넣으면 같은 영상이 나옵니다. 고객이 승인한 그림과",
  "납품본이 어긋나지 않는 근거가 이 줄입니다.",
  "",
].join("\n"));

if (!KEEP) rmSync(frameDir, { recursive: true, force: true });

console.log(`완료: ${resolve(outFile)}`);
console.log(`기록: ${resolve(join(outDir, NAME + ".NOTES.md"))}`);
if (KEEP) console.log(`프레임: ${resolve(frameDir)}`);
