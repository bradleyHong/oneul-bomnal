// X06 눈사람 깜짝 상자 — 바닥의 선물 상자 뚜껑이 열리고, 용수철에 달린 눈사람 머리가 '보잉' 하고 관객 코앞까지 튀어나온다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.22,"contrast":1.1,"bloom":0.07}
#define DT 1.8
#define SNOW 6
#define SNOWD 0.13
#define FLOOR_REFL 0.14
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.38, 0.36, 0.46))
#define AMB_BOT L(vec3(0.20, 0.15, 0.20))
#define CYE L(vec3(1.0, 0.30, 0.40))
#define HAS_PREP
const vec3 BOX = vec3(0.0, 0.0, 1.05); const vec3 BB = vec3(0.42, 0.34, 0.42);
float LC, LID; mat3 SPR;
float springLen(float t){
  float tau = mod(t, 7.5);
  if(tau < 1.0) return 0.25;                                 // 닫혀 있음
  float u = tau - 1.0, w = TAU/1.35, e = exp(-0.85*u);
  float L0 = 1.25;
  float v = L0 - (L0 - 0.25)*cos(w*u)*e + 1.85*sin(w*u)*e;
  return tau > 6.3 ? mix(v, 0.25, ease((tau - 6.3)/1.2)) : v;   // 다시 상자 속으로
}
void prep(){
  LC = springLen(uT);
  float tau = mod(uT, 7.5);
  LID = tau < 1.0 ? 0.0 : (tau < 1.25 ? ease((tau - 1.0)/0.25)*2.1 : (tau > 6.6 ? 2.1*(1.0 - ease((tau - 6.6)/0.7)) : 2.1));
  float sw = TAU*uT/T;
  // 용수철은 위로, 튀어 오를 때 관객 쪽으로 기운다
  SPR = rotA(vec3(1, 0, 0), -1.05*smoothstep(0.3, 1.2, LC) - 0.08*sin(sw*2.0))*rotA(vec3(0, 0, 1), 0.18*sin(sw));
}
// 눈사람 머리: 큰 눈 공 + 당근 코 + 모자
float headD(vec3 q){
  float ball = length(q) - 0.26;
  float nose = sdCap(q, vec3(0, 0.0, -0.22), vec3(0, -0.02, -0.40), 0.035);
  float hat = min(sdCyl(q - vec3(0, 0.36, 0), 0.15, 0.13), sdCyl(q - vec3(0, 0.22, 0), 0.25, 0.018)) - 0.006;
  return min(ball, min(nose, hat));
}
vec3 bxc(){ return vec3(BOX.x, -HO.y + BB.y, BOX.z); }
// 머리는 용수철 끝에 붙되 늘 똑바로 서서 관객을 본다
vec3 headLocal(vec3 p){ vec3 hc = bxc() + vec3(0, -BB.y + 0.05, 0) + SPR*vec3(0, LC + 0.22, 0); return p - hc - vec3(0, 0.04, 0); }
float map(vec3 p){
  vec3 c = bxc();
  vec3 q = p - c;
  // 열린 상자: 겉 - 속
  float box = max(sdRBox(q, BB, 0.02), -sdBox(q - vec3(0, 0.05, 0), BB - 0.035));
  // 뚜껑: 뒤쪽 위 모서리 경첩으로 열린다
  vec3 hq = q - vec3(0, BB.y, BB.z);
  hq.yz = rot(LID)*hq.yz;
  float lid = sdRBox(hq - vec3(0, 0.035, -BB.z), vec3(BB.x + 0.02, 0.035, BB.z + 0.02), 0.015);
  // 용수철 + 머리 (상자 바닥에서 위로, 지역 +z = 용수철 축)
  vec3 sq = transpose(SPR)*(p - (c + vec3(0, -BB.y + 0.05, 0)));
  vec3 cq = vec3(sq.x, sq.z, sq.y);                          // 축을 +y 로
  float coil = sdCoil(cq, LC, 6.0, 0.17, 0.035);
  vec3 hq2 = headLocal(p);
  float head = headD(hq2);
  return min(min(box, lid), min(coil, head));
}
M mat(vec3 p, vec3 n){
  vec3 c = bxc(); vec3 q = p - c;
  vec3 sq = transpose(SPR)*(p - (c + vec3(0, -BB.y + 0.05, 0)));
  vec3 hq2 = headLocal(p);
  if(headD(hq2) < 0.006){
    if(hq2.y > 0.20) { M m = mk(vec3(0.02), 0.35, 0.0); if(abs(hq2.y - 0.27) < 0.03) m.alb = XRED; return m; }   // 모자 + 빨간 띠
    if(hq2.z < -0.21 && length(hq2.xy - vec2(0, -0.01)) < 0.05) return mk(vec3(1.0, 0.32, 0.03), 0.3, 0.0);   // 당근 코
    M m = mk(XSNOW, 0.75, 0.0); m.wrap = 0.3; m.sss = 0.8; m.glit = 280.0; m.bump = 0.25; m.bumpF = 22.0;   // 뭉친 눈
    float eye = min(length(hq2 - vec3(-0.09, 0.07, -0.235)), length(hq2 - vec3(0.09, 0.07, -0.235))) - 0.03;
    float smile = 1e9; for(int i=0;i<5;i++){ float a = -0.6 + float(i)*0.3; smile = min(smile, length(hq2 - vec3(sin(a)*0.13, -0.08 + 0.04*(1.0 - cos(a*1.5)), -0.235)) - 0.017); }
    if(min(eye, smile) < 0.0) m.alb = vec3(0.015);
    return m;
  }
  float coil = sdCoil(vec3(sq.x, sq.z, sq.y), LC, 6.0, 0.17, 0.035);
  if(coil < 0.006){ float st = step(0.5, fract(atan(sq.z, sq.x)/TAU*2.0 + sq.y*3.0)); M m = mk(mix(vec3(0.75), XRED, st), 0.25, 0.0); m.coat = 1.0; return m; }   // 사탕 줄무늬 용수철
  // 상자: 빨강 + 금 리본 띠
  vec3 bq = q;
  float rib = step(abs(bq.x), 0.06) + step(abs(bq.z), 0.06);
  M m = mk(mix(XRED, XGOLD, min(rib, 1.0)), 0.42, min(rib, 1.0)); m.bump = 0.10; m.bumpF = 70.0; m.coat = 0.5; m.glit = rib*240.0;
  return m;
}
