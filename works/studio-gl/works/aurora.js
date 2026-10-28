/* 극광 · Aurora
 *
 * 별이 촘촘한 밤하늘에 커튼 같은 오로라가 일렁이고, 잔잔한 호수가 그 빛을 비춘다.
 * 오로라는 하늘 높이의 얇은 층들을 여러 장 겹쳐 그린다(층마다 휘어진 띠 + 세로 결). 산 실루엣은 앞쪽에.
 * 띠의 흔들림은 30초 주기의 정수배 사인 → 완전 루프.
 */
SGL.add({
  id: "aurora", title: "극광", en: "Aurora", mood: ["calm", "nature", "cosmos"],
  desc: "별빛 가득한 밤하늘에 오로라 커튼이 천천히 일렁이고, 잔잔한 호수가 그 빛을 받아 비춥니다.",
  palettes: [
    { name: "북극", colors: ["#3dffa8", "#38d6ff", "#a06bff", "#0a1430"] },
    { name: "분홍 극광", colors: ["#ff5ab0", "#a06bff", "#3dffa8", "#140a30"] },
    { name: "금빛 새벽", colors: ["#ffd36b", "#ff7a6b", "#7a5cff", "#1a0f20"] },
    { name: "라임", colors: ["#d4ff3a", "#3dffa8", "#38d6ff", "#06141a"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.18, contrast: 1.06, vignette: 0.25, grain: 0.012 },
  src: `
float tri(float x){ return abs(fract(x) - 0.5); }
// 하늘 방향 rd 의 오로라 빛
vec3 aurora(vec3 rd){
  vec3 col = vec3(0.0);
  if(rd.y < 0.02) return col;
  float ph = TAU*uT/T;
  // 커튼 바닥선(곡선) 위로 빛줄기가 솟고 위로 갈수록 옅어진다. 층을 깊이별로 겹쳐 두께를 낸다
  for(int i=0;i<24;i++){
    float fi = float(i);
    float dist = 3.0 + fi*0.35;                               // 커튼까지의 거리
    vec2 q = rd.xz/max(rd.y, 0.02);                            // 하늘 평면 좌표
    float x = atan(rd.x, rd.z)*4.0 + fi*0.08;
    float base = 0.10 + 0.06*sin(x*0.6 + ph + fi*0.1) + 0.04*sin(x*1.3 - ph*2.0) + 0.02*sin(x*3.1 + ph*3.0);
    float hgt = rd.y - base;
    float curtain = hgt > 0.0 ? exp(-hgt*6.0) : exp(hgt*60.0);
    float rays = 0.45 + 0.55*pow(0.5 + 0.5*sin(x*14.0 + 3.0*sin(x*1.7 + ph) + fi*0.7), 2.0);
    float fold = 0.6 + 0.4*sin(x*2.0 - ph*2.0 + fi*0.3);
    vec3 c = mix(uC0, uC1, smoothstep(0.0, 0.25, hgt));
    c = mix(c, uC2, smoothstep(0.18, 0.45, hgt));
    col += c*curtain*rays*fold*exp(-fi*0.09)*0.11;
  }
  return col;
}
vec3 sky(vec3 rd){
  vec3 c = mix(uC3*0.9 + vec3(0.012, 0.016, 0.03), uC3*0.25, smoothstep(0.0, 0.7, rd.y));
  // 별
  vec2 g = vec2(atan(rd.x, rd.z)*160.0, rd.y*160.0);
  vec2 cell = floor(g); float r = h21(cell);
  float tw = 0.6 + 0.4*sin(TAU*(uT/T*floor(1.0 + r*4.0) + r*9.0));
  c += step(0.965, r)*smoothstep(0.35, 0.0, length(fract(g) - 0.5))*tw*1.2*smoothstep(0.02, 0.15, rd.y);
  return c + aurora(rd);
}
float mountain(float x){ return 0.07 + 0.06*sin(x*2.3 + 1.0) + 0.04*sin(x*5.1) + 0.02*sin(x*11.0 + 2.0); }
vec3 env(vec3 rd){ return sky(rd); }
#define HAS_BG
vec3 bg(vec3 rd){
  float az = atan(rd.x, rd.z);
  if(rd.y > 0.0){
    float m = mountain(az);
    if(rd.y < m) return uC3*0.05;                         // 산 실루엣
    return sky(rd);
  }
  // 호수: 물결에 흔들리는 하늘 반사
  float d = 1.0/max(-rd.y, 0.01);
  vec2 w = vec2(az*20.0, d*0.8);
  float wob = 0.012*sin(w.y*6.0 - TAU*uT/T*4.0 + sin(w.x*0.5)) + 0.006*sin(w.x*3.0 + w.y*9.0 + TAU*uT/T*3.0);
  vec3 r = normalize(vec3(rd.x + wob, -rd.y, rd.z));
  float m = mountain(az);
  vec3 c = r.y < m ? uC3*0.04 : sky(r);
  return c*0.75*(0.4 + 0.6*smoothstep(0.0, 0.25, -rd.y)) + uC3*0.02;
}
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = 0.25*sin(TAU*t/T);
  ro = vec3(0.0, 0.0, 0.0); ta = vec3(sin(a), 0.28, cos(a)); fov = 1.25;
}
#define STEPS 1
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
