/* 삶의 선 10 · 우연이 겹쳐 · Serendipity
 *
 * 저마다의 길을 가던 선 둘이 우연히 한 점에서 만난다. 만나는 순간 빛이 터지고, 그 뒤로 둘은 같은 색이 되어
 * 서로를 감으며 새 방향으로 함께 간다. 어둠 곳곳에서 그런 만남이 끊임없이 일어난다 — 들뜬 기회들,
 * 겹친 우연이 모여 인생이 된다.
 * 선은 둘씩 짝. 짝마다 만나는 자리 M 과 때(주기의 한가운데)를 정해 두고, 그 전엔 각자 휘어 다가오고 그 뒤엔 함께 간다.
 * 만남의 불꽃은 따로 짧은 빛살로 그린다. 짝마다 30초에 정수 번 만나 완전 루프.
 */
SGL.add({
  id: "life-chance", title: "우연이 겹쳐", en: "Serendipity", mood: ["vivid", "cosmos"],
  desc: "저마다의 길을 가던 두 선이 우연히 한 점에서 만나 빛이 터지고, 같은 색이 되어 함께 갑니다. 겹친 우연이 모여 인생이 됩니다.",
  palettes: [
    { name: "설렘", colors: ["#38d6ff", "#ff5ab0", "#ffd36b", "#ffffff"] },
    { name: "기회", colors: ["#3dffa8", "#7a5cff", "#ffe07a", "#fff8e0"] },
    { name: "밤거리", colors: ["#ff7a3a", "#3a8aff", "#ff3a8a", "#fff0f8"] },
    { name: "별자리", colors: ["#a8c8ff", "#e8d8ff", "#fff4c8", "#ffffff"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.12, contrast: 1.08, vignette: 0.40, grain: 0.012 },
  N: (ctx) => (ctx.cap ? 46 * 2 + 46 * 10 : 34 * 2 + 34 * 10), K: 80,
  body: `
float PAIRS(){ return uN < 500.0 ? 34.0 : 46.0; }
void meet(float pr, out vec3 M, out float cyc){
  vec3 h = h3(pr*1.37 + 0.5);
  float k = 1.0 + floor(h.x*2.0);
  cyc = fract(uT/T*k + h.y);
  M = (h3(pr*9.1 + 3.0) - 0.5)*vec3(8.0, 3.6, 4.0);
}
vec3 LP(float id, float u, out vec3 col, out float w){
  float NP = PAIRS();
  if(id < NP*2.0){
    float pr = floor(id/2.0), side = mod(id, 2.0);
    vec3 M; float cyc; meet(pr, M, cyc);
    vec3 g = h3(id*5.1 + 2.0);
    vec3 dOwn = normalize(g - 0.5 + 1e-3);
    vec3 dSh = normalize(h3(pr*2.3 + 7.0) - 0.5 + 1e-3);
    vec3 bend = normalize(cross(dOwn, vec3(0.02, 1.0, 0.01)));
    float tau = cyc - u*0.42;
    float sp = 2.6;
    vec3 p;
    if(tau < 0.5){
      float s = (0.5 - tau)*sp;
      p = M + dOwn*s + bend*0.30*s*s*(side*2.0 - 1.0);
    } else {
      float s = (tau - 0.5)*sp;
      vec3 bn = normalize(cross(dSh, vec3(0.01, 1.0, 0.02)));
      float a = s*9.0 + side*3.14159;
      p = M + dSh*s + (bn*cos(a) + cross(dSh, bn)*sin(a))*0.07*min(s*5.0, 1.0);
    }
    float after = smoothstep(0.495, 0.505, tau);
    vec3 own = side < 0.5 ? uC0 : uC1;
    float dm = (cyc - 0.5)*30.0;
    float flash = exp(-dm*dm)*exp(-u*8.0);
    float env = smoothstep(0.0, 0.12, cyc)*smoothstep(1.0, 0.85, cyc);
    col = (mix(own*0.7, uC2*1.2, after)*(1.0 - u)*(1.0 - u)*(0.5 + 1.6*exp(-u*10.0)) + uC3*flash*5.0)*env;
    w = 0.012*(1.0 - 0.6*u) + 0.008*flash;
    return p;
  }
  // 만남의 불꽃: 짝마다 빛살 열
  float sid = id - NP*2.0;
  float pr = mod(floor(sid/10.0), NP);
  vec3 M; float cyc; meet(pr, M, cyc);
  float age = cyc - 0.5;
  vec3 rdir = normalize(h3(sid*3.3 + 1.0) - 0.5 + 1e-3);
  float len = max(age, 0.0)*4.0;
  vec3 p = M + rdir*len*(0.35 + 0.65*u);
  col = uC3*2.4*exp(-max(age, 0.0)*16.0)*step(0.0, age)*(1.0 - u)*u*4.0;
  w = 0.004;
  return p;
}`,
  bg: `
void main(){
  vec3 rd = RD();
  vec3 col = uC0*0.004 + uC1*0.006*smoothstep(-0.5, 0.8, rd.y);
  // 먼 불빛 알갱이(옅게)
  vec2 g = vec2(atan(rd.x, rd.z)*60.0, rd.y*60.0);
  vec2 ce = floor(g); float hh = h21(ce);
  float tw = 0.5 + 0.5*sin(TAU*uT/T*floor(1.0 + hh*4.0) + hh*20.0);
  col += mix(uC0, uC1, fract(hh*7.0))*step(0.985, hh)*smoothstep(0.3, 0.0, length(fract(g) - 0.5))*0.08*tw;
  o = vec4(col*uGain, 1.0);
}`,
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T, a = 0.35 * Math.sin(ph);
    const eye = [Math.sin(a) * 6.5, 0.6 + 0.4 * Math.sin(ph * 2), Math.cos(a) * 6.5];
    return { eye, ta: [0, 0, 0], fov: 0.86, focus: 6.5, ap: 0.012 };
  },
  init(G, ctx) { return SGL.lineInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.lineDraw(this, G, st, t, ctx); },
});
