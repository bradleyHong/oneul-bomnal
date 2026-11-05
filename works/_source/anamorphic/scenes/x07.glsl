// X07 황금 종 — 빨간 리본에 매달린 금종 셋이 흔들리며 울리고, 가운데 큰 종은 틀 밖 관객 쪽까지 크게 넘어온다.
// @lib _xmas
// @post {"exposure":1.08,"sat":1.22,"contrast":1.1,"bloom":0.08}
#define DT 1.8
#define SNOW 6
#define SNOWD 0.12
#define FLOOR_REFL 0.14
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.42, 0.38, 0.40))
#define AMB_BOT L(vec3(0.22, 0.16, 0.14))
#define CYE L(vec3(1.0, 0.78, 0.35))
#define HAS_PREP
#define NB 3
vec3 BP[NB]; vec3 BV[NB]; mat3 BR[NB]; float BS[NB]; float BC[NB];
void prep(){
  for(int i=0;i<NB;i++){
    float fi = float(i);
    vec3 piv = i == 1 ? vec3(0.0, HO.y, 0.25) : vec3((fi - 1.0)*1.25, HO.y, 1.05);
    float len = i == 1 ? 1.05 : 0.80;
    float amp = i == 1 ? 0.85 : 0.40;
    float th = amp*sin(TAU*(uT/T*2.0 + fi*0.27));
    BV[i] = piv; BS[i] = i == 1 ? 0.34 : 0.24;
    vec3 dir = vec3(0.0, -cos(th), -sin(th));
    BP[i] = piv + dir*len;
    BR[i] = rotA(vec3(1, 0, 0), -th);
    BC[i] = 0.35*sin(TAU*(uT/T*2.0 + fi*0.27) - 0.9);         // 추는 조금 늦게 따라 흔들린다
  }
}
float bellAt(int i, vec3 p, out float part){
  vec3 q = transpose(BR[i])*(p - BP[i]);
  float s = BS[i];
  vec3 cq = q; cq.yz = rot(BC[i])*cq.yz;
  float body = sdBell(vec3(q.x, q.y, q.z), s, part);
  float clap = length(cq - vec3(0, -0.80*s, 0)) - 0.15*s;
  float rope = sdCap(q, vec3(0, 0.95*s, 0), vec3(0, 3.0, 0), 0.022);   // 빨간 리본 끈
  float bow = min(sdTorus((q - vec3(-0.12*s, 1.25*s, 0)).yxz*vec3(1, 1, 1.8), vec2(0.13*s, 0.04*s)), sdTorus((q - vec3(0.12*s, 1.25*s, 0)).yxz*vec3(1, 1, 1.8), vec2(0.13*s, 0.04*s)))/1.8;
  float d = min(min(body, clap), min(rope, bow));
  part = d == clap ? 1.0 : (d == rope || d == bow ? 2.0 : 0.0);
  return d;
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NB;i++){ float part; d = min(d, bellAt(i, p, part)); }
  return d;
}
M mat(vec3 p, vec3 n){
  float best = 1e9, pk = 0.0;
  for(int i=0;i<NB;i++){ float part; float d = bellAt(i, p, part); if(d < best){ best = d; pk = part; } }
  if(pk > 1.5){ M r = mk(XRED, 0.45, 0.0); r.bump = 0.15; r.bumpF = 160.0; r.coat = 0.3; return r; }   // 벨벳 리본
  if(pk > 0.5) return mk(vec3(0.6, 0.45, 0.2), 0.3, 1.0);
  M m = mk(XGOLD, 0.22, 1.0); m.bump = 0.10; m.bumpF = 90.0;   // 두드려 만든 놋쇠 결
  return m;
}
