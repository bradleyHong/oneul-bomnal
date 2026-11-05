/* 방울방울, 나 4 · 바람 · Breeze
 *
 * 흰 구름이 지나는 밝은 날, 바람이 분다. 물방울이 허공의 보이지 않는 천 위에 톡톡 내려앉아 바람에 부푼
 * 베일 같은 곡면이 드러나고, 그 곡면이 바람결 따라 출렁인다 — 흔들리면서도 그 자리에 있는 나.
 * 끝에는 바람이 방울을 하나씩 실어 간다.
 */
SGL.add({
  id: "drop-breeze", title: "바람", en: "Breeze", mood: ["calm", "nature"],
  desc: "밝은 날 바람이 붑니다. 물방울이 허공의 보이지 않는 천 위에 내려앉아 바람에 부푼 베일이 드러나고, 바람결 따라 출렁이다 하나씩 실려 갑니다.",
  palettes: [
    { name: "양산", colors: ["#3a7a5a", "#7ab0e0", "#f6efe0", "#f2d04a"] },
    { name: "들꽃", colors: ["#4a7a4a", "#9ac0e8", "#ffc8d8", "#fff0a0"] },
    { name: "바닷바람", colors: ["#2a6a7a", "#6aa8e0", "#e8f4f8", "#ffe0a0"] },
    { name: "저녁 바람", colors: ["#4a4a7a", "#a8a0d8", "#ffd0c0", "#ffc870"] },
  ],
  post: { exposure: 1.0, bloom: 0.08, sat: 1.28, contrast: 1.08, vignette: 0.32, grain: 0.012 },
  N: (ctx) => (ctx.cap ? 1500 : 1100),
  dens: 1.0, haze: 0.008,
  scene: SGL.monet({ tree: 0.55, cloud: 0.95, bright: 0.62, pads: 0.72, disc: 0, padR: 1.0 }) + `
vec3 tint(float k){
  vec3 c = k < 0.5 ? mix(uC1, uC2, k/0.5) : mix(uC2, uC3, (k - 0.5)/0.5);
  c /= max(max(c.r, c.g), max(c.b, 1e-3));
  return clamp(mix(vec3(1.0), c, 0.5), 0.0, 1.0);
}
`,
  build(N) {
    const R = SGL.rng(17);
    const f = (u, v) => {                                   // 바람에 부푼 베일: 길이 u, 폭 v
      const x = -2.1 + 4.2 * u;
      const lift = 0.55 + 1.35 * Math.sin(Math.PI * u) * (0.75 + 0.25 * Math.sin(u * 5 + 1));
      const y = lift + (v - 0.5) * 0.95 * (0.6 + 0.4 * Math.sin(Math.PI * u)) + 0.3 * (v - 0.5) * (v - 0.5);
      const z = -0.45 * Math.sin(u * 2.4 + 0.4) - 0.6 * (v - 0.5) * (v - 0.5) + 0.25 * Math.sin(Math.PI * v) * Math.sin(Math.PI * u);
      return [x, y, z];
    };
    const D = SGL.dropSurf({ f, N, r: [0.013, 0.07], rPow: 2.8, seed: 3, overlap: 1.25, amax: 6, weight: (u, v) => 0.2 + 0.8 * Math.max(Math.pow(Math.abs(v * 2 - 1), 4), Math.pow(Math.abs(u * 2 - 1), 8)) });
    D.forEach((d) => (d.o = Math.abs(d.su - 0.5) + 0.1 * d.u));
    D.sort((a, b) => a.o - b.o);
    D.forEach((d, i) => {
      const fr = i / D.length;
      d.land = 0.6 + 18 * Math.pow(fr, 0.62);
      d.k = Math.min(0.999, Math.max(0, 0.15 + 0.7 * d.sv + 0.2 * (R() - 0.5)));
      d.E = 2.6 + 0.8 * R();
      d.stay = Math.min(21.5 + 5.0 * d.su + 0.8 * R(), d.land + 28.6 - d.E - 1.2) - d.land;
      d.leave = "blow"; d.wx = 2.6 + 1.2 * R(); d.wz = -0.8 * R();
      const su = d.su, sv = d.sv;
      d.sway = (t) => {                                     // 바람결: 30초에 세 번 지나가는 물결 (정수 주기 → 루프)
        const w = 2 * Math.PI * (3 * t / 30) - su * 7.0;
        const amp = 0.09 * Math.sin(Math.PI * su) * (0.5 + sv);
        return [0.02 * Math.sin(w * 2), 0.12 * Math.sin(w) * amp / 0.09, amp * Math.cos(w)];
      };
    });
    return D;
  },
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T, a = 0.22 * Math.sin(ph);
    return { eye: [Math.sin(a) * 6.4, 0.75 + 0.08 * Math.sin(ph * 2), Math.cos(a) * 6.4], ta: [0, 1.35, 0], fov: 0.66, focus: 6.4, ap: 0.01 };
  },
  light() {
    const d = [0.55, 0.62, -0.55], l = Math.hypot(...d);
    return { dir: d.map((v) => v / l), key: [2.4, 2.25, 2.0], dir2: [-0.5, 0.6, 0.6], key2: [0.7, 0.8, 1.0] };
  },
  init(G, ctx) { return SGL.dropInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.dropDraw(this, G, st, t, ctx); },
});
