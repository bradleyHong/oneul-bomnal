/* 삶의 선 1 · 첫 숨 · First Breath
 *
 * 아이가 태어나던 순간의 기쁨. 작은 빛 한 점에서 가는 선 수천 가닥이 꽃잎처럼 말리며 피어난다.
 * 선은 숨을 쉬듯 여섯 번 뻗었다 오므라들고, 숨마다 빛이 안에서 바깥으로 달린다.
 * 30초에 두 번 첫 울음처럼 크게 터진다.
 * 선마다 방향은 구 위 피보나치 점, 휘는 축·각은 선마다 다르다. 숨·울음·회전 모두 30초의 정수배 주기.
 */
SGL.add({
  id: "life-birth", title: "첫 숨", en: "First Breath", mood: ["calm", "vivid"],
  desc: "아이가 태어나던 순간의 기쁨. 작은 빛 한 점에서 수천 가닥의 선이 숨 쉬듯 피어나고, 두 번 첫 울음처럼 터집니다.",
  palettes: [
    { name: "새벽빛", colors: ["#fff1d6", "#ffb38a", "#ff7aa8", "#2a1420"] },
    { name: "금빛 요람", colors: ["#fff4c8", "#ffc85a", "#ff8a3a", "#20140a"] },
    { name: "젖빛", colors: ["#f4f8ff", "#a8d0ff", "#ffc8e0", "#101420"] },
    { name: "연두 숨", colors: ["#f8ffe0", "#b8ff8a", "#5ae0c0", "#0c1a14"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.10, contrast: 1.08, vignette: 0.40, grain: 0.012 },
  N: (ctx) => (ctx.cap ? 1300 : 900), K: 56,
  body: `
vec3 fib(float i, float n){ float y = 1.0 - 2.0*(i + 0.5)/n; float r = sqrt(max(1.0 - y*y, 0.0)); float a = i*2.39996; return vec3(cos(a)*r, y, sin(a)*r); }
vec3 LP(float id, float u, out vec3 col, out float w){
  vec3 h = h3(id*1.37 + 0.5);
  float ph = TAU*uT/T;
  vec3 d = fib(id, uN);
  float br = 0.5 - 0.5*cos(ph*6.0); br = br*br*(3.0 - 2.0*br);           // 숨 여섯 번
  float cs = 0.5 + 0.5*sin(ph*2.0 - 2.2); cs = cs*cs; cs = cs*cs; cs = cs*cs; // 첫 울음 두 번
  float L = (1.4 + 0.8*br + 1.2*cs)*(0.55 + 0.7*h.x);
  float r = 0.06 + u*L;
  vec3 ax = normalize(cross(d, normalize(vec3(0.3, 1.0, 0.2) + (h - 0.5)*1.4)) + 1e-4);
  float ang = u*u*(1.3 + 2.2*h.y)*(0.85 + 0.25*sin(ph*2.0 + h.z*TAU)) + 0.35*u*br;
  vec3 p = rotA(d, ax, ang)*r;
  p += 0.04*u*vec3(sin(ph*3.0 + id), cos(ph*2.0 + id*0.7), sin(ph*4.0 + id*1.3));
  float wv = fract(uT/T*6.0 + 0.08*h.z)*1.3;                              // 숨마다 바깥으로 달리는 빛
  float dw = (u - wv)*7.0;
  float pulse = exp(-dw*dw);
  float fade = (1.0 - u)*sqrt(1.0 - u);
  vec3 tint = mix(uC1, uC2, h.z);
  col = mix(uC0*1.2, tint, smoothstep(0.0, 0.45, u))*fade*(0.06 + 1.2*pulse + 0.3*cs)*smoothstep(0.08, 0.40, u);
  w = mix(0.008, 0.0022, u);
  return p;
}`,
  bg: `
void main(){
  vec3 rd = RD();
  vec3 f = normalize(uTa - uEye);
  float c = max(dot(rd, f), 0.0);
  float ph = TAU*uT/T;
  float cs = 0.5 + 0.5*sin(ph*2.0 - 2.2); cs = cs*cs; cs = cs*cs;
  vec3 col = uC3*0.06 + uC3*0.06*smoothstep(-0.5, 0.6, rd.y);
  col += uC1*0.02*pow(c, 60.0) + uC0*(0.35 + 0.8*cs)*pow(c, 6000.0) + uC2*0.006*pow(c, 8.0);
  o = vec4(col*uGain, 1.0);
}`,
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T;
    const eye = [Math.sin(ph) * 5.2, 0.7 * Math.sin(ph * 2) + 0.4, Math.cos(ph) * 5.2];
    return { eye, ta: [0, 0, 0], fov: 0.78, focus: 5.2, ap: 0.004 };
  },
  init(G, ctx) { return SGL.lineInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.lineDraw(this, G, st, t, ctx); },
});
