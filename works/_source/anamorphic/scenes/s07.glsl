// s07 알밤 굴러온다 — 벽돌 계단 위 아치 구멍에서 반질반질한 왕밤과 도토리가 하나씩 굴러 나와, 계단을 통통 튀어 내려오고 틀 끝을 넘어 관객 쪽으로 굴러떨어진다. 뒤에는 벌어진 밤송이.
// @lib _autumn
// @post {"exposure":1.04,"sat":1.15,"contrast":1.1,"bloom":0.06}
#define DT 2.0
#define LKD vec3(-0.50, 0.58, -0.66)
#define KEYC vec3(2.9, 2.35, 1.65)
#define AMB_TOP L(vec3(0.66, 0.54, 0.44))
#define AMB_BOT L(vec3(0.42, 0.29, 0.19))
#define ROOM L(vec3(0.32, 0.22, 0.15))
#define HAS_WALLLIGHT
#define BRICK1 L(vec3(0.52, 0.25, 0.16))
#define BRICK2 L(vec3(0.68, 0.40, 0.26))
#define MORTAR L(vec3(0.60, 0.55, 0.47))
#define BRICK_AGE 0.45
#define RIMD vec3(0.45, 0.75, 0.55)
#define RIMC (L(vec3(1.0, 0.80, 0.55))*1.0)
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_PREP
#define NN 8
#define NS 3
const float SD = 0.36, SH = 0.17;                 // 계단 디딤 깊이 · 높이
const float AW = 0.30;                            // 아치 반너비
float stepTop(int i){ return -0.93 + float(i + 1)*SH; }
float stepFront(int i){ return DT - float(NS - i)*SD; }
bool backHole(vec3 q){
  float yb = stepTop(NS - 1), ys = yb + 0.26;
  vec2 d = vec2(q.x, q.y - ys);
  return (abs(q.x) < AW && q.y > yb && q.y < ys) || length(d) < AW;
}
vec3 outside(vec3 rd, vec3 ro){                                      // 아치 너머 굴: 깊은 곳에 따뜻한 등불
  float off = length(rd.xy/max(rd.z, 0.1) - vec2(0.0, -0.035));
  return L(vec3(0.25, 0.10, 0.04))*0.25 + L(vec3(1.0, 0.62, 0.30))*1.6*exp(-off*off/(0.028*0.028));
}

#define NLV 5
vec3 LVP[NLV]; mat3 LVR[NLV];
void leavesPrep(){
  for(int i=0;i<NLV;i++){
    float fi = float(i);
    vec3 b;
    if(i == 0) b = vec3(-0.75, stepTop(1) + 0.010, 1.42);
    else if(i == 1) b = vec3(0.95, stepTop(0) + 0.010, 1.10);
    else if(i == 2) b = vec3(-0.30, -0.93 + 0.010, 0.62);
    else if(i == 3) b = vec3(1.35, -0.93 + 0.010, 0.25);
    else b = vec3(0.55, stepTop(2) + 0.010, 1.86);
    LVP[i] = b;
    vec3 zax = vec3(0.0, 1.0, 0.0), xax = normalize(cross(vec3(sin(fi*2.3 + 0.4), 0.0, cos(fi*2.3 + 0.4)), zax));
    LVR[i] = mat3(xax, cross(zax, xax), zax);
  }
}
#define ISACORN(i) (i == 2 || i == 5)
// 굴 속 등불이 아치 둘레 벽돌과 계단을 따뜻하게 물들인다
vec3 wallLight(vec3 p, vec3 n){
  vec3 lp = vec3(0.0, -0.20, DT + 0.25);
  vec3 d = lp - p; float r2 = dot(d, d);
  return L(vec3(1.0, 0.60, 0.28))*0.55*max(dot(n, normalize(d)) + 0.3, 0.0)/(1.0 + r2*6.0);
}
vec3 NP[NN]; mat3 NR[NN]; float NRAD[NN];
void prep(){
  leavesPrep();
  float v = 0.80, g = 6.0;
  float hD[5]; hD[0] = 0.36; hD[1] = 0.42; hD[2] = 0.52; hD[3] = 0.30; hD[4] = 0.17;
  for(int i=0;i<NN;i++){
    float fi = float(i);
    float r = ISACORN(i) ? 0.15 : 0.19 + 0.03*h11(fi*3.3);      // 1·4 번은 도토리
    NRAD[i] = r;
    float s = mod(uT - fi*(T/float(NN)), T);
    float lane = mix(-0.65, 1.0, h11(fi*5.71 + 0.4));
    float x = mix(0.0, lane, smoothstep(0.6, 2.6, s));
    float zs = DT + 0.50;
    float tD = 0.55;                                                    // 벽 뒤 위에서 굴로 떨어진다 (안 보이는 곳)
    float tR = tD + (zs - stepFront(NS - 1))/v;                         // 굴 속에서 계단 끝까지 구르기
    float y, z;
    float spin;
    if(s < tD){ z = zs; y = stepTop(NS - 1) + r + 0.5*g*(tD - s)*(tD - s); }
    else if(s < tR){ z = zs - v*(s - tD); y = stepTop(NS - 1) + r + abs(sin(3.14159*(s - tD)/0.35))*0.06*exp(-(s - tD)*5.0); }
    else {
      float t = s - tR; z = stepFront(NS - 1) - v*t;
      // 계단 셋 → 바닥 → 작은 튐 둘: 디딤마다 포물선 하나
      float ya = stepTop(NS - 1) + r; y = -99.0;
      for(int k=0;k<5;k++){
        float yb = k < 2 ? stepTop(NS - 2 - k) + r : -0.93 + r;
        if(y < -50.0){
          if(t < hD[k]) y = arcY(ya, yb, t, hD[k], g);
          else { t -= hD[k]; ya = yb; }
        }
      }
      if(y < -50.0){
        // 바닥을 굴러 틀 끝에서 턱에 걸려 튀어 오르며 관객 쪽으로 떨어진다
        float zl = z + v*t;                                            // 마지막 튐이 끝난 곳
        float tl = zl/v;
        if(t < tl) y = -0.93 + r;
        else { float u = t - tl; y = -0.93 + r + 2.6*u - 0.5*g*u*u; z -= 0.9*u + 0.7*u*u; }   // 턱에 걸려 크게 튀어 관객 코앞으로
      }
    }
    if(s > 7.0) { y = -60.0; }                                         // 다 떨어진 뒤 치워 둔다
    NP[i] = vec3(x, y, z);
    spin = (zs - z)/r + (s < tD ? 0.0 : 0.0);
    NR[i] = rotA(vec3(1.0, 0.15*(h11(fi) - 0.5), 0.0), -spin)*rotA(normalize(vec3(h11(fi*2.0) - 0.5, 0.4, h11(fi*4.0) - 0.5)), fi*1.7);
  }
}
// 정적인 것: 계단 · 밤송이 셋 (+ 속 밤)
const vec3 BU0 = vec3(-1.42, 0.0, 1.84), BU1 = vec3(1.48, 0.0, 1.80), BU2 = vec3(-1.25, 0.0, 0.80);
const float BUR = 0.25;
vec3 burrC(int i){
  if(i == 0) return vec3(BU0.x, stepTop(NS - 1) + BUR*0.86, BU0.z);
  if(i == 1) return vec3(BU1.x, stepTop(NS - 1) + BUR*0.86, BU1.z);
  return vec3(BU2.x, -0.93 + BUR*0.86, BU2.z);
}
mat3 burrR(int i){ return rotA(vec3(1, 0, 0), i == 2 ? -0.55 : -0.70)*rotA(vec3(0, 1, 0), 0.4 + float(i)*0.9); }
int KIND; vec3 KQ; int KI; float KP;
float stairs(vec3 p, out float part){
  float d = 1e9; part = 0.0;
  for(int i=0;i<NS;i++){
    float yt = stepTop(i), zf = stepFront(i);
    float body = sdBox(p - vec3(0.0, (yt - 0.035 - 0.95)*0.5, (zf + DT + 0.2)*0.5), vec3(2.1, (yt - 0.035 + 0.95)*0.5, (DT + 0.2 - zf)*0.5));
    float slab = sdRBox(p - vec3(0.0, yt - 0.0175, (zf - 0.025 + DT + 0.2)*0.5), vec3(2.1, 0.0175, (DT + 0.2 - zf + 0.025)*0.5), 0.008);
    if(slab < d && slab < body){ part = 1.0; }
    else if(body < d){ part = 0.0; }
    d = min(d, min(body, slab));
  }
  return d;
}
float scn(vec3 p){
  float part;
  float d = stairs(p, part); KIND = 0; KP = part; KQ = p;
  float da = max(sdBox(vec3(0.0, 0.0, p.z - DT + 0.02), vec3(9.0, 9.0, 0.035)), 0.0);
  {
    float yb = stepTop(NS - 1), ys = yb + 0.26;
    vec2 q = vec2(abs(p.x), p.y - ys);
    float inner = q.y > 0.0 ? length(q) - AW : max(q.x - AW, yb - p.y);
    float d2 = max(max(inner - 0.075, -inner), yb - p.y);
    float dz = abs(p.z - DT + 0.015) - 0.035;
    da = length(max(vec2(d2, dz), 0.0)) + min(max(d2, dz), 0.0) - 0.006;
  }
  if(da < d){ d = da; KIND = 0; KP = 1.0; KQ = p; }
  for(int i=0;i<3;i++){
    vec3 c = burrC(i); vec3 r = p - c;
    float bd = length(r) - BUR*1.5;
    if(bd > 0.3){ d = min(d, bd); continue; }
    vec3 q = transpose(burrR(i))*r;
    float pb; float db = min(sdBurr(q, BUR, i == 2 ? 0.22 : 0.16, pb), 0.3);
    float fy = i == 2 ? -0.93 : stepTop(NS - 1);
    db = max(db, fy - p.y);                                               // 바닥 아래로는 자른다
    if(db < d){ d = db; KIND = 1; KQ = q; KI = i; KP = pb; }
    // 벌어진 속에 밤 셋이 옹기종기
    for(int j=0;j<3;j++){
      float a = float(j)*2.0944 + 0.5;
      vec3 u = vec3(cos(a), 0.0, sin(a));
      vec3 up = normalize(vec3(0.0, 1.0, 0.0) + u*0.45);
      vec3 zl = normalize(u - dot(u, up)*up), xl = cross(up, zl);
      vec3 cq = q - (u*0.26*BUR + vec3(0.0, -0.08*BUR, 0.0));
      cq = vec3(dot(cq, xl), dot(cq, up), dot(cq, zl));
      float dc = sdChestnut(cq, 0.50*BUR);
      if(dc < d){ d = dc; KIND = 2; KQ = cq/(0.50*BUR)*0.19; KI = 10 + i*3 + j; KP = 0.0; }
    }
  }
  // 계단·바닥에 떨어진 단풍잎 몇 장
  for(int i=0;i<NLV;i++){
    vec3 r = p - LVP[i];
    float bd = length(r) - 0.24;
    if(bd > 0.3){ d = min(d, bd); continue; }
    float dl = min(sdLeaf(transpose(LVR[i])*r, 0.22, 0.25), 0.3);
    if(dl < d){ d = dl; KIND = 4; KQ = transpose(LVR[i])*r; KI = i; KP = 0.0; }
  }
  for(int i=0;i<NN;i++){
    vec3 r = p - NP[i];
    float bd = length(r) - NRAD[i]*1.6;
    if(bd > 0.3){ d = min(d, bd); continue; }
    vec3 q = transpose(NR[i])*r;
    float pa = 0.0;
    float dn = ISACORN(i) ? sdAcorn(q, NRAD[i], pa) : sdChestnut(q, NRAD[i]);
    dn = min(dn, 0.3);
    if(dn < d){ d = dn; KIND = ISACORN(i) ? 3 : 2; KQ = q/NRAD[i]*0.19; KI = i; KP = pa; }
  }
  return d;
}
float map(vec3 p){ return scn(p); }
M mat(vec3 p, vec3 n){
  scn(p);
  vec3 q = KQ;
  if(KIND == 0){
    if(KP > 0.5){
      // 디딤돌: 옅은 화강암
      vec3 c = L(vec3(0.62, 0.58, 0.52))*(0.85 + 0.25*vnoise(p.xz*40.0))*(0.9 + 0.15*fbm(p.xz*6.0));
      c *= 1.0 - 0.35*step(0.86, h21(floor(p.xz*90.0)));                 // 검은 알갱이
      M m = mk(c, 0.55, 0.0); m.bump = 0.15; m.bumpF = 90.0; return m;
    }
    vec2 uv = abs(n.z) > 0.5 ? p.xy : (abs(n.x) > 0.5 ? p.zy : p.xz);
    vec4 b = brickAlb(uv + vec2(0.0, 0.04), vec2(0.24, 0.08), 5.0, BRICK1, BRICK2, MORTAR);
    M m = mk(b.rgb, 0.85, 0.0); m.bump = 0.25; m.bumpF = 60.0; return m;
  }
  if(KIND == 1){
    float r = length(q)/BUR;
    if(KP > 0.5){
      // 가시: 밑은 올리브갈색, 끝은 마른 짚빛으로 옅어진다
      vec3 c = mix(L(vec3(0.34, 0.29, 0.13)), L(vec3(0.74, 0.64, 0.42)), smoothstep(0.98, 1.40, r));
      M m = mk(c, 0.7, 0.0); m.wrap = 0.35; m.sss = 0.25; return m;
    }
    // 껍질: 바깥은 올리브갈색, 안쪽은 보송한 솜털 크림색
    float inner = dot(n, normalize(-q)) > 0.15 ? 1.0 : 0.0;
    vec3 c = mix(L(vec3(0.36, 0.30, 0.14)), L(vec3(0.70, 0.60, 0.44)), inner);
    M m = mk(c*(0.85 + 0.25*vnoise(q.xz*90.0)), 0.95, 0.0);
    m.sss = 0.45*inner; m.wrap = 0.4*inner; m.bump = 0.45; m.bumpF = 220.0; return m;
  }
  if(KIND == 4){
    vec3 b = leafBend(q, 0.22, 0.25);
    float hc = h11(float(KI)*3.7 + 1.0);
    vec3 c = mix(L(vec3(0.70, 0.07, 0.03)), L(vec3(0.92, 0.36, 0.04)), hc);
    c = mix(c*vec3(1.05, 1.2, 0.6), c, smoothstep(0.05, 0.55, length(b.xy)));
    c = mix(c, c*vec3(1.4, 1.25, 0.7) + 0.02, (1.0 - smoothstep(0.008, 0.024, mapleVein(b.xy)))*0.7);
    M m = mk(c, 0.5, 0.0); m.sss = 0.2; m.coat = 0.2; return m;
  }
  float hh = h11(float(KI)*7.3);
  if(KIND == 2){
    // 밤: 반질한 적갈색 껍질, 세로 결, 밑동은 거친 베이지, 꼭지 털
    float base = smoothstep(-0.120, -0.135, q.y);
    float tip = smoothstep(0.17, 0.20, q.y);
    float a = atan(q.z, q.x);
    vec3 c = mix(L(vec3(0.52, 0.25, 0.11)), L(vec3(0.60, 0.31, 0.13)), hh);
    c *= 0.90 + 0.10*sin(a*22.0 + 3.0*vnoise(q.xy*30.0));
    c *= 0.85 + 0.25*vnoise(vec2(a*9.0, q.y*5.0));
    c = mix(c, L(vec3(0.70, 0.60, 0.42))*(0.8 + 0.3*vnoise(q.xz*120.0)), base);
    c = mix(c, L(vec3(0.66, 0.60, 0.50)), tip);
    M m = mk(c, mix(0.34, 0.9, max(base, tip)), 0.0);
    m.coat = 0.22*(1.0 - base)*(1.0 - tip); m.bump = 0.06 + 0.3*base; m.bumpF = 140.0;
    return m;
  }
  // 도토리: 매끈한 새틴 황갈색 열매, 끝은 옅은 빛. 깍정이는 무광 회갈색 비늘
  if(KP > 0.5){
    float v = (q.y - 0.22*0.19)/0.19*11.0, row = floor(v);
    float ax = atan(q.z, q.x)/TAU*30.0 + 0.5*mod(row, 2.0) + 0.25*(h11(row*3.7) - 0.5);
    float hs = h21(vec2(floor(ax), row));
    vec3 c = mix(L(vec3(0.34, 0.28, 0.21)), L(vec3(0.44, 0.35, 0.24)), hs)*(0.80 + 0.25*(1.0 - fract(v)))*(0.85 + 0.25*vnoise(q.xz*260.0));
    M m = mk(c, 0.92, 0.0); m.bump = 0.2; m.bumpF = 260.0; return m;
  }
  float a = atan(q.z, q.x);
  vec3 c = mix(L(vec3(0.70, 0.48, 0.20)), L(vec3(0.52, 0.30, 0.12)), smoothstep(0.04, -0.20, q.y));
  c *= 0.92 + 0.08*sin(a*14.0 + vnoise(q.xy*20.0)*2.0);
  c = mix(c, L(vec3(0.80, 0.72, 0.50)), smoothstep(-0.20, -0.26, q.y));   // 끝은 옅은 빛
  M m = mk(c, 0.38, 0.0); m.coat = 0.18;
  return m;
}
