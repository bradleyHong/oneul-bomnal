/* 프리셋 2,000개
 *
 * 렌더러를 2,000개 손으로 쓰는 것은 불가능하고, 쓴다 해도 서로 비슷한
 * 코드만 쌓인다. 대신 40개 렌더러에 색·파라미터·시드를 조합해 2,000가지
 * "생김새"를 만든다. 고객이 고르는 것은 알고리즘이 아니라 생김새다.
 *
 * 스타일 40종 × 변주 50가지 = 2,000. 모든 스타일이 같은 수의 변주를 갖는다.
 *
 * 변주 번호에는 뜻이 있다. 아무렇게나 섞으면 2,000개를 넘겨봐도 다 비슷해
 * 보이고, 고객은 "많기만 하다"고 느낀다. 열 개씩 성격을 나눴다.
 *   01~10  성기고 느리게. 큰 요소 몇 개
 *   11~20  빽빽하고 빠르게. 작은 요소 많이
 *   21~30  대비를 올리고 빛을 번지게
 *   31~40  대비를 낮추고 차분하게
 *   41~50  대칭과 반전. 같은 재료로 만든 다른 구도
 *
 * 시드가 정해지는 순간부터 그림은 완전히 결정론적이다. 그래서 프리셋
 * 번호 하나만 알면 언제든 같은 그림을 다시 뽑을 수 있다.
 */
(function (global) {
  "use strict";

  var PER_STYLE = 50;

  /* 프리셋 시드는 스타일·변주에서만 나온다. 목록을 다시 만들어도
     같은 번호는 같은 그림이어야 한다. 고객이 "1204번으로 해주세요"라고
     말한 뒤 우리 쪽에서 다른 그림이 나오면 안 된다. */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 변주 열 개씩의 성격. [밀도, 크기, 속도, 대비, 번짐] 의 중심값 */
  var FAMILY = [
    { key: "sparse", label: "성김",   density: [8, 34],  scale: [58, 92], speed: [10, 38], contrast: [40, 66], glow: [18, 42] },
    { key: "dense",  label: "빽빽",   density: [62, 96], scale: [16, 46], speed: [55, 92], contrast: [46, 74], glow: [12, 36] },
    { key: "bold",   label: "강한",   density: [38, 72], scale: [38, 72], speed: [30, 62], contrast: [72, 98], glow: [48, 88] },
    { key: "calm",   label: "차분",   density: [24, 56], scale: [44, 78], speed: [12, 40], contrast: [22, 46], glow: [8, 28] },
    { key: "mirror", label: "대칭",   density: [30, 66], scale: [34, 70], speed: [26, 58], contrast: [50, 80], glow: [24, 58] },
  ];
  var MOTIONS = ["drift", "pulse", "orbit", "still"];

  var cache = null;

  function build() {
    if (cache) return cache;
    var A = global.StudioArt;
    if (!A) return [];
    var styles = A.STYLES;              // [[id, 이름], ...]
    var pals = A.PALETTE_IDS;
    var out = [];

    /* 변주를 바깥, 스타일을 안쪽으로 돈다. 스타일 순서로 쌓으면 첫 화면
       50칸이 전부 미니멀이라 "많기만 하고 다 비슷하다"는 인상이 남는다.
       이렇게 돌면 첫 줄부터 40종이 다 보인다. 번호는 이 순서로 매겨지며,
       생성이 결정론적이라 번호는 영원히 같은 그림을 가리킨다. */
    for (var vi = 0; vi < PER_STYLE; vi++) {
      for (var si = 0; si < styles.length; si++) {
        var sid = styles[si][0], sname = styles[si][1];
        /* 시드를 스타일·변주에서만 만든다. 목록 순서가 바뀌어도 안전하도록
           스타일 이름의 글자값을 섞어 넣는다. */
        var h = 0;
        for (var c = 0; c < sid.length; c++) h = (h * 31 + sid.charCodeAt(c)) | 0;
        var r = mulberry32((h * 7919 + vi * 104729) | 0);

        var fam = FAMILY[Math.floor(vi / 10)];
        var pick = function (range) {
          return Math.round(range[0] + r() * (range[1] - range[0]));
        };

        var sym = 1, invert = false;
        if (fam.key === "mirror") {
          sym = [2, 4, 6][Math.floor(r() * 3)];
          invert = r() < 0.3;
        } else if (r() < 0.06) {
          invert = true;                 /* 가끔 밝은 바탕. 너무 자주면 눈이 피로하다 */
        }

        var pal = pals[Math.floor(r() * pals.length)];
        var num = String(vi + 1).padStart(2, "0");

        out.push({
          id: sid + "-" + num,
          n: out.length + 1,
          name: sname + " " + num,
          style: sid,
          styleName: sname,
          palette: pal,
          paletteName: A.PALETTES[pal] ? A.PALETTES[pal].name : pal,
          family: fam.label,
          density: pick(fam.density),
          scale: pick(fam.scale),
          speed: pick(fam.speed),
          contrast: pick(fam.contrast),
          glow: pick(fam.glow),
          grain: Math.round(6 + r() * 34),
          accent: Math.round(28 + r() * 66),
          motion: MOTIONS[Math.floor(r() * MOTIONS.length)],
          symmetry: sym,
          invert: invert,
          seed: 1000000 + Math.floor(r() * 8999999),
        });
      }
    }
    cache = out;
    return out;
  }

  global.StudioPresets = {
    list: build,
    perStyle: PER_STYLE,
    families: FAMILY.map(function (f) { return f.label; }),
    /** 번호(1부터)로 찾는다. 고객이 번호만 말해도 되게. */
    byNumber: function (n) {
      var all = build();
      return all[Math.max(1, Math.min(all.length, Math.round(n))) - 1] || null;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
