/* 프리즘 · Prism
 *
 * 어두운 무대, 한 줄기 흰 빛이 유리 프리즘에 들어가 무지개 부채로 갈라져 나온다.
 * 빛줄기는 안개 낀 공기에서 보이는 것처럼(산란) 두께와 번짐을 가진 면 위의 빛으로 그리고,
 * 프리즘은 거리장 유리(겉 반사 · 모서리 빛)로 그린다. 프리즘이 천천히 기울며 부채가 쓸려 간다.
 */
SGL.add({
  id: "prism", title: "프리즘", en: "Prism", mood: ["geo", "vivid"],
  desc: "어두운 무대에서 한 줄기 빛이 유리 프리즘을 지나 무지개 부채로 갈라집니다. 프리즘이 기울 때마다 빛의 부채가 쓸려 갑니다.",
  palettes: [
    { name: "무지개", colors: ["#ffffff", "#ff3a5a", "#3a7aff", "#0a0a12"] },
    { name: "따뜻한 빛", colors: ["#fff4e0", "#ff8a3a", "#ff3a7a", "#120a08"] },
    { name: "차가운 빛", colors: ["#eaf6ff", "#3ad6ff", "#7a5cff", "#060a14"] },
    { name: "라임", colors: ["#f4ffe0", "#d4ff3a", "#38d6ff", "#0a0e06"] },
  ],
  post: { exposure: 1.0, bloom: 0.11, sat: 1.25, contrast: 1.12, vignette: 0.35, grain: 0.012 },
  src: `
#define LKD vec3(0.3, 0.8, 0.5)
#define KEYC vec3(0.5)
#define STEPS 120
#define MAXD 12.0
float PHI(){ return 0.10*sin(TAU*uT/T) + 0.04*sin(TAU*uT/T*2.0); }
vec2 R2(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }
float sdTri(vec2 p, float r){ const float k = 1.7320508; p.x = abs(p.x) - r; p.y = p.y + r/k; if(p.x + k*p.y > 0.0) p = vec2(p.x - k*p.y, -k*p.x - p.y)/2.0; p.x -= clamp(p.x, -2.0*r, 0.0); return -length(p)*sign(p.y); }
float map(vec3 p){
  vec2 q = R2(p.xy, -PHI());
  float d2 = sdTri(q, 0.62);
  return max(d2, abs(p.z) - 0.40) - 0.012;
}
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  alb = vec3(0.0); rough = 0.03; metal = 0.0;
  vec2 q = R2(p.xy, -PHI());
  float d2 = sdTri(q, 0.62);
  // 모서리에 맺히는 빛 (유리 두께가 보이는 곳)
  float edge = exp(-abs(d2)*90.0)*0.6 + exp(-abs(0.40 - abs(p.z))*120.0)*0.35;
  // 유리 속을 지나는 흰 빛 (최소 편각: 밑변과 나란히)
  float by = (q.y - 0.11)*16.0;
  float beam = exp(-by*by)*step(d2, 0.0);
  float sp = clamp((q.x + 0.35)/0.7, 0.0, 1.0);
  vec3 bc = mix(uC0*1.6, spectral(0.5 + (q.y - 0.11)*5.0)*1.2, sp*sp);
  emit = bc*beam*0.9 + uC0*edge*0.5 + uC2*0.015;
}
vec3 env(vec3 rd){
  // 위쪽 긴 띠 조명 둘 (유리 면에 선명한 반사)
  float s1 = smoothstep(0.035, 0.02, abs(rd.x - 0.25))*smoothstep(0.3, 0.5, rd.y);
  float s2 = smoothstep(0.02, 0.01, abs(rd.x + 0.55))*smoothstep(0.2, 0.4, rd.y);
  return vec3(0.003) + vec3(3.0)*s1 + uC1*1.2*s2;
}
float nz(vec2 p){ return vn3(vec3(p, 0.0)); }
// 무대 면(z=0) 위의 빛줄기: 왼쪽 아래에서 올라오는 흰 빛 + 오른쪽으로 내려가는 무지개 부채
vec3 beams(vec2 P){
  float phi = PHI();
  vec2 E = R2(vec2(-0.35, 0.11), phi), X = R2(vec2(0.35, 0.11), phi);
  vec3 c = vec3(0.0);
  vec2 A = vec2(-7.0, -1.6);
  vec2 ba = E - A, pa = P - A; float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0);
  float d = length(pa - ba*h);
  float haze = 0.75 + 0.5*nz(P*vec2(1.5, 6.0) - vec2(uT/T*0.0, 0.0));
  c += uC0*(exp(-d*d*3500.0)*2.6 + exp(-d*d*120.0)*0.10*haze)*step(h, 0.999);
  vec2 v = P - X; float r = length(v);
  float ang = atan(v.y, v.x);
  float a0 = -0.50 - phi*1.6, a1 = a0 + 0.26 + 0.05*sin(TAU*uT/T*2.0);
  float u = (ang - a0)/(a1 - a0);
  float inFan = smoothstep(-0.04, 0.03, u)*smoothstep(1.04, 0.97, u)*step(0.0, v.x);
  vec3 sp = mix(spectral(clamp(u, 0.0, 1.0)), mix(uC2, uC1, clamp(u, 0.0, 1.0)), 0.2);
  float grain = 0.8 + 0.4*nz(vec2(r*5.0, u*40.0));
  c += sp*inFan*grain*(1.8/(1.0 + r*0.7))*smoothstep(0.0, 0.08, r);
  c += sp*smoothstep(-0.4, 0.0, u)*smoothstep(1.4, 1.0, u)*step(0.0, v.x)*0.05/(1.0 + r)*haze;
  return c;
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  ro = vec3(0.4 + 0.35*sin(TAU*t/T), 0.15 + 0.08*sin(TAU*t/T*2.0), 4.0); ta = vec3(0.45, -0.1, 0.0); fov = 0.9;
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 c = uC3*0.5 + vec3(0.003);
  if(rd.z < -1e-4){ float t = -ro.z/rd.z; vec2 P = (ro + rd*t).xy; c += beams(P); }
  return c;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
