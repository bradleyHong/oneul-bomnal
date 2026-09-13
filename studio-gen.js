/* ArtWork Studio · 생성 엔진
 *
 * 화면을 코드로 그린다. 사진을 합성하지 않는다.
 *
 * 그렇게 하는 이유가 둘이다.
 *   1. 우리가 파는 것이 "코드로 만든다"이기 때문이다. 스톡을 이어 붙여
 *      보여주면 우리는 편집자로 보인다.
 *   2. 구매한 스톡의 원본 프레임을 공개 화면에 늘어놓는 것은 라이선스의
 *      취지에서 벗어난다. 에셋은 사내 최종 렌더의 입력으로만 쓴다.
 *
 * 3D 뼈대(assets/mesh)는 이 규칙 안에 있다. 저작권이 풀린 CC0 모형에서
 * 꼭짓점과 모서리 좌표만 받고 재질·텍스처·색은 버린다. 화면에 나가는 것은
 * 그 좌표를 받아 우리 코드가 매 프레임 다시 그린 선과 점이다. 남이 만든
 * 이미지가 그대로 나가는 자리는 한 군데도 없다.
 *
 * 모든 움직임은 5초를 한 바퀴로 도는 주기 함수다. sin/cos 안의 계수를
 * 정수로만 두면 0초와 5초의 화면이 정확히 같아진다. 현장 패널에서
 * 이어 붙였을 때 끊기지 않아야 하므로 이것은 타협하지 않는다.
 */
(function (global) {
  "use strict";

  var TAU = Math.PI * 2;
  var PERIOD = 5;                      // 초

  /* ── 난수 — 씨앗을 주면 같은 화면이 다시 나온다 ─────────── */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a += 0x6D2B79F5;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── 색 팔레트 ────────────────────────────────────────────
   * 낱말에서 고르고, 없으면 씨앗으로 고른다. */
  /* 라이브러리 2,234편에서 배운 색.
   * 사람이 고른 조합이 아니라 실제로 같이 찍힌 조합이다. 프레임마다
   * 대표색 다섯을 세고 비슷한 것끼리 묶어, 무리의 한가운데에 있는
   * 실제 화면 하나를 대표로 삼았다. n은 그 색으로 찍힌 편수다. */
  var MINED = [
    { id: "먹빛", bg: "#020203", ink: ["#161718", "#2C2D2E", "#494B4D", "#6D7073", "#9B9FA2"], n: 319 },
    { id: "하늘빛", bg: "#070A0C", ink: ["#374E5E", "#638196", "#97B1CA", "#D6E7F3", "#202A2F"], n: 248 },
    { id: "쪽빛", bg: "#080913", ink: ["#424794", "#641C5E", "#260D34", "#9B4A81", "#558EBF"], n: 196 },
    { id: "안개", bg: "#181818", ink: ["#BBBBBD", "#B0B1B2", "#A3A3A4", "#959494", "#C9CACB"], n: 181 },
    { id: "짙은 금빛", bg: "#1E1600", ink: ["#F9AA00", "#995400", "#351800", "#D07A00", "#6A3400"], n: 163 },
    { id: "밝은 하늘빛", bg: "#0C171D", ink: ["#63B5E6", "#2290D9", "#8D5DA9", "#B39BCC", "#54358C"], n: 147 },
    { id: "하늘빛 2", bg: "#05090C", ink: ["#2C4C5E", "#0C3044", "#526B73", "#7C8E8D", "#ABB3A2"], n: 145 },
    { id: "홍빛", bg: "#070202", ink: ["#3B1610", "#883D25", "#E7251C", "#E19523", "#E45C65"], n: 132 },
    { id: "밝은 주홍빛", bg: "#0E0D0B", ink: ["#716555", "#B59A7B", "#8C7D6C", "#CFB796", "#3E3E2B"], n: 125 },
    { id: "자줏빛", bg: "#060304", ink: ["#341C23", "#84393A", "#E42847", "#EA8460", "#4E2363"], n: 92 },
    { id: "금빛", bg: "#0C0B06", ink: ["#5D5632", "#393B20", "#7E6D45", "#CED5DC", "#A3985E"], n: 92 },
    { id: "먹빛 2", bg: "#120F0F", ink: ["#8B7875", "#A38F8B", "#BFAAA5", "#4A3E3E", "#221B1E"], n: 90 },
    { id: "안개 2", bg: "#0F0D0F", ink: ["#796877", "#594656", "#47112C", "#94184E", "#ECB7BE"], n: 81 },
    { id: "쪽빛 2", bg: "#030206", ink: ["#1C1330", "#322158", "#3D3C90", "#723A78", "#9069C5"], n: 78 },
    { id: "짙은 쪽빛", bg: "#010205", ink: ["#0D102A", "#1C2353", "#2B3C88", "#4460BF", "#83A3F9"], n: 75 },
    { id: "연둣빛", bg: "#0B0D08", ink: ["#566841", "#425431", "#687950", "#2D3F23", "#7F8F64"], n: 70 },
  ];

  var PALETTES = [
    { id: "봄빛",   bg: "#0d1420", ink: ["#ffd6e7", "#ffb3d1", "#c9f0d8", "#fff2b8", "#ffffff"] },
    { id: "바다",   bg: "#04121c", ink: ["#7fe3e0", "#3aa8c9", "#bff2ff", "#1f6f8b", "#ffffff"] },
    { id: "겨울밤", bg: "#070c18", ink: ["#cfe3ff", "#8fb4dc", "#ffffff", "#5a7fb5", "#e8f1ff"] },
    { id: "단청",   bg: "#120a0a", ink: ["#e8503a", "#f2b632", "#2f6fb0", "#1f8a5b", "#f4efe6"] },
    { id: "노을",   bg: "#160b12", ink: ["#ff8b5e", "#ffc06b", "#ff5f7e", "#7a4a8c", "#ffe9d6"] },
    { id: "숲",     bg: "#08130d", ink: ["#79d99a", "#3f9d6d", "#d6f2b8", "#1f6b4a", "#eafff2"] },
    { id: "도시밤", bg: "#0a0a12", ink: ["#59e0ff", "#ff5fd2", "#ffe45e", "#7b6bff", "#ffffff"] },
    { id: "먹",     bg: "#0b0b0c", ink: ["#f2f2f0", "#b8b8b4", "#6e6e6a", "#3a3a38", "#ffffff"] },
    { id: "우주",   bg: "#05060f", ink: ["#9db4ff", "#d6c8ff", "#ffffff", "#4a5bb0", "#e8ecff"] },
    { id: "흙",     bg: "#120d09", ink: ["#d9a066", "#8c5a2b", "#f0d9b8", "#5c4022", "#fff6e8"] },
    { id: "안개",   bg: "#101418", ink: ["#c9d6de", "#8ea3b0", "#e8f0f4", "#5c6f7a", "#ffffff"] },
    { id: "형광",   bg: "#06080a", ink: ["#c6ff4f", "#4fffd0", "#ff4f8b", "#4f9bff", "#ffffff"] },
    { id: "청자",   bg: "#081412", ink: ["#9fd8c8", "#5aa896", "#d6f0e6", "#2f6b60", "#f0fbf7"] },
    { id: "산호",   bg: "#18090c", ink: ["#ff7a7a", "#ffb08a", "#ffd9c0", "#c04a5a", "#fff0ea"] },
    { id: "라벤더", bg: "#0d0a16", ink: ["#c3b0ff", "#8f7ae0", "#e8dfff", "#5a4a9a", "#ffffff"] },
    { id: "심해",   bg: "#03080f", ink: ["#2f7fa8", "#1b4f70", "#7fd0e8", "#0f3550", "#cfeaf5"] }
  ];

  /* ── 더 고를 수 있는 색 ─────────────────────────────────────
   *
   * 위 PALETTES 는 compose 가 제비뽑기로 집는 목록이다. 여기에 하나라도
   * 더하면 그 뽑기가 밀려서 이미 나간 번호가 다른 색으로 나온다.
   * 그래서 새 색은 이쪽에 둔다 — 손님이 도구에서 손으로 고를 때만 쓰고,
   * 제비뽑기에는 들어가지 않는다. 손으로 고른 색은 설정표에 색값 자체가
   * 실려 나가므로 판과 아무 상관이 없다. */
  var PALETTES_EXTRA = [
    { id: "먹과 금", bg: "#08070a", ink: ["#e4c26a", "#a8802c", "#f5e6bd", "#5c4416", "#fffaf0"] },
    { id: "청자",    bg: "#061210", ink: ["#9fd8c8", "#5aa894", "#d9f2ea", "#2f6b5c", "#f0fffa"] },
    { id: "적벽",    bg: "#120606", ink: ["#e0533c", "#8f2b1f", "#f5a48f", "#5c1a12", "#ffe8e0"] },
    { id: "코발트",  bg: "#04081a", ink: ["#3a6bff", "#1f3fb0", "#9fb8ff", "#0f1f6b", "#e8efff"] },
    { id: "구리",    bg: "#100a06", ink: ["#d98a4a", "#a05a28", "#f2c79a", "#5c3316", "#fff0e0"] },
    { id: "안개 숲", bg: "#0a100c", ink: ["#b8ccb0", "#7d9a78", "#e0ecd8", "#4a5f48", "#f2f8ee"] },
    { id: "자정",    bg: "#020308", ink: ["#4a5a8f", "#2a3560", "#8fa0d0", "#151d3a", "#dde4f5"] },
    { id: "백자",    bg: "#0c0d0f", ink: ["#e8e6e0", "#c0bdb4", "#ffffff", "#8a877e", "#f8f7f4"] },
    { id: "진달래",  bg: "#120810", ink: ["#e86aa8", "#a83870", "#f7b0d0", "#6b1f45", "#ffe8f2"] },
    { id: "청포도",  bg: "#0a0f06", ink: ["#c4e05a", "#8aa82c", "#e8f5a0", "#4f6b16", "#f8ffe0"] },
    { id: "재",      bg: "#0a0a0a", ink: ["#9a9a9a", "#6a6a6a", "#d8d8d8", "#3a3a3a", "#f0f0f0"] },
    { id: "심홍",    bg: "#0f0410", ink: ["#c93a7a", "#7a1f52", "#f08ab0", "#4a0f30", "#ffd8e8"] }
  ];

  PALETTES = MINED.concat(PALETTES);

  /* 낱말이 고른 색과 잘 어울리는 이웃들. 같은 문장이라도 여기서 돌려 쓴다. */
  var KIN = {
    "바다": ["심해", "청자", "안개"], "심해": ["바다", "우주", "겨울밤"],
    "봄빛": ["산호", "라벤더", "노을"], "산호": ["봄빛", "노을"],
    "겨울밤": ["우주", "안개", "심해"], "우주": ["겨울밤", "라벤더", "심해"],
    "단청": ["흙", "노을", "산호"], "흙": ["단청", "먹", "노을"],
    "노을": ["산호", "봄빛", "단청"], "숲": ["청자", "흙", "안개"],
    "청자": ["숲", "바다", "안개"], "도시밤": ["형광", "라벤더", "우주"],
    "형광": ["도시밤", "라벤더"], "먹": ["안개", "흙"],
    "안개": ["먹", "청자", "겨울밤"], "라벤더": ["우주", "봄빛", "도시밤"]
  };

  /* ── 낱말 사전 — 문장에서 색과 움직임을 읽는다 ──────────── */
  /* 한 글자짜리 낱말은 쓰지 않는다. "물"은 건물에, "강"은 강렬에,
   * "산"은 부산에, "눈"은 눈의 벽에 걸린다. 실제로 그렇게 틀렸다. */
  var LEX = [
    { re: /바다|파도|물결|물빛|해변|해양|웨이브|호수|강물|서핑/, pal: "바다", style: "wave", tags: ["바다", "파도"] },
    { re: /노을|석양|저녁놀|일몰|황혼/,             pal: "노을", style: "flow", tags: ["노을"] },
    { re: /겨울|눈송이|눈발|함박눈|설경|시린|한파/, pal: "겨울밤", style: "snow", tags: ["겨울"] },
    { re: /전통|단청|오방|고분|국가유산|사찰|고궁|한옥/, pal: "단청", style: "contour", tags: ["전통"] },
    { re: /벚꽃|봄바람|봄날|봄빛|꽃잎|화사|산뜻/,  pal: "봄빛", style: "flow", tags: ["봄", "화사"] },
    { re: /숲|나무|초록|수목|이끼|정원/,           pal: "숲", style: "flow", tags: ["자연"] },
    { re: /도시|야경|네온|빌딩숲|거리/,            pal: "도시밤", style: "grid", tags: ["도시"] },
    { re: /수묵|먹빛|담백|여백|흑백|모노톤/,       pal: "먹", style: "contour", tags: ["수묵"] },
    { re: /우주|은하수|별빛|밤하늘|성운|SF/,       pal: "우주", style: "particle", tags: ["우주"] },
    { re: /흙빛|도자|토기|질감|모래/,              pal: "흙", style: "contour", tags: ["질감"] },
    { re: /안개|구름|하늘빛|바람결|대기/,          pal: "안개", style: "flow", tags: ["대기"] },
    { re: /형광|사이버|글리치|디지털|비비드/,      pal: "형광", style: "grid", tags: ["사이버"] },
    { re: /빛줄기|조명|반짝|보케|번짐|글로우/,     pal: null, style: "bloom", tags: ["빛"] },
    { re: /기둥형|세로형|줄기|흘러내리/,           pal: null, style: "column", tags: ["세로"] },
    { re: /입자|먼지|알갱이|파티클/,               pal: null, style: "particle", tags: ["입자"] },

    /* 여기서부터는 뒤에 붙인 소재다. 앞의 것이 이미 고른 색·그림은
       덮어쓰지 않으므로(아래 forEach 가 첫 것만 잡는다) 위 열다섯 줄이
       읽던 문장은 하나도 달라지지 않는다. 그림 이름에 sa: 를 붙이는
       것은 6판부터 후보가 엔진 그림뿐이기 때문이다. 접두어 없이 적으면
       fit 목록에 없어서 낱말이 고른 그림이 그냥 버려진다. */
    { re: /대숲|대나무/,             pal: "숲",   style: "sa:bamboo",     tags: ["대숲"] },
    { re: /잎맥/,                    pal: "숲",   style: "sa:leafvein",   tags: ["잎맥"] },
    { re: /갈대/,                    pal: "흙",   style: "sa:reed",       tags: ["갈대"] },
    { re: /꽃잎|꽃눈/,               pal: "봄빛", style: "sa:petalfall",  tags: ["꽃"] },
    { re: /한글|자모|조판/,          pal: "먹",   style: "sa:hangul",     tags: ["한글"] },
    { re: /등고선|지형도/,           pal: "흙",   style: "sa:topo",       tags: ["지형"] },
    { re: /회로|골격/,               pal: "형광", style: "sa:circuit",    tags: ["회로"] },
    { re: /한지/,                    pal: "흙",   style: "sa:hanji",      tags: ["한지"] },
    { re: /유화|붓자국|붓결/,        pal: "노을", style: "sa:impasto",    tags: ["회화"] },
    { re: /명암|고전 회화/,          pal: "먹",   style: "sa:chiaroscuro", tags: ["회화"] },
    { re: /계단식|층층/,             pal: "흙",   style: "sa:terrace",    tags: ["지형"] },
    { re: /씨실|날실|직조/,          pal: "단청", style: "sa:weave",      tags: ["직조"] },
    { re: /결정|광물|크리스탈/,      pal: "청자", style: "sa:crystal",    tags: ["결정"] },
    { re: /오로라/,                  pal: "안개", style: "sa:aurora",     tags: ["오로라"] },
    { re: /심해|빛기둥/,             pal: "심해", style: "sa:ocean",      tags: ["심해"] },
    { re: /낙화|불꽃/,               pal: "노을", style: "sa:nakhwa",     tags: ["낙화"] }
  ];

  /* 분위기 12종 — 속도와 밀도, 선 굵기와 밝기를 함께 정한다.
   * 속도는 정수여야 5초 한 바퀴가 정확히 맞아떨어진다. */
  var MOODS = [
    { id: "고요", re: /고요|정적|멈춘/,        speed: 1, density: 0.6, weight: 0.8, glow: 0.9 },
    { id: "잔잔", re: /잔잔|평온|느리|천천/,   speed: 1, density: 0.8, weight: 1.0, glow: 1.0 },
    { id: "은은", re: /은은|살며시|옅/,        speed: 1, density: 0.9, weight: 0.8, glow: 0.8 },
    { id: "차분", re: /차분|담담|정갈/,        speed: 1, density: 1.0, weight: 1.0, glow: 0.9 },
    { id: "몽환", re: /몽환|꿈결|아련|신비/,   speed: 2, density: 1.2, weight: 0.9, glow: 1.3 },
    { id: "화사", re: /화사|밝|환하/,          speed: 2, density: 1.1, weight: 1.1, glow: 1.2 },
    { id: "산뜻", re: /산뜻|상큼|가볍/,        speed: 2, density: 1.0, weight: 1.0, glow: 1.1 },
    { id: "경쾌", re: /경쾌|활기|발랄|신나/,   speed: 3, density: 1.3, weight: 1.1, glow: 1.2 },
    { id: "역동", re: /역동|빠르|힘차|질주/,   speed: 3, density: 1.5, weight: 1.3, glow: 1.2 },
    { id: "강렬", re: /강렬|짙|선명|대담/,     speed: 3, density: 1.4, weight: 1.6, glow: 1.4 },
    { id: "웅장", re: /웅장|장엄|거대|압도/,   speed: 1, density: 1.5, weight: 1.6, glow: 1.2 },
    { id: "묵직", re: /묵직|깊|무겁|진중/,     speed: 1, density: 1.3, weight: 1.5, glow: 0.9 }
  ];

  /* 느낌 열둘. 순서는 작품 번호(위 5비트)에 박히므로 바꾸거나 중간에
   * 끼워 넣지 않는다. 새로 만들면 뒤에 붙인다.
   * studio.js(고르는 화면)와 play.html(전용 플레이어)이 같은 목록을 본다.
   * 둘이 어긋나면 같은 번호가 다른 그림이 된다. */
var SCENES = [
    { ko: "봄빛 리본",   en: "Spring Ribbon", text: "로비 미디어월에 걸 봄바람 빛 리본, 따뜻하고 화사하게" },
    { ko: "바다 물결",   en: "Ocean Wave",    text: "바다와 파도, 잔잔하게 흐르는 로비 화면" },
    { ko: "겨울 눈",     en: "Winter Snow",   text: "겨울 밤 도심 전광판, 눈송이 내리는 화면, 차분하게" },
    { ko: "전통 단청",   en: "Dancheong",     text: "고분군 야간 포토존, 전통 색감으로 웅장하게" },
    { ko: "도시 야경",   en: "Night City",    text: "도시 야경 네온 전광판, 경쾌하게", off: true },
    { ko: "우주 별빛",   en: "Starfield",     text: "우주와 별빛, 고요하게 흐르는 밤하늘", off: true },
    { ko: "숲 초록",     en: "Deep Forest",   text: "숲과 나무, 초록빛으로 산뜻하게" },
    { ko: "노을",        en: "Sunset",        text: "노을 지는 저녁, 은은하게" },
    { ko: "수묵 여백",   en: "Ink Wash",      text: "수묵 담백한 여백, 묵직하게" },
    { ko: "형광 사이버", en: "Neon Cyber",    text: "형광 사이버 글리치, 강렬하게" },
    { ko: "안개 하늘",   en: "Mist Sky",      text: "안개 낀 하늘과 바람결, 몽환적으로", off: true },
    { ko: "빛 번짐",     en: "Bloom",         text: "빛줄기 번짐, 은은하고 잔잔하게", off: true },

    /* 6판까지 열둘로 버텼는데, 열둘 중 넷이 안개·빛처럼 재료가 없는
       낱말이라 어느 스타일로 풀어도 화면이 비었다. 그 넷을 내리고
       (off — 이미 나간 번호는 그대로 그려야 하므로 칸은 남긴다)
       손으로 짜야 나오는 소재를 뒤에 붙인다. 느낌 번호는 5비트라
       서른한 칸까지 쓸 수 있고 31번은 직접 적은 문장 자리다. */
    { ko: "대숲",        en: "Bamboo Grove",  text: "바람에 흔들리는 대숲, 빽빽하고 잔잔하게" },
    { ko: "잎맥",        en: "Leaf Vein",     text: "잎맥이 갈라져 뻗는 화면, 촘촘하고 정갈하게" },
    { ko: "갈대밭",      en: "Reed Field",    text: "갈대밭이 바람에 눕는 저녁, 묵직하게" },
    { ko: "꽃눈",        en: "Petal Fall",    text: "꽃잎이 흩날려 쌓이는 화면, 화사하게" },
    { ko: "한글 조판",   en: "Hangul Type",   text: "한글 자모로 짠 조판, 정갈하고 묵직하게" },
    { ko: "등고선",      en: "Topography",    text: "등고선 지형도가 겹쳐 흐르는 화면, 촘촘하고 차분하게" },
    { ko: "회로",        en: "Circuit",       text: "회로처럼 얽힌 도시 골격, 강렬하게" },
    { ko: "한지 결",     en: "Hanji Layers",  text: "한지 결이 겹쳐 쌓인 화면, 은은하고 묵직하게" },
    { ko: "유화 붓결",   en: "Impasto",       text: "두껍게 올린 유화 붓자국, 강렬하게" },
    { ko: "고전 명암",   en: "Chiaroscuro",   text: "고전 회화의 깊은 명암, 웅장하게" },
    { ko: "계단 지형",   en: "Terraces",      text: "층층이 쌓인 계단식 지형, 묵직하게" },
    { ko: "직조",        en: "Weave",         text: "씨실과 날실이 짜이는 직조, 촘촘하게" },
    { ko: "결정",        en: "Crystal",       text: "결정이 자라나는 광물 단면, 선명하고 강렬하게" },
    { ko: "오로라",      en: "Aurora",        text: "극지의 오로라가 흐르는 밤, 몽환적으로" },
    { ko: "심해",        en: "Ocean Deep",    text: "심해의 물결과 빛기둥, 고요하고 묵직하게" },
    { ko: "낙화",        en: "Nakhwa",        text: "낙화, 불꽃이 줄지어 떨어지는 밤, 웅장하게" }
    ];

  /* 화면에 내놓는 칸만 추린 자리표. 번호(idx)는 그대로 두고 보여 줄
     것만 고른다. 고르는 화면·미리보기 벽·무작위가 모두 이걸 본다. */
  var LIVE = SCENES.map(function (s2, i) { return s2.off ? -1 : i; })
                   .filter(function (i) { return i >= 0; });

  /* 엔진을 붙이기 전부터 있던 그림들.
   *
   * 이 목록도 판을 타야 한다. 엔진 목록(artIds)만 얼려 놓고 여기를 늘리면
   * 같은 일이 그대로 일어난다 — even 후보는 이 목록이 앞에 붙으므로,
   * 하나만 더해도 그 뒤가 통째로 밀려 이미 나간 번호가 다른 그림이 된다.
   * #29 가 "얼룩"을 여기 더하면서 실제로 그랬다. 16:9 와 4:3 화면에서
   * 1판 13%, 2판 10%, 3판 10%, 4판 11% 의 번호가 다른 그림으로 바뀌었다.
   * 세로·띠는 목록이 따로라 무사했다.
   *
   * 그래서 1~4판이 쓰던 열넷을 BASE_V1 으로 얼리고, 새로 더한 것은
   * 5판부터만 쓴다. 여기에 더할 때는 반드시 판을 올린다. */
  var BASE_V1 = ["flow", "wave", "particle", "contour", "grid", "bloom", "column",
                 "snow", "ribbon", "orbit", "mesh", "bar", "spiral", "drift"];
  /* 5판 — 여기에만 더한다. */
  var BASE_IDS = BASE_V1.concat(["organic"]);

  /* 그림 엔진(studio-engine.js)의 56종을 여기에 이어 붙인다.
   *
   * 이름이 넷 겹친다(wave · bloom · orbit · spiral). 같은 낱말이지만 다른
   * 그림이라 하나로 합칠 수 없다. 앞에 sa:를 붙여 갈라 둔다. 화면에는
   * 접두어를 보이지 않는다. 고객이 볼 이유가 없다. */
  var ART_PREFIX = "sa:";
  function artIds() {
    var A = global.StudioArt;
    if (!A || !A.STYLES) return [];
    return A.STYLES.map(function (e) { return ART_PREFIX + e[0]; });
  }
  function isArt(id) { return typeof id === "string" && id.indexOf(ART_PREFIX) === 0; }

  var STYLE_IDS = BASE_IDS.concat(artIds());

  /* 화면 비율에 따라 어울리는 것이 다르다. 1:6 기둥에 등고선을 그리면
   * 가운데만 뭉치고 위아래가 비어 버린다. 실제로 그렇게 나왔다. */
  /* 세로 기둥에 어울리는 것과 가로 띠에 어울리는 것을 갈라 적는다.
   * 가운데로 모이는 그림(만다라·궤도·리사주)을 1:6 기둥에 걸면 위아래가
   * 통째로 빈다. 실제로 그렇게 나왔다. */
  /* ── 판별 목록 ──────────────────────────────────────────────
   * 스타일이 늘면 pick 이 다른 칸을 집어, 이미 나간 번호가 다른 그림이
   * 된다. 그래서 판이 나갈 때마다 그때의 목록을 얼려 둔다.
   *
   * 한 번 뚫렸다. 하트(#17)가 나갈 때 2판은 엔진 56종이었는데, #25 가
   * VJ 8종을 넣으면서 판을 안 올렸다. 그 뒤 2판을 64종으로 잘못 얼렸고,
   * 고객이 담아 둔 화면이 다른 그림으로 다시 그려졌다. 여기 적힌 수는
   * "그 판이 처음 나간 날의 목록"이다. 한 칸도 바꾸지 않는다.
   *
   *   2판  엔진 56종  (BN2-, #11 ~ #25 사이)
   *   3판  엔진 78종  (BN3-, #26 이 나간 상태)
   *   4판  엔진 88종  (BN4-, #27 이 나간 상태)
   *   5판  전부      (BN5-, 지금 나가는 것)
   *
   * #25 가 나가 있던 몇 시간 동안 BN2- 로 나간 번호는 64종 목록으로
   * 뽑힌 것이라 56종으로는 못 되살린다. 그 창은 짧았고 팔린 번호는
   * 없다. 하트는 그린 스타일 이름을 같이 저장해 이 문제를 비켜 간다. */
  var ART_V2_COUNT = 56, ART_V3_COUNT = 78, ART_V4_COUNT = 88;
  function artIdsN(n) { return artIds().slice(0, n); }

  /* 2판·3판 목록. 이미 나간 번호가 쓴다. 한 칸도 바꾸거나 끼워 넣지 않는다.
   * VJ 넷("bars" "chevron" "strobe" "plasma")은 2판 엔진 56종 밖이라
   * withPrefix 가 2판에서는 저절로 걸러 낸다. */
  var ART_TALL_V2 = ["hanji", "smoke", "dotmatrix", "weave", "terrace", "stripe", "branch",
                  "rain", "bamboo", "flock", "bloom", "inkwash", "thread", "paper",
                  "bars", "chevron", "strobe", "plasma"];
  var ART_WIDE_V2 = ["moire", "oscillo", "slitscan", "dotmatrix", "weave", "terrace", "blinds",
                  "stripe", "lowpoly", "hanji", "wave", "warp", "topo", "magnet", "isocity",
                  "bars", "chevron", "strobe", "plasma", "flythrough"];
  var ART_TALL_V3 = ART_TALL_V2.concat(["segment", "asciiart", "desordre", "nakhwa"]);
  var ART_WIDE_V3 = ART_WIDE_V2.concat(["pdu", "barcode", "segment", "asciiart", "desordre",
                                        "frame", "frieze", "hardedge", "nakhwa"]);

  /* 4판 목록. 이미 나간 번호가 쓴다. 한 칸도 바꾸지 않는다.
   * 가운데로 모이는 그림(3D 뼈대·자모·씨앗나선·꽃)은 기둥과 띠에 넣지
   * 않는다. 걸면 가운데만 차고 나머지가 통째로 빈다. */
  var ART_TALL_V4 = ART_TALL_V3.concat([
    /* 잎맥과 갈대는 아래에서 올라오는 그림이라 기둥에 맞는다 */
    "leafvein", "reed",
    /* 꽃눈은 위에서 내리고, 유화는 밭이라 어디든 찬다 */
    "petalfall", "impasto"]);
  var ART_WIDE_V4 = ART_WIDE_V3.concat([
    /* 갈대밭은 옆으로 넓을수록 살고, 민들레는 홀씨가 옆으로 날아간다 */
    "reed", "dandelion",
    /* 파도와 회랑은 수평선이 있는 그림이라 띠에 산다. 꽃눈·유화는 밭 */
    "petalfall", "ocean", "impasto", "renaissance"]);

  /* 5판 — 여기에만 더한다.
   * 벽보는 인쇄물이라 어느 비율에서나 선다. 기둥에서는 활자 줄이
   * 층층이 쌓이고, 띠에서는 줄무늬가 길게 흐른다. */
  var ART_TALL = ART_TALL_V4.concat(["flyposter"]);
  var ART_WIDE = ART_WIDE_V4.concat(["flyposter"]);

  function withPrefix(list, have) {
    have = have || artIds();
    return list.map(function (id) { return ART_PREFIX + id; })
               .filter(function (id) { return have.indexOf(id) >= 0; });
  }

  /* 1판 — 엔진을 붙이기 전 목록. 이미 나간 BN- 번호가 이걸 쓴다.
     한 칸도 바꾸거나 끼워 넣지 않는다. */
  var FIT_V1 = {
    tall:  ["column", "bar", "flow", "wave", "drift", "snow", "particle", "mesh", "ribbon"],
    wide:  ["wave", "flow", "bar", "ribbon", "grid", "drift", "mesh", "particle", "column"],
    even:  BASE_V1
  };

  var FIT_V2 = {
    tall:  FIT_V1.tall.concat(withPrefix(ART_TALL_V2, artIdsN(ART_V2_COUNT))),
    wide:  FIT_V1.wide.concat(withPrefix(ART_WIDE_V2, artIdsN(ART_V2_COUNT))),
    even:  BASE_V1.concat(artIdsN(ART_V2_COUNT))
  };
  var FIT_V3 = {
    tall:  FIT_V1.tall.concat(withPrefix(ART_TALL_V3, artIdsN(ART_V3_COUNT))),
    wide:  FIT_V1.wide.concat(withPrefix(ART_WIDE_V3, artIdsN(ART_V3_COUNT))),
    even:  BASE_V1.concat(artIdsN(ART_V3_COUNT))
  };
  var FIT_V4 = {
    tall:  FIT_V1.tall.concat(withPrefix(ART_TALL_V4, artIdsN(ART_V4_COUNT))),
    wide:  FIT_V1.wide.concat(withPrefix(ART_WIDE_V4, artIdsN(ART_V4_COUNT))),
    even:  BASE_V1.concat(artIdsN(ART_V4_COUNT))
  };
  var FIT_V5 = {
    tall:  FIT_V1.tall.concat(withPrefix(ART_TALL)),
    wide:  FIT_V1.wide.concat(withPrefix(ART_WIDE)),
    even:  STYLE_IDS
  };

  /* ── 6판 — 솎아낸 판 ───────────────────────────────────────
   *
   * 5판까지는 그린 것을 전부 후보에 넣었다. 그래서 손님이 "다른 화면
   * 보기"를 누르면 공들인 그림과 습작이 같은 확률로 나왔다. 원 몇 개와
   * 선 몇 줄뿐인 화면이 나오면, 그 뒤에 아무리 좋은 것이 있어도 손님은
   * 이미 이 가게의 수준을 그것으로 봤다.
   *
   * 그래서 6판은 내놓을 것만 담는다. 89종을 다 펼쳐 놓고 골랐다.
   * 뺀 것의 기준은 취향이 아니라 밀도다 — 화면이 비어 보이거나(비·궤도·
   * 액자), 어디서나 보는 흔한 도형이거나(미니멀·벡터·콜라주·글래스),
   * 뭉개져 형태가 안 읽히는 것(연기·모자이크·간섭무늬)을 뺐다.
   *
   * 뺀 그림도 코드는 그대로 있다. 이미 나간 번호(BN- ~ BN5-)는 예전
   * 목록으로 그리므로 팔린 화면은 하나도 안 바뀐다. 6판부터 안 뽑힐 뿐이다.
   *
   * 기본 그림(flow·wave 같은 것)은 6판에서 통째로 뺐다. 그림이 나빠서가
   * 아니라 4K 납품 경로(tools/render-studio.mjs → works/studio-art.html)가
   * 엔진 그림만 그릴 줄 알기 때문이다. 6판 번호는 전부 그 자리에서 4K로
   * 뽑을 수 있어야 한다. 손님이 손잡이를 돌려 만든 설정표를 받아 그대로
   * 렌더해 보내는 것이 6판의 약속이다. */
  var ART_V6 = [
    "pop", "swiss", "aurora", "inkwash", "wave", "crystal", "thread", "bloom",
    "circuit", "topo", "constellation", "stripe", "paper", "bamboo", "ripple",
    "slitscan", "dotmatrix", "oscillo", "lowpoly", "isocity", "branch", "mandala",
    "hanji", "blinds", "magnet", "terrace", "weave", "tunnel", "kaleido",
    "wire", "pointcloud",
    "jamo", "pdu", "barcode", "segment", "asciiart", "desordre",
    "chiaroscuro", "frieze", "hardedge", "nakhwa",
    "phyllo", "blossom", "leafvein", "reed", "dandelion",
    "petalfall", "ocean", "anamorph", "impasto", "renaissance", "flyposter"
  ];
  function keptIn(list, keep) {
    return list.filter(function (id) { return keep.indexOf(id) >= 0; });
  }
  var FIT_V6 = {
    tall:  withPrefix(keptIn(ART_TALL, ART_V6)),
    wide:  withPrefix(keptIn(ART_WIDE, ART_V6)),
    even:  withPrefix(ART_V6)
  };

  /* ── 7판 — 활자를 덜어내고 한글을 세운다 ────────────────────
   *
   * 활자 묶음(활자판·칠획·신호·문자 명암)은 넷 다 라틴 글자와 숫자를
   * 늘어놓는 그림이다. 기계가 뱉은 표처럼 보이지 그림으로는 안 읽혔다.
   * 넷을 빼고, 대신 제대로 짠 한글 조판을 세운다. 자모는 획이고 획은
   * 좌표라 코드로 그리기에 라틴 알파벳보다 오히려 낫다.
   *
   * 자모(jamo)는 남긴다. 낱글자 하나를 크게 쓰는 그림이라 조판과 다르다. */
  var ART_V7 = ART_V6
    .filter(function (id) { return ["pdu", "segment", "barcode", "asciiart"].indexOf(id) < 0; })
    .concat(["hangul"]);
  var FIT = {
    tall:  withPrefix(keptIn(ART_TALL.concat(["hangul"]), ART_V7)),
    wide:  withPrefix(keptIn(ART_WIDE.concat(["hangul"]), ART_V7)),
    even:  withPrefix(ART_V7)
  };
  var FITS = { 1: FIT_V1, 2: FIT_V2, 3: FIT_V3, 4: FIT_V4, 5: FIT_V5, 6: FIT_V6, 7: FIT };

  /* ── 문장 읽기 ────────────────────────────────────────────
   * 낱말은 방향만 잡는다. 고정하지 않는다.
   * 문장이 정한 것을 매번 그대로 쓰면 "다른 화면 보기"를 눌러도
   * 늘 같은 그림이 나온다. 그래서 낱말이 고른 것을 가장 자주 쓰되,
   * 어울리는 이웃으로도 돌려 가며 쓴다. */
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

  /* 판(version)을 받는다.
   *
   * 작품 번호는 느낌 번호와 씨앗만 담는다. 그림은 이 함수가 그 둘로 다시
   * 뽑아 만든다. 그래서 스타일 목록이 길어지면 pick이 다른 칸을 집어,
   * 이미 나간 번호가 다른 그림이 된다. 화면에는 "같은 번호로 렌더링해
   * 드립니다"라고 적혀 있으므로 그렇게 두면 안 된다.
   *
   *   v=1  기존 14종만.          BN- 번호가 쓴다.
   *   v=2  + 엔진 56종 = 70종.   BN2- 번호가 쓴다.
   *   v=3  + 엔진 78종 = 92종.   BN3- 번호가 쓴다.
   *   v=4  전부.                 BN4- 번호가 쓴다(지금 나가는 것).
   *
   * 색·느낌·나머지 값은 두 판이 같다. r()을 부르는 횟수가 같기 때문이다. */
  function compose(text, seed, aspect, v) {
    var r = rng(seed);
    var palHint = null, styleHint = null, tags = [];

    LEX.forEach(function (e) {
      if (!e.re.test(text)) return;
      if (e.pal && !palHint) palHint = e.pal;
      if (e.style && !styleHint) styleHint = e.style;
      tags = tags.concat(e.tags);
    });

    // 분위기 — 문장에 없으면 씨앗으로 고른다
    var mood = null;
    MOODS.forEach(function (m) { if (!mood && m.re.test(text)) mood = m; });
    if (!mood) mood = pick(r, MOODS);

    // 색 — 낱말이 고른 것 55%, 어울리는 이웃 30%, 나머지는 자유
    /* 색은 고객이 고른 느낌을 따른다. "수묵 여백"을 눌렀는데 금색이 나오면
     * 고른 의미가 없다. 변화는 스타일과 씨앗에서 낸다.
     * 이웃 색은 결이 같은 것들이라 25%까지만 섞는다. */
    var palId;
    var d = r();
    if (palHint) palId = (d < 0.75 || !KIN[palHint]) ? palHint : pick(r, KIN[palHint]);
    else palId = pick(r, PALETTES).id;
    var palette = PALETTES.filter(function (p) { return p.id === palId; })[0] || PALETTES[0];

    // 스타일 — 화면 비율에 맞는 것들 중에서 고른다
    var ar = aspect || 16 / 9;
    var F = FITS[v] || FIT;      /* 판을 모르면 최신 판. 옛 번호는 옛 목록으로 */
    var fit = ar >= 2.2 ? F.wide : (ar <= 0.62 ? F.tall : F.even);
    var style;
    if (styleHint && fit.indexOf(styleHint) >= 0 && r() < 0.45) style = styleHint;
    else style = pick(r, fit);

    if (!tags.length) tags = ["자유 구성"];
    tags = tags.filter(function (t, i, a2) { return a2.indexOf(t) === i; });

    return {
      seed: seed, style: style, palette: palette, mood: mood, tags: tags,
      speed: mood.speed,
      density: mood.density * (0.8 + r() * 0.5),
      weight: mood.weight * (0.85 + r() * 0.35),
      glow: mood.glow,
      layers: 3 + Math.floor(r() * 4),
      rot: r() * TAU,
      warp: 0.4 + r() * 1.4,
      dir: r() < 0.5 ? 1 : -1,
      ar: ar
    };
  }

  /* ── 그리기 ───────────────────────────────────────────── */
  function Gen(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.spec = null;
    this.raf = 0;
    this.t0 = 0;
    this.mark = "Artwork";
  }

  Gen.prototype.set = function (spec) {
    this.spec = spec;
    this.pts = null;
    this.art = null;                   /* 사양이 바뀌면 엔진 인스턴스를 새로 만든다 */
    this.artL = null;
    return this;
  };

  /* ── 그림 엔진 다리 ───────────────────────────────────────
   * studio-engine.js는 캔버스를 받아 제 배경·비네팅·알갱이까지 한 장을
   * 통째로 그린다. 여기서 배경을 미리 칠하고 넘기면 두 번 칠하게 되므로,
   * 엔진이 맡는 스타일은 이 함수가 프레임을 통째로 맡는다.
   *
   * 시간은 5초 한 바퀴 그대로다. 엔진에 dur=5, fps=30을 주고 150프레임 중
   * 몇 번째인지만 계산해 넘긴다. 현장 패널에서 이어 붙였을 때 끊기지
   * 않아야 한다는 규칙은 엔진 쪽도 같다. */
  var ART_FPS = 30;

  /** 이 화면의 팔레트를 엔진이 아는 모양으로 바꾼다. 낱말이 고른 색을
      그대로 쓰려는 것이다. 엔진 팔레트로 갈아타면 "바다"라고 적었는데
      단청이 나온다. */
  function artPalette(p) {
    var ink = p.ink || [];
    return {
      name: p.id,
      bg: p.bg,
      ink: ink[ink.length - 1] || ink[0] || "#ffffff",
      accent: ink[1] || ink[0] || "#ffffff",
      tones: [ink[0], ink[1] || ink[0], ink[2] || ink[0], ink[3] || ink[1] || ink[0]]
    };
  }

  var ART_MOTIONS = ["drift", "pulse", "orbit", "still"];

  /* 엔진 스타일도 겹쳐서 깊이를 낸다.
   *
   * 기본 열네 종은 layer() 로 세 겹을 그리는데, 엔진 스타일은 artDraw 가
   * 그 앞에서 빠져나가 한 겹만 그렸다. 같은 화면인데 하나는 촬영본처럼
   * 깊고 하나는 종이에 그린 것처럼 평평했다.
   *
   * 겹은 둘만 준다. 엔진 쉰여섯 종에는 면을 가득 채우는 것이 많아
   * 세 겹을 더하면 바닥이 하얗게 탄다. 먼 겹 하나를 흐리게 깔고 그 위에
   * 주 화면을 덮는다. */
  var ART_LAYERS = [
    /* 먼 곳은 어차피 흐리게 보일 것이므로 절반 크기로 그린다. 그리는 넓이가
       4분의 1이 되고 블러도 그만큼 싸진다. 흐린 그림을 온전한 해상도로
       그리는 것은 버리려고 만드는 셈이다. */
    { scale: 1.10, blur: 3, alpha: 0.34, k: 1, dens: 0.62, add: true, half: true },
    { scale: 1.00, blur: 0, alpha: 1.00, k: 1, dens: 1.00, add: false, half: false }
  ];

  /* 작은 칸에서는 겹치지 않는다. 300px 썸네일에서 흐린 겹은 보이지도
     않는데 캔버스만 세 배로 든다. 벽에 열두 칸이면 그대로 느려진다. */
  var ART_DEPTH_MIN = 480;

  /** 사양 하나를 엔진이 알아듣는 값으로 옮긴다.
   *
   * s.tune 이 있으면 그 값이 이긴다. 손님이 도구에서 손잡이를 돌린 값이다.
   * 느낌에서 자동으로 뽑은 값은 손잡이를 안 건드린 자리에만 남는다.
   * 이렇게 해 두면 "저절로 나온 것"과 "손본 것"이 같은 길로 그려져,
   * 손님이 본 화면과 우리가 납품하는 4K 가 어긋나지 않는다. */
  function artOpts(s, W, H, seed, densMul, bare) {
    var r = rng(seed ^ 0x5eed1);
    var cl = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
    var T = s.tune || {};
    var use = function (key, auto) { return T[key] == null ? auto : T[key]; };
    return {
      w: W, h: H, fps: ART_FPS, dur: PERIOD,
      seed: seed,
      style: s.style.slice(ART_PREFIX.length),
      palette: artPalette(s.palette),
      /* 분위기(느낌)가 정한 값을 엔진의 0~100 눈금으로 옮긴다 */
      /* 밀도만 겹마다 다르게 쓴다(먼 겹은 성글게). 손님이 정한 값에도
         같은 비율을 곱해야 겹이 따로 놀지 않는다. */
      density:  cl(Math.round(T.density == null ? s.density * densMul * 42
                                                 : T.density * densMul), 8, 96),
      speed:    cl(Math.round(use("speed", s.speed * 46)), 8, 95),
      scale:    cl(Math.round(use("scale", s.warp * 36)), 15, 90),
      contrast: cl(Math.round(use("contrast", s.weight * 46)), 25, 95),
      glow:     cl(Math.round(use("glow", s.glow * 36)), 5, 85),
      /* 알갱이는 겹을 합친 뒤 grade 가 한 번만 얹는다. 손님이 결을 돌리면
         그 값을 여기에도 실어 엔진 쪽 결까지 같이 굵어진다. */
      grain:    bare ? 0 : (T.grain == null ? 14 : T.grain),
      accent:   cl(Math.round(use("accent", 40 + r() * 45)), 28, 92),
      motion:   use("motion", ART_MOTIONS[Math.floor(r() * ART_MOTIONS.length)]),
      symmetry: use("symmetry", 1),
      invert:   !!use("invert", false),
      bare:     !!bare
    };
  }

  Gen.prototype.artDraw = function (t) {
    var A = global.StudioArt;
    var s = this.spec;
    if (!A) return false;
    var ctx = this.ctx, W = this.cv.width, H = this.cv.height;

    /* 작은 칸은 예전처럼 한 겹으로. 엔진이 제 바탕까지 칠한다. */
    if (W < ART_DEPTH_MIN) {
      if (!this.art || this.art.w !== W || this.art.h !== H) {
        this.art = { w: W, h: H, inst: A.create(this.cv, artOpts(s, W, H, s.seed, 1, false)) };
      }
      var tot = this.art.inst.totalFrames;
      this.art.inst.renderFrame(Math.round((t / PERIOD) * tot) % tot);
      return true;
    }

    /* 큰 화면은 겹쳐 그린다. 바탕은 여기서 한 번만 칠한다. */
    if (!this.artL || this.artL.w !== W || this.artL.h !== H || this.artL.seed !== s.seed || this.artL.style !== s.style) {
      this.artL = { w: W, h: H, seed: s.seed, style: s.style, cv: [], inst: [] };
      for (var i = 0; i < ART_LAYERS.length; i++) {
        var L = ART_LAYERS[i];
        var lw = L.half ? Math.max(2, Math.round(W / 2)) : W;
        var lh = L.half ? Math.max(2, Math.round(H / 2)) : H;
        var c = document.createElement("canvas");
        c.width = lw; c.height = lh;
        this.artL.cv.push(c);
        /* 겹마다 씨앗을 조금 달리해 같은 그림이 두 번 겹치지 않게 한다 */
        this.artL.inst.push(A.create(c, artOpts(s, lw, lh, (s.seed + i * 104729) >>> 0, L.dens, true)));
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = s.palette.bg;
    ctx.fillRect(0, 0, W, H);
    var bgg = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, Math.max(W, H) * 0.75);
    bgg.addColorStop(0, hexA(s.palette.ink[1], 0.16));
    bgg.addColorStop(1, hexA(s.palette.ink[1], 0));
    ctx.fillStyle = bgg;
    ctx.fillRect(0, 0, W, H);

    for (var j = 0; j < ART_LAYERS.length; j++) {
      var LL = ART_LAYERS[j];
      var inst = this.artL.inst[j];
      var total = inst.totalFrames;
      /* 겹의 시간은 정수 배수로만 어긋나게 한다. 5초 한 바퀴가 깨지면
         현장 패널에서 이어 붙였을 때 끊긴다. */
      var lt = (t * LL.k) % PERIOD;
      inst.renderFrame(Math.round((lt / PERIOD) * total) % total);

      ctx.save();
      ctx.globalCompositeOperation = LL.add ? "lighter" : "source-over";
      ctx.globalAlpha = LL.alpha;
      if (LL.blur) ctx.filter = "blur(" + (LL.blur * (Math.max(W, H) / 1200)).toFixed(1) + "px)";
      ctx.translate(W / 2, H / 2);
      ctx.scale(LL.scale, LL.scale);
      ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(this.artL.cv[j], 0, 0, W, H);   /* 절반 크기 겹은 늘려 덮는다 */
      ctx.filter = "none";
      ctx.restore();
    }
    return true;
  };

  Gen.prototype.start = function () {
    var self = this;
    cancelAnimationFrame(this.raf);
    this.t0 = performance.now();
    (function loop(now) {
      /* rAF 가 넘겨주는 시각은 "이 프레임이 시작한 때"다. start() 를
         프레임 도중에 부르면 그 값이 t0 보다 앞설 수 있어 t 가 음수가 된다.
         음수 t 는 그리는 쪽에서 seeds[음수] 를 집어 스타일이 통째로 터진다
         (신호(barcode)에서 실제로 났다). 0 밑으로는 안 내려가게 막는다. */
      var t = (Math.max(0, now - self.t0) / 1000) % PERIOD;
      self.draw(t);
      self.raf = requestAnimationFrame(loop);
    })(performance.now());
  };

  Gen.prototype.stop = function () { cancelAnimationFrame(this.raf); };

  /** 한 바퀴를 0~1로 정규화한 위상. 정수 배수만 곱해 쓴다. */
  function ph(t, k) { return TAU * k * (t / PERIOD); }


  /* ── 깊이 ────────────────────────────────────────────────
   * 한 겹만 그리면 종이에 그린 그림처럼 평평하다. 촬영본이 깊어 보이는
   * 까닭은 먼 것이 흐리고 느리게, 가까운 것이 또렷하고 빠르게 움직여서다.
   * 그래서 같은 그림을 세 겹으로 그린다. 겹마다 크기·속도·흐림이 다르다.
   * 시간축은 정수 배수만 쓰므로 5초 한 바퀴는 그대로 지켜진다. */
  var LAYERS = [
    { scale: 1.22, blur: 7, alpha: 0.42, k: 1, dim: 0.75 },   // 먼 곳
    { scale: 1.00, blur: 0, alpha: 1.00, k: 1, dim: 1.00 },   // 주 화면
    { scale: 0.84, blur: 2, alpha: 0.55, k: 2, dim: 1.15 }    // 가까운 곳
  ];

  /* 면을 채우는 스타일은 겹치면 빛이 포화돼 하얗게 탄다.
   * 선으로 그리는 것만 세 겹을 준다. */
  var FILLING = ["wave", "ribbon", "bar", "drift", "grid", "bloom", "organic"];

  Gen.prototype.layer = function (ctx, W, H, t, s, draw) {
    var fills = FILLING.indexOf(s.style) >= 0;
    var stack = fills ? [{ scale: 1.06, blur: 5, alpha: 0.3, k: 1, dim: 0.8 },
                         { scale: 1.00, blur: 0, alpha: 1.0, k: 1, dim: 1.0 }]
                      : LAYERS;
    if (!this.lc) {
      this.lc = document.createElement("canvas");
      this.lx = this.lc.getContext("2d");
    }
    if (this.lc.width !== W || this.lc.height !== H) {
      this.lc.width = W; this.lc.height = H;
    }
    var lx = this.lx;
    for (var i = 0; i < stack.length; i++) {
      var L = stack[i];
      lx.setTransform(1, 0, 0, 1, 0, 0);
      lx.clearRect(0, 0, W, H);
      // 채우는 스타일은 더하면 바닥이 하얗게 탄다. 덮어써야 물의 층이 보인다.
      lx.globalCompositeOperation = fills ? "source-over" : "lighter";
      lx.globalAlpha = 1;
      // 겹마다 조금 다른 씨앗을 주어 같은 그림이 세 번 겹치지 않게 한다
      var sub = Object.create(s);
      sub.seed = (s.seed + i * 104729) >>> 0;
      sub.density = s.density * (L.scale === 1 ? 1 : (fills ? 0.75 : 0.6));
      sub.weight = s.weight * L.dim;
      // 겹의 시간은 정수 배수로만 어긋나게 한다
      var lt = ((t * L.k) % PERIOD);
      lx.save();
      lx.translate(W / 2, H / 2);
      lx.scale(L.scale, L.scale);
      lx.translate(-W / 2, -H / 2);
      draw.call(this, lx, W, H, lt, sub);
      lx.restore();

      ctx.save();
      ctx.globalCompositeOperation = fills && L.scale === 1 ? "source-over" : "lighter";
      ctx.globalAlpha = L.alpha;
      if (L.blur) ctx.filter = "blur(" + (L.blur * (Math.max(W, H) / 1200)).toFixed(1) + "px)";
      ctx.drawImage(this.lc, 0, 0);
      ctx.filter = "none";
      ctx.restore();
    }
  };

  Gen.prototype.draw = function (t) {
    var s = this.spec;
    if (!s) return;
    var ctx = this.ctx, W = this.cv.width, H = this.cv.height;

    /* 엔진이 맡는 스타일은 한 장을 통째로 그린다. 물기(워터마크)만 얹는다. */
    if (isArt(s.style) && this.artDraw(t)) { this.post(ctx, W, H, s); this.grade(ctx, W, H, t, s); this.watermark(ctx, W, H); return; }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = s.palette.bg;
    ctx.fillRect(0, 0, W, H);
    var bg = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, Math.max(W, H) * 0.75);
    bg.addColorStop(0, hexA(s.palette.ink[1], 0.16));
    bg.addColorStop(1, hexA(s.palette.ink[1], 0));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    this.layer(ctx, W, H, t, s, STYLES[s.style] || STYLES.flow);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    this.post(ctx, W, H, s);
    this.grade(ctx, W, H, t, s);
    this.watermark(ctx, W, H);
  };


  /* ── 마감 ───────────────────────────────────────────────────
   * 선을 그린 채로 끝내면 코드 스케치처럼 보인다. 실제 미디어아트는
   * 빛이 번지고 가장자리가 가라앉아야 화면으로 읽힌다.
   * 작게 줄여 흐린 뒤 더하는 방식이라 큰 화면에서도 값이 싸다. */
  Gen.prototype.post = function (ctx, W, H, s) {
    // 면을 통째로 칠하는 스타일은 이미 밝다. 블룸을 그대로 얹으면 하얗게 뜬다.
    var solid = FILLING.indexOf(s.style) >= 0;
    var bw = Math.max(48, Math.round(W / 4)), bh = Math.max(27, Math.round(H / 4));
    if (!this.bc || this.bc.width !== bw || this.bc.height !== bh) {
      this.bc = document.createElement("canvas");
      this.bc.width = bw; this.bc.height = bh;
      this.bx = this.bc.getContext("2d");
    }
    var bx = this.bx, glow = (s.glow || 1) * (solid ? 0.35 : 1);
    bx.globalCompositeOperation = "copy";
    bx.filter = "blur(" + Math.max(2, Math.round(bw / 44)) + "px) brightness(1.3) saturate(1.2)";
    bx.drawImage(this.cv, 0, 0, bw, bh);
    bx.filter = "none";
    bx.globalCompositeOperation = "source-over";

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(0.7, 0.42 * glow);
    ctx.drawImage(this.bc, 0, 0, W, H);
    ctx.globalAlpha = Math.min(0.38, 0.18 * glow);      // 한 겹 더 얹어 번짐을 넓힌다
    ctx.drawImage(this.bc, -W * 0.01, -H * 0.01, W * 1.02, H * 1.02);
    ctx.restore();

    // 가장자리를 가라앉혀 눈이 가운데로 모이게 한다
    var v = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.22,
                                     W * 0.5, H * 0.5, Math.max(W, H) * 0.74);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(0.65, "rgba(0,0,0,0.18)");
    v.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };


  /* ── 그레이드 ────────────────────────────────────────────
   * 색 보정과 입자. 촬영본과 CG를 가르는 마지막 한 겹이다.
   * 그림자에 찬 색, 하이라이트에 따뜻한 색을 물리면 화면이 한 덩어리로
   * 묶이고, 아주 옅은 입자를 얹으면 매끈함이 깨져 눈이 편해진다.
   * 입자는 매 프레임 새로 그리지 않는다. 미리 만든 한 장을 위치만 바꿔
   * 얹는다. 5초 한 바퀴에 정확히 맞아떨어지는 자리로만 옮긴다. */
  Gen.prototype.grade = function (ctx, W, H, t, s) {
    var ink = s.palette.ink;
    var warm = ink[0], cool = ink[ink.length - 2] || ink[1];

    // 하이라이트에 따뜻한 색
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 그림자에 찬 색
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 입자
    if (!this.gr) {
      var g = document.createElement("canvas");
      g.width = g.height = 256;
      var gx = g.getContext("2d");
      var im = gx.createImageData(256, 256);
      var r = rng(20260905);
      for (var i = 0; i < im.data.length; i += 4) {
        var v = 118 + Math.round((r() - 0.5) * 90);
        im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
        im.data[i + 3] = 255;
      }
      gx.putImageData(im, 0, 0);
      this.gr = g;
    }
    /* 자리를 뛰게 하면 마지막 자리에서 0으로 돌아올 때 화면이 튄다.
       무늬가 256px 마다 되풀이되므로, 원을 그리며 미끄러지게 하면
       한 바퀴 돌아 제자리로 와서 이음매가 생기지 않는다. */
    var ga = TAU * (t / PERIOD);
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.085;
    var pat = ctx.createPattern(this.gr, "repeat");
    ctx.translate(Math.cos(ga) * 26, Math.sin(ga) * 26);
    ctx.fillStyle = pat;
    ctx.fillRect(-256, -256, W + 512, H + 512);
    ctx.restore();
  };

  Gen.prototype.watermark = function (ctx, W, H) {
    /* 계약된 작품을 전용 플레이어에서 틀 때는 도장을 안 찍는다. mark 를 비운다. */
    if (!this.mark) return;
    /* 1:6 기둥 미리보기처럼 칸이 좁으면 글자가 들어갈 자리가 없어
       이름이 잘린다. 잘린 이름을 보이느니 안 보이는 편이 낫다.
       이 크기에서는 가져가 봐야 쓸 데도 없다. */
    if (W < 96) return;
    var fs = Math.max(9, Math.round(Math.min(W / 22, H / 22, 26)));
    ctx.font = "700 " + fs + "px Pretendard, sans-serif";
    while (fs > 8 && ctx.measureText(this.mark).width > W * 0.82) {
      fs -= 1;
      ctx.font = "700 " + fs + "px Pretendard, sans-serif";
    }
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillText(this.mark, W - 15, H - 15);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillText(this.mark, W - 16, H - 16);
    ctx.textAlign = "left";
    ctx.font = "600 " + Math.round(fs * 0.62) + "px Pretendard, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.55)";
    if (W > 180) ctx.fillText("Sample / 5s", 14, H - 14);
  };

  function hex2rgb(hex) {
    var n = parseInt(String(hex).slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ── 스타일 여덟 가지 ─────────────────────────────────── */

  /* ── 얼룩 노이즈 ──────────────────────────────────────────
   * 레퍼런스로 받은 화면(산호·이끼처럼 번지는 얼룩)을 코드로 만드는 방법.
   *
   *   1. 값 노이즈를 여러 겹 겹쳐 부드러운 얼룩을 만든다
   *   2. 그 좌표를 다시 노이즈로 밀어(도메인 워프) 유기적으로 휘게 한다
   *   3. 결과를 몇 단으로 잘라(포스터라이즈) 색 층을 나눈다
   *   4. 층 안에 고운 알갱이를 깔아 산호 같은 질감을 준다
   *
   * 5초 반복은 시간을 원으로 돌려서 지킨다. 표본 좌표를 (cos, sin) 만큼
   * 옮기면 한 바퀴 돌아 제자리로 오므로 이음매가 생기지 않는다.
   *
   * 픽셀마다 노이즈를 여러 번 부르므로 화면 그대로 계산하면 느리다.
   * 4분의 1로 줄여 계산하고 늘려 그린다. 원래 부드러운 그림이라 티가
   * 나지 않고, 알갱이는 늘린 뒤에 얹어 또렷함을 지킨다. */
  function makeNoise(seed) {
    var r = rng(seed), perm = new Uint8Array(256), P = new Uint8Array(512), i, j, t;
    for (i = 0; i < 256; i++) perm[i] = i;
    for (i = 255; i > 0; i--) { j = (r() * (i + 1)) | 0; t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (i = 0; i < 512; i++) P[i] = perm[i & 255];
    function fade(u) { return u * u * u * (u * (u * 6 - 15) + 10); }
    function at(x, y) { return P[(P[x & 255] + y) & 255] / 255; }
    return function (x, y) {
      var X = Math.floor(x), Y = Math.floor(y);
      var fx = x - X, fy = y - Y, u = fade(fx), v = fade(fy);
      var a = at(X, Y), b = at(X + 1, Y), c = at(X, Y + 1), d = at(X + 1, Y + 1);
      return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
    };
  }

  function fbm(n, x, y, oct) {
    var v = 0, amp = 0.5, f = 1;
    for (var i = 0; i < oct; i++) { v += n(x * f, y * f) * amp; amp *= 0.5; f *= 2; }
    return v;
  }

  var STYLES = {

    /* 흐르는 띠 — 사인 곡선을 겹쳐 리본처럼 흐르게 한다 */
    flow: function (ctx, W, H, t, s) {
      var n = Math.round(22 * s.density), r = rng(s.seed);
      ctx.lineCap = "round";
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var y0 = r() * H, amp = (0.05 + r() * 0.2) * H;
        var k = 1 + Math.floor(r() * 2);          // 정수 하모닉 → 완전 반복
        var wv = 1 + Math.floor(r() * 3);
        var off = r() * TAU;
        ctx.strokeStyle = hexA(col, 0.22 + r() * 0.4);
        ctx.lineWidth = (1.6 + r() * 5.2) * (W / 900) * (s.weight || 1);
        ctx.beginPath();
        for (var x = 0; x <= W; x += 6) {
          var u = x / W;
          var y = y0
            + Math.sin(u * TAU * wv + ph(t, k) + off) * amp
            + Math.sin(u * TAU * (wv * 2) - ph(t, k)) * amp * 0.28 * s.warp;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },

    /* 파동 — 아래에서 위로 겹치는 물결 면 */
    /* 얼룩 — 산호·이끼처럼 번지는 유기적 층. 레퍼런스에 가장 가까운 그림이다. */
    organic: function (ctx, W, H, t, s) {
      var SC = 4;                                   // 4분의 1로 줄여 계산한다
      var w = Math.max(24, Math.round(W / SC)), h = Math.max(14, Math.round(H / SC));
      if (!this.oc || this.oc.width !== w || this.oc.height !== h) {
        this.oc = document.createElement("canvas");
        this.oc.width = w; this.oc.height = h;
        this.ox = this.oc.getContext("2d");
        this.od = this.ox.createImageData(w, h);
      }
      var n = this.on && this.onSeed === s.seed ? this.on : (this.onSeed = s.seed, this.on = makeNoise(s.seed));
      var img = this.od, D = img.data;
      var ink = s.palette.ink.map(hex2rgb), bg = hex2rgb(s.palette.bg);
      var bands = 3 + Math.round(2 * s.density);    // 색이 나뉘는 단 수
      var zoom = 2.2 / (0.7 + s.density * 0.5);
      var warp = 0.9 + s.warp * 1.1;
      var a = ph(t, 1), R = 0.55;                   // 시간을 원으로 돌린다
      var ox = Math.cos(a) * R, oy = Math.sin(a) * R;

      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var u = x / w * zoom * (W / H > 1 ? W / H : 1);
          var v = y / h * zoom;
          // 도메인 워프 — 좌표를 노이즈로 한 번 밀어 유기적으로 휘게 한다
          var qx = fbm(n, u + ox, v + oy, 3);
          var qy = fbm(n, u + 5.2 + ox, v + 1.3 + oy, 3);
          var e = fbm(n, u + warp * qx + ox, v + warp * qy + oy, 4);
          var k = Math.max(0, Math.min(bands - 1, Math.floor(e * bands * 1.35)));
          var f = e * bands * 1.35 - k;             // 층 안에서의 위치
          var c = ink[k % ink.length];
          // 곧게 올리면 화면 절반이 밝아져 레퍼런스와 반대가 된다.
          // 곡선을 주어 아래 단은 배경에 붙이고 맨 위 단만 빛나게 한다.
          var g = k / (bands - 1 || 1);
          var mix = 0.1 + 0.85 * Math.pow(g, 1.8);
          var i4 = (y * w + x) * 4;
          var sh = 0.72 + 0.3 * f;                  // 층 안에서 밝기가 살짝 흐른다
          D[i4]     = (bg[0] + (c[0] - bg[0]) * mix) * sh;
          D[i4 + 1] = (bg[1] + (c[1] - bg[1]) * mix) * sh;
          D[i4 + 2] = (bg[2] + (c[2] - bg[2]) * mix) * sh;
          D[i4 + 3] = 255;
        }
      }
      this.ox.putImageData(img, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.oc, 0, 0, W, H);
      ctx.restore();

      // 알갱이 — 층 안의 산호 같은 질감. 늘린 뒤에 얹어야 또렷하다.
      if (!this.og) {
        var g = document.createElement("canvas");
        g.width = g.height = 200;
        var gx = g.getContext("2d"), gi = gx.createImageData(200, 200), gr = rng(s.seed + 77);
        for (var q = 0; q < gi.data.length; q += 4) {
          var vv = gr() < 0.5 ? 96 : 168;
          gi.data[q] = gi.data[q + 1] = gi.data[q + 2] = vv;
          gi.data[q + 3] = 255;
        }
        gx.putImageData(gi, 0, 0);
        this.og = g;
      }
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.3;
      var pat = ctx.createPattern(this.og, "repeat");
      var oa = TAU * (t / PERIOD);
      ctx.translate(Math.cos(oa) * 18, Math.sin(oa) * 18);
      ctx.fillStyle = pat;
      ctx.fillRect(-200, -200, W + 400, H + 400);
      ctx.restore();
    },

    /* 파동 — 종이를 오려 겹친 물결. 뒤에서 앞으로 덮어 칠한다.
     * 반투명으로 겹치면 몇 겹 만에 흰색에 닿아 바닥이 타버린다. */
    wave: function (ctx, W, H, t, s) {
      var n = Math.round(6 * s.density) + 4, r = rng(s.seed);
      var ink = s.palette.ink, bgc = hex2rgb(s.palette.bg);
      for (var i = 0; i < n; i++) {
        var f = i / (n - 1 || 1);
        var c = hex2rgb(ink[i % ink.length]);
        // 뒤쪽은 배경에 가깝게, 앞쪽은 제 색으로. 그래야 깊이가 생긴다.
        var mix = 0.2 + 0.75 * f;
        var col = "rgb(" + Math.round(bgc[0] + (c[0] - bgc[0]) * mix) + ","
                         + Math.round(bgc[1] + (c[1] - bgc[1]) * mix) + ","
                         + Math.round(bgc[2] + (c[2] - bgc[2]) * mix) + ")";
        var base = H * (0.3 + 0.78 * f);
        var amp = (0.03 + r() * 0.07) * H;
        var wv = 1 + Math.floor(r() * 3);
        var k = 1 + Math.floor(r() * 2);
        var off = r() * TAU;
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (var x = 0; x <= W; x += 5) {
          var u = x / W;
          ctx.lineTo(x, base + Math.sin(u * TAU * wv + ph(t, k) * s.dir + off) * amp
                          + Math.sin(u * TAU * (wv + 2) - ph(t, k)) * amp * 0.35);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      }
    },

    particle: function (ctx, W, H, t, s) {
      if (!this.pts) {
        var r0 = rng(s.seed), m = Math.round(280 * s.density), a = [];
        for (var i = 0; i < m; i++) {
          a.push({
            x: r0(), y: r0(),
            rx: (0.01 + r0() * 0.07), ry: (0.01 + r0() * 0.07),
            k: 1 + Math.floor(r0() * 3), off: r0() * TAU,
            rad: 0.9 + r0() * 3.6, a: 0.45 + r0() * 0.55,
            c: s.palette.ink[Math.floor(r0() * s.palette.ink.length)]
          });
        }
        this.pts = a;
      }
      var sc = W / 900;
      for (var j = 0; j < this.pts.length; j++) {
        var p = this.pts[j];
        var a2 = ph(t, p.k) + p.off;
        var x = (p.x + Math.cos(a2) * p.rx) * W;
        var y = (p.y + Math.sin(a2) * p.ry) * H;
        var pulse = 0.55 + 0.45 * Math.sin(ph(t, 1) + p.off);
        var rr = p.rad * sc * (0.7 + pulse * 0.6);
        var gl = ctx.createRadialGradient(x, y, 0, x, y, rr * 4);
        gl.addColorStop(0, hexA(p.c, p.a * pulse * 0.95));
        gl.addColorStop(0.35, hexA(p.c, p.a * pulse * 0.28));
        gl.addColorStop(1, hexA(p.c, 0));
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.arc(x, y, rr * 4, 0, TAU);
        ctx.fill();
      }
    },

    /* 등고선 — 중심에서 퍼지는 닫힌 곡선 */
    contour: function (ctx, W, H, t, s) {
      var n = Math.round(26 * s.density), r = rng(s.seed);
      var cx = W * (0.35 + r() * 0.3), cy = H * (0.35 + r() * 0.3);
      var maxR = Math.max(W, H) * 0.62;
      ctx.lineWidth = Math.max(1.6, 2.6 * (W / 900) * (s.weight || 1));
      for (var i = 0; i < n; i++) {
        var f = (i + 1) / n;
        var col = s.palette.ink[i % s.palette.ink.length];
        ctx.strokeStyle = hexA(col, 0.2 + 0.42 * (1 - f));
        ctx.beginPath();
        for (var a2 = 0; a2 <= TAU + 0.1; a2 += 0.09) {
          var wob = 1
            + Math.sin(a2 * (3 + (i % 3)) + ph(t, 1) + i * 0.4) * 0.09 * s.warp
            + Math.sin(a2 * 7 - ph(t, 2)) * 0.03;
          var rr = maxR * f * wob;
          var x = cx + Math.cos(a2 + s.rot) * rr;
          var y = cy + Math.sin(a2 + s.rot) * rr * 0.78;
          a2 === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    },

    /* 격자 — 점이 파도처럼 밝아졌다 어두워진다 */
    grid: function (ctx, W, H, t, s) {
      var step = Math.max(14, Math.round(34 / s.density)) * (W / 900);
      var cols = Math.ceil(W / step), rows = Math.ceil(H / step);
      var ink = s.palette.ink;
      for (var gy = 0; gy <= rows; gy++) {
        for (var gx = 0; gx <= cols; gx++) {
          var u = gx / cols, v = gy / rows;
          var w = Math.sin(u * TAU * 2 + v * TAU + ph(t, 1))
                * Math.cos(v * TAU * 1 - ph(t, 1) + s.rot);
          var a2 = 0.12 + Math.max(0, w) * 0.78;
          var rad = (1 + Math.max(0, w) * 3.4) * (W / 900);
          ctx.fillStyle = hexA(ink[(gx + gy) % ink.length], a2);
          ctx.beginPath();
          ctx.arc(gx * step, gy * step, rad, 0, TAU);
          ctx.fill();
        }
      }
    },

    /* 번짐 — 큰 빛덩이가 숨을 쉬듯 커졌다 작아진다 */
    bloom: function (ctx, W, H, t, s) {
      var n = Math.round(8 * s.density) + 3, r = rng(s.seed);
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var bx = r() * W, by = r() * H;
        var k = 1 + Math.floor(r() * 2), off = r() * TAU;
        var base = (0.12 + r() * 0.3) * Math.max(W, H);
        var rr = base * (0.75 + 0.25 * Math.sin(ph(t, k) + off));
        var dx = Math.cos(ph(t, 1) + off) * W * 0.03;
        var dy = Math.sin(ph(t, 1) + off) * H * 0.03;
        var g = ctx.createRadialGradient(bx + dx, by + dy, 0, bx + dx, by + dy, rr);
        g.addColorStop(0, hexA(col, 0.52));
        g.addColorStop(0.45, hexA(col, 0.18));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
    },

    /* 기둥 — 세로로 흐르는 빛줄기. 세로 사이니지에서 좋다 */
    column: function (ctx, W, H, t, s) {
      var n = Math.round(30 * s.density), r = rng(s.seed);
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var x = r() * W;
        var w = (2 + r() * 26) * (W / 900);
        var k = 1 + Math.floor(r() * 2), off = r() * TAU;
        var len = H * (0.18 + r() * 0.5);
        var y = ((r() + (ph(t, k) + off) / TAU) % 1) * (H + len) - len;
        var g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, hexA(col, 0));
        g.addColorStop(0.5, hexA(col, 0.28 + r() * 0.34));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, len);
      }
    },

    /* 띠 — 두꺼운 면이 겹쳐 흐른다. 넓은 화면에서 시원하다 */
    ribbon: function (ctx, W, H, t, s) {
      var n = Math.round(9 * s.density) + 3, r = rng(s.seed);
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var y0 = r() * H, th = (0.04 + r() * 0.16) * H * s.weight;
        var wv = 1 + Math.floor(r() * 3), k = 1 + Math.floor(r() * 2);
        var off = r() * TAU, amp = (0.04 + r() * 0.14) * H;
        ctx.fillStyle = hexA(col, (0.2 + r() * 0.22) * s.glow);
        ctx.beginPath();
        for (var x = 0; x <= W; x += 6) {
          var u = x / W;
          ctx.lineTo(x, y0 + Math.sin(u * TAU * wv + ph(t, k) * s.dir + off) * amp);
        }
        for (var x2 = W; x2 >= 0; x2 -= 6) {
          var u2 = x2 / W;
          ctx.lineTo(x2, y0 + th + Math.sin(u2 * TAU * wv + ph(t, k) * s.dir + off) * amp);
        }
        ctx.closePath();
        ctx.fill();
      }
    },

    /* 궤도 — 동심원 호가 각기 다른 속도로 돈다 */
    orbit: function (ctx, W, H, t, s) {
      var n = Math.round(16 * s.density) + 4, r = rng(s.seed);
      var cx = W * 0.5, cy = H * 0.5, R = Math.max(W, H) * 0.55;
      ctx.lineCap = "round";
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var rr = R * (0.1 + 0.9 * (i + 1) / n);
        var k = 1 + Math.floor(r() * 3), span = 0.5 + r() * 2.2;
        var a0 = r() * TAU + ph(t, k) * s.dir;
        ctx.strokeStyle = hexA(col, (0.18 + r() * 0.3) * s.glow);
        ctx.lineWidth = (1.8 + r() * 4.6) * s.weight * (Math.max(W, H) / 900);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rr, rr * (H / W < 0.5 ? 2.2 : 0.82), s.rot, a0, a0 + span);
        ctx.stroke();
      }
    },

    /* 그물 — 점을 잇는 선. 별자리처럼 보인다 */
    mesh: function (ctx, W, H, t, s) {
      if (!this.pts) {
        var r0 = rng(s.seed), m = Math.round(46 * s.density), a = [];
        for (var i = 0; i < m; i++) {
          a.push({ x: r0(), y: r0(), rx: 0.01 + r0() * 0.05, ry: 0.01 + r0() * 0.05,
                   k: 1 + Math.floor(r0() * 2), off: r0() * TAU });
        }
        this.pts = a;
      }
      var P = this.pts, pos = [];
      for (var j = 0; j < P.length; j++) {
        var p = P[j], a2 = ph(t, p.k) * s.dir + p.off;
        pos.push([(p.x + Math.cos(a2) * p.rx) * W, (p.y + Math.sin(a2) * p.ry) * H]);
      }
      var lim = Math.min(W, H) * 0.26;
      var ink = s.palette.ink;
      ctx.lineWidth = 1.6 * s.weight * (Math.max(W, H) / 900);
      for (var i2 = 0; i2 < pos.length; i2++) {
        for (var j2 = i2 + 1; j2 < pos.length; j2++) {
          var dx = pos[i2][0] - pos[j2][0], dy = pos[i2][1] - pos[j2][1];
          var d2 = Math.sqrt(dx * dx + dy * dy);
          if (d2 > lim) continue;
          ctx.strokeStyle = hexA(ink[(i2 + j2) % ink.length], (1 - d2 / lim) * 0.34 * s.glow);
          ctx.beginPath();
          ctx.moveTo(pos[i2][0], pos[i2][1]);
          ctx.lineTo(pos[j2][0], pos[j2][1]);
          ctx.stroke();
        }
        ctx.fillStyle = hexA(ink[i2 % ink.length], 0.6 * s.glow);
        ctx.beginPath();
        ctx.arc(pos[i2][0], pos[i2][1], 1.6 * s.weight * (Math.max(W, H) / 900), 0, TAU);
        ctx.fill();
      }
    },

    /* 막대 — 이퀄라이저처럼 오르내린다. 전광판에서 잘 읽힌다 */
    bar: function (ctx, W, H, t, s) {
      var tall = s.ar < 1;
      var n = Math.round((tall ? 16 : 28) * s.density);
      var r = rng(s.seed), ink = s.palette.ink;
      for (var i = 0; i < n; i++) {
        var f = i / n;
        var k = 1 + Math.floor(r() * 3), off = r() * TAU;
        var lev = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(ph(t, k) * s.dir + off + f * TAU));
        ctx.fillStyle = hexA(ink[i % ink.length], (0.2 + r() * 0.3) * s.glow);
        if (tall) {
          var bh = H / n * 0.62;
          ctx.fillRect(0, f * H + bh * 0.2, W * lev, bh);
        } else {
          var bw = W / n * 0.62;
          ctx.fillRect(f * W + bw * 0.2, H * (1 - lev), bw, H * lev);
        }
      }
    },

    /* 소용돌이 — 중심에서 풀려 나오는 나선 */
    spiral: function (ctx, W, H, t, s) {
      var arms = 2 + Math.floor(rng(s.seed)() * 4);
      var r = rng(s.seed + 1);
      var cx = W * 0.5, cy = H * 0.5, R = Math.max(W, H) * 0.62;
      ctx.lineCap = "round";
      for (var a2 = 0; a2 < arms; a2++) {
        var col = s.palette.ink[a2 % s.palette.ink.length];
        var k = 1 + Math.floor(r() * 2);
        var turns = 2 + Math.floor(r() * 3);
        ctx.strokeStyle = hexA(col, (0.2 + r() * 0.3) * s.glow);
        ctx.lineWidth = (2 + r() * 4.5) * s.weight * (Math.max(W, H) / 900);
        ctx.beginPath();
        for (var u = 0; u <= 1; u += 0.008) {
          var ang = u * TAU * turns + (a2 / arms) * TAU + ph(t, k) * s.dir + s.rot;
          var rr = R * u;
          var x = cx + Math.cos(ang) * rr;
          var y = cy + Math.sin(ang) * rr * (H / W < 0.55 ? 2.0 : 0.85);
          u === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },

    /* 표류 — 옆으로 천천히 흘러가는 넓은 띠. 어느 비율에나 붙는다 */
    drift: function (ctx, W, H, t, s) {
      var n = Math.round(14 * s.density) + 4, r = rng(s.seed);
      var tall = s.ar < 1;
      for (var i = 0; i < n; i++) {
        var col = s.palette.ink[i % s.palette.ink.length];
        var k = 1 + Math.floor(r() * 2), off = r();
        var band = (tall ? H : W) * (0.06 + r() * 0.22);
        var travel = ((off + (t / PERIOD) * k * s.dir) % 1 + 1) % 1;
        var pos = travel * ((tall ? H : W) + band) - band;
        var g = tall
          ? ctx.createLinearGradient(0, pos, 0, pos + band)
          : ctx.createLinearGradient(pos, 0, pos + band, 0);
        g.addColorStop(0, hexA(col, 0));
        g.addColorStop(0.5, hexA(col, (0.1 + r() * 0.16) * s.glow));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        tall ? ctx.fillRect(0, pos, W, band) : ctx.fillRect(pos, 0, band, H);
      }
    },

    /* 설경 — 천천히 내려오는 알갱이. 겨울 문장에 붙는다 */
    snow: function (ctx, W, H, t, s) {
      if (!this.pts) {
        var r0 = rng(s.seed), m = Math.round(300 * s.density), a = [];
        for (var i = 0; i < m; i++) {
          a.push({ x: r0(), y0: r0(), sp: 1 + Math.floor(r0() * 2),
                   sw: 0.01 + r0() * 0.05, off: r0() * TAU,
                   rad: 1.1 + r0() * 3.0, a: 0.5 + r0() * 0.5,
                   c: s.palette.ink[Math.floor(r0() * s.palette.ink.length)] });
        }
        this.pts = a;
      }
      var sc = W / 900;
      for (var j = 0; j < this.pts.length; j++) {
        var p = this.pts[j];
        var y = ((p.y0 + (t / PERIOD) * p.sp) % 1) * H;
        var x = (p.x + Math.sin(ph(t, 1) + p.off) * p.sw) * W;
        var rs = p.rad * sc;
        var gs = ctx.createRadialGradient(x, y, 0, x, y, rs * 3.2);
        gs.addColorStop(0, hexA(p.c, p.a));
        gs.addColorStop(0.4, hexA(p.c, p.a * 0.3));
        gs.addColorStop(1, hexA(p.c, 0));
        ctx.fillStyle = gs;
        ctx.beginPath();
        ctx.arc(x, y, rs * 3.2, 0, TAU);
        ctx.fill();
      }
    }
  };

  global.BomnalGen = {
    compose: compose, Gen: Gen, SCENES: SCENES, LIVE: LIVE,
    /* 색판. 도구에서 손님이 색을 고를 때 쓴다.
       PALETTES 는 제비뽑기에도 쓰이므로 순서를 못 바꾼다.
       EXTRA 는 손으로 고를 때만 쓰는 덤이다. */
    PALETTES: PALETTES,
    PALETTES_EXTRA: PALETTES_EXTRA,
    /* 그 판·그 비율에서 실제로 뽑히는 후보. 도구가 자기 묶음을 이걸로
       거른다. 안 거르면 솎아낸 그림이 도구를 통해 다시 나온다. */
    pool: function (v, ar) {
      var F = FITS[v] || FIT;
      return (ar >= 2.2 ? F.wide : (ar <= 0.62 ? F.tall : F.even)).slice();
    },
    /* 담아 둔 화면이 적어 둔 스타일을 지금도 그릴 줄 아는가 */
    hasStyle: function (id) { return STYLE_IDS.indexOf(id) >= 0; },
    counts: { styles: STYLE_IDS.length, palettes: PALETTES.length, moods: MOODS.length }
  };
})(window);
