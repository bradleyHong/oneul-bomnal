// X15 거울 오너먼트 — 사이버 상자 전체를 비추는 거대한 거울 오너먼트가 돌며 관객 쪽으로 다가와 틀을 넘고, 작은 구슬들이 그 둘레를 돈다.
// @lib _xmas
// @post {"exposure":1.08,"sat":1.25,"contrast":1.1,"bloom":0.08}
#define DT 1.9
#define SNOW 6
#define SNOWD 0.12
#define FLOOR_REFL 0.16
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.36, 0.34, 0.46))
#define AMB_BOT L(vec3(0.18, 0.14, 0.18))
#define CYK 1.3
#define CYE L(vec3(0.55, 0.90, 1.0))
#define HAS_PREP
#define NS 6
vec3 BIG; mat3 BR; vec3 SP[NS]; float SR2[NS];
void prep(){
  float ph = TAU*uT/T;
  float k = 0.5 - 0.5*cos(ph);                                 // 0 → 1 → 0 : 다가왔다 물러난다
  BIG = vec3(0.35*sin(ph), 0.05 + 0.08*sin(ph*2.0), mix(1.0, -0.85, ease(k)));
  BR = rotA(vec3(0, 1, 0), ph*2.0)*rotA(vec3(1, 0, 0), 0.15*sin(ph));
  for(int i=0;i<NS;i++){
    float fi = float(i);
    float a = ph*(i < 3 ? 2.0 : -3.0) + fi*1.047;
    float rr = 0.78 + 0.12*fi/float(NS);
    SP[i] = BIG + vec3(cos(a)*rr, 0.28*sin(a*1.0 + fi), sin(a)*rr*0.8);
    SR2[i] = 0.07 + 0.03*h11(fi*3.1);
  }
}
float map(vec3 p){
  float part;
  vec3 q = transpose(BR)*(p - BIG);
  float d = sdOrnament(q, 0.50, part);
  for(int i=0;i<NS;i++) d = min(d, length(p - SP[i]) - SR2[i]);
  return d;
}
M mat(vec3 p, vec3 n){
  float part; vec3 q = transpose(BR)*(p - BIG);
  float db = sdOrnament(q, 0.50, part);
  int k = -1; float best = db;
  for(int i=0;i<NS;i++){ float d = length(p - SP[i]) - SR2[i]; if(d < best){ best = d; k = i; } }
  if(k >= 0){ int c = k - 3*(k/3); M o = mk(XGREEN, 0.3, 0.0); o.coat = 1.0; if(c == 0){ o = mk(XRED, 0.3, 0.0); o.coat = 1.0; } if(c == 1){ o = mk(XGOLD, 0.3, 1.0); o.glit = 280.0; } return o; }
  if(part > 0.5) return mk(XGOLD, 0.2, 1.0);
  // 거울 구슬에 금 띠 두 줄과 빨간 보석 점
  vec3 u = normalize(q);
  float band = smoothstep(0.012, 0.0, abs(abs(u.y) - 0.30) - 0.03);
  M m = mk(mix(vec3(0.95, 0.96, 1.0), XGOLD, band), mix(0.02, 0.28, band), 1.0); m.glit = band*320.0;
  float lon = atan(u.z, u.x);
  float gem = smoothstep(0.06, 0.03, length(vec2(fract(lon/TAU*12.0) - 0.5, (u.y)*3.0)));
  if(gem > 0.0){ m.alb = mix(m.alb, XRED, gem); m.metal = 1.0 - gem; m.emit = XRED*gem*0.3; }
  return m;
}
