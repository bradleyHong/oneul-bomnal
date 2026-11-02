/* 삶의 선 2 · 희 · 기쁨 · Joy
 *
 * 기쁨은 가만히 있지 못한다. 빛의 선 수백 가닥이 고리를 따라 통통 튀며 달린다.
 * 땅에 닿을 때마다 반짝이고, 박자에 맞춰 더 높이 뛴다. 고리 다섯 겹이 서로 반대로 돈다.
 * 선 하나는 '튀는 공의 꼬리': 머리에서 u 만큼 지난 자리. 도는 바퀴·튀는 횟수 모두 정수라 30초 완전 루프.
 */
SGL.add({
  id: "life-joy", title: "희 · 기쁨", en: "Joy", mood: ["vivid"],
  desc: "기쁨은 가만히 있지 못합니다. 빛의 선 수백 가닥이 고리를 따라 통통 튀며 달리고, 땅에 닿을 때마다 반짝입니다.",
  palettes: [
    { name: "축제", colors: ["#ffd23a", "#ff5a8a", "#3ad8ff", "#9a5aff"] },
    { name: "햇살", colors: ["#fff0a0", "#ffb03a", "#ff7a5a", "#ffe0c0"] },
    { name: "사탕", colors: ["#ff8ad0", "#8ae0ff", "#d0ff8a", "#ffd08a"] },
    { name: "네온", colors: ["#3dffa8", "#ff3df0", "#3da8ff", "#ffe83d"] },
  ],
  post: { exposure: 1.0, bloom: 0.09, sat: 1.15, contrast: 1.08, vignette: 0.36, grain: 0.012 },
  N: (ctx) => (ctx.cap ? 320 : 240), K: 90,
  body: `
vec3 LP(float id, float u, out vec3 col, out float w){
  vec3 h = h3(id*1.37 + 0.5), g = h3(id*7.1 + 2.0);
  float ph = TAU*uT/T;
  float ring = floor(h.x*4.0);
  float R = 0.8 + ring*0.6 + 0.08*g.z;
  float M = 3.0 + floor(g.y*3.0);                       // 한 바퀴에 튀는 횟수
  float k = 1.0 + floor(h.y*3.0);                       // 30초에 도는 바퀴
  float tail = 0.10 + 0.14*g.z;
  float s = h.z + uT/T*k - u*tail;
  float dirn = mod(ring, 2.0) < 0.5 ? 1.0 : -1.0;
  float th = s*TAU*dirn;
  float f = fract(s*M);
  float beat = 0.5 + 0.5*cos(ph*8.0 - ring); beat = beat*beat*beat;
  float H = (0.55 + 0.6*g.x)*(1.0 + 0.5*beat);
  float y = 4.0*f*(1.0 - f)*H;
  float tilt = 0.18*(g.x - 0.5);
  vec3 p = vec3(cos(th)*R, y - 0.85 + tilt*sin(th)*R, sin(th)*R);
  float head = exp(-u*14.0);
  float land = exp(-min(f, 1.0 - f)*24.0);
  col = pal(ring*0.25 + g.y*0.2)*(1.0 - u)*(1.0 - u)*(0.35 + 2.4*head)*(1.0 + 2.5*land*exp(-u*20.0));
  w = 0.018*(1.0 - 0.75*u);
  return p;
}`,
  bg: `
void main(){
  vec3 rd = RD();
  vec3 col = uC3*0.010 + uC3*0.02*smoothstep(-0.2, 0.6, rd.y);
  // 바닥: 둥근 무대에 고인 빛
  if(rd.y < 0.0){
    float d = (-0.85 - uEye.y)/rd.y;
    vec3 p = uEye + rd*d;
    float r = length(p.xz);
    float ph = TAU*uT/T;
    float ring = 0.0;
    for(int i=0;i<4;i++){ float R = 0.8 + float(i)*0.6; ring += exp(-abs(r - R)*14.0)*(0.5 + 0.5*cos(ph*8.0 - float(i))); }
    col += (uC0*0.04 + pal(r*0.3)*0.05*ring)*exp(-r*0.4);
  }
  o = vec4(col*uGain, 1.0);
}`,
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T, a = 0.5 * Math.sin(ph) + 0.3;
    const eye = [Math.sin(a) * 5.0, 1.1 + 0.3 * Math.sin(ph * 2), Math.cos(a) * 5.0];
    return { eye, ta: [0, -0.15, 0], fov: 0.82, focus: 5.0, ap: 0.008 };
  },
  init(G, ctx) { return SGL.lineInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.lineDraw(this, G, st, t, ctx); },
});
