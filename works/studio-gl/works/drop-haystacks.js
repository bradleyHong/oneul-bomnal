/* 방울방울, 나 3 · 건초더미 · Haystacks
 *
 * 늦은 오후 낮은 해. 물방울이 쌓이고 쌓여 둥근 더미 셋이 차례로 솟는다 — 하루하루 쌓아 온 나.
 * 해를 받는 쪽 방울은 금빛 · 산호빛으로, 그늘 쪽은 보랏빛으로 물든다(모네의 건초더미처럼 그림자에도 색이 있다).
 * 더미가 다 서면 차례로 놓여 물 위로 톡톡 떨어진다.
 */
SGL.add({
  id: "drop-haystacks", title: "건초더미", en: "Haystacks", mood: ["calm", "nature"],
  desc: "늦은 오후 낮은 해 아래, 물방울이 쌓이고 쌓여 둥근 더미 셋이 차례로 솟습니다. 해를 받는 쪽은 금빛, 그늘 쪽은 보랏빛. 하루하루 쌓아 온 나.",
  palettes: [
    { name: "늦은 오후", colors: ["#5a4a8a", "#9ab0d8", "#ff9a5a", "#ffe0a0"] },
    { name: "가을 저녁", colors: ["#4a3a6a", "#c0a0c8", "#ff7a4a", "#ffd890"] },
    { name: "눈 온 아침", colors: ["#4a5a8a", "#c8d4ec", "#ffb0a0", "#fff4e0"] },
    { name: "여름 한낮", colors: ["#3a6a5a", "#a0c8e0", "#ffc060", "#fff8c8"] },
  ],
  post: { exposure: 1.05, bloom: 0.09, sat: 1.3, contrast: 1.1, vignette: 0.36, grain: 0.012 },
  N: (ctx) => (ctx.cap ? 2300 : 1600),
  dens: 1.2, haze: 0.012,
  scene: SGL.monet({ tree: 0.6, cloud: 0.5, bright: 0.55, pads: 1.5, disc: 0 }) + `
vec3 tint(float k){
  vec3 c = k < 0.4 ? mix(uC0*1.5 + uC1*0.3, uC1, k/0.4) : (k < 0.7 ? mix(uC1, uC2, (k - 0.4)/0.3) : mix(uC2, uC3, (k - 0.7)/0.3));
  c /= max(max(c.r, c.g), max(c.b, 1e-3));
  return clamp(mix(vec3(1.0), c, 0.6), 0.0, 1.0);
}
`,
  build(N) {
    const R = SGL.rng(31);
    const S = [[-1.85, -0.7, 0.78, 0.95], [0.4, 0.25, 0.92, 1.18], [2.4, -1.9, 0.7, 0.85]];   // x, z, 반지름, 높이
    const sdf = (x, y, z) => {
      let d = 1e9;
      for (const [cx, cz, r, h] of S) {
        const px = x - cx, pz = z - cz, py = y - 0.1;
        const q_ = Math.max(0, py / h), rr = r * (1 - 0.45 * Math.pow(q_, 1.6));         // 위가 둥글게 좁아진다
        const qx = Math.hypot(px, pz) / rr, qy = py / h;
        const k0 = Math.hypot(qx, qy), k1 = Math.hypot(qx / rr, qy / h);
        d = Math.min(d, k0 * (k0 - 1) / k1);
      }
      return d;
    };
    const D = SGL.dropFill({ sdf, box: [-2.6, 0, -2.8, 3.1, 1.7, 1.2], N, r: [0.014, 0.07], rPow: 2.6, seed: 9, surface: 0.75, band: 0.05, overlap: 1.18, relax: 8 });
    const L = [-0.86, 0.24, 0.12];
    D.forEach((d) => {
      let best = 0, bd = 1e9; S.forEach((s, i) => { const q = Math.hypot(d.x - s[0], d.z - s[1]); if (q < bd) { bd = q; best = i; } });
      d.st = best;
      const s = S[best], nx = d.x - s[0], ny = (d.y - 0.1) * 0.6, nz = d.z - s[1], nl = Math.hypot(nx, ny, nz) + 1e-6;
      const lit = (nx * L[0] + ny * L[1] + nz * L[2]) / nl / Math.hypot(...L);
      d.k = Math.min(0.999, Math.max(0, 0.42 + 0.75 * lit + 0.12 * (R() - 0.5)));
      d.o = best + 0.92 * d.y / (s[3] + 0.1) + 0.08 * d.u;
    });
    D.sort((a, b) => a.o - b.o);
    D.forEach((d, i) => {
      const fr = i / D.length;
      d.land = 0.6 + 18.2 * Math.pow(fr, 0.75);
      d.E = 1.8 + 0.6 * R();
      const ls = 21.0 + 2.2 * d.st + 2.0 * (1 - d.y / 1.6) + 1.0 * R();
      d.stay = Math.min(ls, d.land + 28.6 - d.E - 1.2) - d.land;
      d.leave = "drop";
    });
    for (let i = 0; i < 60; i++) {
      const x = -4 + 8.5 * R(), z = -4 + 5.5 * R(), r = 0.02 + 0.025 * R();
      D.push({ x, y: r, z, r, u: R(), k: R(), land: R() * 30, stay: 0.8 + 0.6 * R(), E: 0.7, leave: "sink" });
    }
    return D;
  },
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T, s = Math.sin(ph);
    return { eye: [0.3 + 0.9 * s, 1.9 + 0.1 * Math.sin(ph * 2), 7.4], ta: [0.25 + 0.4 * s, 0.55, -0.6], fov: 0.66, focus: 7.6, ap: 0.01 };
  },
  light() {
    const d = [-0.86, 0.24, 0.12], l = Math.hypot(...d);
    return { dir: d.map((v) => v / l), key: [2.5, 1.85, 1.2], dir2: [0.4, 0.8, 0.5], key2: [0.6, 0.65, 0.85] };
  },
  init(G, ctx) { return SGL.dropInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.dropDraw(this, G, st, t, ctx); },
});
