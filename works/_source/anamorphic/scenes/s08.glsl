// s08 억새와 보름달 — 벽돌 방 뒷벽의 둥근 달문 너머로 커다란 보름달이 떠오른 가을밤. 벽돌 바닥 틈에서 자란 억새가 바람 물결에 천천히 흔들리고, 달빛을 받은 은빛 이삭이 틀 밖 관객 쪽까지 늘어지며 씨앗 몇 송이가 바람을 타고 날아온다.
// @lib _autumn
// @post {"exposure":1.05,"sat":1.08,"contrast":1.06,"bloom":0.16}
#define DT 1.7
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_PREP
#define HAS_BACKWALL
#define LKD vec3(0.22, 0.80, -0.56)
#define KEYC (vec3(0.80, 0.90, 1.15)*0.85)
#define AMB_TOP L(vec3(0.40, 0.44, 0.60))
#define AMB_BOT L(vec3(0.34, 0.33, 0.42))
#define BRICK1 L(vec3(0.42, 0.24, 0.19))
#define BRICK2 L(vec3(0.54, 0.36, 0.28))
#define MORTAR L(vec3(0.50, 0.50, 0.50))
#define BRICK_AGE 0.6
#define MOSS 0.25
#define MOSSC L(vec3(0.22, 0.28, 0.16))
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define RIMD vec3(0.02, 0.30, 1.0)
#define RIMC (L(vec3(0.78, 0.85, 1.0))*1.5)
#define NC 11
#define NB 3
#define STEPS 100
#define NH 2
#define NS (NC*NB + NH)
#define NBL 2
const vec3 MD = normalize(vec3(0.012, 0.062, 1.0));  // 달 방향: 둥근 달문 한가운데
const float MR = 0.085;                              // 달 겉보기 반지름 (라디안)
const vec2 GC = vec2(0.0, 0.10); const float GR = 0.74;   // 뒷벽 둥근 달문
bool backHole(vec3 q){ return length(q.xy - GC) < GR; }
vec3 backWall(vec3 p){ float r = length(p.xy - GC) - GR; return L(vec3(0.50, 0.58, 0.80))*0.07*exp(-max(r, 0.0)*6.0); }   // 달문 둘레로 번지는 달빛

vec3 outside(vec3 rd, vec3 ro){
  float e = rd.y/max(rd.z, 0.05);
  vec3 c = mix(L(vec3(0.13, 0.17, 0.32)), L(vec3(0.015, 0.025, 0.08)), smoothstep(-0.02, 0.30, e));
  // 달무리
  float cd = acos(clamp(dot(rd, MD), -1.0, 1.0));
  c += L(vec3(0.55, 0.62, 0.85))*(0.55*exp(-(cd - MR)*9.0) + 0.25*exp(-(cd - MR)*28.0))*step(MR, cd);
  // 별
  vec2 g = rd.xy/max(rd.z, 0.1)*90.0; float r = h21(floor(g));
  c += step(0.965, r)*smoothstep(0.30, 0.0, length(fract(g) - 0.5))*0.7*smoothstep(MR*2.5, MR*5.0, cd);
  // 엷은 구름 띠
  float cl = fbm(vec2(rd.x/max(rd.z, 0.1)*3.0 + 0.15*sin(TAU*uT/T), e*9.0));
  c = mix(c, L(vec3(0.30, 0.34, 0.50))*0.8, smoothstep(0.55, 0.85, cl)*0.35*smoothstep(0.02, 0.12, e));
  // 보름달: 바다 무늬 · 가장자리 어둡게
  if(cd < MR){
    vec3 t1 = normalize(cross(MD, vec3(0, 1, 0))), t2 = cross(t1, MD);
    vec2 uv = vec2(dot(rd, t1), dot(rd, t2))/MR;
    float limb = sqrt(max(1.0 - dot(uv, uv), 0.0));
    float mar = fbm(uv*2.2 + 3.0), cr = fbm(uv*9.0 + 1.0);
    vec3 mc = L(vec3(1.0, 0.96, 0.86))*(0.48 + 0.52*smoothstep(0.60, 0.42, mar))*(0.80 + 0.30*cr);
    c = mix(c, mc*3.6*(0.55 + 0.45*limb), smoothstep(MR, MR*0.985, cd));
  }
  // 먼 언덕과 억새 들판 (달빛 실루엣)
  float az = rd.x/max(rd.z, 0.1);
  float hz = -0.030 + 0.035*fbm(vec2(az*2.0, 1.7)) + 0.006*sin(az*40.0 + 1.3*sin(TAU*uT/T + az*3.0));
  {
    // 언덕 마루에 늘어선 먼 억새: 줄기는 검은 실루엣, 이삭은 달빛에 은빛으로
    float gx = az*150.0, id = floor(gx), f = fract(gx) - 0.5;
    float hh = h11(id*1.37 + 2.0);
    float top = hz + 0.010 + 0.022*hh;
    float k = clamp((e - hz)/(top - hz), 0.0, 1.0);
    float sw = (0.30*sin(TAU*uT/T*3.0 - id*0.21) + 0.25)*k*k;
    float ds = abs(f - sw)/150.0;
    vec2 pq = vec2((f - sw - 0.30)/150.0, e - top + 0.002);
    float pl = length(pq/vec2(0.0050, 0.0026));
    float gl = exp(-cd*cd/(0.22*0.22));
    if(e > hz && e < top && ds < 0.00035) c = mix(c, L(vec3(0.06, 0.07, 0.10)), 0.8);
    if(pl < 1.6) c = mix(c, L(vec3(0.85, 0.82, 0.74))*(0.06 + 1.2*gl)*(0.5 + 0.5*hh), smoothstep(1.6, 0.4, pl)*0.8);
  }
  if(e < hz){
    float k = smoothstep(hz, hz - 0.12, e);
    vec3 gc = mix(L(vec3(0.20, 0.22, 0.30)), L(vec3(0.05, 0.06, 0.09)), k);
    float glow = exp(-abs(az - MD.x/MD.z)*2.5)*(1.0 - k);
    gc += L(vec3(0.70, 0.75, 0.90))*0.35*glow*smoothstep(hz - 0.03, hz, e);   // 달 아래 들판 끝이 은빛으로
    c = gc;
  }
  return c;
}

#define NSEED 7
vec3 SP[NSEED]; float SPS[NSEED];
void seedPrep(){
  for(int i=0;i<NSEED;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/float(NSEED) + 0.07*h11(fi));
    vec3 a = vec3(-1.2 + 2.4*h11(fi*3.0), 0.05 + 0.30*h11(fi*5.0), 0.6 + 1.0*h11(fi*11.0));   // 억새 이삭에서 떨어져
    vec3 b = h11(fi*13.0) < 0.65 ? vec3(2.7 + 1.0*h11(fi*7.0), 0.8 + 0.9*h11(fi*9.0), -1.6)   // 오른쪽으로
                                 : vec3(-2.7 - 0.6*h11(fi*7.0), 2.3 + 0.5*h11(fi*9.0), -1.6);  // 왼쪽 위로 (그림자도 틀 밖)
    vec3 q = mix(a, b, u*u*(1.5 - 0.5*u));
    q += vec3(0.12*sin(TAU*(u*2.0 + fi*0.3)), 0.08*sin(TAU*(u*3.0 + fi*0.7)) - 0.15*sin(3.14159*u), 0.0)*smoothstep(0.0, 0.2, u);
    SPS[i] = (0.024 + 0.014*h11(fi*17.0))*smoothstep(0.0, 0.10, u);
    SP[i] = q;
  }
}
vec3 SB[NS]; vec4 SD[NS]; float SW[NS]; vec3 SPP[NS]; vec3 PA[NS]; vec3 PM[NS]; vec3 PN[NS]; float PRR[NS]; vec4 PBS[NS]; float DK[NS];
vec3 CB[NC]; vec4 CBD[NC];
vec3 BA0[NC*NBL]; vec3 BBA[NC*NBL]; vec3 BDR[NC*NBL];
vec4 HB[NH];
vec3 LBC[4]; vec3 LBH[4];
int layerOf(int c){ return c < 3 ? 0 : (c < 7 ? 1 : (c < 10 ? 2 : 3)); }

vec2 windAt(vec2 xz){
  float ph = TAU*(uT/T*3.0) - xz.x*1.6 + xz.y*2.2;           // 바람 물결이 오른쪽 앞으로 지나간다
  float w = 0.17 + 0.13*sin(ph) + 0.04*sin(TAU*(uT/T*5.0) - xz.x*3.1 + 1.0);
  return normalize(vec2(1.0, -0.55))*w;
}
vec3 stalkPerp(int k){ return SPP[k]; }
vec3 stalkP(int k, float s){                                  // 줄기 위 높이 비율 s 의 점: 휘어 오르며 가운데가 살짝 굽는다
  vec4 sd = SD[k];
  return SB[k] + vec3(sd.y*s*s, sd.x*s, sd.z*s*s) + stalkPerp(k)*SW[k]*sin(3.14159*s);
}
void setStalk(int k, vec3 b, float H, vec2 tip, float rad, float bow, float Lp, float prr, float dk){
  SB[k] = b; SD[k] = vec4(H, tip.x, tip.y, rad); SW[k] = bow; DK[k] = dk;
  SPP[k] = normalize(vec3(-tip.y, 0.0, tip.x) + vec3(1e-4, 0.0, 0.0));
  vec3 t0 = stalkP(k, 0.80), t1 = stalkP(k, 1.0);
  vec3 dir = normalize(t1 - t0);
  vec3 wd = normalize(vec3(tip.x, 0.0, tip.y) + vec3(0.6, 0.0, -0.33)*0.5);
  // 이삭: 꽃대를 따라 가지가 어긋나게 돋아 바람 쪽으로 늘어진다
  vec3 ax = normalize(dir*1.0 + wd*0.30 + vec3(0.0, 0.25, 0.0));
  PA[k] = stalkP(k, 0.88);
  PM[k] = ax*Lp;
  PN[k] = wd;
  PRR[k] = prr*0.85;
  vec3 pc = PA[k] + ax*Lp*0.45 + wd*0.08*Lp/0.36 + vec3(0.0, -0.06, 0.0)*Lp/0.36;
  PBS[k] = vec4(pc, Lp*1.0 + 0.10*Lp/0.36);
}
void prep(){
  seedPrep();
  for(int c=0;c<NC;c++){
    float fc = float(c);
    vec3 cb; float layer;
    if(c < 3){ cb = vec3(-1.05 + 1.10*fc + 0.15*h11(fc), -0.93, 0.28 + 0.10*h11(fc + 7.0)); layer = 0.0; }
    else if(c < 7){ cb = vec3(-1.62 + 1.08*(fc - 3.0) + 0.3*h11(fc), -0.93, 0.80 + 0.25*h11(fc + 3.0)); layer = 1.0; }
    else if(c < 10){ cb = vec3(-1.10 + 1.05*(fc - 7.0) + 0.2*h11(fc), -0.93, 1.36 + 0.18*h11(fc + 1.0)); layer = 2.0; }
    else { cb = vec3(0.10, -0.93, 2.30); layer = 3.0; }                  // 달문 너머 한 무리
    vec3 mn = vec3(1e9), mx = vec3(-1e9);
    for(int j=0;j<NB;j++){
      int k = c*NB + j; float fj = float(j), hk = h11(float(k)*3.17 + 0.5), hk2 = h11(float(k)*7.31 + 2.0);
      float a = fj*2.0944 + fc;
      vec3 b = cb + vec3(cos(a), 0.0, sin(a))*0.06*(0.5 + hk);
      float H = (layer < 0.5 ? 1.00 : 1.15 + 0.08*layer) + 0.35*hk;
      vec2 lean = vec2(cos(a), sin(a))*0.16*(0.5 + hk2);
      if(layer < 0.5) lean += vec2(0.0, -0.46 - 0.16*hk);           // 앞줄은 관객 쪽으로 기울어 이삭이 틀 밖으로
      vec2 w = windAt(b.xz)*(0.8 + 0.4*hk2);
      setStalk(k, b, H, lean + w, 0.0055 + 0.0022*hk, 0.05*(hk2 - 0.5), 0.34 + 0.08*hk, 0.0105 + 0.002*hk2, layer);
      mn = min(mn, min(b, PBS[k].xyz - PBS[k].w)); mx = max(mx, max(b + vec3(0.0, H*0.5, 0.0), PBS[k].xyz + PBS[k].w));
    }
    // 밑동에서 휘어 늘어지는 가는 잎
    for(int j=0;j<NBL;j++){
      int k = c*NBL + j; float hb = h11(float(k)*5.3 + 1.0);
      float a = float(j)*3.14159 + fc*0.9 + 0.3;
      vec3 o = vec3(cos(a), 0.0, sin(a));
      vec2 w = windAt(cb.xz)*0.5;
      float Lb = 0.55 + 0.30*hb;
      BA0[k] = cb + o*0.02;
      BBA[k] = (o*0.30 + vec3(0.0, 0.70, 0.0))*Lb;
      BDR[k] = (o*0.38 + vec3(w.x, -0.80, w.y))*Lb;
      vec3 e0 = BA0[k] + BBA[k]*0.6 + BDR[k]*0.36, e1 = BA0[k] + BBA[k] + BDR[k];
      mn = min(mn, min(e0, e1)); mx = max(mx, max(e0, e1));
    }
    CB[c] = (mn + mx)*0.5; CBD[c] = vec4((mx - mn)*0.5 + 0.06, 0.0);
  }
  for(int l=0;l<4;l++){ LBC[l] = vec3(1e9); LBH[l] = vec3(-1e9); }
  for(int c=0;c<NC;c++){ int l = layerOf(c); LBC[l] = min(LBC[l], CB[c] - CBD[c].xyz); LBH[l] = max(LBH[l], CB[c] + CBD[c].xyz); }
  for(int l=0;l<4;l++){ vec3 a = LBC[l], b = LBH[l]; LBC[l] = (a + b)*0.5; LBH[l] = (b - a)*0.5; }
  // 앞 모서리의 큰 억새 둘: 바람에 크게 휩쓸려 이삭이 틀을 넘어 관객 앞까지 나온다
  for(int i=0;i<NH;i++){
    int k = NC*NB + i; float fi = float(i);
    vec3 b = i == 0 ? vec3(-1.62, -0.93, 0.16) : vec3(1.58, -0.93, 0.22);
    vec2 w = windAt(b.xz)*1.7;
    vec2 tip = (i == 0 ? vec2(0.55, -0.80) : vec2(-0.20, -0.85)) + w;
    setStalk(k, b, 1.55 - 0.1*fi, tip, 0.0085, 0.06*(fi - 0.5), 0.58, 0.017, 0.0);
    vec3 mid = (b + PBS[k].xyz)*0.5;
    HB[i] = vec4(mid, length(PBS[k].xyz - b)*0.5 + PBS[k].w + 0.1);
  }
}
float plumeD(int k, vec3 p, out float hh){
  vec3 a0 = PA[k], ax = PM[k]; float Lp = length(ax); vec3 axn = ax/Lp;
  vec3 e1 = normalize(cross(axn, vec3(0.0, 1.0, 0.0)) + 1e-4), e2 = cross(e1, axn);
  float sc = Lp/0.36;
  float d = 1e9; hh = 0.0;
  for(int i=0;i<7;i++){
    float fi = float(i), hs = h11(float(k)*7.7 + fi*3.1);
    float side = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
    float at = fi/6.0;
    vec3 a = a0 + ax*0.42*at;
    float sp = side*(0.22 + 0.25*(1.0 - at))*(0.7 + 0.6*hs);
    vec3 sd = normalize(axn + e1*sp + e2*(hs - 0.5)*0.35);
    vec3 ba = sd*Lp*(0.95 - 0.40*at)*(0.85 + 0.30*hs);
    vec3 dr = (PN[k]*0.10 + vec3(0.0, -0.11 - 0.06*hs, 0.0))*(1.0 - 0.3*at)*sc;   // 끝으로 갈수록 바람 쪽 아래로 처진다
    float h = clamp(dot(p - a, ba)/dot(ba, ba), 0.0, 1.0);
    float r = PRR[k]*(0.50 + 0.50*sin(3.14159*min(h*0.8 + 0.2, 1.0)));
    float di = length(p - a - ba*h - dr*h*h) - r;
    if(di < d){ d = di; hh = at*0.4 + h*0.6; }
  }
  return d*0.72;
}
float stalkD(int k, vec3 p){
  vec4 sd = SD[k];
  float s = clamp((p.y - SB[k].y)/sd.x, 0.0, 0.90);
  vec3 c = stalkP(k, s);
  vec3 sl3 = vec3(2.0*sd.y*s, 0.0, 2.0*sd.z*s)/sd.x + stalkPerp(k)*SW[k]*3.14159*cos(3.14159*s)/sd.x;
  float d = length(p - c)/sqrt(1.0 + dot(sl3, sl3)) - sd.w*(1.0 - 0.45*s);
  return d*0.75;
}
float bladeD(int k, vec3 p){
  vec3 a = BA0[k], ba = BBA[k];
  float h = clamp(dot(p - a, ba)/dot(ba, ba), 0.0, 1.0);
  return (length(p - a - ba*h - BDR[k]*h*h) - 0.0090*(1.0 - 0.75*h))*0.6;
}
int KK; float KH; int KT;

void stalkPlume(int k, vec3 p, bool wantMat, inout float d){
  float hh = 0.0;
  float pb = length(p - PBS[k].xyz) - PBS[k].w;
  float dp = pb > 0.2 ? pb : min(plumeD(k, p, hh), 0.2);
  if(dp < d){ d = dp; if(wantMat){ KK = k; KH = hh; KT = 1; } }
  float sb = sdCap(p, SB[k], PA[k], abs(SW[k]) + 0.04 + 0.2*length(SD[k].yz));         // 줄기 겉 테: 멀면 줄기 거리를 건너뛴다
  float ds = sb > 0.15 ? sb : min(stalkD(k, p), 0.15);
  if(ds < d){ d = ds; if(wantMat){ KK = k; KT = 0; } }
}
float scn(vec3 p, bool wantMat){
  // 상자 벽 너머(천장 위·바닥 밑·옆벽 밖)엔 아무것도 없다: 그림자 광선이 그곳을 지날 때 값싸게 넘긴다
  if(p.z > 0.0){ float ob = max(max(abs(p.x) - 1.96, p.y - 0.97), -0.97 - p.y); if(ob > 0.02) return ob; }
  float d = 1e9;
  // 달문 둘레 돌 테두리
  {
    float rr = length(p.xy - GC);
    float d2 = max(rr - GR - 0.07, GR - rr);
    float dz = abs(p.z - DT + 0.012) - 0.032;
    float dr = length(max(vec2(d2, dz), 0.0)) + min(max(d2, dz), 0.0) - 0.006;
    if(dr < d){ d = dr; if(wantMat){ KT = 2; } }
  }
  // 날아오는 씨앗 술
  for(int i=0;i<NSEED;i++){
    vec3 r = p - SP[i];
    float bd = length(r) - 0.06;
    if(bd > 0.3){ d = min(d, bd); continue; }
    if(SPS[i] < 0.002) continue;
    float ds = length(r*vec3(1.0, 1.4, 0.8)) - SPS[i];
    if(ds < 0.02) ds += SPS[i]*0.6*(vnoise3(r*150.0 + float(i)*5.0) - 0.5);
    ds = min(ds*0.7, 0.3);
    if(ds < d){ d = ds; if(wantMat){ KT = 3; } }
  }
  bool near[4];
  for(int l=0;l<4;l++){ float lb = sdBox(p - LBC[l], LBH[l]); near[l] = lb < 0.3; if(!near[l]) d = min(d, lb); }
  for(int c=0;c<NC;c++){
    if(!near[layerOf(c)]) continue;
    float bd = sdBox(p - CB[c], CBD[c].xyz);
    if(bd > 0.3){ d = min(d, bd); continue; }
    for(int j=0;j<NB;j++) stalkPlume(c*NB + j, p, wantMat, d);
    for(int j=0;j<NBL;j++){
      float db = min(bladeD(c*NBL + j, p), 0.3);
      if(db < d){ d = db; if(wantMat){ KK = c*NB; KT = 4; } }
    }
  }
  for(int i=0;i<NH;i++){
    float bd = length(p - HB[i].xyz) - HB[i].w;
    if(bd > 0.3){ d = min(d, bd); continue; }
    stalkPlume(NC*NB + i, p, wantMat, d);
  }
  return d;
}
float map(vec3 p){ return scn(p, false); }
M mat(vec3 p, vec3 n){
  scn(p, true);
  float hk = h11(float(KK)*3.17 + 0.5);
  float ang = acos(clamp(dot(VRD, MD), -1.0, 1.0));
  float gl = exp(-ang*ang/(0.20*0.20));                          // 달을 등진 이삭일수록 빛이 술 사이로 비친다
  float edge = 1.0 - max(dot(n, -VRD), 0.0);
  if(KT == 2){
    vec3 c = L(vec3(0.58, 0.56, 0.52))*(0.8 + 0.3*vnoise(p.xy*40.0))*(0.9 + 0.15*fbm(p.xy*6.0));
    float jt = abs(fract(atan(p.y - GC.y, p.x - GC.x)/TAU*28.0) - 0.5);       // 돌 이음매
    c *= 0.55 + 0.45*smoothstep(0.0, 0.04, jt);
    M m = mk(c, 0.7, 0.0); m.bump = 0.2; m.bumpF = 80.0; return m;
  }
  if(KT == 3){
    M m = mk(L(vec3(0.88, 0.84, 0.74)), 0.9, 0.0); m.wrap = 0.7; m.sss = 0.8;
    m.emit = L(vec3(0.95, 0.90, 0.78))*(0.10 + 0.9*gl)*(0.4 + 0.6*edge); return m;
  }
  float dk = KT == 4 ? DK[KK] : DK[KK];
  float shade = dk < 0.5 ? 0.28 : (dk < 1.5 ? 0.62 : 1.0);         // 앞줄은 어두운 실루엣, 달문 가까이는 밝게
  if(KT == 0 || KT == 4){
    vec3 c = mix(L(vec3(0.40, 0.34, 0.24)), L(vec3(0.60, 0.53, 0.38)), hk)*(0.8 + 0.3*vnoise(p.xy*vec2(20.0, 300.0)))*shade;
    if(KT == 4) c = mix(c, L(vec3(0.34, 0.36, 0.22))*shade, 0.5);    // 잎은 마른 풀빛
    M m = mk(c, 0.82, 0.0); m.wrap = 0.3; m.sss = 0.15;
    m.emit = L(vec3(0.85, 0.85, 0.80))*0.25*gl*edge*edge;
    return m;
  }
  // 이삭: 은빛과 옅은 금빛이 섞인 보송한 술. 밑동은 엷은 자줏빛
  float st = vnoise(vec2(dot(p, vec3(1.0, 0.3, 1.0))*140.0, KH*4.0));
  vec3 c = mix(L(vec3(0.60, 0.50, 0.48)), L(vec3(0.78, 0.73, 0.62)), smoothstep(0.0, 0.5, KH))*(0.82 + 0.25*st)*shade;
  M m = mk(c, 0.9, 0.0);                                                    // 거칠기 0.8 이상: 흐린 반사 추적을 건너뛴다
  m.wrap = 0.7; m.sss = 0.6; m.bump = 0.5; m.bumpF = 320.0;
  float gl2 = exp(-ang*ang/(0.32*0.32));
  m.emit = L(vec3(1.0, 0.92, 0.74))*(1.5*gl*(0.25 + 0.75*edge*edge) + 0.35*gl2*edge*edge + 0.05*edge)*(0.6 + 0.6*st)*(0.35 + 0.65*shade);   // 달빛이 술 끝을 금은빛으로 태운다
  return m;
}
