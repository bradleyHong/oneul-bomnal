/* 용암 · Lava Field
 *
 * 식어 가는 검은 현무암 껍질이 판처럼 갈라지고, 그 틈으로 뜨거운 용암이 빛난다. 앞쪽으로는 녹은 용암 강이 흐른다.
 * 껍질 판은 보로노이 경계로 만들고 x 방향으로 8칸마다 되풀이되게 해, 30초에 정확히 8칸 흘러가면 처음과 같아진다.
 * 강의 무늬도 같은 주기의 원통 위 잡음으로 흘러 루프가 이어진다.
 */
SGL.add({
  id: "lava", title: "용암", en: "Lava Field", mood: ["nature", "vivid"],
  desc: "식어 가는 검은 바위 틈으로 뜨거운 용암이 빛나고, 녹은 용암 강이 천천히 흘러갑니다.",
  palettes: [
    { name: "용암", colors: ["#fff1b0", "#ff8a1a", "#d01a0a", "#1a0806"] },
    { name: "푸른 불", colors: ["#e8fbff", "#38d6ff", "#2a3aff", "#060818"] },
    { name: "보랏빛 마그마", colors: ["#ffe8ff", "#ff4fd8", "#7a1aff", "#100618"] },
    { name: "황금", colors: ["#fffbe0", "#ffd36b", "#ff7a1a", "#140c04"] },
  ],
  post: { exposure: 1.0, bloom: 0.12, sat: 1.15, contrast: 1.12, vignette: 0.35, grain: 0.014 },
  src: `
#define LKD vec3(-0.4, 0.5, 0.6)
#define KEYC vec3(0.10, 0.09, 0.14)
#define STEPS 170
#define MAXD 26.0
#define FOG 0.045
const float NC = 8.0;
vec2 cellHash(vec2 id){ vec2 m = vec2(mod(id.x, NC), id.y); return vec2(h21(m), h21(m + 17.31)); }
vec2 pt(vec2 id){ vec2 h = cellHash(id); return 0.18 + 0.64*h + 0.06*sin(TAU*uT/T + TAU*h.yx); }
// 경계까지 거리, 칸 값
vec2 vor(vec2 x){
  vec2 n = floor(x), f = fract(x), mg = vec2(0.0), mr = vec2(0.0); float md = 8.0;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g = vec2(float(i), float(j)); vec2 r = g + pt(n + g) - f; float d = dot(r, r);
    if(d < md){ md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g = mg + vec2(float(i), float(j)); vec2 r = g + pt(n + g) - f;
    if(dot(mr - r, mr - r) > 1e-5) md = min(md, dot(0.5*(mr + r), normalize(r - mr)));
  }
  return vec2(md, h21(vec2(mod(n.x + mg.x, NC), n.y + mg.y)));
}
vec2 Q(vec3 p){ return vec2(p.x*0.85 - uT/T*NC, p.z*0.85); }
// x 방향 주기 NC 인 잡음 (원통 위에서 뽑는다)
float pfbm(vec2 q, float f){ float a = q.x*TAU/NC; float R = NC*f/TAU; return fbm3(vec3(cos(a)*R, sin(a)*R, q.y*f)); }
float river(vec3 p){ return smoothstep(0.75, 0.35, abs(p.z - 1.6 - 0.5*sin(p.x*0.35) - 0.25*sin(p.x*0.9 + 1.0))); }
float H(vec3 p){
  vec2 q = Q(p); vec2 v = vor(q);
  float crust = 0.16*smoothstep(0.0, 0.20, v.x) + 0.05*smoothstep(0.15, 0.5, v.x)*v.y + 0.025*pfbm(q, 3.0);
  return mix(crust, -0.06, river(p));
}
float map(vec3 p){ return (p.y - H(p))*0.55; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  vec2 q = Q(p); vec2 v = vor(q);
  float rv = river(p);
  float crack = 1.0 - smoothstep(0.0, 0.06, v.x);
  float pulse = 0.72 + 0.28*sin(TAU*(uT/T*2.0 + v.y));
  float flow = pfbm(q*vec2(1.0, 1.0) + vec2(0.0, 3.0), 2.2);
  float temp = max(crack*pulse*0.95, rv*(0.55 + 0.9*flow*flow));
  vec3 lc = mix(uC2, uC1, smoothstep(0.25, 0.65, temp));
  lc = mix(lc, uC0, smoothstep(0.75, 1.05, temp));
  float rock = pfbm(q, 6.0);
  alb = mix(vec3(0.03, 0.028, 0.03)*(0.6 + 0.8*rock), vec3(0.0), max(crack, rv));
  rough = mix(0.75, 0.35, max(crack, rv)); metal = 0.0;
  emit = lc*temp*temp*7.0 + uC2*exp(-v.x*12.0)*0.25*(1.0 - crack)*(1.0 - rv);
}
vec3 env(vec3 rd){
  float h = rd.y;
  return mix(uC3*0.45 + uC2*0.03, uC3*0.10 + vec3(0.002), smoothstep(-0.05, 0.45, h)) + uC2*0.05*exp(-abs(h)*12.0);
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(0.35*sin(a), 1.25 + 0.06*sin(a*2.0), -3.2); ta = vec3(0.0, -0.1, 1.8); fov = 0.95;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
