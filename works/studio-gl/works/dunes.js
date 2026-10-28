/* 모래 언덕 · Dunes
 *
 * 해 질 녘 낮은 햇빛에 사막 언덕의 능선이 날카롭게 빛나고, 골짜기에는 긴 그림자가 고인다.
 * 표면에는 바람이 남긴 잔물결. 카메라는 언덕 위를 천천히 미끄러져 간다.
 * 지형은 진행 방향(z)으로 주기 P 인 함수라, 30초에 정확히 P 만큼 가면 처음과 같은 자리 → 완전 루프.
 */
SGL.add({
  id: "dunes", title: "모래 언덕", en: "Dunes", mood: ["calm", "nature"],
  desc: "해 질 녘 낮은 햇빛에 모래 언덕의 능선이 빛나고 골짜기에 긴 그림자가 고입니다. 바람 자국 위를 천천히 미끄러져 갑니다.",
  palettes: [
    { name: "노을 사막", colors: ["#ffb36b", "#ff6a4a", "#7a4aa0", "#e8a868"] },
    { name: "하얀 모래", colors: ["#fff1d6", "#ffc9a0", "#9ab8ff", "#f2e6d0"] },
    { name: "붉은 계곡", colors: ["#ff8a4a", "#d0402a", "#5a2a6a", "#c8603a"] },
    { name: "달빛", colors: ["#c8d8ff", "#6a8cff", "#141a40", "#9aa8c8"] },
  ],
  post: { exposure: 1.0, bloom: 0.06, sat: 1.12, contrast: 1.10, vignette: 0.30, grain: 0.012 },
  src: `
#define LKD vec3(0.75, 0.20, 0.55)
#define KEYC (uC0*3.2 + vec3(0.25))
#define STEPS 200
#define MAXD 60.0
#define FOG 0.028
const float PZ = 25.1327412;                    // 진행 방향 주기 (8π)
float crest(float u){ float s = 0.5 + 0.5*sin(u + 0.55*sin(u)); return s*s; }   // 한쪽이 가파른 능선
float H(vec2 p){
  float k = TAU/PZ;
  float h = 0.0;
  h += 1.25*crest(p.y*k*2.0 + p.x*0.22 + 0.6*sin(p.x*0.11));
  h += 0.55*crest(p.y*k*5.0 - p.x*0.35 + 1.7 + 0.8*sin(p.x*0.17 + p.y*k*1.0));
  h += 0.22*crest(p.y*k*11.0 + p.x*0.6 + 2.9);
  return h;
}
// 바람 잔물결: 높이는 거의 그대로, 노멀만 흔든다 (z 주기에 맞춘 정수 배)
float ripple(vec2 p){ float k = TAU/PZ; return 0.012*sin(p.y*k*120.0 + p.x*1.3 + 2.0*sin(p.x*0.4 + p.y*k*6.0)); }
float map(vec3 p){ return (p.y - H(p.xz))*0.55; }
vec3 sky(vec3 rd){
  vec3 L = normalize(LKD);
  float e = rd.y;
  vec3 c = mix(uC0*1.1 + vec3(0.12, 0.06, 0.04), mix(uC0*0.5, uC2, 0.45)*0.6 + vec3(0.02, 0.03, 0.07), smoothstep(-0.02, 0.6, e));
  float d = max(dot(rd, L), 0.0);
  c += uC0*(0.6*pow(d, 8.0) + 1.5*pow(d, 80.0)) + vec3(6.0, 4.5, 3.0)*smoothstep(0.9993, 0.9996, d);
  return c;
}
vec3 env(vec3 rd){ return sky(rd)*0.6; }
#define HAS_BG
vec3 bg(vec3 rd){ return sky(rd); }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  alb = uC3*0.75; rough = 0.85; metal = 0.0;
  // 능선 쪽은 밝고 고운 모래, 골짜기는 조금 어두운 모래
  float h = H(p.xz);
  alb *= 0.8 + 0.25*smoothstep(0.3, 1.6, h);
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float z = t/T*PZ;
  float x = 0.6*sin(TAU*t/T);
  ro = vec3(x, 0.0, z); ro.y = H(ro.xz) + 1.35;
  vec3 f = vec3(x + 0.3*cos(TAU*t/T), 0.0, z + 6.0); f.y = H(f.xz) + 0.6;
  ta = f; fov = 0.95;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) {
    // 잔물결은 노멀에만: 광선 행진 노멀 계산 뒤가 아니라 지형 높이에 아주 작게 더한다
    SGL.drawRay(G, this.src.replace("float map(vec3 p){ return (p.y - H(p.xz))*0.55; }", "float map(vec3 p){ return (p.y - H(p.xz) - ripple(p.xz))*0.55; }"), t, ctx);
  },
});
