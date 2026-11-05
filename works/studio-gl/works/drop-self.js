/* 방울방울, 나 5 · 자화상 · Self
 *
 * 해 질 녘 연못. 물방울이 톡, 톡 내려앉을 때마다 보이지 않던 옆얼굴과 어깨가 조금씩 드러난다.
 * 이슬은 윤곽(빛이 스치는 가장자리)에 더 모여 누군가의 옆모습을 그린다 — 그게 나인지는 모르겠지만.
 * 다 그려지면 잠시 머물다가 빛이 되어 날아간다.
 */
SGL.add({
  id: "drop-self", title: "자화상", en: "Self", mood: ["calm"],
  desc: "해 질 녘 연못에 물방울이 내려앉을 때마다 보이지 않던 옆얼굴과 어깨가 조금씩 드러납니다. 그게 나인지는 모르겠지만, 잠시 머물다 빛이 되어 날아갑니다.",
  palettes: [
    { name: "해 질 녘", colors: ["#3a3060", "#8a7ab8", "#ff9a8a", "#ffd0a0"] },
    { name: "푸른 저녁", colors: ["#26385e", "#7090c8", "#ffa8a0", "#ffe0c0"] },
    { name: "연분홍", colors: ["#4a3a5a", "#c0a8d0", "#ffb0c0", "#fff0e0"] },
    { name: "금빛 저녁", colors: ["#3a3a4a", "#a0a0b8", "#ff9a50", "#ffe090"] },
  ],
  post: { exposure: 1.05, bloom: 0.1, sat: 1.3, contrast: 1.1, vignette: 0.42, grain: 0.012 },
  N: (ctx) => (ctx.cap ? 1900 : 1400),
  dens: 1.15, haze: 0.01,
  scene: SGL.monet({ tree: 1.15, cloud: 0.35, bright: 0.42, pads: 0.7, disc: 0, padR: 1.8 }) + `
vec3 tint(float k){
  vec3 c = k < 0.5 ? mix(uC1, uC2, k/0.5) : mix(uC2, uC3, (k - 0.5)/0.5);
  c /= max(max(c.r, c.g), max(c.b, 1e-3));
  return clamp(mix(vec3(1.0), c, 0.55), 0.0, 1.0);
}
`,
  build(N) {
    const R = SGL.rng(53);
    const ell = (x, y, z, cx, cy, cz, a, b, c) => { const qx = (x - cx) / a, qy = (y - cy) / b, qz = (z - cz) / c; const k0 = Math.hypot(qx, qy, qz), k1 = Math.hypot(qx / a, qy / b, qz / c); return k0 * (k0 - 1) / k1; };
    const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
    // 왼쪽을 보는 옆모습: 머리 · 이마 · 코 · 입술 · 턱 · 목 · 어깨 · 가슴
    const sdf = (x, y, z) => {
      let d = ell(x, y, z, 0.05, 2.02, 0, 0.44, 0.5, 0.4);
      d = smin(d, ell(x, y, z, -0.26, 2.14, 0, 0.22, 0.24, 0.26), 0.1);              // 이마
      d = smin(d, ell(x, y, z, -0.47, 1.9, 0, 0.17, 0.08, 0.09), 0.04);              // 코
      d = smin(d, ell(x, y, z, -0.38, 1.74, 0, 0.1, 0.06, 0.12), 0.04);              // 입술
      d = smin(d, ell(x, y, z, -0.3, 1.6, 0, 0.13, 0.09, 0.14), 0.05);               // 턱
      d = smin(d, ell(x, y, z, -0.08, 1.66, 0, 0.26, 0.2, 0.24), 0.1);               // 뺨 · 턱선
      d = smin(d, ell(x, y, z, 0.1, 1.36, 0, 0.19, 0.32, 0.19), 0.12);
      d = smin(d, ell(x, y, z, 0.12, 0.92, 0, 0.88, 0.38, 0.4), 0.22);
      d = smin(d, ell(x, y, z, 0.12, 0.35, 0, 0.75, 0.62, 0.36), 0.2);
      return d;
    };
    // 이슬은 윤곽(카메라에서 볼 때 비스듬한 면)에 모인다 → 옆모습이 읽힌다
    const weight = (x, y, z) => { const e = 1e-3, f = sdf(x, y, z), gx = sdf(x + e, y, z) - f, gy = sdf(x, y + e, z) - f, gz = sdf(x, y, z + e) - f; const nz = Math.abs(gz) / (Math.hypot(gx, gy, gz) + 1e-9); return 0.1 + 0.9 * Math.pow(1 - nz, 2.2); };
    const D = SGL.dropFill({ sdf, box: [-1.0, 0, -0.6, 1.1, 2.6, 0.6], N, r: [0.012, 0.06], rPow: 2.6, seed: 11, surface: 0.75, band: 0.04, overlap: 1.18, relax: 8, weight });
    D.sort((a, b) => a.y + 0.25 * a.u - (b.y + 0.25 * b.u));
    D.forEach((d, i) => {
      const fr = i / D.length;
      d.land = 0.6 + 18.6 * Math.pow(fr, 0.6);
      d.k = Math.min(0.999, Math.max(0, 0.2 + 0.5 * (d.y / 2.5) + 0.35 * Math.max(0, -d.x) + 0.15 * (R() - 0.5)));
      d.E = 2.4 + 0.8 * R();
      d.stay = Math.min(22 + 4.5 * (1 - d.y / 2.5) + 1.0 * R(), d.land + 28.6 - d.E - 1.2) - d.land;
      d.leave = "rise";
    });
    for (let i = 0; i < 50; i++) {
      const a = R() * 2 * Math.PI, rr = 1.6 + 3.5 * R(), r = 0.02 + 0.02 * R();
      D.push({ x: Math.cos(a) * rr, y: r, z: Math.sin(a) * rr - 0.8, r, u: R(), k: R(), land: R() * 30, stay: 0.8 + 0.6 * R(), E: 0.7, leave: "sink" });
    }
    return D;
  },
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T, a = 0.12 * Math.sin(ph) + 0.03;
    return { eye: [Math.sin(a) * 5.4, 1.75 + 0.08 * Math.sin(ph * 2), Math.cos(a) * 5.4], ta: [0, 1.25, 0], fov: 0.62, focus: 5.4, ap: 0.016 };
  },
  light() {
    const d = [-0.65, 0.35, -0.67], l = Math.hypot(...d);
    return { dir: d.map((v) => v / l), key: [2.4, 1.75, 1.45], dir2: [0.5, 0.7, 0.55], key2: [0.55, 0.55, 0.8] };
  },
  init(G, ctx) { return SGL.dropInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.dropDraw(this, G, st, t, ctx); },
});
