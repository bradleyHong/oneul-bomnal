/* 녹은 거울 · Liquid Chrome
 *
 * 거울 금속 방울 일곱 개가 서로 붙었다 떨어지며 하나의 액체 조각이 된다(부드러운 합집합).
 * 표면에는 얇은 기름막 같은 무지개가 돌고, 스튜디오 소프트박스가 길게 비친다.
 * 방울 길은 모두 30초 주기의 정수배 → 완전 루프.
 */
SGL.add({
  id: "liquid-chrome", title: "녹은 거울", en: "Liquid Chrome", mood: ["vivid", "geo"],
  desc: "거울 금속 방울들이 붙었다 떨어지며 하나의 액체 조각이 됩니다. 표면에 오로라 같은 빛막이 흐릅니다.",
  palettes: [
    { name: "오팔", colors: ["#ff4f9a", "#38d6ff", "#d4ff3a", "#7a5cff"] },
    { name: "샴페인", colors: ["#ffd9a0", "#ffb36b", "#fff4e0", "#e0a060"] },
    { name: "블랙 크롬", colors: ["#3a3f55", "#9aa8ff", "#1a1d2a", "#c8d0ff"] },
    { name: "로즈골드", colors: ["#ffb0a0", "#ff7a8a", "#ffe0d0", "#d07070"] },
  ],
  post: { exposure: 1.0, bloom: 0.06, sat: 1.12, contrast: 1.10, vignette: 0.30, grain: 0.010 },
  src: `
#define LKD vec3(-0.35, 0.85, -0.40)
vec3 env(vec3 rd){
  // 사진 스튜디오: 큰 천장 소프트박스 · 양옆 색 조명 띠 · 밝은 수평선 띠 · 어두운 바닥
  float az = atan(rd.x, rd.z);
  vec3 c = mix(vec3(0.010, 0.010, 0.014), vec3(0.06, 0.06, 0.075), smoothstep(-0.5, 0.9, rd.y));
  c += vec3(5.0)*smoothstep(0.62, 0.70, rd.y)*smoothstep(1.2, 0.5, abs(az));
  c += uC0*3.2*smoothstep(0.55, 0.25, abs(az - 1.6))*smoothstep(0.8, 0.2, abs(rd.y - 0.1));
  c += uC1*3.2*smoothstep(0.55, 0.25, abs(az + 1.6))*smoothstep(0.8, 0.2, abs(rd.y - 0.1));
  c += (vec3(1.4) + uC2*0.8)*smoothstep(0.06, 0.0, abs(rd.y - 0.02))*0.8;
  c += uC3*0.25*smoothstep(0.0, -0.5, rd.y);
  return c;
}
#define HAS_BG
// 배경은 소프트박스 없이 어둡게: 조각만 떠 보이게
vec3 bg(vec3 rd){ vec2 q = rd.xy; return mix(vec3(0.010, 0.010, 0.016), uC3*0.05 + vec3(0.02), smoothstep(-0.6, 0.6, rd.y)) + uC0*0.03*exp(-dot(q, q)*3.0); }
vec3 BP(int i, float t){
  float fi = float(i), ph = TAU*t/T;
  float k1 = float(1 + i%3), k2 = float(1 + (i + 1)%2);
  return vec3(1.05*sin(ph*k1 + fi*1.9), 0.55*sin(ph*k2 + fi*2.7 + 1.0), 0.95*cos(ph*k1 + fi*1.3))*(0.70 + 0.18*sin(fi));
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<7;i++){ float r = 0.30 + 0.09*sin(float(i)*3.3); d = smin(d, length(p - BP(i, uT)) - r, 0.38); }
  return d;
}
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  metal = 1.0; rough = 0.06;
  float film = dot(n, normalize(vec3(0.3, 0.8, -0.5)))*0.6 + fbm3(p*1.6 + vec3(0.0, uT*TAU/T*0.0, 0.0))*0.8 + uT/T;
  alb = mix(vec3(0.97), pal(film), 0.38);
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(sin(a)*2.9, 0.5 + 0.3*sin(a*2.0), cos(a)*2.9); ta = vec3(0.0); fov = 0.80;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
