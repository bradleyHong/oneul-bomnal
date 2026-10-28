/* 빛의 회랑 · Gyroid Hall
 *
 * 자이로이드(sin x cos y + sin y cos z + sin z cos x = 0)는 끝없이 이어지는 구멍 뚫린 곡면이다.
 * 그 속을 카메라가 30초 동안 정확히 한 주기만큼 날아가므로 끝과 처음이 이어진다.
 * 곡면 틈마다 빛이 고여 성당 회랑처럼 보이게, 물체 반사 대신 표면 가까이의 빛(발광)과 안개로 깊이를 낸다.
 */
SGL.add({
  id: "gyroid", title: "빛의 회랑", en: "Gyroid Hall", mood: ["cosmos", "geo"],
  desc: "끝없이 이어지는 곡면 동굴 속을 천천히 날아갑니다. 틈마다 빛이 고여 성당 회랑처럼 깊어집니다.",
  palettes: [
    { name: "새벽", colors: ["#ff7aa8", "#7a5cff", "#38d6ff", "#ffd36b"] },
    { name: "호박", colors: ["#ffb347", "#ff5a3d", "#ffe0a0", "#8a3a20"] },
    { name: "심해", colors: ["#1fd1c1", "#2a6cff", "#9ef0ff", "#0a2a60"] },
    { name: "라임 네온", colors: ["#d4ff3a", "#38d6ff", "#7a5cff", "#1a3a20"] },
  ],
  post: { exposure: 1.0, bloom: 0.09, sat: 1.15, contrast: 1.08, vignette: 0.28, grain: 0.012 },
  src: `
#define LKD vec3(0.3, 0.6, -0.7)
#define KEYC vec3(0.35, 0.33, 0.32)
#define MAXD 22.0
#define STEPS 200
float gy(vec3 p){ return dot(sin(p), cos(p.yzx)); }
float map(vec3 p){
  float s = 1.6;
  vec3 q = p*s;
  float g = abs(gy(q))/s - 0.10;                    // 두께 있는 곡면
  return g*0.65;
}
vec3 env(vec3 rd){ return mix(uC3*0.02, uC1*0.06, 0.5 + 0.5*rd.y); }
#define HAS_BG
vec3 bg(vec3 rd){ return uC1*0.04 + uC0*0.02; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  // 곡면 무늬: 두 겹의 등고선 띠가 빛난다
  float g2 = gy(p*1.6*2.0 + 0.5);
  float band = smoothstep(0.0, 0.035, abs(fract(gy(p*0.8)*1.5 + uT/T*2.0) - 0.5) - 0.44);   // 등고선 가장자리만 가늘게
  alb = mix(vec3(0.02), pal(p.z*0.08 + 0.2*g2)*0.15, 0.6);
  rough = 0.25; metal = 0.6;
  float rim = pow(1.0 - abs(dot(n, normalize(vec3(0.0, 0.0, 1.0)))), 3.0);
  emit = pal(p.z*0.06 + uT/T)*band*3.0 + pal(p.x*0.1 + 0.5)*rim*0.25;
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  // 자이로이드의 한 주기 = 2π/1.6. 30초에 두 주기 → 끝과 처음이 같다
  float per = 6.2831853/1.6;
  float z = t/T*per*2.0;
  // 관 안쪽 길: (π/2, 0) 축을 따라 가면 곡면에 부딪히지 않는다
  vec3 c = vec3(0.98, 0.0, z);
  ro = c + vec3(0.18*sin(TAU*t/T), 0.18*cos(TAU*t/T*2.0), 0.0);
  ta = ro + vec3(0.25*sin(TAU*t/T + 1.0), 0.15*sin(TAU*t/T*2.0), 1.0);
  fov = 1.25;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, "#define FOG 0.16\n" + this.src, t, ctx); },
});
