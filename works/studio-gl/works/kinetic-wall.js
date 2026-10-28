/* 뒤집히는 벽 · Kinetic Facade
 *
 * 앞면은 거울 금속, 뒷면은 색 유광으로 칠한 작은 판 수백 장이 세로축으로 돌며 벽 전체에 물결을 만든다.
 * 건물 외벽의 키네틱 파사드처럼. 각 판의 각도는 위치와 시간의 함수(물결 두 겹 + 가운데서 퍼지는 고리)이고,
 * 한 바퀴(2π)는 30초에 정수 번 → 완전 루프.
 */
SGL.add({
  id: "kinetic-wall", title: "뒤집히는 벽", en: "Kinetic Facade", mood: ["geo", "vivid"],
  desc: "작은 금속 판 수백 장이 하나씩 뒤집히며 벽 전체에 빛의 물결을 만듭니다. 건물 외벽 키네틱 파사드 같은 작품입니다.",
  palettes: [
    { name: "골드·블랙", colors: ["#ffcf8a", "#1a1a1a", "#ff8a4a", "#fff1d6"] },
    { name: "실버·코발트", colors: ["#d8e0ff", "#1a3aff", "#6a8cff", "#f0f4ff"] },
    { name: "로즈·버건디", colors: ["#ffb0a0", "#7a0a2a", "#ff5a7a", "#ffe4e8"] },
    { name: "라임·차콜", colors: ["#e8ffb0", "#1a2018", "#d4ff3a", "#f4ffe0"] },
  ],
  post: { exposure: 1.0, bloom: 0.07, sat: 1.12, contrast: 1.10, vignette: 0.28, grain: 0.010 },
  src: `
#define LKD vec3(-0.55, 0.55, -0.62)
#define STEPS 160
const float CS = 0.26;
float angAt(vec2 c){
  float ph = TAU*uT/T;
  float r = length(c*vec2(0.8, 1.0));
  float a = ph*1.0 + c.x*0.9 + 0.6*sin(c.y*0.8 + ph*2.0);
  float dr = r - mod(uT/T*3.0, 1.0)*6.0;
  a += 1.2*exp(-dr*dr*1.5);                                   // 가운데서 퍼지는 고리 (pow(음수, 2.0) 는 GLSL 에서 NaN)
  return a;
}
float tile(vec3 p, vec2 id){
  vec2 c = (id + 0.5)*CS;
  vec3 q = p - vec3(c, 0.0);
  float a = angAt(c);
  q.xz = rot(a)*q.xz;
  return length(max(abs(q) - vec3(CS*0.43, CS*0.43, 0.012), 0.0)) - 0.004;
}
float map(vec3 p){
  vec2 id = floor(p.xy/CS);
  float d = tile(p, id);
  d = min(d, tile(p, id + vec2(1, 0)));
  d = min(d, tile(p, id - vec2(1, 0)));
  d = min(d, 0.20 - p.z);                                     // 뒤 벽 (카메라 쪽이 양수)
  return d;
}
vec3 env(vec3 rd){
  float az = atan(rd.x, rd.z);
  vec3 c = mix(vec3(0.01), vec3(0.06), smoothstep(-0.5, 0.9, rd.y));
  c += vec3(4.0)*smoothstep(0.55, 0.65, rd.y)*smoothstep(1.4, 0.6, abs(az + 3.14159));
  c += uC2*2.5*smoothstep(0.5, 0.2, abs(az - 2.2))*smoothstep(0.9, 0.2, abs(rd.y));
  c += uC3*1.5*smoothstep(0.4, 0.15, abs(az + 2.0))*smoothstep(0.9, 0.3, abs(rd.y - 0.3));
  // 관객 쪽 넓은 조명면 (판이 정면을 볼 때 비친다) + 위쪽 띠
  c += vec3(1.6, 1.55, 1.5)*smoothstep(0.1, -0.7, rd.z)*(0.35 + 0.65*smoothstep(-0.3, 0.6, rd.y));
  c += uC2*1.2*smoothstep(0.05, 0.0, abs(rd.y - 0.35))*smoothstep(0.0, -0.5, rd.z);
  return c;
}
#define HAS_BG
vec3 bg(vec3 rd){ return vec3(0.01); }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  if(p.z > 0.19){ alb = vec3(0.02); rough = 0.6; metal = 0.0; return; }
  vec2 id = floor(p.xy/CS);
  float a = angAt((id + 0.5)*CS);
  // 판의 앞면(지역 -z)이 카메라를 보면 금속, 뒷면이면 색 유광
  float front = cos(a);
  vec3 ln = vec3(0.0, 0.0, -1.0); ln.xz = rot(-a)*ln.xz;
  bool isFront = dot(n, ln) > 0.5;
  bool isBack = dot(n, -ln) > 0.5;
  if(isFront){ alb = uC0; rough = 0.14; metal = 1.0; }
  else if(isBack){ alb = uC1; rough = 0.10; metal = 0.0; }
  else { alb = uC3; rough = 0.3; metal = 1.0; }
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = 0.35*sin(TAU*t/T);
  ro = vec3(sin(a)*5.4, 0.5 + 0.25*sin(TAU*t/T*2.0), -cos(a)*5.4); ta = vec3(0.0, 0.0, 0.0); fov = 0.85;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
