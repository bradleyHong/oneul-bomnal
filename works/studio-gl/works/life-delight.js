/* 삶의 선 5 · 락 · 즐거움 · Delight
 *
 * 즐거움은 리듬이다. 정수 비율로 도는 리사주 곡선 수백 가닥이 실뜨기처럼 겹쳐 면을 이루고,
 * 30초에 16박으로 통통 부풀며, 선을 따라 빛이 노래하듯 달린다. 무리 넷이 서로 다른 화음(진동수 비)으로 돈다.
 */
SGL.add({
  id: "life-delight", title: "락 · 즐거움", en: "Delight", mood: ["vivid", "geo"],
  desc: "즐거움은 리듬입니다. 빛의 곡선 수백 가닥이 실뜨기처럼 겹쳐 춤추고, 박자에 맞춰 부풀며 선을 따라 빛이 노래하듯 달립니다.",
  palettes: [
    { name: "음악", colors: ["#ff4f9a", "#ffd23a", "#3ad8ff", "#9a5aff"] },
    { name: "재즈", colors: ["#ffb347", "#ff6a3d", "#ffe7a8", "#c9762c"] },
    { name: "라임 팝", colors: ["#d4ff3a", "#3dffa8", "#38d6ff", "#ff5ab0"] },
    { name: "달빛 왈츠", colors: ["#c8d8ff", "#a08aff", "#ffd8f0", "#8affe8"] },
  ],
  post: { exposure: 1.0, bloom: 0.09, sat: 1.15, contrast: 1.08, vignette: 0.36, grain: 0.012 },
  N: 168, K: 420,
  body: `
vec3 LP(float id, float u, out vec3 col, out float w){
  float ph = TAU*uT/T;
  float grp = floor(id/42.0), j = id - grp*42.0;
  vec3 fq = grp < 0.5 ? vec3(2.0, 3.0, 1.0) : (grp < 1.5 ? vec3(3.0, 2.0, 5.0) : (grp < 2.5 ? vec3(1.0, 4.0, 3.0) : vec3(5.0, 3.0, 2.0)));
  float tt = u*TAU;
  float off = j*0.032;
  vec3 p = vec3(sin(fq.x*tt + ph + off), sin(fq.y*tt + ph*2.0 + off*1.3 + grp), sin(fq.z*tt - ph + off*0.7 + 2.0*grp));
  float beat = 0.5 + 0.5*cos(ph*16.0 - grp*0.8); beat = beat*beat*beat*beat;
  p *= vec3(1.55, 1.0, 1.0)*(0.62 + 0.10*grp + 0.12*beat);
  p = rotA(p, normalize(vec3(sin(grp*1.7), 1.0, cos(grp*2.3))), ph*(grp < 2.0 ? 1.0 : -1.0) + grp*0.8);
  float run = fract(u*3.0 - uT/T*6.0 + j*0.013 + grp*0.25);
  col = pal(grp*0.25 + j*0.004)*(0.035 + 0.75*exp(-run*12.0))*(1.0 + 1.2*beat);
  w = 0.0045;
  return p;
}`,
  bg: `
void main(){
  vec3 rd = RD();
  float ph = TAU*uT/T;
  float beat = 0.5 + 0.5*cos(ph*16.0); beat = beat*beat*beat*beat;
  vec3 f = normalize(uTa - uEye);
  float c = max(dot(rd, f), 0.0);
  vec3 col = uC3*0.006 + uC0*0.02*(0.6 + 0.4*beat)*pow(c, 3.0) + uC1*0.015*smoothstep(0.2, -0.6, rd.y);
  o = vec4(col*uGain, 1.0);
}`,
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T, a = 0.35 * Math.sin(ph);
    const eye = [Math.sin(a) * 4.0, 0.5 * Math.sin(ph * 2), Math.cos(a) * 4.0];
    return { eye, ta: [0, 0, 0], fov: 0.82, focus: 4.0, ap: 0.010 };
  },
  init(G, ctx) { return SGL.lineInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.lineDraw(this, G, st, t, ctx); },
});
