// X13 선물 탑 — 셋이 쌓인 선물 상자의 뚜껑이 차례로 '펑' 열리고, 오너먼트가 불꽃처럼 솟아 관객 쪽으로 쏟아진다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.25,"contrast":1.1,"bloom":0.08}
#define DT 1.8
#define SNOW 6
#define SNOWD 0.12
#define FLOOR_REFL 0.14
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.38, 0.36, 0.44))
#define AMB_BOT L(vec3(0.20, 0.15, 0.18))
#define CYE L(vec3(1.0, 0.35, 0.45))
#define HAS_PREP
#define NO 15
vec3 BC[3]; vec3 BB[3]; float LO[3];
vec3 OP[NO]; float OR2[NO];
void prep(){
  BB[0] = vec3(0.55, 0.30, 0.45); BB[1] = vec3(0.42, 0.24, 0.36); BB[2] = vec3(0.30, 0.19, 0.27);
  float y = -HO.y;
  for(int i=0;i<3;i++){ y += BB[i].y; BC[i] = vec3(0.0, y, 1.10); y += BB[i].y; }
  for(int i=0;i<3;i++){
    float t0 = 1.5 + float(i)*4.0;                            // 위에서부터? 아래부터: 맨 위 상자가 먼저
    float u = uT - t0;
    LO[i] = u > 0.0 && u < 3.2 ? sin(3.14159*clamp(u/3.2, 0.0, 1.0)) : 0.0;
  }
  for(int j=0;j<NO;j++){
    float fj = float(j);
    int b = j/5;
    float t0 = 1.5 + float(2 - b)*4.0 + 0.1;
    float u = uT - t0;
    vec3 top = BC[2 - b] + vec3(0, BB[2 - b].y, 0);
    float a = fj*2.39996;
    vec3 v = vec3(cos(a)*0.9, 2.6 + 0.6*h11(fj*3.1), -1.2 - 0.9*h11(fj*7.3));
    OR2[j] = (0.09 + 0.05*h11(fj*5.7))*smoothstep(0.0, 0.15, u)*step(u, 4.5);
    OP[j] = u > 0.0 ? top + v*u + vec3(0, -0.5*3.0*u*u, 0) : top - vec3(0, 0.2, 0);
  }
}
float boxAt(int i, vec3 p, out float part){
  vec3 q = p - BC[i];
  float lidLift = LO[i]*0.5;
  float body = sdRBox(q - vec3(0, -0.03, 0), BB[i] - vec3(0, 0.03, 0), 0.015);
  vec3 lq = q - vec3(0, BB[i].y + lidLift, 0); lq.yz = rot(LO[i]*0.5)*lq.yz;
  float lid = sdRBox(lq, vec3(BB[i].x + 0.02, 0.05, BB[i].z + 0.02), 0.012);
  float w = 0.05;
  float rib = min(sdBox(q, vec3(w, BB[i].y + 0.004, BB[i].z + 0.004)), sdBox(q, vec3(BB[i].x + 0.004, BB[i].y + 0.004, w)));
  float d = min(body, min(lid, rib));
  part = d == rib ? 1.0 : 0.0;
  return d;
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<3;i++){ float part; d = min(d, boxAt(i, p, part)); }
  for(int j=0;j<NO;j++){ if(OR2[j] < 0.005) continue; d = min(d, length(p - OP[j]) - OR2[j]); }
  return d;
}
M mat(vec3 p, vec3 n){
  float best = 1e9, pk = 0.0; int k = 0;
  for(int i=0;i<3;i++){ float part; float d = boxAt(i, p, part); if(d < best){ best = d; pk = part; k = i; } }
  int ko = -1;
  for(int j=0;j<NO;j++){ if(OR2[j] < 0.005) continue; float d = length(p - OP[j]) - OR2[j]; if(d < best){ best = d; ko = j; } }
  if(ko >= 0){
    int c = ko - 4*(ko/4);
    M o = mk(XSILVER, 0.04, 1.0);
    if(c == 0){ o = mk(XRED, 0.30, 0.0); o.coat = 1.0; }
    if(c == 1){ o = mk(XGOLD, 0.30, 1.0); o.glit = 280.0; }
    if(c == 2){ o = mk(XGREEN, 0.35, 0.2); o.coat = 1.0; o.glit = 200.0; }
    return o;
  }
  vec3 bc[3]; bc[0] = XGREEN; bc[1] = XRED; bc[2] = vec3(0.70, 0.72, 0.80);
  if(pk > 0.5) return mk(k == 2 ? XRED : XGOLD, 0.2, k == 2 ? 0.0 : 1.0);
  M m = mk(bc[k], 0.45, 0.0); m.bump = 0.10; m.bumpF = 70.0; m.coat = 0.5; return m;
}
