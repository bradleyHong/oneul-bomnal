/* 삶의 선 3 · 노 · 분노 · Rage
 *
 * 속에서 엉킨 붉은 실이 떨리다가, 차오르면 번개처럼 사방으로 터진다.
 * 15초마다 분노가 쌓이고(번개가 잦아지고 굵어지고 실이 거세게 떤다) 끝에서 한 번에 터진 뒤 고요해진다.
 * 번개는 0.25초 칸마다 새로 친다(120칸 → 30초 완전 루프). 갈지자 꺾임은 삼각파를 겹쳐 만든다.
 */
SGL.add({
  id: "life-rage", title: "노 · 분노", en: "Rage", mood: ["vivid"],
  desc: "속에서 엉킨 붉은 실이 떨리다가 차오르면 번개처럼 사방으로 터집니다. 쌓이고, 터지고, 고요해지는 분노의 결.",
  palettes: [
    { name: "불", colors: ["#ff3a1a", "#fff0d0", "#ff9a3a", "#1a0604"] },
    { name: "핏빛", colors: ["#ff1a3a", "#ffe0e8", "#ff6a8a", "#1a0408"] },
    { name: "번개", colors: ["#8a5aff", "#f0f0ff", "#3ad8ff", "#08061a"] },
    { name: "쇳물", colors: ["#ff7a1a", "#fff8e0", "#ffd03a", "#140a04"] },
  ],
  post: { exposure: 1.0, bloom: 0.11, sat: 1.12, contrast: 1.12, vignette: 0.42, grain: 0.014 },
  N: 520, K: 56,
  body: `
float tri(float x){ return abs(fract(x) - 0.5)*2.0 - 0.5; }
// 쌓이다(0~13.2초) 정점에서 터진 뒤 빠르게 가라앉는다 → 15초 끝에 0으로 이어져 이음매가 없다
float RAGE(){ float b = fract(uT/15.0); return b < 0.88 ? pow(b/0.88, 3.0) : exp(-(b - 0.88)*40.0); }
vec3 LP(float id, float u, out vec3 col, out float w){
  float ph = TAU*uT/T;
  float rage = RAGE();
  if(id >= 380.0){
    // 엉킨 실: 가운데를 감고 떤다
    float k = id - 380.0;
    vec3 hh = h3(k*5.3 + 9.0);
    float a = u*TAU*2.0 + hh.x*TAU + ph*(1.0 + floor(hh.y*3.0));
    vec3 p = vec3(cos(a)*(0.42 + 0.22*sin(u*TAU*3.0 + ph*2.0 + hh.z*6.0)),
                  sin(a*1.5 + hh.y*4.0)*0.32,
                  sin(a)*(0.42 + 0.18*cos(u*TAU*5.0 - ph*3.0)));
    p = rotA(p, normalize(hh - 0.5 + 1e-3), hh.z*3.0);
    float sh = 0.012 + 0.05*rage;
    p += sh*vec3(sin(ph*200.0 + k + u*20.0), sin(ph*170.0 + k*2.0 + u*17.0), sin(ph*230.0 + k*3.0 + u*23.0));
    col = mix(uC0, uC2, hh.z)*(0.10 + 0.9*rage)*(0.6 + 0.4*sin(u*TAU*4.0 + ph*20.0));
    w = 0.005 + 0.004*rage;
    return p;
  }
  float slot = floor(uT*4.0), st = fract(uT*4.0);
  float sl = mod(slot, 120.0);
  vec3 h = h3(id*1.37 + sl*17.31), g = h3(id*3.7 + 1.0), q = h3(id*2.1 + sl*5.7 + 3.0);
  float act = step(h.x, 0.08 + 0.7*rage);
  float strike = exp(-st*(6.0 - 3.0*rage))*act;
  vec3 A = normalize(h - 0.5 + 1e-3)*0.3;
  vec3 B = normalize(g*2.0 - 1.0 + (q - 0.5)*1.2 + 1e-3)*(1.5 + 1.4*h.y)*(0.8 + 0.5*rage);
  vec3 base = mix(A, B, u);
  vec3 dr = normalize(B - A);
  vec3 n1 = normalize(cross(dr, vec3(0.01, 1.0, 0.02))), n2 = cross(dr, n1);
  float amp = 0.20*sin(3.14159*u)*(0.6 + 0.9*rage);
  float j1 = tri(u*3.0 + h.z*5.0) + 0.5*tri(u*7.0 + h.y*3.0) + 0.25*tri(u*15.0 + q.x*7.0) + 0.12*tri(u*31.0 + q.y*3.0);
  float j2 = tri(u*4.0 + h.y*9.0) + 0.5*tri(u*9.0 + h.z*2.0) + 0.25*tri(u*19.0 + g.x*5.0) + 0.12*tri(u*37.0 + q.z*5.0);
  vec3 p = base + (n1*j1 + n2*j2)*amp;
  float reach = smoothstep(0.0, 0.18, st);
  float vis = 1.0 - smoothstep(reach - 0.02, reach + 0.02, u);
  col = mix(uC1*2.6, uC0*1.4, smoothstep(0.0, 0.7, u))*strike*vis*(1.0 + 1.5*rage);
  w = (0.007 + 0.008*rage)*(1.0 - 0.6*u);
  return p;
}`,
  bg: `
void main(){
  vec3 rd = RD();
  float ph = TAU*uT/T;
  float b = fract(uT/15.0), rage = b < 0.88 ? pow(b/0.88, 3.0) : exp(-(b - 0.88)*40.0);
  vec3 f = normalize(uTa - uEye);
  float c = max(dot(rd, f), 0.0);
  vec3 col = uC3*0.25 + uC0*0.03*(0.4 + rage)*pow(c, 4.0) + uC2*0.25*rage*rage*pow(c, 60.0);
  // 불티
  vec2 g = vec2(atan(rd.x, rd.z)*40.0, rd.y*40.0 + uT/T*80.0);
  vec2 ce = floor(g); float hh = h21(vec2(ce.x, mod(ce.y, 80.0)));       // 80칸 주기 → 루프
  col += uC2*step(0.985, hh)*smoothstep(0.35, 0.0, length(fract(g) - 0.5))*(0.3 + rage);
  o = vec4(col*uGain, 1.0);
}`,
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T, b = (t / 15) % 1, rage = b < 0.88 ? Math.pow(b / 0.88, 3) : Math.exp(-(b - 0.88) * 40);
    const sh = 0.03 * rage;
    const eye = [Math.sin(ph) * 4.0 + sh * Math.sin(ph * 90), 0.4 + 0.3 * Math.sin(ph * 2) + sh * Math.sin(ph * 110), Math.cos(ph) * 4.0];
    return { eye, ta: [0, 0, 0], fov: 0.85 - 0.08 * rage, focus: 4.0, ap: 0.006 };
  },
  init(G, ctx) { return SGL.lineInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.lineDraw(this, G, st, t, ctx); },
});
