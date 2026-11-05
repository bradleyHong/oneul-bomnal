/* 방울방울, 나 1 · 수련 · Nymphéas
 *
 * 연못 위로 물방울이 하나씩 톡, 톡 떨어져 수면에서 통통 튀고 자리를 잡는다. 처음엔 드문드문, 차츰 잦아지며
 * 방울 위에 방울이 쌓여 꽃잎 같기도 하고 아닌 것 같기도 한 형상이 피어난다. 방울 하나하나가 렌즈라 그 속에
 * 모네의 연못 하늘이 거꾸로 담긴다. 다 피면 잠시 숨 쉬다가, 위에서부터 빛이 되어 날아간다.
 * 30초: 피어남(0.6~19초) → 머묾 → 빛이 되어 사라짐(22~29초) → 빈 연못(루프).
 */
SGL.add({
  id: "drop-nympheas", title: "수련", en: "Nymphéas", mood: ["calm", "nature"],
  desc: "연못 위로 물방울이 톡, 톡 떨어져 통통 튀며 쌓이고, 꽃잎인 듯 아닌 듯한 형상으로 피어납니다. 방울마다 모네의 연못이 거꾸로 담깁니다.",
  palettes: [
    { name: "수련", colors: ["#2f6b5e", "#a9b8e0", "#f0a8c0", "#f6e3a1"] },
    { name: "아침 안개", colors: ["#4a6f8a", "#c8d4e6", "#f4c6a8", "#fff1d6"] },
    { name: "보랏빛 저녁", colors: ["#3b3a6b", "#9d8fc8", "#ff9e8a", "#ffd9a0"] },
    { name: "초록 정원", colors: ["#3e6b3a", "#b8d4c8", "#e8a0b8", "#f2f0c0"] },
  ],
  post: { exposure: 1.05, bloom: 0.09, sat: 1.32, contrast: 1.1, vignette: 0.36, grain: 0.012 },
  N: (ctx) => (ctx.cap ? 1700 : 1300),
  dens: 1.25, haze: 0.006,
  scene: SGL.monet({ tree: 1, cloud: 0.55, bright: 0.5, pads: 0.62 }) + `
vec3 tint(float k){
  vec3 c = k < 0.33 ? mix(uC0*1.4 + 0.12, uC1, k/0.33) : (k < 0.66 ? mix(uC1, uC2, (k - 0.33)/0.33) : mix(uC2, uC3, (k - 0.66)/0.34));
  c /= max(max(c.r, c.g), max(c.b, 1e-3));
  return clamp(mix(vec3(1.0), c, 0.52), 0.0, 1.0);
}
`,
  build(N, ctx) {
    const R = SGL.rng(41);
    const pet = [];
    [[5, 1.05, 0.30, 1.22, 0.0], [8, 1.45, 0.38, 0.78, 0.35], [11, 1.8, 0.36, 0.36, 0.12]].forEach(([n, L, W, tilt, off], li) => {
      for (let i = 0; i < n; i++) pet.push({ phi: (i + off + 0.15 * (R() - 0.5)) / n * 2 * Math.PI, L: L * (0.9 + 0.2 * R()), W, tilt: tilt + 0.12 * (R() - 0.5), li });
    });
    let rimE = 0;
    const sdf = (x, y, z) => {
      let d = 1e9;
      for (const p of pet) {
        const c = Math.cos(p.phi), s = Math.sin(p.phi);
        let lx = x * c + z * s, lz = -x * s + z * c, ly = y - 0.06 - 0.12 * (2 - p.li);
        const ct = Math.cos(p.tilt), st = Math.sin(p.tilt);
        const ax = lx * ct + ly * st; let ay = -lx * st + ly * ct;
        ay -= 0.55 * (lz * lz) / (p.W * p.W) * 0.12 + 0.10 * (ax / p.L) * (ax / p.L);   // 오목하게 · 끝이 살짝 휜다
        const qx = (ax - p.L * 0.5) / (p.L * 0.5), qy = ay / 0.03, qz = lz / p.W;
        const k0 = Math.hypot(qx, qy, qz), k1 = Math.hypot(qx / (p.L * 0.5), qy / 0.03, qz / p.W);
        const dd = k0 * (k0 - 1) / k1;
        if (dd < d) { d = dd; rimE = Math.hypot(qx, qz) + 0.5 * Math.exp(-qz * qz * 40) * (qx > -0.6 ? 1 : 0); }
      }
      return d;
    };
    // 이슬은 꽃잎 가장자리와 가운데 결에 더 모인다 → 형상의 윤곽이 읽힌다
    const weight = (x, y, z) => { sdf(x, y, z); return 0.12 + 0.88 * Math.min(1, Math.max(0, (rimE - 0.62) / 0.33)); };
    const D = SGL.dropFill({ sdf, box: [-2.0, 0, -2.0, 2.0, 1.75, 2.0], N: Math.round(N * 0.95), r: [0.012, 0.085], rPow: 3.0, seed: 5, surface: 0.75, band: 0.05, overlap: 1.25, relax: 8, weight });
    const ymax = Math.max(...D.map((d) => d.y));
    D.forEach((d) => (d.o = d.y / ymax + 0.18 * d.u));
    D.sort((a, b) => a.o - b.o);
    D.forEach((d, i) => {
      const f = i / D.length, rad = Math.hypot(d.x, d.z);
      d.land = 0.6 + 18.4 * Math.pow(f, 0.62);
      d.k = Math.min(0.999, Math.max(0, 0.30 + 0.62 * (rad / 1.8) + 0.12 * (d.y / ymax) + 0.12 * (R() - 0.5)));
      d.E = 2.2 + 0.8 * R();
      const ls = 21.8 + 4.2 * (1 - d.y / ymax) + 1.2 * R();
      d.stay = Math.min(ls, d.land + 28.6 - d.E - 1.2) - d.land;
      d.leave = "rise";
    });
    // 둘레에 떨어지는 빗방울: 수면에 톡 떨어져 튀고 녹아든다
    for (let i = 0; i < 90; i++) {
      const a = R() * 2 * Math.PI, rr = 2.2 + 3.5 * R(), r = 0.025 + 0.025 * R();
      D.push({ x: Math.cos(a) * rr, y: r, z: Math.sin(a) * rr - 0.8, r, u: R(), k: R(), land: R() * 30, stay: 0.9 + 0.6 * R(), E: 0.7, leave: "sink" });
    }
    return D;
  },
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T, a = 0.32 * Math.sin(ph);
    return { eye: [Math.sin(a) * 6.2, 2.75 + 0.15 * Math.sin(ph * 2), Math.cos(a) * 6.2], ta: [0, 0.32, 0], fov: 0.62, focus: 6.4, ap: 0.012 };
  },
  light() {
    const d = [-0.42, 0.58, -0.70], l = Math.hypot(...d);
    return { dir: d.map((v) => v / l), key: [2.3, 2.0, 1.65], dir2: [0.45, 0.75, 0.6], key2: [0.9, 0.9, 1.0] };
  },
  init(G, ctx) { return SGL.dropInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.dropDraw(this, G, st, t, ctx); },
});
