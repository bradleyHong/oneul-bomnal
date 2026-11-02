/* 삶의 선 7 · 결혼 · 하나의 매듭 · Vow
 *
 * 금실과 은실 두 가닥이 서로를 세 번 감아 하나의 반지가 된다. 감김은 숨 쉬듯 조였다 풀리고,
 * 두 실이 엇갈리는 자리마다 작은 빛이 맺힌다. 둘레를 가는 빛의 선(서약)이 감싸 돈다. 검은 거울 바닥에 비친다.
 * 반지: 원환의 단면 안에서 두 실의 중심이 둘레 각의 3배로 돈다(정수 → 닫힌 매듭). 광선 행진 + 선 그리기를 같이 쓴다.
 */
SGL.add({
  id: "life-marriage", title: "결혼 · 하나의 매듭", en: "Vow", mood: ["calm", "geo"],
  desc: "금실과 은실 두 가닥이 서로를 감아 하나의 반지가 됩니다. 감김이 숨 쉬듯 조였다 풀리고, 엇갈리는 자리마다 빛이 맺힙니다.",
  palettes: [
    { name: "금과 백금", colors: ["#ffc86a", "#e8eef8", "#fff4d8", "#ffd8a0"] },
    { name: "로즈골드", colors: ["#ffa088", "#f4e8e0", "#ffe8e0", "#ffc0a8"] },
    { name: "진주", colors: ["#f0e8d8", "#c8d8f0", "#ffffff", "#e8d8ff"] },
    { name: "흑진주", colors: ["#d8c8a8", "#6a7088", "#e8f0ff", "#a08ac8"] },
  ],
  post: { exposure: 1.0, bloom: 0.08, sat: 1.08, contrast: 1.10, vignette: 0.40, grain: 0.012 },
  src: `
#define LKD vec3(-0.45, 0.85, 0.35)
#define KEYC vec3(2.4, 2.3, 2.2)
#define STEPS 200
#define MAXD 16.0
mat3 RING(){
  float ph = TAU*uT/T;
  float a = ph, b = 1.05 + 0.18*sin(ph*2.0);
  float c = cos(a), s = sin(a), cb = cos(b), sb = sin(b);
  return mat3(1.0, 0.0, 0.0, 0.0, cb, sb, 0.0, -sb, cb)*mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}
float strand(vec3 q, float i){
  float ph = TAU*uT/T;
  float th = atan(q.z, q.x);
  vec2 cs = vec2(length(q.xz) - 1.0, q.y);
  float rb = 0.105 + 0.055*sin(ph*2.0);
  float a = 3.0*th + i*3.14159 + ph;
  return (length(cs - rb*vec2(cos(a), sin(a))) - 0.072)*0.55;
}
float map(vec3 p){
  float fl = p.y + 1.15;
  vec3 q = RING()*(p - vec3(0.0, 0.05, 0.0));
  if(length(q) > 1.45) return min(fl, length(q) - 1.35);
  return min(fl, min(strand(q, 0.0), strand(q, 1.0)));
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float ph = TAU*t/T;
  ro = vec3(0.6*sin(ph), 0.65 + 0.15*sin(ph*2.0), 3.6);
  ta = vec3(0.0, -0.05, 0.0); fov = 0.78;
}
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  vec3 q = RING()*(p - vec3(0.0, 0.05, 0.0));
  float d0 = strand(q, 0.0), d1 = strand(q, 1.0);
  if(p.y < -1.1 && min(d0, d1) > 0.01){ alb = vec3(0.015); rough = 0.06; metal = 0.9; return; }
  float ph = TAU*uT/T;
  // 엇갈리는 자리: 두 실이 가장 가까운 곳 (둘레각 3θ+φ 가 ±π/2 근처)
  float th = atan(q.z, q.x);
  float cross_ = pow(abs(sin(3.0*th + ph)), 40.0);
  float bru = vn3(q*vec3(60.0, 60.0, 60.0));                            // 결이 있는 금속 (가는 솔질 자국)
  if(d0 < d1){ alb = uC0*(0.9 + 0.1*bru); rough = 0.16 + 0.06*bru; metal = 1.0; }
  else { alb = uC1*(0.9 + 0.1*bru); rough = 0.07 + 0.04*bru; metal = 1.0; }
  emit = uC2*cross_*1.2*(0.6 + 0.4*sin(ph*6.0 + th*3.0));
}
vec3 env(vec3 rd){
  vec3 c = mix(vec3(0.004), uC3*0.03, smoothstep(-0.2, 0.8, rd.y));
  float az = atan(rd.x, rd.z);
  c += vec3(3.4)*smoothstep(0.82, 0.88, rd.y);
  c += vec3(4.5)*smoothstep(0.09, 0.05, abs(az - 1.5))*smoothstep(0.3, 0.42, rd.y)*smoothstep(0.85, 0.6, rd.y);
  c += uC3*4.0*smoothstep(0.07, 0.04, abs(az + 1.3))*smoothstep(0.3, 0.42, rd.y)*smoothstep(0.85, 0.6, rd.y);
  return c;
}
#define HAS_BG
vec3 bg(vec3 rd){ return mix(vec3(0.003), uC3*0.012, smoothstep(-0.1, 0.6, rd.y)) + uC2*0.02*exp(-abs(rd.y - 0.02)*8.0); }
#define FOG 0.03
`,
  N: 46, K: 260,
  body: `
// 서약의 선: 반지를 감싸 도는 가는 빛의 고리
vec3 LP(float id, float u, out vec3 col, out float w){
  float ph = TAU*uT/T;
  vec3 h = h3(id*1.37 + 0.5);
  float R = 1.45 + 0.9*h.x;
  float a = u*TAU;
  vec3 p = vec3(cos(a)*R, 0.0, sin(a)*R);
  vec3 ax = normalize(vec3(h.y - 0.5, 1.0, h.z - 0.5));
  p = rotA(p, normalize(cross(ax, vec3(0.0, 1.0, 0.0)) + vec3(1e-3)), 0.25 + 0.5*h.y);
  p = rotA(p, vec3(0.0, 1.0, 0.0), ph*(1.0 + floor(h.z*2.0))*(mod(id, 2.0) < 0.5 ? 1.0 : -1.0));
  p.y += 0.05;
  float run = fract(u - uT/T*(2.0 + floor(h.x*3.0)) + h.z);
  col = mix(uC0, uC2, h.y)*(0.008 + 0.6*exp(-run*30.0));
  w = 0.0035;
  return p;
}`,
  init(G, ctx) { return SGL.lineInit(this, G, ctx); },
  draw(G, st, t, ctx) {
    SGL.drawRay(G, this.src, t, ctx);
    const ph = 2 * Math.PI * t / SGL.T;
    const eye = [0.6 * Math.sin(ph), 0.65 + 0.15 * Math.sin(ph * 2), 3.6];
    const VP = SGL.cam(ctx, eye, [0, -0.05, 0], 0.78);
    G.custom((gl, c) => st.L.draw(gl, { t, VP, fov: 0.78, N: st.N, K: st.K, ctx, c, focus: 3.6, aperture: 0.010 }));
  },
});
