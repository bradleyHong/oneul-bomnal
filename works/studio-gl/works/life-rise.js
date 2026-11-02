/* 삶의 선 9 · 다시, 일어서다 · Rise Again
 *
 * 힘차게 솟던 빛의 기둥이 꺾여 무너지고, 차갑게 식어 바닥에 눕는다. 한동안 꺼진 듯 숨만 쉬다가,
 * 바닥의 불씨 하나하나가 다시 붙어 아래에서 위로 타오르며 더 높이 일어선다. 일이 잘 안 풀릴 때의 슬픔과
 * "다시 할 수 있다"는 다짐.
 * 30초 시간표: 솟음(0~6초) → 무너짐(6~14) → 바닥(14~18) → 다시 일어섬(18~27) → 솟음으로 이어짐.
 * 선마다 세 모양(나선 기둥 · 늘어진 활 · 바닥 소용돌이)을 시간 무게로 섞는다.
 */
SGL.add({
  id: "life-rise", title: "다시, 일어서다", en: "Rise Again", mood: ["vivid"],
  desc: "힘차게 솟던 빛이 무너져 바닥에 식어 눕고, 불씨가 하나하나 다시 붙어 아래에서 위로 더 높이 일어섭니다. 다시 할 수 있다는 다짐.",
  palettes: [
    { name: "불씨", colors: ["#ffb03a", "#3a6aff", "#ff5a1a", "#0a0604"] },
    { name: "새벽", colors: ["#ffe08a", "#5a7ab8", "#ff8a6a", "#06080e"] },
    { name: "푸른 불꽃", colors: ["#7ae8ff", "#5a4ab8", "#3a8aff", "#04060e"] },
    { name: "백금", colors: ["#fff4e0", "#7a8090", "#ffc88a", "#08080a"] },
  ],
  post: { exposure: 1.0, bloom: 0.11, sat: 1.10, contrast: 1.12, vignette: 0.42, grain: 0.013 },
  N: (ctx) => (ctx.cap ? 420 : 300), K: 72,
  body: `
vec3 LP(float id, float u, out vec3 col, out float w){
  vec3 h = h3(id*1.37 + 0.5), g = h3(id*5.3 + 2.0);
  float ph = TAU*uT/T;
  float x = uT/T;
  float wR = 1.0 - smoothstep(0.18, 0.30, x) + smoothstep(0.62, 0.86, x);
  float wF = smoothstep(0.18, 0.30, x)*(1.0 - smoothstep(0.42, 0.52, x));
  float wG = smoothstep(0.42, 0.52, x)*(1.0 - smoothstep(0.62, 0.86, x));
  float ws = wR + wF + wG; wR /= ws; wF /= ws; wG /= ws;
  // 솟음: 나선으로 감아 오르는 기둥
  float a = g.x*TAU + u*(5.0 + 3.0*h.x) + ph*3.0;
  float rr = (0.18 + 0.50*h.y)*(1.0 - 0.55*u) + 0.05;
  vec3 pR = vec3(cos(a)*rr, -1.6 + u*(3.4 + 0.8*h.z), sin(a)*rr);
  // 무너짐: 꺾여 바깥으로 늘어진 활
  float oa = g.x*TAU + 0.6*u;
  float out_ = (0.35 + 1.7*h.y)*u;
  float yF = -1.6 + (1.2 + 0.8*h.z)*sin(3.14159*min(u*1.15, 1.0)) - 0.5*u*u;
  vec3 pF = vec3(cos(oa)*out_, yF, sin(oa)*out_);
  // 바닥: 식어서 누운 소용돌이
  float sa = g.x*TAU + u*2.4;
  float sr = 0.25 + 1.9*h.y*u;
  vec3 pG = vec3(cos(sa)*sr, -1.6 + 0.012*h.z, sin(sa)*sr);
  vec3 p = pR*wR + pF*wF + pG*wG;
  // 다시 붙는 불: 아래에서 위로 달리는 불길 앞머리
  float ign = smoothstep(0.60, 0.86, x);
  float front = mix(2.0, ign*1.25 - 0.1 + 0.08*h.x, smoothstep(0.52, 0.60, x));   // 바닥에서 꺼졌다가 다시 붙는다
  float lit = 1.0 - smoothstep(front - 0.06, front + 0.02, u);
  float tip = exp(-abs(u - front)*22.0)*smoothstep(0.58, 0.62, x)*(1.0 - ign*ign);
  float bright = wR*1.0 + wF*0.30 + wG*0.07;
  float ember = wG*(0.5 + 0.5*sin(ph*7.0 + id*2.1 + u*9.0))*step(0.9, fract(u*7.0 + h.x));
  vec3 warm = mix(uC0, uC2, u*0.6);
  vec3 cool = uC1;
  vec3 c = mix(cool, warm, clamp(wR + 0.2*wG, 0.0, 1.0));
  col = c*(bright*lit*(0.25 + 0.9*(1.0 - u)) ) + uC2*ember*0.6 + uC0*tip*3.5;
  col *= 0.30;
  w = mix(0.008, 0.0025, u)*(0.7 + 0.5*wR);
  return p;
}`,
  bg: `
void main(){
  vec3 rd = RD();
  float x = uT/T;
  float wR = clamp(1.0 - smoothstep(0.18, 0.30, x) + smoothstep(0.62, 0.86, x), 0.0, 1.0);
  vec3 col = uC3*0.4 + mix(uC1*0.010, uC0*0.03, wR)*smoothstep(-0.2, 0.6, rd.y);
  if(rd.y < 0.0){
    float d = (-1.6 - uEye.y)/rd.y;
    vec3 p = uEye + rd*d;
    float r = length(p.xz);
    col += mix(uC1*0.03, uC0*0.12, wR)*exp(-r*1.3)*exp(-d*0.05);
  }
  o = vec4(col*uGain, 1.0);
}`,
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T, a = 0.4 * Math.sin(ph) + 0.2;
    const eye = [Math.sin(a) * 6.6, 0.1 + 0.35 * Math.sin(ph * 2), Math.cos(a) * 6.6];
    return { eye, ta: [0, 0.45, 0], fov: 0.86, focus: 6.6, ap: 0.010 };
  },
  init(G, ctx) { return SGL.lineInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.lineDraw(this, G, st, t, ctx); },
});
