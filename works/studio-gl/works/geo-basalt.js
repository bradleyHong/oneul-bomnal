/* 주상절리 · Basalt Columns
 *
 * 육각 현무암 기둥들이 큰 계단을 이루며 안개 낀 바다로 내려간다. 해가 막 진 푸른 시간.
 * 기둥은 육각 격자 칸마다 높이가 다른 육각기둥(모서리 둥글림)으로, 광선이 칸 경계를 넘지 않게 보폭을 묶어 이웃 기둥을 놓치지 않는다.
 * 바다는 따로 평면과 만나게 하고 물결(주기 맞춘 사인 합) · 하늘 반사 · 해 반짝임 · 기둥 둘레 물거품을 얹는다.
 * 낮게 깔린 바다 안개는 광선을 따라 쌓고(해 쪽 앞산란), 젖은 기둥 윗면은 하늘과 해를 비춘다.
 * 지형과 안개는 해안 방향(x)으로 P 마다 되풀이되고, 카메라가 30초에 정확히 P 만큼 미끄러져 루프가 된다.
 */
SGL.add({
  id: "geo-basalt", title: "주상절리", en: "Basalt Columns", mood: ["nature", "geo", "calm"],
  desc: "육각 돌기둥이 큰 계단처럼 안개 낀 바다로 내려갑니다. 해 질 녘 푸른 빛 속에서 젖은 기둥 위를 낮게 미끄러져 갑니다.",
  palettes: [
    { name: "블루 아워", colors: ["#ffb48a", "#24407e", "#9ab4e0", "#2c2e36"] },
    { name: "금빛 황혼", colors: ["#ffa040", "#5a3a78", "#f2b08a", "#2e2622"] },
    { name: "달밤", colors: ["#dce6ff", "#0c1838", "#6a88c0", "#1c2028"] },
    { name: "새벽 분홍", colors: ["#ffc2c8", "#2a6a80", "#bfe4e0", "#283234"] },
  ],
  post: { exposure: 1.0, bloom: 0.09, sat: 1.10, contrast: 1.08, vignette: 0.32, grain: 0.012 },
  src: `
#define STEPS 1
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
vec3 env(vec3 rd){ return vec3(0.0); }
#define KC 0.9
#define NX 16.0
#define P (NX*KC)
vec3 SUN(){ return normalize(vec3(0.80, 0.035, 1.0)); }
float shoreA(float x){ return 1.6*sin(TAU*x/P) + 0.8*sin(2.0*TAU*x/P + 1.3); }
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  float x = P*t/T;
  // 해안선을 따라 미끄러진다 (해안선 굽이를 그대로 따라 돈다)
  float z = shoreA(x) + 0.5;
  float dz = (shoreA(x + 0.5) - shoreA(x - 0.5));
  ro = vec3(x, 4.05 + 0.15*sin(a*2.0 + 0.6), z);
  vec3 f = normalize(vec3(1.0, 0.0, dz*0.6));
  ta = ro + f + vec3(0.0, -0.36 + 0.04*sin(a + 1.0), 0.62); fov = 1.0;
}
// 육각 칸: xy 칸 안 좌표 · zw 칸 번호 (가로 간격 1)
vec4 hexCell(vec2 p){
  const vec2 s = vec2(1.0, 1.7320508);
  vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0))/s.xyxy) + 0.5;
  vec4 h = vec4(p - hC.xy*s, p - (hC.zw + 0.5)*s);
  return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hC.xy) : vec4(h.zw, hC.zw + 0.5);
}
float hexD(vec2 h){ h = abs(h); return max(dot(h, vec2(0.5, 0.8660254)), h.x); }
// x 방향 P 주기 잡음 (원통 위에서)
float pn(float x, float z, float f){ float an = TAU*x/P; float R = P*f/TAU; return vn3(vec3(cos(an)*R, sin(an)*R, z*f)); }
// 칸의 높이: 바다 쪽(z+)으로 큰 계단, 해안선은 x 를 따라 굽이친다
float colH(vec2 id, out float rnd1){
  float cx = (id.x)*KC, cz = id.y*1.7320508*KC;
  vec3 h = h33(vec3(mod(id.x, NX), id.y, 3.0));
  rnd1 = h.x;
  float shore = shoreA(cx) + 1.0*(pn(cx, cz, 0.35) - 0.5);
  float zz = cz - shore;
  float st = max(floor(zz/3.0), -2.0);
  float H = st < 1.5 ? 1.9 - 1.1*st*(1.0 + 0.3*max(-st - 1.0, 0.0)) : -1.6 - 0.4*st;
  H += 0.35*(h.y - 0.5) + 0.25*(pn(cx, cz, 0.6) - 0.5);
  if(h.z < 0.10) H -= 0.6 + 0.8*h.x;
  return H;
}
float CELLR, CELLH, DTRUE; vec2 CELLID; vec2 CELLL;
float columns(vec3 p){
  vec4 hc = hexCell(p.xz/KC);
  float rr; float H = colH(hc.zw, rr);
  float d2 = (hexD(hc.xy) - 0.47)*KC;
  float rb = 0.05;
  vec2 w = vec2(d2 + rb, p.y - H + rb);
  float d = min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - rb;
  // 칸 경계를 넘지 않게 (맞음 판정은 묶기 전 거리로)
  DTRUE = d;
  float bnd = (0.5 - hexD(hc.xy))*KC + 0.03;
  d = min(d, bnd);
  CELLR = rr; CELLH = H; CELLID = hc.zw; CELLL = hc.xy;
  return d;
}
float mapD(vec3 p){ return max(columns(p), p.y - 7.8); }
vec3 nrm(vec3 p){ vec2 e = vec2(0.002, 0.0); return normalize(vec3(columns(p + e.xyy) - columns(p - e.xyy), columns(p + e.yxy) - columns(p - e.yxy), columns(p + e.yyx) - columns(p - e.yyx))); }
float shadowS(vec3 p, vec3 L){
  float res = 1.0, t = 0.03;
  for(int i=0;i<64;i++){ vec3 q = p + L*t; if(q.y > 7.7) break; float h = columns(q); res = min(res, 12.0*DTRUE/t); t += clamp(h, 0.04, 0.6); if(res < 0.01 || t > 18.0) break; }
  return clamp(res, 0.0, 1.0);
}
vec3 sky(vec3 rd){
  vec3 s = SUN(); float mu = max(dot(rd, s), 0.0);
  float h = max(rd.y, 0.0);
  vec3 c = mix(uC2*0.24 + uC0*0.08, uC1*0.30, pow(smoothstep(0.0, 0.40, h), 0.5));
  c += uC0*(0.35*pow(mu, 14.0) + 0.9*pow(mu, 90.0))*exp(-h*5.0);
  c += uC0*6.0*smoothstep(0.99984, 0.99993, mu)*smoothstep(-0.005, 0.01, rd.y - 0.02);
  return c;
}
// 물결: x 방향 P 주기 · 시간 T 주기
float waveH(vec2 x, float t, out vec2 g){
  float h = 0.0; g = vec2(0.0);
  for(int i=0;i<7;i++){
    float fi = float(i);
    float m = float(3 + 4*i) * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0);
    float kx = TAU*m/P;
    float kz = 1.6 + 0.9*fi + 0.7*sin(fi*2.7);
    float w = TAU*float(2 + i)/T;
    float A = 0.022/(1.0 + 0.35*fi);
    float ph = kx*x.x + kz*x.y - w*t + fi*1.7;
    h += A*sin(ph); g += A*cos(ph)*vec2(kx, kz);
  }
  return h;
}
float mistD(vec3 p){
  float a = TAU*uT/T;
  float an = TAU*p.x/P - a; float R = P*0.35/TAU;
  float n = vn3(vec3(cos(an)*R, sin(an)*R, p.z*0.35 + p.y*0.6));
  float n2 = vn3(vec3(cos(an)*R*3.0, sin(an)*R*3.0, p.z*1.1 - p.y*0.8));
  return exp(-max(p.y, 0.0)/0.7)*(0.25 + 1.6*smoothstep(0.40, 0.80, n*0.7 + n2*0.3))*smoothstep(-4.0, 3.0, p.z);
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 L = SUN();
  // 바다 평면
  float tw = rd.y < -1e-4 ? -ro.y/rd.y : 1e9;
  // 기둥 찾기
  float t = 0.0, hit = -1.0;
  if(ro.y + rd.y*60.0 < 7.7 || rd.y < 0.0){
    t = rd.y < 0.0 ? max(0.0, (ro.y - 7.7)/(-rd.y)) : 0.0;
    for(int i=0;i<240;i++){
      vec3 p = ro + rd*t;
      float d = mapD(p);
      if(max(DTRUE, p.y - 7.8) < 0.001*(1.0 + t)){ hit = t; break; }
      t += d;
      if(t > tw || t > 90.0 || p.y > 7.9) break;
    }
  }
  vec3 col; float tend;
  if(hit > 0.0 && hit < tw){
    tend = hit;
    vec3 p = ro + rd*hit;
    columns(p);
    float rr = CELLR, H = CELLH; vec2 lc = CELLL;
    vec3 n = nrm(p);
    float top = smoothstep(0.6, 0.9, n.y);
    // 윗면의 거친 돌결 (젖은 웅덩이는 매끈)
    float pud = smoothstep(0.45, 0.65, vn3(vec3(lc*2.5, rr*20.0)));
    vec2 bq = lc*5.0 + rr*13.0;
    float b0 = vn3(vec3(bq, 1.0)), bx = vn3(vec3(bq + vec2(0.2, 0.0), 1.0)), bz = vn3(vec3(bq + vec2(0.0, 0.2), 1.0));
    n = normalize(n + top*(1.0 - pud)*vec3(b0 - bx, 0.0, b0 - bz)*0.30);
    float sh = shadowS(p + n*0.01, L);
    float nl = max(dot(n, L), 0.0);
    float ao = clamp(0.35 + 0.65*clamp((p.y + 0.5)/(H + 0.5), 0.0, 1.0), 0.0, 1.0);
    ao *= mix(1.0, smoothstep(-0.02, 0.15, (0.47 - hexD(lc))*KC + (H - p.y)*0.0), top);
    // 현무암: 옆면은 가로 금(마디) · 세로 결, 윗면은 젖어서 매끈
    float joint = smoothstep(0.90, 0.985, fract(p.y*0.9 + rr*7.0))*(1.0 - top);
    float grain = vn3(vec3(lc*5.0, p.y*7.0) + rr*30.0)*0.6 + vn3(vec3(lc*14.0, p.y*14.0) + rr*11.0)*0.4;
    float side = 1.0 - top;
    float chip = smoothstep(0.55, 0.8, vn3(vec3(lc*6.0, p.y*3.0) + rr*17.0));
    vec3 alb = uC3*(0.45 + 0.55*grain)*(1.0 - 0.6*joint)*(0.75 + 0.5*rr)*(1.0 - 0.35*chip*side);
    alb = mix(alb, uC3*0.45, top);
    float wet = top*(0.45 + 0.55*pud);
    float rough = mix(0.65, 0.08, wet);
    vec3 skyAmb = mix(uC1*0.45, uC2*0.40 + uC0*0.08, 0.5 + 0.5*n.y)*(0.5 + 0.5*max(n.y, 0.0));
    vec3 dif = alb*(uC0*3.0*nl*sh + skyAmb*ao + uC2*0.05*max(-n.z, 0.0));
    float cv = max(dot(n, -rd), 1e-3);
    float F = 0.04 + 0.96*pow(1.0 - cv, 5.0);
    vec3 spec = uC0*3.0*min(ggx(n, -rd, L, rough), 80.0)*F*sh;
    vec3 refl = sky(reflect(rd, n))*F*wet*(0.5 + 0.5*sh);
    col = dif*(1.0 - wet*0.4) + spec + refl;
  } else if(tw < 1e8){
    tend = tw;
    vec3 p = ro + rd*tw;
    vec2 g; float wh = waveH(p.xz, uT, g);
    // 잔물결 (x 주기 · 시간 주기 잡음의 기울기)
    float an = TAU*p.x/P; float Rr = P*2.2/TAU; float a2 = TAU*uT/T;
    vec3 rq = vec3(cos(an)*Rr, sin(an)*Rr, p.z*2.2) + vec3(cos(a2), sin(a2), 0.0)*0.8;
    float r0 = vn3(rq), r1 = vn3(rq + vec3(-sin(an), cos(an), 0.0)*0.15), r2 = vn3(rq + vec3(0.0, 0.0, 0.15));
    g += vec2(r1 - r0, r2 - r0)*0.9;
    g *= 1.0 - smoothstep(8.0, 30.0, tw);
    vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
    // 물 아래 기둥 깊이와 기둥 둘레 물거품
    vec4 hc = hexCell(p.xz/KC); float rr; float H = colH(hc.zw, rr);
    float edge = (hexD(hc.xy) - 0.47)*KC;
    float depth = -H;
    vec3 rf = reflect(rd, n); rf.y = abs(rf.y);
    float cv = max(dot(n, -rd), 1e-3);
    float F = 0.02 + 0.98*pow(1.0 - cv, 5.0);
    vec3 deep = uC1*0.04 + uC2*0.02;
    vec3 shallow = mix(uC2*0.12, uC3*0.15 + uC2*0.08, 0.5);
    vec3 body = mix(shallow, deep, smoothstep(0.0, 1.2, depth));
    // 기둥 사이 좁은 틈의 물은 그늘져 어둡다
    float gapOcc = H > -0.1 ? smoothstep(0.0, 0.25, edge) : 1.0;
    col = (body*(1.0 - F) + sky(rf)*F)*mix(0.15, 1.0, gapOcc);
    col += uC0*4.0*min(ggx(n, -rd, L, 0.06 + 0.10*smoothstep(8.0, 40.0, tw)), 120.0)*F;
    float a = TAU*uT/T;
    // 물 위로 솟은 기둥 둘레에만 얇은 물거품 (물결 따라 숨 쉰다)
    float near = H > 0.02 && edge > 0.0 ? exp(-edge*22.0) : 0.0;
    float foam = near*(0.5 + 0.5*sin(a*3.0 + rr*20.0 - edge*40.0))*smoothstep(0.3, 0.7, vn3(vec3(p.xz*5.0, rr*9.0)));
    col = mix(col, uC2*0.35 + uC0*0.10, clamp(foam, 0.0, 1.0)*0.7*(1.0 - smoothstep(8.0, 25.0, tw)));
  } else {
    tend = 80.0;
    col = sky(rd);
  }
  // 바다 안개 (해 쪽 앞산란)
  float mu = dot(rd, L);
  float ph = 0.25 + 1.6*pow(max(mu, 0.0), 8.0) + 0.4*pow(max(mu, 0.0), 2.0);
  float tl = min(tend, 45.0);
  float dt = tl/40.0; float tt = dt*rnd();
  vec3 sc = vec3(0.0); float tr = 1.0;
  for(int i=0;i<40;i++){
    vec3 q = ro + rd*tt;
    float d = mistD(q)*0.06;
    vec3 Lc = uC0*0.9*ph + uC2*0.30 + uC1*0.12;
    sc += tr*Lc*d*dt;
    tr *= exp(-d*dt);
    tt += dt;
  }
  // 아주 멀리는 수평선 안개빛
  vec3 hz = sky(normalize(vec3(rd.x, 0.02, rd.z)));
  float far = 1.0 - exp(-max(tend - 10.0, 0.0)*0.03);
  col = mix(col, hz*0.9, far*(tend < 79.0 ? 1.0 : 0.0));
  return col*tr + sc;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
