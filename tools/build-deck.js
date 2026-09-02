/**
 * 회사 소개서 생성기.
 *
 * canon/canon.json을 읽어 오늘은 봄날 회사소개서(13장)를 만든다.
 * 회사 정보·사업영역·인증·납품 형태가 바뀌면 캐논을 먼저 고치고 다시 돌린다.
 * 소개서와 홈페이지가 다른 말을 하지 않게 하려고 같은 출처를 쓴다.
 *
 *   node tools/build-deck.js                    # docs/오늘은봄날_회사소개서.pptx 로 출력
 *   node tools/build-deck.js /경로/파일.pptx    # 위치 지정
 *
 * 필요 모듈: pptxgenjs (없으면 npm install pptxgenjs)
 * 이미지: assets/deck/*.jpg (작품 스틸), assets/works/*.jpg (현장 사진)
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const C = JSON.parse(fs.readFileSync(path.join(REPO, "canon/canon.json"), "utf8"));
const I = C.identity, B = C.business;

/* 사업비 계획. canon/grant.json 에만 있고 웹에는 올라가지 않는다.
   파일이 없으면 사업비 장은 통째로 건너뛴다. 소개서만 필요한 경우가 있다. */
const GRANT_PATH = path.join(REPO, "canon/grant.json");
const G = fs.existsSync(GRANT_PATH) ? JSON.parse(fs.readFileSync(GRANT_PATH, "utf8")) : null;
const won = (n) => n.toLocaleString("ko-KR") + "원";
const man = (n) => Math.round(n / 10000).toLocaleString("ko-KR") + "만원";

/* 사이트에서 그대로 가져온 색. 소개서와 홈페이지가 같은 회사로 보이게 한다. */
const NAVY = "101B33";
const BLUE = "0075C9";
const INK = "1C2536";
const GREY = "4A5262";
const LINE = "DFE3EA";
const WHITE = "FFFFFF";
const PAPER = "F7F8FA";

const HEAD = "맑은 고딕";
const BODY = "맑은 고딕";

const img = (p) => path.join(REPO, p);
const art = (n) => path.join(REPO, "assets/deck", n);

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";           // 13.3 × 7.5
pres.author = "오늘은 봄날";
pres.company = "오늘은 봄날";
pres.title = "오늘은 봄날 회사소개서";
const W = 13.3, H = 7.5;

/* ── 공통 조각 ──────────────────────────────────────────── */
function pageTitle(s, kicker, title, opts = {}) {
  const dark = opts.dark;
  s.addText(kicker, {
    x: 0.7, y: 0.5, w: 8, h: 0.3, margin: 0,
    fontFace: HEAD, fontSize: 12, bold: true, charSpacing: 2,
    color: dark ? BLUE : BLUE,
  });
  s.addText(title, {
    x: 0.7, y: 0.82, w: opts.tw || 9.2, h: 1.02, margin: 0,
    fontFace: HEAD, fontSize: opts.fs || 32, bold: true,
    color: dark ? WHITE : NAVY, valign: "top",
  });
}
function pageNum(s, n) {
  s.addText(String(n).padStart(2, "0"), {
    x: W - 1.1, y: H - 0.62, w: 0.6, h: 0.3, margin: 0, align: "right",
    fontFace: BODY, fontSize: 10, color: "9AA3B0",
  });
}
function card(s, x, y, w, h, fill) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: fill || WHITE },
    line: { color: LINE, width: 1 },
    shadow: { type: "outer", color: "101B33", opacity: 0.07, blur: 12, offset: 3, angle: 90 },
  });
}
function numBadge(s, x, y, label, color) {
  s.addShape(pres.ShapeType.ellipse, {
    x, y, w: 0.46, h: 0.46, fill: { color: color || BLUE }, line: { color: color || BLUE },
  });
  s.addText(label, {
    x, y, w: 0.46, h: 0.46, margin: 0, align: "center", valign: "middle",
    fontFace: HEAD, fontSize: 13, bold: true, color: WHITE,
  });
}

/* ── 1. 표지 ────────────────────────────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addImage({ path: art("eyewall.jpg"), x: 0, y: 4.55, w: W, h: 2.95, sizing: { type: "cover", w: W, h: 2.95 }, transparency: 18 });
  s.addShape(pres.ShapeType.rect, { x: 0, y: 4.55, w: W, h: 0.9, fill: { color: NAVY, transparency: 30 }, line: { color: NAVY, transparency: 100 } });

  s.addText("AI MEDIA ART STUDIO · DAEGU", {
    x: 0.9, y: 1.15, w: 9, h: 0.3, margin: 0,
    fontFace: HEAD, fontSize: 12, bold: true, charSpacing: 3, color: BLUE,
  });
  s.addText("오늘은 봄날", {
    x: 0.9, y: 1.55, w: 9, h: 1.25, margin: 0,
    fontFace: HEAD, fontSize: 60, bold: true, color: WHITE,
  });
  s.addText("미디어아트를 코드로 만드는 AI 기업입니다", {
    x: 0.9, y: 2.85, w: 10, h: 0.5, margin: 0,
    fontFace: HEAD, fontSize: 22, color: "CFD6E4",
  });
  s.addText(
    "미디어파사드 콘텐츠 제작  ·  LED 패널 · 전광판 설치  ·  빔프로젝터 미디어파사드",
    { x: 0.9, y: 3.45, w: 11, h: 0.4, margin: 0, fontFace: BODY, fontSize: 14, color: "9FB0CC" }
  );
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.9, y: 4.05, w: 2.5, h: 0.42, rectRadius: 0.2,
    fill: { color: BLUE }, line: { color: BLUE },
  });
  s.addText("여성기업 · 대구", {
    x: 0.9, y: 4.05, w: 2.5, h: 0.42, margin: 0, align: "center", valign: "middle",
    fontFace: HEAD, fontSize: 12, bold: true, color: WHITE,
  });
  s.addText(`${I.phone}   |   ${I.email}   |   publicbloom.art`, {
    x: 0.9, y: 6.75, w: 11.5, h: 0.35, margin: 0,
    fontFace: BODY, fontSize: 12, color: "CFD6E4",
  });
  s.addNotes("표지. 회사명과 한 줄 정의, 사업영역 3종, 여성기업 자격, 연락처.");
}

/* ── 2. 한 장 요약 ──────────────────────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  pageTitle(s, "WHO WE ARE", "화면 콘텐츠부터 화면 자체까지");
  s.addText(
    "오늘은 봄날은 대구광역시 수성구에 있는 여성기업이자 AI 미디어아트 기업입니다.\n" +
    "미디어아트를 영상 편집이 아니라 코드로 만들고, LED 패널·전광판 설치와 빔프로젝터 미디어파사드 시공까지 직접 수행합니다.",
    { x: 0.7, y: 1.85, w: 11.9, h: 0.85, margin: 0, fontFace: BODY, fontSize: 14, color: GREY, lineSpacing: 24 }
  );

  /* 소개서 카드용 축약문. 홈페이지 본문을 그대로 넣으면 상자를 넘친다. */
  const deckCopy = {
    "media-art": "영상 편집이 아니라 코드로 만듭니다. 현장 화면 비율·해상도에 맞춰 다시 출력할 수 있고, 데이터를 연결하면 화면이 매일 달라집니다.",
    "fast": "시안 3종을 요청 후 1주일 이내에 제시합니다. 영상 외주 제작이 통상 1개월 이상 걸리는 것과 비교되는 지점입니다.",
    "led": "로비 미디어월, 외벽 전광판, 세로형 사이니지를 사양 산정부터 공급·설치·배선까지 직접 시공합니다.",
    "facade": "건물 외벽과 전시장 벽면에 빔프로젝터를 설치하고 프로젝션 매핑으로 미디어파사드를 만듭니다.",
  };
  const items = B.scopes.map((sc, i) => ({ n: i + 1, name: sc.name, sum: deckCopy[sc.id] }));
  const cw = 2.85, gap = 0.25, x0 = 0.7, y0 = 2.95, ch = 3.5;
  items.forEach((it, i) => {
    const x = x0 + i * (cw + gap);
    card(s, x, y0, cw, ch);
    numBadge(s, x + 0.35, y0 + 0.32, String(it.n).padStart(2, "0"));
    s.addText(it.name, {
      x: x + 0.35, y: y0 + 0.92, w: cw - 0.7, h: 0.72, margin: 0,
      fontFace: HEAD, fontSize: 15, bold: true, color: NAVY, valign: "top",
    });
    s.addText(it.sum, {
      x: x + 0.35, y: y0 + 1.7, w: cw - 0.7, h: 1.62, margin: 0,
      fontFace: BODY, fontSize: 10, color: GREY, lineSpacing: 15, valign: "top",
    });
  });
  pageNum(s, 2);
  s.addNotes("사업영역 네 가지를 한 화면에. 상세는 뒤에서 각각 설명.");
}

/* ── 3. 왜 우리인가 ─────────────────────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  pageTitle(s, "WHY US", "발주처가 겪던 세 가지가 사라집니다");

  const stats = [
    { big: "여성기업", unit: "", label: "공공기관 우선구매 대상",
      body: "여성기업 확인서와 직접생산확인증명서를 보유해 우선구매와 중소기업자간 경쟁입찰에 바로 참여합니다. 회계연도 기준 견적서를 즉시 발행합니다." },
    { big: "1", unit: "주", label: "시안 3종 제시까지",
      body: "영상 외주 제작이 통상 1개월 이상 걸리는 데 비해 짧습니다. 미디어아트를 코드로 만들기 때문에 기획·카피·비주얼을 한 번에 생성합니다. 자세히 알려주실수록 시안 디테일이 올라갑니다." },
    { big: "1", unit: "개 계약", label: "콘텐츠와 시공을 한 업체가",
      body: "대부분의 발주에서 콘텐츠 업체와 시공 업체가 쪼개집니다. 오늘은 봄날에서는 쪼개지지 않아 담당자가 사이에서 조율할 일이 없습니다." },
  ];
  const cw = 3.85, gap = 0.3, x0 = 0.7, y0 = 2.1, ch = 4.2;
  stats.forEach((st, i) => {
    const x = x0 + i * (cw + gap);
    card(s, x, y0, cw, ch, WHITE);
    s.addText(
      [{ text: st.big, options: { fontSize: st.big.length > 2 ? 34 : 52, bold: true, color: NAVY } },
       { text: st.unit, options: { fontSize: 20, bold: true, color: BLUE } }],
      { x: x + 0.4, y: y0 + 0.5, w: cw - 0.8, h: 1.0, margin: 0, fontFace: HEAD, valign: "middle" }
    );
    s.addText(st.label, {
      x: x + 0.4, y: y0 + 1.6, w: cw - 0.8, h: 0.5, margin: 0,
      fontFace: HEAD, fontSize: 14, bold: true, color: BLUE, valign: "top",
    });
    s.addText(st.body, {
      x: x + 0.4, y: y0 + 2.2, w: cw - 0.8, h: 1.7, margin: 0,
      fontFace: BODY, fontSize: 11, color: GREY, lineSpacing: 17, valign: "top",
    });
  });
  pageNum(s, 3);
}

/* ── 4. 사업영역 01 · 코드로 만드는 미디어아트 ──────────── */
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  pageTitle(s, "SERVICE 01", "미디어아트를 코드로 만듭니다", { tw: 6.6, fs: 28 });
  s.addImage({ path: art("flowribbons.jpg"), x: 7.15, y: 0.5, w: 5.45, h: 3.07, rounding: false });
  s.addText("流帶 · 결결 · 로비 LED 미디어월용 자체 제작 작품", {
    x: 7.15, y: 3.68, w: 5.45, h: 0.3, margin: 0, fontFace: BODY, fontSize: 9.5, color: "8A93A3",
  });

  s.addText(B.method.why, {
    x: 0.7, y: 1.95, w: 6.1, h: 1.5, margin: 0,
    fontFace: BODY, fontSize: 13, color: GREY, lineSpacing: 22, valign: "top",
  });

  const rows = [
    ["같은 작품을 다시 출력", "32:9 · 16:9 · 9:16 · 비정형 벽면까지 현장 규격에 맞춰 재출력. 화면이 바뀌어도 새로 만들지 않습니다."],
    ["데이터를 연결하면 매일 달라짐", "공공 API와 기관 보유 DB를 연결해 날씨·대기질·방문자 수가 화면에 반영됩니다."],
    ["승인본과 납품본이 어긋나지 않음", "결정론적으로 짜기 때문에 같은 시드·같은 캔버스에서 언제나 같은 결과가 나옵니다."],
  ];
  let y = 3.55;
  rows.forEach((r, i) => {
    numBadge(s, 0.7, y, String(i + 1), NAVY);
    s.addText(r[0], {
      x: 1.32, y: y - 0.04, w: 5.5, h: 0.32, margin: 0,
      fontFace: HEAD, fontSize: 13, bold: true, color: NAVY,
    });
    s.addText(r[1], {
      x: 1.32, y: y + 0.3, w: 5.5, h: 0.72, margin: 0,
      fontFace: BODY, fontSize: 11, color: GREY, lineSpacing: 16, valign: "top",
    });
    y += 1.18;
  });
  pageNum(s, 4);
}

/* ── 5. 사업영역 02 · 빠른 제작 ─────────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  pageTitle(s, "SERVICE 02", "시안 3종이 일주일 안에 나옵니다");
  s.addText(
    "기관 CI·컬러·서체·금기 표현을 제작 기준으로 미리 등록해 두고, 기획·카피·비주얼·송출 코드를 한 번에 만듭니다.\n" +
    "원하시는 방향을 자세히 알려주실수록 시안의 디테일이 올라갑니다.",
    { x: 0.7, y: 1.9, w: 11.9, h: 0.8, margin: 0, fontFace: BODY, fontSize: 13, color: GREY, lineSpacing: 22 }
  );

  s.addChart(pres.ChartType.bar, [{
    name: "시안 제시까지 걸리는 기간(일)",
    labels: ["일반 영상 외주 제작", "오늘은 봄날"],
    values: [30, 7],
  }], {
    x: 0.7, y: 2.95, w: 6.6, h: 3.2,
    barDir: "bar", barGrouping: "clustered",
    chartColors: ["C6CCD8", BLUE],
    varyColors: true,
    showTitle: false, showLegend: false,
    showValue: true, dataLabelPosition: "outEnd",
    dataLabelColor: NAVY, dataLabelFontFace: HEAD, dataLabelFontSize: 16, dataLabelFontBold: true,
    catAxisLabelColor: NAVY, catAxisLabelFontFace: BODY, catAxisLabelFontSize: 12,
    valAxisLabelColor: "8A93A3", valAxisLabelFontSize: 10,
    valAxisMaxVal: 35, valAxisMajorUnit: 7,
    valGridLine: { color: "EDEFF3", size: 1 },
    catGridLine: { style: "none" },
    barGapWidthPct: 60,
  });

  const gains = [
    ["시안 3종", "요청 후 1주일 이내 제시"],
    ["재생 PC 세팅", "사이니지 재생 장비까지 준비"],
    ["교체 운영", "계절·행사별 콘텐츠 교체"],
  ];
  let y = 3.1;
  gains.forEach(([t, d]) => {
    card(s, 7.7, y, 4.9, 0.92);
    s.addText(t, { x: 8.05, y: y + 0.14, w: 4.2, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 13, bold: true, color: BLUE });
    s.addText(d, { x: 8.05, y: y + 0.47, w: 4.2, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11, color: GREY });
    y += 1.06;
  });
  pageNum(s, 5);
}

/* ── 6. 사업영역 03 · LED 설치 ──────────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  pageTitle(s, "SERVICE 03", "LED 전광판을 직접 설치합니다", { tw: 7.5 });
  s.addImage({ path: img("assets/works/gumico-led-outdoor.jpg"), x: 8.35, y: 1.95, w: 4.25, h: 3.19 });
  s.addText("구미코 외벽 LED · 대형 LED 패널 콘텐츠", {
    x: 8.35, y: 5.22, w: 4.25, h: 0.3, margin: 0, fontFace: BODY, fontSize: 9.5, color: "8A93A3",
  });

  s.addText(
    "LED 전광판 설치는 LED 모듈을 구조물에 고정하고 배선·전원·제어기를 연결해 하나의 화면으로 만드는 공사입니다.\n" +
    "화면 크기와 보는 거리에 따라 픽셀 피치와 밝기가 달라지므로 실측 후 사양을 확정합니다.",
    { x: 0.7, y: 1.95, w: 7.3, h: 0.95, margin: 0, fontFace: BODY, fontSize: 12.5, color: GREY, lineSpacing: 21 }
  );

  const kinds = [
    ["로비 LED 미디어월", "관공서·기업 로비 상시 화면. 가까이서 보므로 촘촘한 사양이 필요합니다."],
    ["건물 외벽 LED 전광판", "주간 시인성 밝기, 옥외 방수·방진, 구조 보강이 관건입니다."],
    ["세로형 LED 사이니지", "안내 사이니지와 겸용. 기존 화면을 미디어아트 화면으로 함께 운용합니다."],
    ["기존 패널 활용", "이미 설치된 화면이 있으면 해상도·입력 규격에 맞춰 콘텐츠만 제작합니다."],
  ];
  let y = 3.1;
  kinds.forEach(([t, d], i) => {
    card(s, 0.7, y, 7.3, 0.85, i === 3 ? PAPER : WHITE);
    s.addText(t, { x: 1.0, y: y + 0.12, w: 6.7, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 12.5, bold: true, color: NAVY });
    s.addText(d, { x: 1.0, y: y + 0.44, w: 6.7, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10.5, color: GREY });
    y += 0.97;
  });
  pageNum(s, 6);
}

/* ── 7. 사업영역 04 · 미디어파사드 ──────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addImage({ path: img("assets/works/andong-station-facade.jpg"), x: 0, y: 0, w: 6.2, h: H, sizing: { type: "cover", w: 6.2, h: H } });
  s.addText("SERVICE 04", {
    x: 6.9, y: 1.15, w: 5.7, h: 0.3, margin: 0,
    fontFace: HEAD, fontSize: 12, bold: true, charSpacing: 2, color: BLUE,
  });
  s.addText("빔프로젝터로\n건물을 화면으로 바꿉니다", {
    x: 6.9, y: 1.5, w: 5.7, h: 1.5, margin: 0,
    fontFace: HEAD, fontSize: 28, bold: true, color: WHITE, lineSpacing: 38,
  });
  s.addText(
    "미디어파사드는 건물 외벽이나 전시장 벽면 자체를 하나의 큰 화면으로 쓰는 방식입니다. " +
    "화면 장치를 새로 달지 않고 빔프로젝터로 쏘기 때문에, 건물을 손대지 않고 밤에만 화면으로 바꿀 수 있습니다.",
    { x: 6.9, y: 3.15, w: 5.7, h: 1.4, margin: 0, fontFace: BODY, fontSize: 12, color: "CFD6E4", lineSpacing: 20 }
  );
  const bullets = [
    "현장 실측 · 프로젝터 대수와 밝기 산정",
    "벽면 형태에 맞춘 프로젝션 매핑",
    "축제 · 개관 · 전시 단기 설치와 철거",
    "일몰 기준 상시 상영 스케줄 운영",
  ];
  s.addText(bullets.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i !== bullets.length - 1 } })), {
    x: 6.9, y: 4.6, w: 5.7, h: 1.6, margin: 0,
    fontFace: BODY, fontSize: 12, color: WHITE, paraSpaceAfter: 8,
  });
  s.addText("안동 문화플랫폼 모디684 · 야외 건물 미디어파사드", {
    x: 0.35, y: 6.95, w: 5.5, h: 0.3, margin: 0, fontFace: BODY, fontSize: 9.5, color: "DDE3EE",
  });
  pageNum(s, 7);
}

/* ── 8. 사이니지 종류별 화면 ────────────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  pageTitle(s, "WHAT FITS WHERE", "화면 종류가 다르면 영상도 달라집니다");
  s.addText(
    "16:9로 만든 영상을 32:9 화면에 올리면 좌우가 비거나 위아래가 잘립니다. 보는 거리도 다릅니다.",
    { x: 0.7, y: 1.85, w: 11.9, h: 0.35, margin: 0, fontFace: BODY, fontSize: 12.5, color: GREY }
  );

  const cells = [
    { img: art("eyewall.jpg"),  ...C.signageTypes[0] },
    { img: art("flowribbons.jpg"), ...C.signageTypes[1] },
    { img: img("assets/works/gumico-signage-yeongchae.jpg"), ...C.signageTypes[2] },
    { img: img("assets/works/gbe-gumico-exhibition.jpg"), ...C.signageTypes[3] },
  ];
  const cw = 2.95, gap = 0.23, x0 = 0.7, y0 = 2.5;
  cells.forEach((c, i) => {
    const x = x0 + i * (cw + gap);
    card(s, x, y0, cw, 3.9, WHITE);
    s.addImage({ path: c.img, x: x + 0.18, y: y0 + 0.18, w: cw - 0.36, h: 1.45, sizing: { type: "cover", w: cw - 0.36, h: 1.45 } });
    s.addText(c.name, {
      x: x + 0.28, y: y0 + 1.78, w: cw - 0.56, h: 0.6, margin: 0,
      fontFace: HEAD, fontSize: 12.5, bold: true, color: NAVY, valign: "top",
    });
    s.addText(c.spec, {
      x: x + 0.28, y: y0 + 2.4, w: cw - 0.56, h: 0.35, margin: 0,
      fontFace: BODY, fontSize: 10, bold: true, color: BLUE,
    });
    s.addText(c.content, {
      x: x + 0.28, y: y0 + 2.78, w: cw - 0.56, h: 0.95, margin: 0,
      fontFace: BODY, fontSize: 10, color: GREY, lineSpacing: 15, valign: "top",
    });
  });
  pageNum(s, 8);
}

/* ── 9. 진행 절차 ───────────────────────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  pageTitle(s, "PROCESS", "실측에서 상영까지, 같은 계약 안에서");

  const steps = [
    ["현장 실측", "벽면 크기와 굴곡, 주변 조도, 관람 동선, 전기 용량, 설치면 하중을 잽니다. 여기서 프로젝터 대수 또는 LED 사양이 정해집니다."],
    ["설계 · 시안", "매핑 면 또는 화면 규격을 확정하고, 기관 CI를 반영한 시안 3종을 1주일 이내에 제시합니다."],
    ["시공 · 제작", "프로젝터 설치와 매핑, 또는 LED 구조 보강·모듈 설치·배선을 진행하고 확정 화면 규격으로 콘텐츠를 출력합니다."],
    ["상영 · 운영", "상영 스케줄을 관리하고 계절·행사별로 콘텐츠를 교체합니다. 이상이 생기면 원격으로 조치합니다."],
  ];
  const cw = 2.85, gap = 0.25, x0 = 0.7, y0 = 2.3, ch = 3.6;
  steps.forEach(([t, d], i) => {
    const x = x0 + i * (cw + gap);
    card(s, x, y0, cw, ch);
    numBadge(s, x + 0.35, y0 + 0.4, `0${i + 1}`, i === steps.length - 1 ? NAVY : BLUE);
    s.addText(t, {
      x: x + 0.35, y: y0 + 1.02, w: cw - 0.7, h: 0.4, margin: 0,
      fontFace: HEAD, fontSize: 16, bold: true, color: NAVY,
    });
    s.addText(d, {
      x: x + 0.35, y: y0 + 1.55, w: cw - 0.7, h: 1.75, margin: 0,
      fontFace: BODY, fontSize: 10.5, color: GREY, lineSpacing: 16, valign: "top",
    });
    if (i < steps.length - 1) {
      s.addText("›", {
        x: x + cw + 0.02, y: y0 + 1.5, w: 0.21, h: 0.4, margin: 0, align: "center",
        fontFace: HEAD, fontSize: 20, bold: true, color: "C6CCD8",
      });
    }
  });
  s.addText("현장 실측 없이 산정한 견적은 대부분 틀립니다. 현장을 먼저 보고 확정한 뒤 회계연도 기준 견적서를 발행합니다.", {
    x: 0.7, y: 6.25, w: 11.9, h: 0.35, margin: 0, fontFace: BODY, fontSize: 11.5, italic: true, color: "8A93A3",
  });
  pageNum(s, 9);
}

/* ── 10. 납품 형태 ──────────────────────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: PAPER };
  pageTitle(s, "DELIVERABLES", "원하시는 형태로 드립니다");
  s.addText("같은 작품이라도 현장 사정에 따라 필요한 형태가 다릅니다. 세 가지 중에 고르시면 됩니다.", {
    x: 0.7, y: 1.88, w: 11.9, h: 0.35, margin: 0, fontFace: BODY, fontSize: 13, color: GREY,
  });

  const cw = 3.85, gap = 0.3, x0 = 0.7, y0 = 2.55, ch = 3.5;
  B.method.deliverables.forEach((d, i) => {
    const x = x0 + i * (cw + gap);
    card(s, x, y0, cw, ch, WHITE);
    numBadge(s, x + 0.4, y0 + 0.42, String(i + 1), i === 2 ? NAVY : BLUE);
    s.addText(d.name, {
      x: x + 0.4, y: y0 + 1.05, w: cw - 0.8, h: 0.5, margin: 0,
      fontFace: HEAD, fontSize: 17, bold: true, color: NAVY,
    });
    s.addText(d.detail, {
      x: x + 0.4, y: y0 + 1.7, w: cw - 0.8, h: 1.5, margin: 0,
      fontFace: BODY, fontSize: 11.5, color: GREY, lineSpacing: 18, valign: "top",
    });
  });
  s.addText("화면이 아직 없는 현장은 LED 설치 또는 빔프로젝터 시공까지 한 계약으로 진행합니다.", {
    x: 0.7, y: 6.35, w: 11.9, h: 0.35, margin: 0, fontFace: BODY, fontSize: 11.5, italic: true, color: "8A93A3",
  });
  pageNum(s, 10);
}

/* ── 11. 발주처가 자주 확인하는 것 ─────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  pageTitle(s, "WHAT YOU ASKED", "이런 것까지 해드립니다");
  s.addText("담당자분들이 발주 전에 가장 많이 확인하시는 네 가지입니다.", {
    x: 0.7, y: 1.88, w: 11.9, h: 0.35, margin: 0, fontFace: BODY, fontSize: 13, color: GREY,
  });

  const cw = 5.85, gap = 0.35, x0 = 0.7, y0 = 2.45, ch = 2.15;
  B.capabilities.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = x0 + col * (cw + gap), y = y0 + row * (ch + 0.3);
    card(s, x, y, cw, ch, i === 2 ? "F0F6FC" : WHITE);
    numBadge(s, x + 0.38, y + 0.32, String(i + 1), i === 2 ? NAVY : BLUE);
    s.addText(c.title, {
      x: x + 1.0, y: y + 0.3, w: cw - 1.4, h: 0.5, margin: 0,
      fontFace: HEAD, fontSize: 14.5, bold: true, color: NAVY, valign: "middle",
    });
    s.addText(c.detail, {
      x: x + 0.38, y: y + 0.88, w: cw - 0.76, h: 1.16, margin: 0,
      fontFace: BODY, fontSize: 10, color: GREY, lineSpacing: 14.5, valign: "top",
    });
  });
  pageNum(s, 11);
}

/* ── 11. 현장 레퍼런스 ──────────────────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  pageTitle(s, "REFERENCES", "영남권 공공 현장에서 켜져 있는 화면들");

  const shots = [
    ["assets/works/busan-songdo-wave.jpg", "부산 서구청 · 송도", "실내 대형 벽면 미디어파사드"],
    ["assets/works/daegu-student-center.jpg", "대구학생문화센터", "로비 LED 월 미디어아트"],
    ["assets/works/gumi-summer-night.jpg", "구미 썸머나잇 페스티벌", "야외 건물 미디어파사드"],
    ["assets/works/gbe-gumico-exhibition.jpg", "경북교육청 · 구미코 전시", "전시장 미디어파사드"],
    ["assets/works/gumico-signage-yeongchae.jpg", "구미코 · 로비 사이니지", "세로형 LED 사이니지"],
    ["assets/works/andong-station-facade.jpg", "안동 · 모디684", "야외 건물 미디어파사드"],
  ];
  const cw = 3.85, chh = 1.55, gapx = 0.3, x0 = 0.7, y0 = 1.95;
  shots.forEach(([p, t, d], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = x0 + col * (cw + gapx), y = y0 + row * 2.35;
    s.addImage({ path: img(p), x, y, w: cw, h: chh, sizing: { type: "cover", w: cw, h: chh } });
    s.addText(t, { x, y: y + chh + 0.08, w: cw, h: 0.26, margin: 0, fontFace: HEAD, fontSize: 12, bold: true, color: NAVY });
    s.addText(d, { x, y: y + chh + 0.36, w: cw, h: 0.26, margin: 0, fontFace: BODY, fontSize: 10, color: GREY });
  });
  s.addText(
    "위 현장은 상상연필과 함께 수행한 레퍼런스입니다. 오늘은 봄날 명의의 납품 실적은 대구 북구청 사이니지 미디어아트 3편이며, 입찰·수의계약용 실적증명서는 요청 시 발송합니다.",
    { x: 0.7, y: 6.62, w: 10.8, h: 0.5, margin: 0, fontFace: BODY, fontSize: 10, color: "8A93A3", lineSpacing: 14 }
  );
  pageNum(s, 12);
}

/* ── 12. 인증 · 공공구매 ────────────────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  pageTitle(s, "CREDENTIALS", "공공 발주에 바로 대응합니다");
  s.addText("여성기업이므로 공공기관 우선구매 대상이며, 직접생산확인증명서로 중소기업자간 경쟁입찰에 즉시 참여합니다.", {
    x: 0.7, y: 1.88, w: 11.9, h: 0.35, margin: 0, fontFace: BODY, fontSize: 13, color: GREY,
  });

  const cw = 5.85, gap = 0.35, x0 = 0.7, y0 = 2.55, ch = 1.35;
  I.credentials.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = x0 + col * (cw + gap), y = y0 + row * (ch + 0.28);
    card(s, x, y, cw, ch, i === 0 ? "F0F6FC" : WHITE);
    s.addText(c.name, { x: x + 0.38, y: y + 0.2, w: cw - 0.76, h: 0.32, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: NAVY });
    s.addText(c.number + (c.valid ? `   ·   유효 ${c.valid}` : ""), {
      x: x + 0.38, y: y + 0.54, w: cw - 0.76, h: 0.28, margin: 0, fontFace: BODY, fontSize: 11, color: BLUE,
    });
    s.addText(c.meaning, { x: x + 0.38, y: y + 0.84, w: cw - 0.76, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10.5, color: GREY });
  });

  card(s, 0.7, 5.85, 12.0, 0.95, PAPER);
  s.addText(
    `시공 지역   ${C.areaServed.join(" · ")}      |      ${C.areaServedNote}`,
    { x: 1.05, y: 6.05, w: 11.3, h: 0.55, margin: 0, fontFace: BODY, fontSize: 11.5, color: NAVY, valign: "middle" }
  );
  pageNum(s, 19);
}

/* ── 14~18. 사업비 ──────────────────────────────────────────
   AI 활용 소상공인 지원사업 집행기준(별표 11·12)에 맞춘 지출 계획.
   금액은 canon/grant.json 에서만 읽는다. 총액을 고치면 표가 함께 바뀐다. */
if (G) {
  const GOV = Math.round(G.total.amount * G.total.govRatio);
  const OWN = G.total.amount - GOV;

  /* ── 14. 사업비 총괄 ─────────────────────────────────── */
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    pageTitle(s, "BUDGET", "사업비 구성");

    /* 총액 띠 */
    card(s, 0.7, 2.1, 11.9, 1.5, PAPER);
    s.addText("총 사업비", { x: 1.1, y: 2.35, w: 2, h: 0.32, margin: 0, fontFace: HEAD, fontSize: 12, bold: true, color: GREY });
    s.addText(man(G.total.amount), { x: 1.1, y: 2.68, w: 3, h: 0.6, margin: 0, fontFace: HEAD, fontSize: 30, bold: true, color: NAVY });

    const barX = 4.6, barW = 7.6, barY = 2.62, barH = 0.62;
    s.addShape(pres.ShapeType.rect, { x: barX, y: barY, w: barW * G.total.govRatio, h: barH, fill: { color: BLUE } });
    s.addShape(pres.ShapeType.rect, { x: barX + barW * G.total.govRatio, y: barY, w: barW * G.total.ownRatio, h: barH, fill: { color: NAVY } });
    s.addText(`정부지원금 ${Math.round(G.total.govRatio * 100)}%   ${man(GOV)}`, {
      x: barX + 0.16, y: barY, w: barW * G.total.govRatio - 0.3, h: barH, margin: 0,
      fontFace: HEAD, fontSize: 12.5, bold: true, color: WHITE, valign: "middle",
    });
    s.addText(`대응자금 ${Math.round(G.total.ownRatio * 100)}%\n${man(OWN)}`, {
      x: barX + barW * G.total.govRatio + 0.12, y: barY - 0.02, w: barW * G.total.ownRatio, h: barH + 0.04, margin: 0,
      fontFace: HEAD, fontSize: 9.5, bold: true, color: WHITE, valign: "middle", lineSpacing: 11,
    });
    s.addText("대응자금은 현금 또는 현물. 현물은 대표자·기 고용 인력 인건비, 사무실 임차료, 이행보증보험증권 수수료.", {
      x: barX, y: barY + 0.72, w: barW, h: 0.3, margin: 0, fontFace: BODY, fontSize: 9.5, color: GREY,
    });

    /* 비목별 배분 */
    const rows = G.gov.map((x) => [x.item, x.spend, Math.round(GOV * x.share)]);
    /* 아홉 줄이 들어가야 한다. 줄 높이를 먼저 재서 슬라이드 안에 맞춘다.
       처음엔 0.42로 잡았다가 마지막 두 줄이 화면 밖으로 나갔다. */
    const tTop = 3.96, tBot = 6.78;
    const rh = (tBot - tTop) / rows.length;
    const maxAmt = Math.max(...rows.map((r) => r[2]));
    s.addText("정부지원금 비목별 배분", { x: 0.7, y: 3.66, w: 6, h: 0.26, margin: 0, fontFace: HEAD, fontSize: 11, bold: true, color: BLUE });
    rows.forEach(([item, spend, amt], i) => {
      const y = tTop + i * rh;
      s.addText(item, { x: 0.75, y, w: 2.3, h: rh, margin: 0, fontFace: HEAD, fontSize: 9, bold: true, color: NAVY, valign: "middle" });
      s.addText(spend, { x: 3.1, y, w: 5.1, h: rh, margin: 0, fontFace: BODY, fontSize: 9, color: GREY, valign: "middle" });
      const w = 2.6 * (amt / maxAmt);
      s.addShape(pres.ShapeType.rect, { x: 8.35, y: y + rh / 2 - 0.07, w: Math.max(w, 0.08), h: 0.14, fill: { color: BLUE } });
      s.addText(man(amt), { x: 11.05, y, w: 1.5, h: rh, margin: 0, align: "right", fontFace: BODY, fontSize: 9, bold: true, color: NAVY, valign: "middle" });
      s.addShape(pres.ShapeType.line, { x: 0.75, y: y + rh, w: 11.8, h: 0, line: { color: LINE, width: 1 } });
    });
    s.addText(G.total.note, {
      x: 0.7, y: 6.88, w: 11.9, h: 0.42, margin: 0, fontFace: BODY, fontSize: 8.5, italic: true, color: "9AA3B0", lineSpacing: 11,
    });
    pageNum(s, 14);
  }

  /* ── 15. 정부지원금 상세 ─────────────────────────────── */
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    pageTitle(s, "BUDGET · 정부지원금", "무엇에 쓰고, 왜 필요한가", { fs: 30 });

    const y0 = 2.05, rh = 0.545;
    const head = [["비목 · 세목", 0.75, 2.6], ["집행항목", 3.4, 1.5], ["우리 지출", 4.95, 3.0], ["필요한 이유", 8.0, 4.55]];
    head.forEach(([t, x, w]) => s.addText(t, { x, y: y0 - 0.3, w, h: 0.26, margin: 0, fontFace: HEAD, fontSize: 9.5, bold: true, charSpacing: 1, color: BLUE }));
    s.addShape(pres.ShapeType.line, { x: 0.75, y: y0 - 0.02, w: 11.8, h: 0, line: { color: NAVY, width: 1.5 } });

    G.gov.forEach((g, i) => {
      const y = y0 + i * rh + 0.06;
      s.addText(g.code, { x: 0.75, y, w: 2.6, h: rh - 0.1, margin: 0, fontFace: BODY, fontSize: 8.5, color: GREY, valign: "middle" });
      s.addText(g.item, { x: 3.4, y, w: 1.5, h: rh - 0.1, margin: 0, fontFace: HEAD, fontSize: 9.5, bold: true, color: NAVY, valign: "middle" });
      s.addText(g.spend, { x: 4.95, y, w: 3.0, h: rh - 0.1, margin: 0, fontFace: HEAD, fontSize: 9.5, bold: true, color: g.warn ? "B0442C" : INK, valign: "middle" });
      s.addText(g.why, { x: 8.0, y, w: 4.55, h: rh - 0.1, margin: 0, fontFace: BODY, fontSize: 8.5, color: GREY, valign: "middle", lineSpacing: 11 });
      s.addShape(pres.ShapeType.line, { x: 0.75, y: y + rh - 0.06, w: 11.8, h: 0, line: { color: LINE, width: 1 } });
    });
    pageNum(s, 15);
  }

  /* ── 16. 대응자금 ────────────────────────────────────── */
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    pageTitle(s, "BUDGET · 대응자금", "20%는 현물로 채운다", { fs: 30 });
    const OWNv = G.total.amount - Math.round(G.total.amount * G.total.govRatio);

    s.addText("대응자금은 100% 소진이 필수이며, 계획에 대해 주관기관 사전 승인이 필요하다.", {
      x: 0.7, y: 1.95, w: 11.9, h: 0.3, margin: 0, fontFace: BODY, fontSize: 11, color: GREY,
    });

    const cw = 3.85, gap = 0.28, x0 = 0.7, y0 = 2.5, ch = 2.15;
    G.own.forEach((o, i) => {
      const x = x0 + i * (cw + gap);
      card(s, x, y0, cw, ch);
      numBadge(s, x + 0.3, y0 + 0.3, `0${i + 1}`, NAVY);
      s.addText(o.item, { x: x + 0.3, y: y0 + 0.88, w: cw - 0.6, h: 0.32, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: NAVY });
      s.addText(man(Math.round(OWNv * o.share)), { x: x + 0.3, y: y0 + 1.2, w: cw - 0.6, h: 0.3, margin: 0, fontFace: HEAD, fontSize: 13, bold: true, color: BLUE });
      s.addText(o.spend, { x: x + 0.3, y: y0 + 1.54, w: cw - 0.6, h: 0.5, margin: 0, fontFace: BODY, fontSize: 9.5, color: GREY, lineSpacing: 12 });
    });

    s.addText("비목별 증빙자료", { x: 0.7, y: 4.95, w: 6, h: 0.26, margin: 0, fontFace: HEAD, fontSize: 11.5, bold: true, color: BLUE });
    const ey = 5.25, erh = 0.32;
    G.evidence.forEach(([k, v], i) => {
      const y = ey + i * erh;
      s.addText(k, { x: 0.75, y, w: 1.75, h: erh, margin: 0, fontFace: HEAD, fontSize: 9, bold: true, color: NAVY, valign: "middle" });
      s.addText(v, { x: 2.6, y, w: 9.95, h: erh, margin: 0, fontFace: BODY, fontSize: 8.5, color: GREY, valign: "middle" });
    });
    pageNum(s, 16);
  }

  /* ── 17. 집행 시 주의 ────────────────────────────────── */
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    pageTitle(s, "BUDGET · 집행", "미리 알고 가는 열 가지", { fs: 30 });
    s.addText("소상공인 사업비 집행기준 <별표 11> · 집행 유의사항 <별표 12>에서 우리 사업에 걸리는 것만 추렸다.", {
      x: 0.7, y: 1.95, w: 11.9, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10.5, color: GREY,
    });

    const cw = 5.85, gap = 0.35, x0 = 0.7, y0 = 2.45, ch = 0.86;
    G.rules.forEach((r, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = x0 + col * (cw + gap), y = y0 + row * (ch + 0.1);
      const key = r.flag === "warn" ? "B0442C" : r.flag === "good" ? "0F7A4A" : BLUE;
      s.addShape(pres.ShapeType.rect, { x, y, w: 0.045, h: ch, fill: { color: key } });
      s.addText(r.t, { x: x + 0.22, y: y + 0.02, w: cw - 0.3, h: 0.28, margin: 0, fontFace: HEAD, fontSize: 11, bold: true, color: r.flag ? key : NAVY });
      s.addText(r.d, { x: x + 0.22, y: y + 0.3, w: cw - 0.3, h: 0.55, margin: 0, fontFace: BODY, fontSize: 8.8, color: GREY, lineSpacing: 11.5, valign: "top" });
    });
    pageNum(s, 17);
  }

  /* ── 18. 오늘 만든 것 ────────────────────────────────── */
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };
    pageTitle(s, "STATUS", G.built.title, { dark: true, fs: 30 });
    s.addText(G.built.note, {
      x: 0.7, y: 1.95, w: 11.9, h: 0.34, margin: 0, fontFace: BODY, fontSize: 10.5, color: "8FA0BE",
    });

    const y0 = 2.55, rh = 0.86;
    G.built.items.forEach(([t, d], i) => {
      const y = y0 + i * rh;
      s.addShape(pres.ShapeType.ellipse, { x: 0.75, y: y + 0.14, w: 0.2, h: 0.2, fill: { color: BLUE }, line: { color: BLUE } });
      s.addText(t, { x: 1.2, y, w: 3.6, h: 0.34, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: WHITE });
      s.addText(d, { x: 4.95, y: y + 0.02, w: 7.6, h: 0.62, margin: 0, fontFace: BODY, fontSize: 10, color: "B9C6DC", lineSpacing: 13.5, valign: "top" });
      s.addShape(pres.ShapeType.line, { x: 1.2, y: y + rh - 0.12, w: 11.35, h: 0, line: { color: "2C3A57", width: 1 } });
    });
    s.addText("publicbloom.art/studio  ·  publicbloom.art/ai  ·  publicbloom.art/ax-studio", {
      x: 0.7, y: 6.85, w: 11.9, h: 0.3, margin: 0, fontFace: BODY, fontSize: 10.5, color: BLUE,
    });
    pageNum(s, 18);
  }
}

/* ── 13. 연락처 ─────────────────────────────────────────── */
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addText("현장 사진 한 장이면 검토가 시작됩니다", {
    x: 0.9, y: 1.5, w: 11.5, h: 0.9, margin: 0,
    fontFace: HEAD, fontSize: 34, bold: true, color: WHITE,
  });
  s.addText(
    "설치 장소와 벽면 · 화면 크기, 일정만 알려주시면 실측 후 회계연도 기준 견적서를 보내드립니다.\n여성기업 확인서와 직접생산확인증명서를 함께 발행합니다.",
    { x: 0.9, y: 2.5, w: 11.5, h: 0.9, margin: 0, fontFace: BODY, fontSize: 14, color: "CFD6E4", lineSpacing: 24 }
  );

  const info = [
    ["대표", I.representative],
    ["연락처", I.phone],
    ["이메일", I.email],
    ["홈페이지", "publicbloom.art"],
    ["주소", I.address],
    ["사업자등록번호", I.businessNumber],
  ];
  const cw = 5.85, gap = 0.35, x0 = 0.9;
  info.forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = x0 + col * (cw + gap), y = 3.85 + row * 0.72;
    s.addText(k, { x, y, w: 1.75, h: 0.4, margin: 0, fontFace: HEAD, fontSize: 11.5, bold: true, color: BLUE, valign: "middle" });
    s.addText(v, { x: x + 1.8, y, w: cw - 1.8, h: 0.4, margin: 0, fontFace: BODY, fontSize: 13, color: WHITE, valign: "middle" });
    s.addShape(pres.ShapeType.line, { x, y: y + 0.48, w: cw, h: 0, line: { color: "2C3A57", width: 1 } });
  });
  s.addText("오늘은 봄날   ·   AI 미디어아트 기업   ·   대구 여성기업", {
    x: 0.9, y: 6.75, w: 11.5, h: 0.35, margin: 0, fontFace: BODY, fontSize: 11.5, color: "8FA0BE",
  });
}

const OUT = process.argv[2] || path.join(REPO, "docs/오늘은봄날_회사소개서.pptx");
pres.writeFile({ fileName: OUT }).then(() => console.log("생성 완료:", OUT));
