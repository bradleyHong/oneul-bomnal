/* 고리의 시간 · Kinetic Rings
 *
 * 크기가 다른 고리 일곱 개가 서로 다른 축으로 도는 키네틱 조각(자이로스코프·천구의). 가운데에는 빛나는 구슬.
 * 고리는 솔질한 금속·검은 유광·금으로 번갈아 칠했다. 회전수는 모두 30초에 정수 바퀴 → 완전 루프.
 */
SGL.add({
  id: "kinetic-rings", title: "고리의 시간", en: "Kinetic Rings", mood: ["geo", "calm"],
  desc: "크기가 다른 금속 고리 일곱 개가 서로 다른 축으로 천천히 돌며 시계 속처럼 겹쳤다 풀립니다. 가운데 빛이 고리에 비칩니다.",
  palettes: [
    { name: "샴페인 골드", colors: ["#ffcf8a", "#ff8a4a", "#fff1d6", "#c08040"] },
    { name: "문라이트", colors: ["#bcd4ff", "#6a8cff", "#f0f4ff", "#8090c0"] },
    { name: "로즈", colors: ["#ff9aa8", "#ff5a7a", "#ffe4e8", "#c06070"] },
    { name: "라임", colors: ["#d4ff3a", "#38d6ff", "#f4ffe0", "#80c040"] },
  ],
  post: { exposure: 1.0, bloom: 0.07, sat: 1.10, contrast: 1.10, vignette: 0.32, grain: 0.010 },
  src: `
#define LKD vec3(-0.45, 0.80, -0.40)
vec3 env(vec3 rd){
  float az = atan(rd.x, rd.z);
  vec3 c = mix(vec3(0.008, 0.008, 0.011), vec3(0.05, 0.05, 0.06), smoothstep(-0.5, 0.9, rd.y));
  c += vec3(4.5)*smoothstep(0.60, 0.68, rd.y)*smoothstep(1.4, 0.6, abs(az));
  c += uC0*2.4*smoothstep(0.5, 0.2, abs(az - 1.7))*smoothstep(0.9, 0.2, abs(rd.y));
  c += uC2*1.6*smoothstep(0.4, 0.15, abs(az + 1.5))*smoothstep(0.9, 0.3, abs(rd.y - 0.2));
  return c;
}
#define HAS_BG
vec3 bg(vec3 rd){ return mix(vec3(0.008, 0.008, 0.012), uC3*0.04 + vec3(0.015), smoothstep(-0.7, 0.7, rd.y)) + uC0*0.05*exp(-dot(rd.xy, rd.xy)*6.0); }
mat3 R(int i, float t){
  float fi = float(i), ph = TAU*t/T;
  float a = ph*float(1 + i%3)*(i%2 == 0 ? 1.0 : -1.0) + fi*0.7;
  float b = ph*float(1 + (i + 1)%2) + fi*1.3;
  mat3 X = mat3(1,0,0, 0,cos(a),sin(a), 0,-sin(a),cos(a));
  mat3 Y = mat3(cos(b),0,-sin(b), 0,1,0, sin(b),0,cos(b));
  return Y*X;
}
float ringD(vec3 p, int i){
  float r = 0.42 + float(i)*0.17;
  vec3 q = transpose(R(i, uT))*p;
  // 납작한 띠 단면: 너비 0.07, 두께 0.022
  vec2 d = vec2(length(q.xz) - r, q.y);
  return length(max(abs(d) - vec2(0.022, 0.06), 0.0)) - 0.006;
}
float map(vec3 p){
  float d = length(p) - 0.22;
  for(int i=0;i<7;i++) d = min(d, ringD(p, i));
  return d;
}
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  if(length(p) < 0.24){ alb = vec3(0.0); rough = 0.2; metal = 0.0; emit = mix(uC0, vec3(1.0), 0.5)*(4.0 + 1.5*sin(TAU*uT/T*4.0)); return; }
  int k = 0; float best = 1e9;
  for(int i=0;i<7;i++){ float d = ringD(p, i); if(d < best){ best = d; k = i; } }
  int m = k%3;
  if(m == 0){ alb = uC0*0.9 + 0.1; rough = 0.18; metal = 1.0; }            // 금
  else if(m == 1){ alb = vec3(0.92); rough = 0.28; metal = 1.0; }          // 솔질한 은
  else { alb = vec3(0.02); rough = 0.08; metal = 0.0; }                     // 검은 유광
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T + 0.6;
  ro = vec3(sin(a)*3.4, 0.9 + 0.3*sin(a*2.0), cos(a)*3.4); ta = vec3(0.0); fov = 0.72;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
