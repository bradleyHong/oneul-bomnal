/* 물빛 · Caustics
 *
 * 물결 아래 모래 바닥에 햇빛이 모였다 흩어지는 그물 무늬(커스틱)와, 물속으로 비스듬히 꽂히는 빛줄기.
 * 커스틱은 물결 높이의 기울기로 빛이 굴절되어 모이는 정도(야코비안)로 계산한다.
 * 물결은 시간 주파수가 30초의 정수배인 사인들의 합 → 완전 루프.
 */
SGL.add({
  id: "caustics", title: "물빛", en: "Caustics", mood: ["calm", "nature"],
  desc: "얕은 바다 모래 위로 햇빛 그물이 흔들리고, 물속으로 빛줄기가 내려앉습니다. 오래 틀어 두어도 편안합니다.",
  palettes: [
    { name: "라군", colors: ["#2ee6d6", "#0a6fb0", "#f2f7d0", "#e8d6a8"] },
    { name: "노을 바다", colors: ["#ff9a6b", "#3a4fa0", "#ffe0b0", "#d8b090"] },
    { name: "달밤", colors: ["#9ec8ff", "#0a1f5a", "#e0ecff", "#8090a8"] },
    { name: "에메랄드", colors: ["#3dffa8", "#0a5a50", "#e8ffd0", "#c8d8a0"] },
  ],
  post: { exposure: 1.0, bloom: 0.07, sat: 1.12, contrast: 1.05, vignette: 0.30, grain: 0.012 },
  src: `
float wave(vec2 p){
  float h = 0.0;
  for(int i=0;i<6;i++){
    float fi = float(i), an = fi*2.399 + 0.4;
    vec2 d = vec2(cos(an), sin(an));
    float k = 1.6*pow(1.45, fi), w = TAU*float(2 + i)/T;
    h += sin(dot(d, p)*k - w*uT + fi*1.7)/(k*1.2);
  }
  return h;
}
// 커스틱: 바닥 점으로 내려오는 빛이 물결에 굴절돼 모이는 그물 무늬.
// 널리 쓰이는 반복 커스틱 꼴(정의역 비틀기 5단)을 다시 짰고, 단마다 시간 배수를 정수로 둬 30초에 정확히 돌게 했다.
float caustic(vec2 uv){
  vec2 p = mod(uv*TAU, TAU) - 250.0;
  vec2 i = p; float c = 1.0, inten = 0.005;
  for(int n=0;n<5;n++){
    float t = TAU*uT/T*float(n + 1);
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0/length(vec2(p.x/(sin(i.x + t)/inten), p.y/(cos(i.y + t)/inten)));
  }
  c /= 5.0; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
float sand(vec2 p){ return 0.05*sin(p.x*3.0 + 0.6*sin(p.y*1.3)) + 0.03*fbm3(vec3(p*2.0, 0.0)); }
float map(vec3 p){ return p.y + 1.2 - sand(p.xz); }
vec3 env(vec3 rd){ return mix(uC1*0.10, uC0*0.35, smoothstep(-0.2, 0.9, rd.y)); }
#define HAS_BG
vec3 bg(vec3 rd){ return mix(uC1*0.12, uC0*0.45, smoothstep(-0.1, 0.8, rd.y)); }
#define LKD vec3(0.25, 0.95, 0.2)
#define KEYC vec3(0.35, 0.40, 0.42)
#define FOG 0.10
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  alb = uC3*0.30; rough = 0.9; metal = 0.0;
  float c = caustic(p.xz*0.32) + 0.5*caustic(p.xz*0.32*1.7 + 3.0);
  emit = (uC2*1.6 + uC0*0.5)*c*1.2;
  // 멀수록 물빛 안개
  float d = length(p.xz - vec2(0.0, -3.0));
  emit = mix(emit, vec3(0.0), smoothstep(4.0, 14.0, d));
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(0.4*sin(a), 0.2 + 0.05*sin(a*2.0), -3.0); ta = vec3(0.2*sin(a + 1.0), -1.0, 1.0); fov = 1.0;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
