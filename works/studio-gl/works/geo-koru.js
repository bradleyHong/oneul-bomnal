/* 고사리 새순 · Koru
 *
 * 고사리 새순(코루)은 로그 나선이다. 새순 줄기 끝이 r = R0·e^(bφ) 로 말려 들어가고, 그 위에 붙은 작은 잎도
 * 같은 나선으로 말려 있다(자기 닮음 두 단계). 거리장은 해석적으로 구한다: 점의 각도에서 나선이 지나는 반지름들
 * R0·e^(b(φ − 2πk)) 중 가까운 것까지의 거리에 1/√(1+b²) 를 곱하면 나선까지의 거리가 된다.
 * 나선은 b 를 키우면 풀리고 줄이면 감긴다. 길이를 그대로 두도록 R0 와 끝 반지름을 같이 바꾼다.
 * 새순마다 30초 동안 한 번 풀렸다 다시 감긴다(코사인, 위상만 다름). 숨 쉬듯.
 * 뒤에서 들어오는 햇빛이 안개 속 빛줄기가 되고, 새순 가장자리는 팔레트 빛으로 은은히 빛난다.
 * 렌즈 위 점에서 광선을 쏘아 얕은 피사계 심도를 내고, 떠다니는 포자는 3D 점으로 따로 그려 초점 밖에서 원판으로 번진다.
 * 그림자·반사 광선은 작은 잎을 빼고(재질이 CHEAP 를 정한다) 계산을 줄인다.
 * 큰 새순 7개 둘레로 작은 새순 무리를 1.1 칸마다 심었다(칸 경계까지 거리로 묶어 넘치지 않게). 안개 · 빛줄기는 팔레트 안개색으로 물든다.
 */
SGL.add({
  id: "geo-koru", title: "고사리 새순", en: "Koru", mood: ["nature", "geo", "calm"],
  desc: "안개 낀 숲에서 고사리 새순이 숨 쉬듯 천천히 풀렸다 다시 감깁니다. 큰 나선 위에 작은 나선 잎이 같은 모양으로 말려 있습니다.",
  palettes: [
    { name: "이끼 숲", colors: ["#ffe9c0", "#7dffb0", "#2f8a7a", "#5f9a3a"] },
    { name: "달빛 고사리", colors: ["#cfe0ff", "#5ae0ff", "#5a78c8", "#3a7a80"] },
    { name: "반딧불 숲", colors: ["#ffd890", "#d8ff4a", "#2a6a50", "#4a7a2a"] },
    { name: "요정의 숲", colors: ["#ffd0ec", "#ff7ad8", "#9a5ac0", "#4a8a6a"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.12, contrast: 1.08, vignette: 0.36, grain: 0.012 },
  src: `
#define LKD vec3(-0.30, 0.50, -0.81)
#define KEYC (uC0*2.6*dapple(p)*KS)
#define STEPS 200
#define MAXD 32.0
#define FOG 0.042
#define PI 3.14159265
int CHEAP;
float KS = 1.0;   // 주광 세기 배수 (재질이 정한다)   // 0 모두 · 1 새순만(그림자·반사) · 2 비움 — 재질이 정하고 카메라가 되돌린다
void camBase(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(0.95 + 0.45*sin(a), 0.82 + 0.08*cos(a), 2.85 + 0.20*cos(a));
  ta = vec3(-0.30 + 0.12*sin(a + 0.5), 1.28 + 0.03*sin(a), -0.20);
  fov = 0.80;
}
// 얕은 피사계 심도: 렌즈 위 한 점에서 쏘되 초점 거리의 점은 같은 화소에 맺힌다
const float FOCUS = 2.95, APER = 0.012;
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  CHEAP = 0;
  camBase(t, ro, ta, fov);
  vec3 cw = normalize(ta - ro);
  ta = ro + cw*FOCUS;
  vec3 cu = normalize(cross(cw, vec3(0.0, 1.0, 0.0))), cv = cross(cu, cw);
  float r = sqrt(rnd())*APER, an = rnd()*TAU;
  ro += (cu*cos(an) + cv*sin(an))*r;
}
float n3(vec3 p){ return 0.5*vn3(p) + 0.3*vn3(p*2.03 + 1.7) + 0.2*vn3(p*4.1 + 3.1); }
// 숲 지붕의 틈 (해 쪽으로 올려다본 자리). 잎 흔들림은 원을 따라 돈다
float hole(vec3 p){
  vec3 S = normalize(LKD);
  vec2 pc = p.xz + S.xz*(9.0 - p.y)/S.y;
  float a = TAU*uT/T;
  float v = n3(vec3(pc*0.55, 2.0) + vec3(cos(a), sin(a), 0.0)*0.15);
  return smoothstep(0.58, 0.68, v);
}
float dapple(vec3 p){ return 0.08 + 0.92*hole(p); }
// 큰 새순 목록: (x, z, 돌림, 줄기 높이) · (말린 길이, 위상, 크기, 기울기). 작은 새순 무리는 grove() 가 칸마다 심는다
const int NF = 7;
const vec4 FA[7] = vec4[7](
  vec4( 0.00,  0.00,  0.30, 0.95), vec4(-2.25,  1.20, -0.30, 0.62), vec4( 1.75, -1.45,  2.60, 1.15),
  vec4(-1.55, -1.35, -0.50, 1.10), vec4(-2.70, -3.30,  2.90, 1.60), vec4( 0.55, -3.70,  3.30, 1.80),
  vec4( 2.70, -4.50, -0.70, 1.70));
const vec4 FB[7] = vec4[7](
  vec4(1.70, 0.00, 1.30,  0.05), vec4(1.50, 3.30, 1.55, -0.08), vec4(1.60, 4.00, 1.45, -0.12),
  vec4(1.40, 2.10, 0.95,  0.20), vec4(1.50, 5.10, 1.05,  0.18), vec4(1.50, 2.80, 1.00,  0.05),
  vec4(1.40, 0.60, 0.95, -0.15));
// 해석적 로그 나선(관) 거리. 붙는 곳은 원점, 처음 방향 +y, +x 쪽으로 말린다.
// R0 붙는 곳 반지름 · b 나선 기울기 · E 끝 반지름 비
// 굵기 w = clamp(WK·r^WEXP, WMIN, WMAX) 이고 감긴 사이 간격의 WCAP 배를 넘지 않는다 → 가운데로 갈수록 상대적으로 굵어져 매듭처럼 맞닿는다
float WK, WMIN, WMAX, WEXP, WCAP;
float wid(float r, float b){ return min(clamp(WK*pow(r, WEXP), WMIN, WMAX), max(WCAP*r*(1.0 - exp(-TAU*b)), WMIN*0.6)); }
float spiral(vec2 q, float z, float R0, float b, float E, out float phi, out float phi2){
  float sb = sqrt(1.0 + b*b);
  vec2 C = R0*vec2(1.0, b)/sb;
  float th0 = atan(b) + PI;
  vec2 rel = q - C;
  float rho = length(rel);
  float Th = -log(E)/b;
  float pa = mod(atan(rel.y, rel.x) - th0, TAU) - TAU;
  float best = 1e9, sec = 1e9; phi = 0.0; phi2 = 0.0;
  for(int k=-1;k<4;k++){
    float ph = pa - TAU*float(k);
    if(ph > 0.0) continue;
    if(ph < -Th) break;
    float r = R0*exp(b*ph);
    float d = length(vec2((rho - r)/sb, z)) - wid(r, b);
    if(d < best){ sec = best; phi2 = phi; best = d; phi = ph; }
    else if(d < sec){ sec = d; phi2 = ph; }
  }
  float rt = R0*E, tt = th0 - Th;
  vec2 tip = C + rt*vec2(cos(tt), sin(tt));
  float dt = length(vec3(q - tip, z)) - wid(rt, b)*1.25;
  if(dt < best){ best = dt; phi = -Th; }
  if(sec > 1e8) phi2 = phi;
  return best;
}
// 풀림 s(0 감김 … 1 풀림)에서 나선 모양
void shape(float s, float L, out float R0, out float b, out float E){
  b = mix(0.17, 0.40, s);
  E = mix(0.055, 0.30, s);
  R0 = L*b/(sqrt(1.0 + b*b)*(1.0 - E));
}
float MID, MF, MS, MIX, MLF;     // 재질 정보: 종류 · 나선 위 자리(−1 줄기 밑 … 0 붙는 곳 … 1 끝) · 풀림 · 새순 번호 · 작은 잎 위 자리
float ease(float s){ return s*s*(3.0 - 2.0*s)*0.72; }
// 새순 하나 (지역 좌표: 줄기는 y 축, 나선은 xy 평면, z 는 평면 밖). leaves 면 작은 잎(둘째 단계 나선)까지
float koru(vec3 q, float H, float L, float s, bool leaves, out float kind, out float f, out float lf){
  // 줄기: 밑이 굵고 나선 쪽으로 가늘어지며 살짝 휜다
  float yy = clamp(q.y, 0.0, H);
  float bend = 0.06*(yy - H)*(yy - H)/(H*H);
  WMAX = 0.042; WMIN = 0.0035; WEXP = 0.6; WCAP = 0.42;
  float sd = length(vec2(q.x - bend, q.z)) - WMAX*(1.0 + 0.55*(1.0 - yy/H)*(1.0 - yy/H));
  sd = max(sd, -q.y);
  sd = max(sd, q.y - H);
  float R0, b, E; shape(s, L, R0, b, E);
  WK = WMAX/pow(0.178*L, WEXP);
  vec2 q2 = vec2(q.x, q.y - H);
  float phi, phi2;
  float dm = spiral(q2, q.z, R0, b, E, phi, phi2);
  float d = min(sd, dm);
  kind = 2.0;
  float Th = -log(E)/b;
  f = (1.0 - exp(b*phi))/(1.0 - E);
  if(sd < dm){ f = -1.0 + q.y/H; }
  lf = 0.0;
  // 작은 잎: 큰 나선 바깥 가장자리에 촘촘히, 같은 방향으로 단단히 말린 구슬 같은 나선 (좌우로 번갈아 기운다)
  if(leaves && dm < 0.55*R0 + 0.07){
    const float J = 30.0;
    float sb = sqrt(1.0 + b*b);
    vec2 C = R0*vec2(1.0, b)/sb;
    float th0 = atan(b) + PI;
    float sl = clamp(s*1.15, 0.0, 1.0);
    float lb = mix(0.27, 0.29, sl), lE = mix(0.05, 0.07, sl);
    float swk = WK, swmn = WMIN, swmx = WMAX, swe = WEXP, swc = WCAP;
    for(int c=0;c<2;c++){
      float pc = c == 0 ? phi : phi2;
      if(c == 1 && abs(phi2 - phi) < 0.01) break;
      float jf = -pc/Th*J - 0.5;
      for(int m=0;m<2;m++){
        float j = clamp(floor(jf) + float(m), 0.0, J - 1.0);
        float pj = -(j + 0.5)/J*Th;
        float rj = R0*exp(b*pj);
        float th = th0 + pj;
        vec2 ur = vec2(cos(th), sin(th)), ut = vec2(-sin(th), cos(th));
        vec2 M = C + rj*ur;
        vec2 Tf = -(b*ur + ut)/sb;                                  // 끝 쪽
        vec2 O = vec2(-Tf.y, Tf.x); if(dot(O, ur) < 0.0) O = -O;      // 바깥쪽
        vec2 rel = q2 - M;
        WK = swk; WMIN = swmn; WMAX = swmx; WEXP = swe; WCAP = swc;
        float wm = wid(rj, b);
        float ls = 1.0 - 0.5*(j/J);
        float Ll = rj*mix(0.52, 0.62, s)*ls + 0.010;
        float lR = Ll*lb/(sqrt(1.0 + lb*lb)*(1.0 - lE));
        float yl = dot(rel, O) - 0.70*wm;
        float alt = mod(j, 2.0) < 0.5 ? 1.0 : -1.0;
        float zz = q.z - alt*mix(0.5, 0.9, s)*max(yl, 0.0);
        WK = 0.24; WMIN = 0.003; WMAX = 0.55*wm; WEXP = 1.0; WCAP = 0.45;
        float lp, lp2;
        float dl = spiral(vec2(dot(rel, Tf), yl), zz, lR, lb, lE, lp, lp2);
        if(dl < d){ d = dl; kind = 3.0; f = (1.0 - exp(b*pj))/(1.0 - E); lf = (1.0 - exp(lb*lp))/(1.0 - lE); }
      }
    }
  }
  return d;
}
float frond(vec3 p, int i, float best){
  vec4 A = FA[i], B = FB[i];
  float sc = B.z;
  vec3 q = p - vec3(A.x, 0.0, A.y);
  q.xz = rot(A.z)*q.xz;
  q /= sc;
  q.xy = rot(B.w*0.5)*q.xy;
  float H = A.w, L = B.x;
  float db = length(max(abs(q - vec3(0.35*L, 0.5*(H + 1.3*L), 0.0)) - vec3(0.95*L + 0.1, 0.5*(H + 1.3*L) + 0.1, 0.55*L + 0.1), 0.0));
  if(db*sc > best) return 1e9;
  if(db > 0.2) return db*sc;
  float s = ease(0.5 - 0.5*cos(TAU*uT/T + B.y));
  float kind, f, lf;
  float d = koru(q, H, L, s, CHEAP == 0, kind, f, lf)*sc;
  if(d < best){ MID = kind; MF = f; MS = s; MIX = float(i); MLF = lf; }
  return d;
}
// 작은 새순 무리: 1.1 칸마다 하나(빈 칸도 있다). 칸 밖으로 나가지 않게 두고, 거리는 칸 경계까지로 묶는다
const float CS = 1.1;
float grove(vec3 p, float best){
  if(p.y > 1.2) return p.y - 1.15;
  vec2 c = floor(p.xz/CS);
  vec2 l = p.xz - (c + 0.5)*CS;
  float border = CS*0.5 - max(abs(l.x), abs(l.y)) + 0.08;   // 이웃 새순은 제 칸 가장자리에서 0.1 넘게 떨어져 있다
  if(c.y > 0.0 || c.y < -10.0 || c.x < -6.0 || c.x > 4.0) return max(border, 0.05);
  vec4 h = vec4(h33(vec3(c, 3.0)), h11(c.x*7.1 + c.y*13.7 + 0.3));
  if(h.x < 0.38) return max(border, 0.05);
  float far = smoothstep(-2.0, -7.0, c.y*CS);
  float sc = mix(mix(0.20, 0.34, h.y), mix(0.36, 0.52, h.y), far);
  float H = mix(0.45, 1.05, h.z), L = 1.2;
  vec3 q = vec3(l.x, p.y, l.y) - vec3((h.w - 0.5)*0.15, 0.0, (h.y - 0.5)*0.15);
  q.xz = rot(h.w*TAU)*q.xz;
  q /= sc;
  q.x += 0.45*L;                                     // 나선을 칸 가운데로
  float bb = length(max(abs(q - vec3(0.45*L, 0.5*(H + 1.1*L), 0.0)) - vec3(0.62*L, 0.5*(H + 1.1*L), 0.25*L), 0.0))*sc;
  if(bb > 0.06) return min(bb, max(border, 0.04));
  float s = ease(0.5 - 0.5*cos(TAU*uT/T + h.z*TAU));
  float kind, f, lf;
  float d = koru(q, H, L, s, false, kind, f, lf)*sc;
  if(d < best){ MID = 2.0; MF = f; MS = s; MIX = 10.0 + h.w*20.0; MLF = 0.0; }
  return min(d, max(border, 0.04));
}
float ground(vec3 p){ return p.y + 0.06 - 0.18*vn3(vec3(p.xz*0.55, 0.0)) - 0.03*sin(p.x*2.3 + sin(p.z*1.7)) - 0.035*vn3(vec3(p.xz*4.0, 5.0)); }
// 먼 나무: 두 줄, 위로 가늘어지고 살짝 기운 어두운 기둥 (안개 속 그림자)
float trunks(vec3 p){
  if(p.z > -8.0) return p.z + 8.6;
  float d = 1e9; vec2 bc = vec2(0.0); float bi = 0.0;
  for(int i=0;i<12;i++){
    float fi = float(i);
    float row = i < 6 ? 0.0 : 1.0;
    float k = mod(fi, 6.0);
    vec2 c = vec2(-10.0 + k*4.0 + 1.8*sin(fi*3.7) + row*2.0, -9.5 - 4.0*h11(fi*5.3 + 1.0) - row*7.0);
    float r = (0.30 + 0.45*h11(fi*2.1))*(1.0 + row*0.6);
    vec2 pc = p.xz - c - vec2(0.06, 0.03)*(h11(fi*9.1) - 0.5)*p.y;
    float dd = length(pc) - r*(1.15 - 0.04*p.y);
    if(dd < d){ d = dd; bc = pc; bi = fi; }
  }
  return d - 0.04*vn3(vec3(bc*3.0, p.y*0.8 + bi));
}
float map(vec3 p){
  if(CHEAP == 2) return 1e3;
  float d = 1e3;
  if(CHEAP == 0){
    d = ground(p); MID = 0.0;
    float tr = trunks(p); if(tr < d){ d = tr; MID = 1.0; }
    d = min(d, grove(p, d));
  }
  float gb = length(max(abs(p - vec3(0.15, 2.2, -1.45)) - vec3(3.75, 2.45, 4.15), 0.0));
  if(gb < min(d, 0.3)){
    for(int i=0;i<NF;i++) d = min(d, frond(p, i, d));
  } else d = min(d, max(gb, 0.05));
  return d*0.85;
}
// 안개 · 빛줄기의 빛깔: 주광과 팔레트 안개색을 섞는다 (달빛은 푸른 은빛, 요정 숲은 보랏빛 장미색)
vec3 hazeC(){ return mix(uC0, uC2*1.8, 0.5); }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  CHEAP = 0;
  map(p);
  KS = MID < 0.5 ? 0.15 : 1.0;
  float dap = dapple(p);
  vec3 ro, ta; float fv; camBase(uT, ro, ta, fv);
  CHEAP = (MID < 1.5 && length(p - ro) > 6.0) || (MID > 0.5 && MID < 1.5) ? 2 : 1;
  vec3 V = normalize(ro - p);
  vec3 S = normalize(LKD);
  float ph = TAU*uT/T;
  metal = 0.0;
  if(MID < 0.5){
    // 어두운 이끼 바닥
    float g = vn3(vec3(p.xz*3.0, 1.0));
    float g2 = vn3(p*11.0);
    alb = (mix(uC3*0.010, uC3*0.030, g)*(0.5 + 1.0*g2) + uC2*0.004); rough = 0.9;
    vec3 c = floor(p*22.0); vec3 hh = h33(c);
    float dd = length(fract(p*22.0) - 0.5 - (hh - 0.5)*0.6);
    emit = uC0*step(0.95, hh.x)*smoothstep(0.16, 0.0, dd)*(0.6 + 0.4*sin(ph*2.0 + hh.y*TAU))*0.5*dap*smoothstep(4.5, 2.0, length(p - ro));
    // 바닥 가까이 고인 은은한 팔레트 빛
    emit += uC1*0.012*smoothstep(0.55, 0.85, vn3(vec3(p.xz*0.9, 7.0)));
    return;
  }
  if(MID < 1.5){ alb = (uC3*0.010 + uC2*0.006)*(0.5 + vn3(p*vec3(6.0, 0.6, 6.0))); rough = 0.95; return; }
  float leaf = MID > 2.5 ? 1.0 : 0.0;
  float f = MF;
  float stem = f < 0.0 ? 1.0 : 0.0;
  float u = clamp(f, 0.0, 1.0);
  float fy = clamp(f + 1.0, 0.0, 1.0);
  alb = mix(uC3*0.50, uC3*0.80 + uC1*0.08, leaf)*(0.85 + 0.3*vn3(p*30.0));
  if(stem > 0.5){ alb = mix(mix(uC3, vec3(0.30, 0.16, 0.08), 0.5)*0.20, uC3*0.45, smoothstep(0.0, 1.0, fy))*(0.75 + 0.5*vn3(p*vec3(60.0, 4.0, 60.0))); }
  rough = 0.55;
  float nv = abs(dot(n, V));
  float rim = pow(1.0 - nv, 2.5);
  float fuzz = 0.5 + 0.9*vn3(p*95.0);                        // 보송한 솜털 결
  float back = pow(max(dot(-V, S), 0.0), 1.5);
  // 가장자리 빛 (나선 끝으로 갈수록 밝다) · 줄기에서 끝으로 달리는 빛
  float glow = mix(0.25, 1.0, u)*(1.0 - stem*0.85);
  float run = fract(uT/T*2.0 + MIX*0.37);
  float dw = (u - run)*7.0;
  float pulse = exp(-dw*dw)*(1.0 - stem);
  float edge = leaf > 0.5 ? 0.45 + 0.9*MLF : 0.35;
  emit = uC1*rim*fuzz*(edge*glow + 1.3*pulse);
  emit += uC1*(0.07*glow + 0.28*pulse)*(0.4 + 0.6*leaf) + uC1*leaf*smoothstep(0.7, 1.0, MLF)*0.5;
  emit += uC1*0.08*smoothstep(-0.6, 0.0, f);                 // 줄기 위쪽부터 나선까지 이어지는 속빛
  // 가장 단단히 감긴 가운데 (봉오리)가 가장 밝다
  emit += uC1*smoothstep(0.75, 1.0, u)*(1.0 - leaf)*1.3;
  // 역광: 테두리가 솜털처럼 빛나고, 살을 지나온 빛이 속에서 번진다
  emit += mix(uC0, uC1, 0.35)*pow(1.0 - nv, 3.5)*fuzz*back*dap*1.1;
  emit += uC3*mix(uC0, uC1, 0.3)*back*(0.25 + 0.75*leaf)*1.2*dap*(1.0 - 0.7*stem)*(0.4 + 0.6*rim);
  emit *= MIX > 9.5 ? 0.30 + 0.5*fract(MIX*7.3) : 1.0;
  emit *= mix(0.45, 1.0, smoothstep(1.6, 2.7, length(p - ro)))*(abs(MIX - 1.0) < 0.5 ? 0.55 : 1.0);   // 렌즈 바로 앞 새순은 옅게 (초점 밖 테두리)          // 작은 무리는 옅게, 저마다 다르게
  // 이슬방울: 촘촘하고 작게, 해가 닿는 곳에서 반짝
  vec3 c = floor(p*46.0); vec3 hh = h33(c + 7.0);
  float dd = length(fract(p*46.0) - 0.5 - (hh - 0.5)*0.55);
  float tw = 0.5 + 0.5*sin(ph*3.0 + hh.y*TAU);
  emit += uC0*step(0.86, hh.x)*smoothstep(0.18, 0.0, dd)*tw*tw*(0.6 + 2.4*dap)*1.6;
}
vec3 env(vec3 rd){
  float up = smoothstep(-0.2, 0.8, rd.y);
  return uC2*(0.008 + 0.035*up);
}
float motes(vec3 rd, float sc, float th){
  vec3 g = rd*sc; vec3 h = h33(floor(g));
  float tw = 0.5 + 0.5*sin(TAU*uT/T*2.0 + h.y*TAU);
  return step(th, h.x)*smoothstep(0.42, 0.0, length(fract(g) - 0.5 - (h.yzx - 0.5)*0.4))*tw;
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 ro, ta; float fov; camBase(uT, ro, ta, fov);
  vec3 S = normalize(LKD);
  vec3 HC = hazeC();
  float mu = max(dot(rd, S), 0.0);
  float up = smoothstep(0.05, 0.6, rd.y);
  vec3 sky = mix(uC2*0.035, uC2*0.012, up);
  sky += HC*(0.30*pow(mu, 24.0) + 0.03*pow(mu, 4.0));
  // 공기 속 빛줄기 (팔레트 빛깔), 바닥 가까이 옅은 안개
  float phase = 0.08 + 1.4*pow(mu, 10.0) + 0.22*mu*mu;
  vec3 air = vec3(0.0);
  float dt = 1.55, t = dt*rnd();
  for(int i=0;i<14;i++){
    vec3 p = ro + rd*t;
    float L = hole(p)*smoothstep(-0.5, 1.5, p.y);
    air += (HC*L*phase*2.6 + uC2*0.06*(1.0 + 2.0*smoothstep(0.9, 0.0, p.y)))*dt;
    t += dt;
  }
  air *= 0.0065;
  vec3 col = sky + air;
  col += uC1*motes(rd, 90.0, 0.993)*0.3;
  return col;
}
`,
  // 떠다니는 포자 (3D 점, 초점 밖은 넓고 옅은 원판)
  spores: {
    vs: `#version 300 es
uniform mat4 uVP; uniform float uT, uH, uF, uFocus, uAp, uGain; uniform vec3 uC0, uC1;
out vec3 vCol; out float vR;
#define TAU 6.2831853
float h11(float p){ p = fract(p*0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
void main(){
  float id = float(gl_VertexID);
  vec3 h = vec3(h11(id*1.31 + 0.1), h11(id*2.77 + 0.3), h11(id*3.91 + 0.7));
  vec3 g = vec3(h11(id*5.17 + 0.2), h11(id*7.03 + 0.5), h11(id*9.11 + 0.9));
  float a = TAU*uT/30.0;
  vec3 p = vec3(mix(-3.4, 2.8, h.x), 0.04 + 2.9*h.y*h.y*h.y, mix(-5.0, 2.2, h.z));
  p += vec3(0.22*sin(a + g.x*TAU), 0.12*sin(2.0*a + g.y*TAU) + 0.10*cos(a + g.z*TAU), 0.22*cos(a + g.z*TAU));
  vec4 c = uVP*vec4(p, 1.0);
  if(c.w < 0.2){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; vCol = vec3(0.0); vR = 1.0; return; }
  float px = 0.009*uF/c.w*uH*0.5;
  float coc = uF*uAp*abs(1.0/c.w - 1.0/uFocus)*uH*0.5;
  float r = sqrt(px*px + coc*coc) + 0.6;
  float I = (px + 0.6)*(px + 0.6)/(r*r);
  float tw = 0.55 + 0.45*sin(a*2.0 + g.x*TAU);
  float fade = smoothstep(16.0, 6.0, c.w);
  vCol = mix(uC1, uC0, g.y*0.6)*I*tw*fade*(0.25 + 2.5*g.z*g.z*g.z)*uGain*2.2;
  vR = r;
  gl_PointSize = 2.0*r + 2.0;
  gl_Position = c;
}`,
    fs: `#version 300 es
precision highp float; in vec3 vCol; in float vR; out vec4 o;
void main(){
  float d = length(gl_PointCoord*2.0 - 1.0)*(vR + 1.0);
  float m = 1.0 - smoothstep(vR - 0.8, vR + 0.4, d);
  o = vec4(vCol*m*(0.8 + 0.2*d/max(vR, 1.0)), 1.0);
}`,
  },
  cam(t) {
    const a = 2 * Math.PI * t / SGL.T;
    return { eye: [0.95 + 0.45 * Math.sin(a), 0.82 + 0.08 * Math.cos(a), 2.85 + 0.20 * Math.cos(a)],
      ta: [-0.30 + 0.12 * Math.sin(a + 0.5), 1.28 + 0.03 * Math.sin(a), -0.20], fov: 0.80 };
  },
  init(G) { return { P: SGL.program(G.gl, this.spores.vs, this.spores.fs), vao: G.gl.createVertexArray() }; },
  draw(G, st, t, ctx) {
    SGL.drawRay(G, this.src, t, ctx);
    const c = this.cam(t), VP = SGL.cam(ctx, c.eye, c.ta, c.fov);
    G.custom((gl, cc) => {
      const u = st.P.u; gl.useProgram(st.P.p);
      gl.uniformMatrix4fv(u.uVP, false, VP);
      gl.uniform1f(u.uT, t); gl.uniform1f(u.uH, ctx.H); gl.uniform1f(u.uF, 1 / Math.tan(c.fov / 2));
      gl.uniform1f(u.uFocus, 2.95); gl.uniform1f(u.uAp, 0.03); gl.uniform1f(u.uGain, cc.gain);
      gl.uniform3fv(u.uC0, ctx.colors[0]); gl.uniform3fv(u.uC1, ctx.colors[1]);
      gl.bindVertexArray(st.vao); gl.drawArrays(gl.POINTS, 0, 190);
    });
  },
});
