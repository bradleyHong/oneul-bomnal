/* 프랙탈 신전 · Fractal Temple
 *
 * 끝없이 되풀이되는 멩거 스펀지의 중심 통로를 천천히 걸어 들어간다. 큰 기둥과 창 안에 같은 모양이 작게, 또 작게 들어 있다.
 * 둘째 단계 면은 금빛 장식, 가장 작은 구멍들은 스스로 빛나고, 위에서 들어온 햇빛이 통로에 그림자를 드리운다.
 * 구조가 진행 방향으로 4 마다 되풀이되므로 30초에 정확히 4 만큼 가면 루프가 된다.
 */
SGL.add({
  id: "fractal-temple", title: "프랙탈 신전", en: "Fractal Temple", mood: ["geo", "cosmos"],
  desc: "끝없이 되풀이되는 프랙탈 신전의 통로를 걸어 들어갑니다. 기둥 속에 같은 모양이 작게, 또 작게 들어 있습니다.",
  palettes: [
    { name: "황금 신전", colors: ["#ffd9a0", "#ffb35a", "#9ab8ff", "#c8b8a8"] },
    { name: "달빛 대리석", colors: ["#d8e4ff", "#7ab8ff", "#a07aff", "#c8ccd8"] },
    { name: "붉은 사암", colors: ["#ffc8a0", "#ff6a3a", "#3ad6ff", "#c88a6a"] },
    { name: "옥빛", colors: ["#e8fff0", "#3dffa8", "#ffd36b", "#a8c8b8"] },
  ],
  post: { exposure: 1.0, bloom: 0.09, sat: 1.10, contrast: 1.10, vignette: 0.35, grain: 0.012 },
  src: `
#define LKD vec3(0.30, 0.90, 0.22)
#define KEYC (uC0*2.6)
#define STEPS 220
#define MAXD 30.0
#define FOG 0.055
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float LEV;
float sponge(vec3 p){
  vec3 q = p; q.xz = mod(q.xz + 2.0, 4.0) - 2.0;
  vec3 r = q*0.5;
  float d = sdBox(r, vec3(1.0, 1.0, 1.0)); LEV = 0.0;
  float s = 1.0;
  for(int m=0;m<4;m++){
    vec3 a = mod(r*s, 2.0) - 1.0; s *= 3.0;
    vec3 k = abs(1.0 - 3.0*abs(a));
    float c = (min(max(k.x, k.y), min(max(k.y, k.z), max(k.z, k.x))) - 1.0)/s;
    if(c > d){ d = c; LEV = float(m + 1); }
  }
  return d*2.0;
}
float map(vec3 p){ return sponge(p); }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  sponge(p);
  float lv = LEV;
  float g = fbm3(p*3.0);
  alb = uC3*uC3*(0.45 + 0.4*g); rough = 0.6; metal = 0.0;
  if(lv > 1.5 && lv < 2.5){ alb = uC0*0.8; metal = 1.0; rough = 0.18; }
  if(lv > 3.5){ emit = uC1*1.6*(0.6 + 0.4*sin(TAU*(uT/T*2.0) + p.z*1.5708)); alb *= 0.4; }
}
vec3 env(vec3 rd){ return mix(uC2*0.10, uC0*0.5 + uC2*0.15, smoothstep(-0.3, 0.8, rd.y)); }
#define HAS_BG
vec3 bg(vec3 rd){ return uC0*1.1*smoothstep(0.2, 1.0, rd.z) + uC2*0.25 + uC1*0.1; }
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float z = t/T*4.0;
  float a = TAU*t/T;
  ro = vec3(0.10*sin(a), -0.05 + 0.06*sin(a*2.0), z);
  ta = ro + vec3(0.18*sin(a + 1.0), 0.10 + 0.05*cos(a), 1.0); fov = 1.15;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
