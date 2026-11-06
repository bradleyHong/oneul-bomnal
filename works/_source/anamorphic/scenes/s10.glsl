// S10 얼음 왕국 — 새벽빛 드는 검붉은 벽돌 방이 얼어붙는다. 벽돌 틈부터 하얀 서리가 번지고 고드름이 자라며, 바닥에서 맑은 얼음 결정이 솟아 틀을 넘어 관객 쪽으로 뻗었다가 다시 녹는다.
// @lib _winter
// @post {"exposure":1.0,"sat":1.08,"contrast":1.1,"bloom":0.10}
#define DT 1.9
#define BRICK1 L(vec3(0.46, 0.18, 0.13))
#define BRICK2 L(vec3(0.60, 0.28, 0.20))
#define MORTAR L(vec3(0.52, 0.50, 0.49))
#define BRICKW 0.24
#define BRICKH 0.08
#define BRICK_AGE 0.6
#define FLOOR_REFL 0.06
#define KEYC vec3(2.55, 1.92, 1.48)
#define LKD vec3(-0.50, 0.50, -0.70)
#define AMB_TOP L(vec3(0.44, 0.47, 0.56))
#define AMB_BOT L(vec3(0.22, 0.21, 0.24))
#define BACKC L(vec3(0.55, 0.66, 0.85))*0.22
#define RIMC L(vec3(0.60, 0.85, 1.0))*0.18
#define FRAMEC L(vec3(0.07, 0.07, 0.08))
#define HAS_PREP
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_BACKWALL
#define HAS_WALLTINT
#define HAS_WALLLIGHT
#define SNOW 4
#define SNOWD 0.035
#define SNOWC vec3(0.50, 0.58, 0.70)
#define NC 8
const vec3 ICEC = vec3(0.55, 0.88, 1.0);
const vec3 WINC = vec3(0.55, 0.68, 0.95);           // 창으로 드는 찬 새벽빛
const float WX = 1.02, WY0 = -0.12, WYC = 0.24, WW = 0.24;   // 뒷벽 아치 창: 가운데 x · 아래 · 반원 중심 · 반폭

float winD(vec2 q){ vec2 c = q - vec2(WX, WYC); return c.y > 0.0 ? length(c) - WW : max(abs(c.x) - WW, WY0 - q.y); }
bool backHole(vec3 q){ return winD(q.xy) < 0.0; }
vec3 outside(vec3 rd, vec3 ro){
  float e = rd.y;
  vec3 c = mix(L(vec3(0.80, 0.84, 0.92))*1.1, L(vec3(1.0, 0.82, 0.70))*1.5, exp(-abs(e)*9.0));   // 지평선의 복숭앗빛
  c = mix(c, L(vec3(0.50, 0.62, 0.86)), smoothstep(0.08, 0.5, e));
  if(e < 0.0) c = mix(c, L(vec3(0.70, 0.78, 0.90))*0.9, smoothstep(0.0, -0.05, e));             // 눈 덮인 들
  return c;
}
vec3 backWall(vec3 p){ float d = winD(p.xy); return WINC*0.10*exp(-max(d, 0.0)*7.0); }

// 엔진 벽돌 무늬와 똑같은 바탕 (얼음 너머로 비치는 벽돌, 줄눈 자리 찾기)
float BMORT, BCAV;
vec3 brickAlb(vec3 p, float id){
  vec2 uv = id < 2.5 ? p.zy : (id < 3.5 ? p.xz : p.xy);
  bool floorTile = (id > 2.5 && id < 3.5 && p.y < 0.0);
  vec2 S = vec2(BRICKW, BRICKH); if(floorTile) S = vec2(BRICKW, BRICKW*0.5);
  float row = floor(uv.y/S.y);
  vec2 q = uv; q.x += mod(row, 2.0)*S.x*0.5;
  vec2 cid = vec2(floor(q.x/S.x), row);
  vec2 f = fract(q/S)*S;
  float h = h21(cid + id*31.7), h2 = h21(cid*1.7 + 9.1);
  vec2 e2 = min(f, S - f); float e = min(e2.x, e2.y);
  float mortar = 1.0 - smoothstep(0.0055, 0.0095, e);
  vec2 wq = uv*vec2(9.0, 14.0);
  float grain = vnoise(wq*3.0)*0.6 + vnoise(wq*9.0)*0.4;
  vec3 bc = mix(BRICK1, BRICK2, h)*(0.78 + 0.34*h2)*(0.86 + 0.28*grain);
  if(fract(h*7.3) < 0.08) bc *= 0.55;
  bc *= 1.0 - BRICK_AGE*0.45*smoothstep(0.45, 0.85, fbm(uv*1.3 + id*5.0));
  BMORT = 1.0 - smoothstep(0.004, 0.016, e);
  vec2 tl = vec2(1.0 - smoothstep(0.0075, 0.0235, e2.x), 1.0 - smoothstep(0.0075, 0.0235, e2.y))*(1.0 - mortar);
  BCAV = mortar*0.55 + max(tl.x, tl.y)*0.10;
  return mix(bc, MORTAR*(0.8 + 0.3*vnoise(uv*60.0)), mortar);
}
// 줄눈만 (서리가 먼저 끼는 자리) — 색 계산 없이 가볍게
void brickMortar(vec3 p, float id){
  vec2 uv = id < 2.5 ? p.zy : (id < 3.5 ? p.xz : p.xy);
  vec2 S = vec2(BRICKW, BRICKH); if(id > 2.5 && id < 3.5 && p.y < 0.0) S = vec2(BRICKW, BRICKW*0.5);
  float row = floor(uv.y/S.y);
  vec2 q = uv; q.x += mod(row, 2.0)*S.x*0.5;
  vec2 f = fract(q/S)*S, e2 = min(f, S - f); float e = min(e2.x, e2.y);
  float mortar = 1.0 - smoothstep(0.0055, 0.0095, e);
  vec2 tl = vec2(1.0 - smoothstep(0.0075, 0.0235, e2.x), 1.0 - smoothstep(0.0075, 0.0235, e2.y))*(1.0 - mortar);
  BMORT = 1.0 - smoothstep(0.004, 0.020, e);
  BCAV = mortar*0.55 + max(tl.x, tl.y)*0.10;
}
// ── 시간: 얼어붙음 → 머묾 → 녹음 (0 과 15초에 모두 0) ──
float LV, MELT;
// 얼음 결정
vec3 CB[NC], CX[NC], CY[NC], CZ[NC]; float CL[NC], CR[NC];
void prep(){
  MELT = smoothstep(11.8, 14.9, uT);
  LV = smoothstep(0.2, 9.5, uT)*(1.0 - MELT);
  float fy = -HO.y;
  vec3 c0 = vec3(0.0, fy - 0.06, 1.25);
  for(int i=0;i<NC;i++){
    vec3 d; float Lm, r, dl;
    if(i == 0){ d = vec3(0.50, 0.42, -0.76); Lm = 2.78; r = 0.15; dl = 2.2; }        // 틀을 넘어 관객 쪽으로 뻗는 큰 결정들
    else if(i == 1){ d = vec3(-0.55, 0.46, -0.70); Lm = 2.70; r = 0.13; dl = 2.8; }
    else if(i == 2){ d = vec3(0.05, 0.62, -0.78); Lm = 2.10; r = 0.17; dl = 1.6; }
    else if(i == 3){ d = vec3(-0.12, 0.97, 0.20); Lm = 1.40; r = 0.15; dl = 1.0; }
    else if(i == 4){ d = vec3(0.40, 0.88, 0.25); Lm = 1.15; r = 0.12; dl = 1.4; }
    else if(i == 5){ d = vec3(-0.85, 0.40, -0.25); Lm = 1.00; r = 0.09; dl = 2.0; }
    else if(i == 6){ d = vec3(0.85, 0.42, -0.10); Lm = 1.00; r = 0.10; dl = 1.8; }
    else { d = vec3(-0.30, 0.35, -0.89); Lm = 1.40; r = 0.08; dl = 3.2; }
    d = normalize(d);
    float g = clamp((uT - dl)/5.5, 0.0, 1.0);
    g = 1.0 - (1.0 - g)*(1.0 - g)*(1.0 - g);                                   // 빠르게 솟다가 천천히 멈춘다
    g *= 1.0 - smoothstep(0.0, 1.0, MELT*1.15 - float(i)*0.02);
    vec3 b = c0 + vec3(h11(float(i)*3.7) - 0.5, 0.0, h11(float(i)*5.1) - 0.5)*0.22;
    CB[i] = b; CY[i] = d;
    vec3 x = normalize(cross(d, vec3(0.31, 0.0, 0.95)));
    float a = float(i)*1.3;
    vec3 z = cross(x, d);
    CX[i] = cos(a)*x + sin(a)*z; CZ[i] = cross(CX[i], d);
    CL[i] = Lm*g + 0.08;                                                          // 밑동은 바닥 아래에 묻혀 있다
    CR[i] = r*(0.55 + 0.45*g);
  }
}
float hex2(vec2 p, float r){
  const vec3 k = vec3(-0.8660254, 0.5, 0.57735);
  p = abs(p); p -= 2.0*min(dot(k.xy, p), 0.0)*k.xy;
  return length(p - vec2(clamp(p.x, -k.z*r, k.z*r), r))*sign(p.y - r);
}
float crystalD(int i, vec3 p){
  vec3 w = p - CB[i];
  vec3 q = vec3(dot(w, CX[i]), dot(w, CY[i]), dot(w, CZ[i]));
  float L0 = CL[i], r = CR[i], tl = r*2.4;
  float rr = r*clamp((L0 - q.y)/tl, 0.0, 1.0);
  return max(hex2(q.xz, rr)*0.72, max(-q.y, q.y - L0));
}
// 고드름: 뿌리가 굵고 끝이 둥글게 가늘어지는 두 마디. 앞 틀 위 끝과 뒷벽 천장 끝에 드문드문
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a; float l2 = dot(ba, ba); float rr = r1 - r2; float a2 = l2 - rr*rr; float il2 = 1.0/l2;
  vec3 pa = p - a; float y = dot(pa, ba); float z = y - l2;
  vec3 xv = pa*l2 - ba*y; float x2 = dot(xv, xv); float y2 = y*y*l2; float z2 = z*z*l2;
  float k = sign(rr)*rr*rr*x2;
  if(sign(z)*a2*z2 > k) return sqrt(x2 + z2)*il2 - r2;
  if(sign(y)*a2*y2 < k) return sqrt(x2 + y2)*il2 - r1;
  return (sqrt(x2*a2*il2) + y*rr)*il2 - r1;
}
float icicleRow(vec3 p, float z0, float seed, float lvl){
  float cs = 0.23;
  float d = 1e9;
  float ci = floor(p.x/cs);
  for(int k=-1;k<=1;k++){
    float c = ci + float(k);
    if(abs((c + 0.5)*cs) > HO.x - 0.08) continue;
    float h = h11(c*7.13 + seed), h2 = h11(c*3.31 + seed*2.0), h3 = h11(c*5.77 + seed*3.0);
    if(h3 < 0.28) continue;                                                     // 군데군데 비어 있다
    float g = smoothstep(0.0, 0.45, lvl - h2*0.3 + 0.15);
    float len = (0.07 + 0.58*pow(h, 2.2))*g*lvl;
    if(len < 0.01) continue;
    float r = (0.024 + 0.024*h)*smoothstep(0.0, 0.08, len);
    vec3 a = vec3((c + 0.12 + 0.76*h2)*cs, HO.y + 0.01, z0 + (h3 - 0.5)*0.10);
    vec3 m = a + vec3((h2 - 0.5)*0.02, -len*0.38, 0.0);
    vec3 b = a + vec3((h3 - 0.5)*0.03, -len, 0.0);
    float ic = min(sdRoundCone(p, a, m, r, r*0.62), sdRoundCone(p, m, b, r*0.62, 0.0045));
    ic = min(ic, length(p - b + vec3(0.0, 0.004, 0.0)) - 0.0075*smoothstep(0.1, 0.3, len));   // 끝에 맺힌 물방울
    d = min(d, ic);
  }
  return d;
}
// 서리: 2D 덮임 값 C(0..1) 가 1-lvl 보다 크면 덮인다. 벽 모서리·창틀에서 먼저
float frostC(vec2 uv, float edge){
  float n = vnoise(uv*4.0)*0.52 + vnoise(uv*11.0 + 4.0)*0.32 + vnoise(uv*29.0 + 9.0)*0.16;
  return 0.55*edge + 0.45*n;
}
float frostCov(vec3 p, float id){
  float dxs = HO.x - abs(p.x), dyc = HO.y - p.y, dfy = p.y + HO.y, dzb = DT - p.z;
  vec2 uv; float e, k = 1.1;
  if(id < 2.5){ uv = p.zy; e = min(min(dyc, dfy), min(dzb, p.z + 0.15)); }
  else if(id > 3.5){ uv = p.xy; e = min(min(dxs, min(dyc, dfy)), max(winD(p.xy), 0.0)*1.6); }
  else if(p.y > 0.0){ uv = p.xz; e = min(dxs, min(dzb, p.z + 0.15)); }
  else { uv = p.xz*0.8 + 3.0; e = min(min(dxs, dzb), length(p.xz - vec2(0.0, 1.25))*0.55); k = 1.0; }
  float C = frostC(uv + id*7.0, 1.0 - clamp(e/k, 0.0, 1.0));
  return C - (1.0 - 1.25*LV);
}
// 깃털 같은 서리 결: 방향이 다른 가는 결 두 겹
float rime(vec2 uv){
  vec2 a = mat2(0.8, 0.6, -0.6, 0.8)*uv, b = mat2(0.8, -0.6, 0.6, 0.8)*uv;
  return max(vnoise(a*vec2(120.0, 36.0)), vnoise(b*vec2(120.0, 36.0) + 5.0))*0.6 + vnoise(uv*55.0)*0.4;
}
float frostAmt(vec3 p, float id, out vec3 fc){
  fc = vec3(0.0);
  if(LV < 0.003) return 0.0;
  float cv = frostCov(p, id);
  if(cv < -0.25) return 0.0;
  brickMortar(p, id);
  vec2 uv = id < 2.5 ? p.zy : (id < 3.5 ? p.xz : p.xy);
  float rm = rime(uv);
  float fM = smoothstep(-0.20, 0.06, cv)*BMORT;                                   // 줄눈에 먼저 낀다
  float fF = smoothstep(0.0, 0.9, cv)*(0.12 + 0.80*smoothstep(0.40, 0.85, rm));  // 벽돌 면은 결을 따라 군데군데, 모서리일수록 짙게
  float fw = clamp(max(fM, fF)*(id > 2.5 && id < 3.5 && p.y < 0.0 ? 0.6 : 0.95), 0.0, 1.0);
  fc = mix(vec3(0.74, 0.82, 0.94), vec3(0.92, 0.95, 1.0), rm)/(1.0 - 0.85*BCAV*fw);   // 줄눈 그늘에 묻히지 않게
  return fw;
}
vec3 wallTint(vec3 p, float id, vec3 a){
  vec3 fc; float fw = frostAmt(p, id, fc);
  return mix(a, fc, fw);
}
// 벽돌에 더하는 빛: 창으로 드는 찬빛 + 서리 결정이 해를 받아 반짝임
vec3 wallLight(vec3 p, vec3 n){
  vec3 dw = vec3(WX, WYC - 0.05, DT) - p; float r2 = dot(dw, dw);
  vec3 c = WINC*max(dot(n, dw*inversesqrt(r2)), 0.0)*0.30/(0.25 + r2);
  if(LV > 0.05){
    float id = abs(n.x) > 0.5 ? 2.0 : (abs(n.y) > 0.5 ? 3.0 : 4.0);
    vec3 fc; float fw = frostAmt(p, id, fc);
    if(fw > 0.05){
      vec3 Lk = normalize(LKD);
      float tk = -p.z/Lk.z; vec2 q = (p + Lk*tk).xy;
      float ap = smoothstep(-0.02, 0.02, min(HO.x - abs(q.x), HO.y - abs(q.y)));
      vec3 rd = normalize(p - vec3(0.0, 0.0, -ZC));
      vec3 gq = p*230.0; vec3 hh = h33(floor(gq) + 1.7);
      vec3 gn = normalize(n + (hh - 0.5)*1.2);
      float sp = pow(max(dot(reflect(rd, gn), Lk), 0.0), 220.0)*step(0.55, hh.x)*smoothstep(0.5, 0.15, length(fract(gq) - 0.5));
      c += KEYC*sp*ap*fw*5.0;
    }
  }
  return c;
}
// 창살: 나무 창틀 십자
float barsD(vec3 p){
  vec3 q = p - vec3(WX, WYC - 0.06, DT + 0.012);
  float b = min(sdBox(q, vec3(0.012, 0.36, 0.012)), sdBox(q, vec3(0.26, 0.012, 0.012)));
  return max(b, winD(p.xy) - 0.01);
}
float iceD(vec3 p){
  float d = 1e9;
  for(int i=0;i<NC;i++){
    float bd = sdCap(p, CB[i], CB[i] + CY[i]*CL[i], CR[i]*1.25);
    if(bd > 0.3){ d = min(d, bd); continue; }
    d = min(d, crystalD(i, p));
  }
  if(LV > 0.003){
    if(p.y > HO.y - 0.95) d = min(d, min(icicleRow(p, 0.07, 1.7, LV), icicleRow(p, DT - 0.08, 5.3, LV)));
    else d = min(d, (HO.y - 0.68) - p.y);                                         // 여유 0.3 이상: 가짜 반그림자 없게
  }
  return d;
}
float map(vec3 p){
  float d = iceD(p);
  if(p.z > DT - 0.4) d = min(d, barsD(p)); else d = min(d, DT - 0.4 - p.z + 0.35);
  return d;
}
// 얼음 너머로 비치는 방: 꺾인 시선이 닿는 벽돌(서리 포함)을 대강의 빛으로
vec3 iceThrough(vec3 p, vec3 n){
  vec3 rr = refract(VRD, n, 1.0/1.31);
  if(dot(rr, rr) < 0.01) rr = reflect(VRD, n);
  vec3 rd = normalize(mix(VRD, rr, 0.6));
  vec3 sr = sign(rd) + vec3(equal(rd, vec3(0.0)));
  float tx = (sr.x*HO.x - p.x)/(rd.x + 1e-5*sr.x);
  float ty = (sr.y*HO.y - p.y)/(rd.y + 1e-5*sr.y);
  float tz = rd.z > 0.0 ? (DT - p.z)/rd.z : 1e9;
  float t = min(tx, min(ty, tz));
  if(t > 1e8 || t < 0.0) return L(vec3(0.12, 0.15, 0.22));
  vec3 q = p + rd*t;
  float id = t == tx ? 2.0 : (t == ty ? 3.0 : 4.0);
  if(id > 3.5 && winD(q.xy) < 0.0) return outside(rd, q);
  vec3 nw = id < 2.5 ? vec3(-sr.x, 0, 0) : (id < 3.5 ? vec3(0, -sr.y, 0) : vec3(0, 0, -1));
  float cv = frostCov(q, id);                                                    // 무늬는 흐리게: 벽돌 평균색에 서리 덮임만
  vec3 b = mix(mix(BRICK1, BRICK2, 0.5)*0.85, vec3(0.80, 0.86, 0.95), smoothstep(-0.1, 0.6, cv)*0.35);
  vec3 Lk = normalize(LKD);
  float tk = -q.z/Lk.z; vec2 a = (q + Lk*tk).xy;
  float ap = smoothstep(-0.03, 0.03, min(HO.x - abs(a.x), HO.y - abs(a.y)));
  vec3 amb = mix(AMB_BOT, AMB_TOP, nw.y*0.5 + 0.5);
  return b*(amb*0.8 + KEYC*max(dot(nw, Lk), 0.0)*ap*0.85 + wallLight(q, nw)*0.5);
}
M mat(vec3 p, vec3 n){
  float cosV = max(dot(n, -VRD), 0.0);
  if(p.z > DT - 0.05 && barsD(p) < iceD(p)){
    vec3 fc; float fw = frostAmt(p, 4.0, fc);
    M m = mk(mix(L(vec3(0.22, 0.17, 0.13)), vec3(0.85, 0.9, 1.0), fw*0.8), 0.6, 0.0);   // 서리 낀 나무 창살
    return m;
  }
  // 맑은 얼음: 어두운 바탕 + 또렷한 겉 반사 + 굴절된 방 + 결정 모서리에 맺힌 빛
  M m = mk(ICEC*0.015, 0.85, 0.0);
  m.coat = 0.35; m.glit = 140.0;
  float Fr = 0.04 + 0.96*pow(1.0 - cosV, 5.0);
  vec3 th = iceThrough(p, n)*mix(vec3(1.0), ICEC*0.8, 0.55 + 0.35*cosV)*(1.0 - Fr);   // 두꺼운 가운데는 더 푸르고 깊게
  float edge = pow(1.0 - cosV, 2.0);
  m.emit = th*0.80 + L(vec3(0.30, 0.75, 1.0))*(0.01 + 0.05*edge);
  float lit = max(dot(n, normalize(LKD)), 0.0);
  float best = 1e9; vec3 bq = vec3(0); float bL = 1.0, bR = 0.1;
  for(int i=0;i<NC;i++){
    float d = crystalD(i, p);
    if(d < best){ best = d; vec3 w = p - CB[i]; bq = vec3(dot(w, CX[i]), dot(w, CY[i]), dot(w, CZ[i])); bL = CL[i]; bR = CR[i]; }
  }
  if(best > 0.02){
    // 고드름: 젖은 겉, 끝으로 갈수록 맑고 반짝
    m.coat = 1.0;
    m.emit += L(vec3(0.45, 0.85, 1.0))*(0.03 + 0.30*edge) + KEYC*0.10*smoothstep(0.2, 0.8, lit);
    float tip = smoothstep(HO.y - 0.25, HO.y - 0.6, p.y);
    m.emit += KEYC*0.25*tip*pow(max(dot(reflect(VRD, n), normalize(LKD)), 0.0), 30.0);
  } else {
    float ang = mod(atan(bq.z, bq.x), 1.0471976);
    float de = min(ang, 1.0471976 - ang)*length(bq.xz);
    float ring = abs(bq.y - (bL - bR*2.4));
    float e = min(de, ring);
    float k = smoothstep(0.0045, 0.0, e);
    m.emit += k*(L(vec3(0.55, 0.88, 1.0))*0.18 + KEYC*0.55*smoothstep(0.1, 0.7, lit));   // 빛 받은 모서리는 또렷이 하얗게
    m.emit += L(vec3(0.40, 0.80, 1.0))*0.06*smoothstep(0.6, 1.0, bq.y/bL);
  }
  return m;
}
