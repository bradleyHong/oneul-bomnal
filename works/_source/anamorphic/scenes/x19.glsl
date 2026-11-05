// X19 눈덩이 굴리기 — 뒷벽 구멍에서 굴러 나온 눈덩이가 바닥을 구르며 점점 커지고, 틀 끝에서 튀어 관객 쪽으로 굴러떨어진다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.18,"contrast":1.1,"bloom":0.07}
#define DT 1.9
#define SNOW 7
#define SNOWD 0.15
#define FLOOR_REFL 0.12
#define FRAMEC L(vec3(0.05, 0.06, 0.08))
#define AMB_TOP L(vec3(0.40, 0.44, 0.56))
#define AMB_BOT L(vec3(0.20, 0.20, 0.26))
#define CYE L(vec3(0.55, 0.90, 1.0))
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_BACKWALL
#define HAS_PREP
#define NB 4
const vec2 HOLE = vec2(0.0, -0.55); const float HR = 0.34;
bool backHole(vec3 q){ return length(q.xy - HOLE) < HR; }
vec3 outside(vec3 rd, vec3 ro){ return L(vec3(0.75, 0.85, 1.0))*0.6; }
vec3 backWall(vec3 p){ float d = length(p.xy - HOLE) - HR; return CYE*(smoothstep(0.02, 0.0, abs(d - 0.012))*2.2 + exp(-max(d, 0.0)*9.0)*0.25); }
vec3 BP[NB]; float BR[NB]; mat3 BM[NB];
void prep(){
  for(int i=0;i<NB;i++){
    float fi = float(i);
    float s = mod(uT - fi*3.75, T);
    float vx = (h11(fi*2.9) - 0.5)*0.5, vz = 0.42;
    float r0 = 0.16, grow = 0.09;
    float t = max(s - 0.6, 0.0);
    float z0 = DT + 0.2;
    float te = (z0 - 0.0)/vz;
    float tt = min(t, te);
    float r = r0 + grow*tt;                                     // 구를수록 눈이 붙어 커진다
    BR[i] = r*smoothstep(0.0, 0.3, s);
    vec3 p;
    if(s < 0.6){ p = vec3(HOLE.x, -HO.y + r0, z0 + 0.9 - 0.9*s/0.6); }
    else if(t < te){ p = vec3(HOLE.x + vx*t, -HO.y + r, z0 - vz*t); }
    else { float u = t - te; p = vec3(HOLE.x + vx*te + sign(vx + 0.01)*0.45*u, -HO.y + r + 1.7*u - 0.5*3.2*u*u, -1.0*u); }
    BP[i] = p;
    float roll = (z0 - p.z)/max(r, 0.05);
    BM[i] = rotA(normalize(vec3(1.0, 0.0, vx*0.5)), -roll);
  }
}
float ballD(int i, vec3 p){
  vec3 q = transpose(BM[i])*(p - BP[i]);
  float d = length(q) - BR[i];
  return d + BR[i]*0.06*(vnoise3(q/max(BR[i], 0.01)*3.5) - 0.5);   // 울퉁불퉁 뭉친 눈
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NB;i++){ if(BR[i] < 0.01) continue; float bd = length(p - BP[i]) - BR[i]*1.1; if(bd > 0.3){ d = min(d, bd); continue; } d = min(d, ballD(i, p)*0.9); }
  return d;
}
M mat(vec3 p, vec3 n){
  M m = mk(XSNOW, 0.75, 0.0);
  m.wrap = 0.35; m.sss = 0.9; m.glit = 300.0; m.bump = 0.35; m.bumpF = 26.0;
  return m;
}
