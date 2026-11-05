// X17 페퍼민트 사탕 — 비닐에 싸인 빨강·하양 소용돌이 사탕들이 팽이처럼 돌며 날아와 틀 밖 관객 쪽으로 쏟아진다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.25,"contrast":1.1,"bloom":0.07}
#define DT 1.8
#define SNOW 5
#define SNOWD 0.10
#define FLOOR_REFL 0.14
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.40, 0.38, 0.46))
#define AMB_BOT L(vec3(0.20, 0.15, 0.18))
#define CYE L(vec3(1.0, 0.35, 0.45))
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_BACKWALL
#define HAS_PREP
#define NK 8
const vec2 HC = vec2(0.0, 0.05); const float HR = 0.55;
bool backHole(vec3 q){ return length(q.xy - HC) < HR; }
vec3 outside(vec3 rd, vec3 ro){ float r = length(rd.xy/max(rd.z, 0.1) - HC/3.0); return mix(L(vec3(1.0, 0.85, 0.9)), L(vec3(0.9, 0.1, 0.2)), smoothstep(0.0, 0.25, r))*0.8; }
vec3 backWall(vec3 p){
  float d = length(p.xy - HC) - HR;
  float a = atan(p.y - HC.y, p.x - HC.x);
  float sw = step(0.5, fract(a/TAU*8.0 + d*3.0 - uT/T*2.0));             // 구멍 둘레 소용돌이 띠
  return mix(L(vec3(1.0, 0.25, 0.35)), vec3(0.9), sw)*0.6*smoothstep(0.35, 0.0, d)*step(0.0, d) + L(vec3(1.0, 0.5, 0.6))*smoothstep(0.02, 0.0, abs(d - 0.01))*2.0;
}
vec3 KP[NK]; mat3 KR[NK]; float KS[NK];
void prep(){
  for(int i=0;i<NK;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/float(NK));
    vec3 a = vec3(HC + (vec2(h11(fi), h11(fi + 3.0)) - 0.5)*0.3, DT + 2.5);
    float ang = fi*2.39996;
    vec3 b = vec3(cos(ang)*2.7, sin(ang)*1.7 + 0.2, -3.0);
    float k = u*u*(1.4 - 0.4*u);
    KP[i] = mix(a, b, k) + vec3(0, 0.5*sin(3.14159*k), 0);
    KS[i] = (0.20 + 0.06*h11(fi*5.1))*smoothstep(0.0, 0.05, u);
    KR[i] = rotA(normalize(vec3(h11(fi*2.0) - 0.5, 1.0, 0.3)), u*5.0)*rotA(vec3(0, 0, 1), TAU*uT/T*4.0);
  }
}
float candy(vec3 q, float s, out float part){
  float disc = sdCyl(q.xzy, s*0.92, s*0.20) - s*0.12;
  // 비닐 꼬임: 양옆 원뿔 + 주름 끝
  vec3 w = vec3(abs(q.x) - s*1.05, q.y, q.z);
  float twist = sdCap(w, vec3(0), vec3(s*0.25, 0, 0), s*0.10);
  float frill = max(sdBox(w - vec3(s*0.48, 0, 0), vec3(s*0.22, s*0.40, s*0.08)), -(length(w.yz) - s*0.45*(0.5 + 0.5*(w.x - s*0.26)/(s*0.44)) ));
  frill += 0.012*s*sin(q.y/s*40.0);
  float wrap = min(twist, frill);
  float d = min(disc, wrap);
  part = disc < wrap ? 0.0 : 1.0;
  return d;
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NK;i++){
    if(KS[i] < 0.01) continue;
    vec3 q = transpose(KR[i])*(p - KP[i]);
    float bd = length(q) - KS[i]*1.8;
    if(bd > 0.3){ d = min(d, bd); continue; }
    float part; d = min(d, candy(q, KS[i], part)*0.9);
  }
  return d;
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9;
  for(int i=0;i<NK;i++){ float d = length(p - KP[i]); if(d < best){ best = d; k = i; } }
  vec3 q = transpose(KR[k])*(p - KP[k]);
  float part; candy(q, KS[k], part);
  if(part > 0.5){ M m = mk(vec3(0.85, 0.88, 0.95), 0.08, 0.0); m.iri = 0.4; m.coat = 1.0; m.bump = 0.25; m.bumpF = 70.0; return m; }   // 반짝 비닐
  float a = atan(q.y, q.x), r = length(q.xy)/KS[k];
  float sw = step(0.5, fract(a/TAU*8.0 + r*1.6));
  vec3 c = k - 3*(k/3) == 1 ? XGREEN : XRED;
  M m = mk(mix(vec3(0.80, 0.78, 0.76), c, sw*step(r, 0.88)), 0.30, 0.0);
  m.coat = 1.0; m.sss = 0.3;
  return m;
}
