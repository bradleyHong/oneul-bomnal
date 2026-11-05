// X20 선물 폭죽 — 바닥에 솟은 큰 선물 상자의 뚜껑이 '펑' 날아가고, 오너먼트와 별이 불꽃처럼 터져 관객 쪽으로 쏟아진 뒤 상자는 다시 닫힌다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.25,"contrast":1.1,"bloom":0.09}
#define DT 1.9
#define SNOW 6
#define SNOWD 0.12
#define FLOOR_REFL 0.16
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.38, 0.36, 0.44))
#define AMB_BOT L(vec3(0.20, 0.15, 0.18))
#define CYE L(vec3(1.0, 0.78, 0.35))
#define HAS_PREP
#define NI 18
const vec3 BB = vec3(0.55, 0.42, 0.50);
float BSC; vec3 LIDP; mat3 LIDR; vec3 IP[NI]; mat3 IR[NI]; float IS[NI];
void prep(){
  float t = uT;
  // 상자: 처음부터 있고 10~12초에 바닥으로 가라앉았다 12~15초에 다시 솟는다
  BSC = t < 10.0 ? 1.0 : (t < 11.6 ? 1.0 - ease((t - 10.0)/1.6) : ease((t - 11.6)/3.4));
  vec3 top = vec3(0.0, -HO.y + 2.0*BB.y*BSC, 1.10);
  float tb = 3.0;                                               // 펑!
  float u = t - tb;
  if(u < 0.0 || t > 11.6){ LIDP = top + vec3(0, 0.04, 0); LIDR = mat3(1.0); }
  else { LIDP = top + vec3(0.4*u, 3.2*u - 0.5*3.4*u*u, -1.2*u); LIDR = rotA(vec3(1, 0, 0.3), -u*5.0); }
  for(int j=0;j<NI;j++){
    float fj = float(j);
    float a = fj*2.39996, el = 0.5 + 0.45*h11(fj*3.7);
    vec3 v = vec3(cos(a)*1.3*(1.0 - el*0.5), 2.2 + 1.4*el, -1.1 - 1.4*h11(fj*5.3));
    float uu = u - 0.05*h11(fj*9.1);
    IS[j] = (0.07 + 0.05*h11(fj*2.3))*smoothstep(0.0, 0.08, uu)*step(uu, 4.0)*step(t, 11.6);
    IP[j] = uu > 0.0 ? top + v*uu + vec3(0, -0.5*3.0*uu*uu, 0) : top - vec3(0, 0.3, 0);
    IR[j] = rotA(normalize(vec3(h11(fj), 1.0, h11(fj + 4.0))), uu*6.0);
  }
}
float itemD(int j, vec3 p){
  vec3 q = transpose(IR[j])*(p - IP[j]);
  if(j - 3*(j/3) == 2) return sdStar3(q, IS[j]*1.4, IS[j]*0.45);
  return length(q) - IS[j];
}
float map(vec3 p){
  float d = 1e9;
  if(BSC > 0.01){
    vec3 q = p - vec3(0.0, -HO.y + BB.y*BSC, 1.10);
    vec3 b = BB*vec3(1.0, BSC, 1.0);
    float box = max(sdRBox(q, b, 0.02), -sdBox(q - vec3(0, 0.05, 0), b - 0.035));
    float w = 0.07;
    float rib = max(min(sdBox(q, vec3(w, b.y + 0.004, b.z + 0.004)), sdBox(q, vec3(b.x + 0.004, b.y + 0.004, w))), -sdBox(q - vec3(0, 0.05, 0), b - 0.035));
    d = min(box, rib);
    vec3 lq = transpose(LIDR)*(p - LIDP);
    float part; float lid = sdGift(lq - vec3(0, 0.05, 0), vec3(BB.x + 0.03, 0.06, BB.z + 0.03), part);
    d = min(d, lid);
  }
  for(int j=0;j<NI;j++){ if(IS[j] < 0.005) continue; d = min(d, itemD(j, p)); }
  return d;
}
M mat(vec3 p, vec3 n){
  float best = 1e9; int k = -1;
  for(int j=0;j<NI;j++){ if(IS[j] < 0.005) continue; float d = itemD(j, p); if(d < best){ best = d; k = j; } }
  if(k >= 0 && best < 0.01){
    int c = k - 3*(k/3);
    if(c == 2){ M m = mk(XGOLD, 0.2, 1.0); m.glit = 300.0; m.emit = XGOLD*0.6; return m; }
    M m = mk(XSILVER, 0.04, 1.0);
    int cc = k - 4*(k/4);
    if(cc == 0){ m = mk(XRED, 0.3, 0.0); m.coat = 1.0; }
    if(cc == 1){ m = mk(XGREEN, 0.35, 0.2); m.coat = 1.0; m.glit = 200.0; }
    if(cc == 3){ m = mk(XGOLD, 0.3, 1.0); m.glit = 280.0; }
    return m;
  }
  vec3 q = p - vec3(0.0, -HO.y + BB.y*BSC, 1.10);
  vec3 lq = transpose(LIDR)*(p - LIDP);
  float part; float lid = sdGift(lq - vec3(0, 0.05, 0), vec3(BB.x + 0.03, 0.06, BB.z + 0.03), part);
  bool onLid = lid < 0.01;
  vec3 rq = onLid ? lq : q;
  float rib = max(step(abs(rq.x), 0.075), step(abs(rq.z), 0.075));
  if(onLid && part > 0.5) rib = 1.0;
  M m = mk(mix(XRED, XGOLD, rib), mix(0.42, 0.25, rib), rib);
  m.bump = 0.10; m.bumpF = 70.0; m.coat = 0.5*(1.0 - rib); m.glit = rib*260.0;
  return m;
}
