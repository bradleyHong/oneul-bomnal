/* 삶의 선 8 · 자녀 · 이어지는 선 · Lineage
 *
 * 한 줄기 빛이 둘로, 넷으로 갈라지며 자라 나무가 된다. 세대마다 가지는 가늘어지고 끝은 더 밝다.
 * 한 나무가 다 자라 빛을 내려놓을 즈음 옆에서 다음 나무가 자라기 시작한다. 이어지고, 또 이어진다.
 * 가지는 이진 나무(7세대, 127가지): 뿌리에서 자기 번호의 비트를 따라 내려오며 시작점과 방향을 정한다.
 * 두 나무가 반 주기씩 엇갈려 자라므로 30초 완전 루프.
 */
SGL.add({
  id: "life-lineage", title: "자녀 · 이어지는 선", en: "Lineage", mood: ["calm", "nature"],
  desc: "한 줄기 빛이 둘로, 넷으로 갈라지며 나무가 됩니다. 한 나무가 다 자랄 즈음 옆에서 다음 나무가 자라기 시작합니다. 이어지고, 또 이어집니다.",
  palettes: [
    { name: "온기", colors: ["#ffd8a0", "#ff9a6a", "#fff4e0", "#1a1008"] },
    { name: "새싹", colors: ["#d4ff8a", "#5ae0a0", "#f4ffe8", "#08140c"] },
    { name: "별빛 가계", colors: ["#c8d8ff", "#8a9aff", "#ffffff", "#060814"] },
    { name: "벚빛", colors: ["#ffd0e0", "#ff8ab0", "#fff4f8", "#1a0810"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.08, contrast: 1.08, vignette: 0.40, grain: 0.012 },
  N: 254, K: 28,
  body: `
vec3 LP(float id, float u, out vec3 col, out float w){
  float tree = id < 127.0 ? 0.0 : 1.0;
  float n = id - tree*127.0 + 1.0;                     // 힙 번호 1..127
  float ph = TAU*uT/T;
  float g = fract(uT/T + tree*0.5);                   // 이 나무의 나이 0..1
  float gen = g*9.0 - 0.6;
  float depth = floor(log2(n) + 1e-4);
  vec3 S = vec3(tree < 0.5 ? -1.15 : 1.15, -1.9, tree < 0.5 ? 0.2 : -0.2);
  vec3 dir = vec3(0.0, 1.0, 0.0);
  float len = 0.95;
  float node = 1.0;
  for(int k=0;k<7;k++){
    if(float(k) >= depth) break;
    S += dir*len;
    float bit = mod(floor(n/exp2(depth - float(k) - 1.0)), 2.0);
    node = node*2.0 + bit;
    vec3 hh = h3(node*1.37 + tree*91.0);
    float spread = 0.50 + 0.25*hh.x;
    vec3 side = normalize(vec3(cos(hh.y*TAU), 0.0, sin(hh.y*TAU)));
    vec3 ax = normalize(cross(dir, side) + 1e-4);
    dir = normalize(rotA(dir, ax, (bit*2.0 - 1.0)*spread) + vec3(0.0, 0.30, 0.0));
    len *= 0.78;
  }
  vec3 hh = h3(n*1.37 + tree*91.0 + 0.3);
  vec3 bend = (hh - 0.5)*0.35*len;
  vec3 p = S + dir*len*u + bend*sin(3.14159*u);
  // 바람: 자리만으로 정해지는 흔들림이라 가지 이음매가 떨어지지 않는다
  float hy = max(p.y + 1.9, 0.0);
  p += 0.035*hy*hy*vec3(sin(ph*2.0 + tree*3.0 + p.z), 0.0, cos(ph*3.0 + tree + p.x*0.5));
  float vis = clamp(gen - depth, 0.0, 1.0);
  float on = 1.0 - smoothstep(vis - 0.02, vis + 0.02, u);
  float tip = exp(-max(vis - u, 0.0)*14.0)*on*step(vis, 0.995);
  float leaf = depth > 5.5 ? smoothstep(0.85, 1.0, u)*smoothstep(0.9, 1.0, vis) : 0.0;
  float life = smoothstep(0.0, 0.06, g)*(1.0 - smoothstep(0.82, 1.0, g));
  float shimmer = 0.75 + 0.25*sin(ph*4.0 + n*0.7 - u*6.0);
  col = (mix(uC0, uC1, depth/7.0)*(0.55*shimmer) + uC2*2.6*tip + uC2*1.5*leaf)*on*life;
  w = 0.042*pow(0.70, depth) + 0.003;
  return p;
}`,
  bg: `
void main(){
  vec3 rd = RD();
  vec3 col = uC3*0.30 + uC0*0.012*smoothstep(-0.2, 0.7, rd.y);
  if(rd.y < 0.0){
    float d = (-1.9 - uEye.y)/rd.y;
    vec3 p = uEye + rd*d;
    float ph = TAU*uT/T;
    float g0 = fract(uT/T), g1 = fract(uT/T + 0.5);
    float l0 = smoothstep(0.0, 0.06, g0)*(1.0 - smoothstep(0.82, 1.0, g0));
    float l1 = smoothstep(0.0, 0.06, g1)*(1.0 - smoothstep(0.82, 1.0, g1));
    float r0 = length(p.xz - vec2(-1.15, 0.2)), r1 = length(p.xz - vec2(1.15, -0.2));
    col += uC0*0.10*(l0*exp(-r0*1.6) + l1*exp(-r1*1.6))*exp(-d*0.05);
  }
  o = vec4(col*uGain, 1.0);
}`,
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T, a = 0.45 * Math.sin(ph);
    const eye = [Math.sin(a) * 5.2, 0.6 + 0.3 * Math.sin(ph * 2), Math.cos(a) * 5.2];
    return { eye, ta: [0, 0.75, 0], fov: 0.86, focus: 5.2, ap: 0.010 };
  },
  init(G, ctx) { return SGL.lineInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.lineDraw(this, G, st, t, ctx); },
});
