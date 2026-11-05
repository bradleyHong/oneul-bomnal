/* 방울방울, 나 2 · 해돋이 · Impression
 *
 * 안개 낀 새벽 물가, 낮게 뜬 주황 해가 물 위에 빛길을 낸다. 물방울이 톡, 톡 내려앉아 위로 휘감아 오르는
 * 돛 같기도, 불꽃 같기도 한 형상을 세운다 — 하루를 시작하는 나. 해를 등진 방울마다 주황빛이 고인다.
 * 다 서면 방울이 하나씩 놓여 물 위로 톡 떨어지고, 물결만 남는다.
 */
SGL.add({
  id: "drop-impression", title: "해돋이", en: "Impression", mood: ["calm", "nature"],
  desc: "안개 낀 새벽 물가에 물방울이 톡, 톡 내려앉아 위로 휘감아 오르는 형상을 세웁니다. 해를 등진 방울마다 주황빛이 고이고, 끝에는 하나씩 물 위로 떨어집니다.",
  palettes: [
    { name: "해돋이", colors: ["#2c4a6e", "#8fa6c0", "#ff7a3c", "#ffd8a8"] },
    { name: "푸른 새벽", colors: ["#253a66", "#7a90c8", "#ff9a7a", "#ffe6c8"] },
    { name: "안개 항구", colors: ["#3a4a58", "#a8b4bc", "#ffa060", "#fff0d8"] },
    { name: "장밋빛", colors: ["#3a2f5a", "#a096c0", "#ff6a7a", "#ffd0b8"] },
  ],
  post: { exposure: 1.05, bloom: 0.11, sat: 1.3, contrast: 1.08, vignette: 0.38, grain: 0.012 },
  N: (ctx) => (ctx.cap ? 1500 : 1100),
  dens: 1.1, haze: 0.02,
  scene: SGL.monet({ tree: 0.32, cloud: 0.35, bright: 0.55, pads: 1.5, disc: 1.0 }) + `
#define WATERF 0.3
vec3 tint(float k){
  vec3 c = mix(uC1, uC2, smoothstep(0.2, 0.9, k));
  c = mix(c, uC3, smoothstep(0.85, 1.0, k));
  c /= max(max(c.r, c.g), max(c.b, 1e-3));
  return clamp(mix(vec3(1.0), c, 0.55), 0.0, 1.0);
}
`,
  build(N) {
    const R = SGL.rng(23), H = 2.9;
    const W = (y) => 0.62 * Math.pow(Math.max(Math.sin(Math.PI * Math.min(y / H, 1) * 0.92 + 0.12), 0), 0.8) * (1 - 0.35 * y / H);
    const f = (u, v) => {                                   // 돛 · 불꽃: 위로 갈수록 비틀리며 가늘어지는 띠
      const y = u * H, th = y * 1.15 + 0.3, cx = 0.28 * Math.sin(y * 1.7), cz = 0.18 * Math.sin(y * 1.1 + 1);
      const w = W(y) * (v * 2 - 1);
      const bend = 0.12 * (v * 2 - 1) * (v * 2 - 1);
      return [cx + Math.cos(th) * w - Math.sin(th) * bend, y + 0.04, cz + Math.sin(th) * w + Math.cos(th) * bend];
    };
    const D = SGL.dropSurf({ f, N, r: [0.013, 0.075], rPow: 2.8, seed: 7, overlap: 1.25, amax: 10, weight: (u, v) => 0.25 + 0.75 * Math.pow(Math.abs(v * 2 - 1), 3) });
    D.forEach((d) => (d.o = d.su + 0.12 * d.u));
    D.sort((a, b) => a.o - b.o);
    D.forEach((d, i) => {
      const fr = i / D.length;
      d.land = 0.6 + 18.0 * Math.pow(fr, 0.6);
      d.k = Math.min(0.999, Math.max(0, 0.25 + 0.55 * d.su + 0.3 * Math.abs(d.sv * 2 - 1) + 0.15 * (R() - 0.5)));
      d.E = 2.0 + 0.6 * R();
      const ls = 21.5 + 5.5 * R();
      d.stay = Math.min(ls, d.land + 28.6 - d.E - 1.2) - d.land;
      d.leave = "drop";
    });
    for (let i = 0; i < 70; i++) {
      const a = R() * 2 * Math.PI, rr = 1.8 + 3.5 * R(), r = 0.02 + 0.025 * R();
      D.push({ x: Math.cos(a) * rr, y: r, z: Math.sin(a) * rr - 1, r, u: R(), k: R(), land: R() * 30, stay: 0.8 + 0.6 * R(), E: 0.7, leave: "sink" });
    }
    return D;
  },
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T, a = 0.2 * Math.sin(ph);
    return { eye: [Math.sin(a) * 6.6, 1.25 + 0.1 * Math.sin(ph * 2), Math.cos(a) * 6.6], ta: [0, 1.15, 0], fov: 0.6, focus: 6.6, ap: 0.012 };
  },
  light() {
    const d = [0.32, 0.11, -0.94], l = Math.hypot(...d);
    return { dir: d.map((v) => v / l), key: [2.6, 1.7, 1.0], dir2: [-0.4, 0.8, 0.5], key2: [0.6, 0.7, 0.9] };
  },
  init(G, ctx) { return SGL.dropInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.dropDraw(this, G, st, t, ctx); },
});
