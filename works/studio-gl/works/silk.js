/* 비단 물결 · Silk Waves
 *
 * 화면을 가득 채운 비단 한 장이 바람에 일렁인다. 높이장(height field)으로 천의 주름을 만들고
 * 비단 특유의 결 방향 광택(비등방 하이라이트)을 흉내 내 접힌 곳마다 빛이 길게 미끄러지게 했다.
 * 물결은 30초 정수배 주기 → 완전 루프.
 */
SGL.add({
  id: "silk", title: "비단 물결", en: "Silk Waves", mood: ["calm", "vivid"],
  desc: "화면 가득 비단 한 장이 바람에 일렁입니다. 접힌 곳마다 빛이 길게 미끄러져 호텔 로비처럼 고급스럽습니다.",
  palettes: [
    { name: "버건디", colors: ["#9a0f2a", "#ff6a7a", "#2a0410", "#ffd0b0"] },
    { name: "샴페인", colors: ["#c8a070", "#fff0d0", "#3a2a18", "#ffe0a0"] },
    { name: "에메랄드", colors: ["#0a7a5a", "#7affd0", "#021a14", "#d0fff0"] },
    { name: "미드나잇", colors: ["#1a2a8a", "#8aa8ff", "#04061a", "#e0e8ff"] },
  ],
  post: { exposure: 1.0, bloom: 0.06, sat: 1.12, contrast: 1.10, vignette: 0.30, grain: 0.012 },
  src: `
#define LKD vec3(-0.6, 0.55, -0.55)
#define KEYC vec3(2.2, 2.1, 2.0)
#define STEPS 120
float H(vec2 p){
  float ph = TAU*uT/T, h = 0.0;
  h += 0.22*sin(p.x*1.1 + p.y*0.35 + ph);
  h += 0.12*sin(p.x*2.3 - p.y*0.8 - ph*2.0 + 1.0);
  h += 0.06*sin(p.x*4.7 + p.y*1.9 + ph*3.0 + 2.0);
  h += 0.03*sin(p.x*9.0 - p.y*3.1 + ph*4.0);
  h += 0.10*sin(p.y*1.4 + 0.6*sin(p.x*0.7 + ph));
  return h;
}
float map(vec3 p){ return (H(p.xy) - p.z)*0.6; }   // 천 앞쪽(카메라 쪽)이 양수
vec3 env(vec3 rd){ return mix(uC2*0.2, uC1*0.6, smoothstep(-0.5, 1.0, rd.y)) + vec3(2.0)*smoothstep(0.75, 0.9, dot(rd, normalize(vec3(-0.5, 0.6, -0.6)))); }
#define HAS_BG
vec3 bg(vec3 rd){ return uC2*0.1; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  alb = uC0; rough = 0.42; metal = 0.0;
  // 비단 결 광택: 결 방향(x)에 수직인 반사가 길게 늘어난다
  vec3 T1 = normalize(cross(n, vec3(0.0, 1.0, 0.0)));
  vec3 L = normalize(LKD), V = normalize(vec3(0.0, 0.0, -1.0));
  vec3 Hh = normalize(L + V);
  float th = dot(T1, Hh);
  float sheen = pow(sqrt(max(1.0 - th*th, 0.0)), 60.0);
  emit = uC1*sheen*0.9*max(dot(n, L), 0.0) + uC3*pow(1.0 - max(dot(n, V), 0.0), 3.0)*0.25;
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  ro = vec3(0.3*sin(TAU*t/T), 0.0, -3.2); ta = vec3(0.0, 0.0, 0.0); fov = 0.9;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
