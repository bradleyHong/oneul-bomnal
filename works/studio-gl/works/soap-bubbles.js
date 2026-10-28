/* 비누 거품 · Soap Bubbles
 *
 * 어두운 스튜디오에 떠 있는 비누 거품들. 거품 막은 수백 나노미터 두께라 빛이 막 앞뒤에서 반사되며
 * 파장마다 세기가 달라진다(박막 간섭) — 그래서 두께가 흐르는 대로 무지갯빛 무늬가 소용돌이친다.
 * 위쪽은 막이 얇아져 금빛·검은빛이 되고, 조명 반사가 그 색을 입는다. 거품은 광선-구 교차로 직접 그린다.
 */
SGL.add({
  id: "soap-bubbles", title: "비누 거품", en: "Soap Bubbles", mood: ["calm", "vivid"],
  desc: "어두운 공간에 떠 있는 비누 거품들. 얇은 막 위로 무지갯빛 무늬가 천천히 소용돌이칩니다.",
  palettes: [
    { name: "스튜디오", colors: ["#fff4e8", "#ffd0a0", "#a0c8ff", "#0a0a10"] },
    { name: "분홍 조명", colors: ["#ffe8f4", "#ff7ad0", "#7a5cff", "#120814"] },
    { name: "청록 조명", colors: ["#e8fffa", "#38d6ff", "#3dffa8", "#06100e"] },
    { name: "노을빛", colors: ["#fff0d8", "#ff8a3a", "#ff4f7a", "#140a08"] },
  ],
  post: { exposure: 1.0, bloom: 0.09, sat: 1.12, contrast: 1.08, vignette: 0.30, grain: 0.012 },
  src: `
#define STEPS 1
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(0.35*sin(a), 0.18*sin(a*2.0), 6.0); ta = vec3(0.0); fov = 0.78;
}
float box(vec3 rd, vec3 c, vec2 hs){
  vec3 d = normalize(c); vec3 u = normalize(cross(d, vec3(0.0, 1.0, 0.0))); vec3 v = cross(u, d);
  float k = dot(rd, d); if(k <= 0.0) return 0.0;
  vec2 q = vec2(dot(rd, u), dot(rd, v))/k;
  return smoothstep(hs.x, hs.x*0.85, abs(q.x))*smoothstep(hs.y, hs.y*0.85, abs(q.y));
}
vec3 env(vec3 rd){
  vec3 c = uC3*0.6 + vec3(0.004)*(0.5 + 0.5*rd.y);
  c += uC0*3.0*box(rd, vec3(-0.6, 0.55, 0.8), vec2(0.45, 0.35));     // 뒤 왼쪽 큰 소프트박스
  c += uC1*2.2*box(rd, vec3(0.9, 0.1, 0.5), vec2(0.06, 0.7));        // 오른쪽 긴 띠 조명
  c += uC2*1.6*box(rd, vec3(0.2, 0.3, -1.0), vec2(0.5, 0.25));       // 거품 뒤 테두리 조명
  c += uC1*0.25*smoothstep(-0.1, -0.6, rd.y);                        // 바닥 반사
  return c;
}
vec4 bub(int i){
  float fi = float(i);
  vec3 h = h33(vec3(fi*7.13, 3.3, 1.7)), g = h33(vec3(fi*2.71, 9.1, 4.2));
  float r = 0.32 + 0.55*h.x;
  vec3 b = vec3((h.y - 0.5)*5.2, (h.z - 0.5)*2.6, -g.x*3.5 + 0.6);
  float a = TAU*uT/T;
  b += vec3(0.22*sin(a + fi*1.3), 0.28*sin(a*2.0 + fi*2.1) + 0.12*cos(a + fi), 0.18*cos(a + fi*0.7));
  return vec4(b, r);
}
vec3 film(vec3 n, vec3 rd, float fi){
  float a = TAU*uT/T;
  vec3 q = n;
  q.xz = rot(a + fi)*q.xz;
  q.xy = rot(0.5*sin(a + fi*1.7))*q.xy;
  float th = 260.0 + 560.0*fbm3(q*1.7 + vec3(fi*3.1, 0.0, 0.0) + 0.35*vec3(cos(a), sin(a), 0.0));
  th *= mix(0.30, 1.15, smoothstep(0.95, -0.5, n.y));                // 위쪽이 얇다
  float ci = max(dot(n, -rd), 0.0);
  float ct = sqrt(1.0 - (1.0 - ci*ci)/1.7689);
  vec3 ph = 2.0*TAU*1.33*th*ct/vec3(650.0, 532.0, 450.0);
  return 0.5 - 0.5*cos(ph);
}
vec3 backdrop(vec3 rd){
  vec3 c = mix(uC3*1.6, uC3*0.4, smoothstep(-0.4, 0.5, rd.y)) + vec3(0.006);
  vec2 g = rd.xy*7.0; vec2 id = floor(g);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 cid = id + vec2(float(i), float(j)); vec3 h = h33(vec3(cid, 5.0));
    if(h.z < 0.75) continue;
    float d = length(g - cid - 0.5 - (h.xy - 0.5)*0.7);
    c += mix(uC1, uC2, h.x)*0.018*smoothstep(0.45, 0.30, d);
  }
  return c;
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 c = backdrop(rd);
  for(int i=0;i<8;i++){
    vec4 B = bub(i);
    vec3 oc = ro - B.xyz;
    float b = dot(oc, rd), cc = dot(oc, oc) - B.w*B.w, D = b*b - cc;
    if(D <= 0.0) continue;
    float sq = sqrt(D), t1 = -b - sq, t2 = -b + sq;
    if(t1 <= 0.0) continue;
    vec3 n1 = normalize(ro + rd*t1 - B.xyz), n2 = -normalize(ro + rd*t2 - B.xyz);
    float f1 = 0.08 + 0.92*pow(1.0 - max(dot(n1, -rd), 0.0), 3.0);
    float f2 = 0.08 + 0.92*pow(1.0 - max(dot(n2, -rd), 0.0), 3.0);
    c *= 0.96;
    c += env(reflect(rd, n1))*film(n1, rd, float(i))*f1*2.2;
    c += env(reflect(rd, n2))*film(-n2, rd, float(i) + 0.5)*f2*0.9;
  }
  return c;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
