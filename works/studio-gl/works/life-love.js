/* 삶의 선 6 · 사랑 · Love
 *
 * 따뜻한 선 하나와 서늘한 선 하나가 끝없는 매듭 길을 함께 간다. 서로 감기며 멀어졌다 가까워지고,
 * 닿는 곳마다 빛이 핀다. 둘레에는 함께 지나온 날들이 옅은 실로 겹겹이 남아 있다.
 * 길은 (2,3) 원환 매듭(닫힌 곡선), 두 선은 길을 중심으로 서로 반대편에서 감긴다. 모든 움직임은 30초 정수배 주기.
 */
SGL.add({
  id: "life-love", title: "사랑", en: "Love", mood: ["calm", "vivid"],
  desc: "따뜻한 선과 서늘한 선이 끝없는 매듭 길을 함께 갑니다. 감기며 멀어졌다 가까워지고, 닿는 곳마다 빛이 핍니다.",
  palettes: [
    { name: "설렘", colors: ["#ff5a8a", "#5ab8ff", "#fff0f4", "#ffb0c8"] },
    { name: "노을 연인", colors: ["#ff8a3a", "#8a6aff", "#fff4e0", "#ffc08a"] },
    { name: "장미와 진주", colors: ["#ff2a5a", "#f0e8ff", "#ffffff", "#ff8aa8"] },
    { name: "봄밤", colors: ["#ffa0d0", "#7affd8", "#fffaf0", "#c0a8ff"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.10, contrast: 1.08, vignette: 0.40, grain: 0.012 },
  N: (ctx) => (ctx.cap ? 260 : 180), K: 520,
  body: `
vec3 knot(float s){ float r = 2.0 + cos(3.0*s); return vec3(r*cos(2.0*s), sin(3.0*s)*1.15, r*sin(2.0*s))*0.62; }
vec3 LP(float id, float u, out vec3 col, out float w){
  float ph = TAU*uT/T;
  float s = u*TAU;
  vec3 P = knot(s);
  vec3 Tn = normalize(knot(s + 0.004) - knot(s - 0.004));
  vec3 Nn = normalize(cross(Tn, vec3(0.0, 1.0, 0.0)) + 1e-4), Bn = cross(Tn, Nn);
  float flow = fract(u*2.0 - uT/T*3.0);
  if(id < 2.0){
    float side = id < 0.5 ? 0.0 : 3.14159;
    float gap = 0.035 + 0.20*(0.5 + 0.5*sin(s*3.0 - ph*2.0));
    float tw = s*6.0 + ph*2.0 + side;
    vec3 p = P + (Nn*cos(tw) + Bn*sin(tw))*gap;
    float touch = exp(-(gap - 0.035)*30.0);
    vec3 base = id < 0.5 ? uC0 : uC1;
    col = base*(0.45 + 1.4*exp(-flow*5.0)) + uC2*touch*1.8;
    w = 0.016 + 0.008*touch;
    return p;
  }
  // 지나온 날들: 길을 따라 옅게 겹친 실
  vec3 hh = h3(id*3.1 + 1.0);
  float er = 0.10 + 0.55*hh.x*hh.x;
  float tw = s*(4.0 + floor(hh.y*6.0)) + hh.z*TAU + ph*(mod(id, 2.0) < 0.5 ? 1.0 : -1.0);
  vec3 p = P + (Nn*cos(tw) + Bn*sin(tw))*er;
  col = mix(uC0, uC1, hh.z)*0.030*(0.4 + 1.6*exp(-fract(flow + hh.x)*6.0))*(1.0 - 0.6*hh.x);
  w = 0.003;
  return p;
}`,
  bg: `
void main(){
  vec3 rd = RD();
  vec3 f = normalize(uTa - uEye);
  float c = max(dot(rd, f), 0.0);
  vec3 col = mix(uC0, uC1, 0.5 + 0.5*rd.x)*0.012 + uC3*0.02*pow(c, 4.0);
  o = vec4(col*uGain, 1.0);
}`,
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T;
    const eye = [Math.sin(ph) * 4.6, 1.6 + 0.6 * Math.sin(ph * 2), Math.cos(ph) * 4.6];
    return { eye, ta: [0, 0, 0], fov: 0.80, focus: 4.6, ap: 0.012 };
  },
  init(G, ctx) { return SGL.lineInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.lineDraw(this, G, st, t, ctx); },
});
