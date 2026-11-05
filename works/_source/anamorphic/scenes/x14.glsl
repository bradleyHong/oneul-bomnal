// X14 핫초코 — 큰 머그잔에서 김이 오르고, 마시멜로가 퐁퐁 튀어 올라 틀 밖 관객 쪽으로 날아온다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.22,"contrast":1.1,"bloom":0.07}
#define DT 1.8
#define SNOW 6
#define SNOWD 0.12
#define FLOOR_REFL 0.14
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.40, 0.36, 0.42))
#define AMB_BOT L(vec3(0.22, 0.16, 0.16))
#define CYE L(vec3(1.0, 0.55, 0.35))
#define HAS_PREP
#define NMM 8
const vec3 MUG = vec3(0.0, 0.0, 1.15); const float MR = 0.52, MH = 0.50;
vec3 MP[NMM]; mat3 MRR[NMM]; float MS[NMM];
void prep(){
  for(int j=0;j<NMM;j++){
    float fj = float(j);
    float u = mod(uT - fj*1.875, T);                          // 1.875초마다 하나 (15/8)
    vec3 top = vec3(MUG.x + (h11(fj*3.3) - 0.5)*0.5, -HO.y + MH*2.0 - 0.05, MUG.z + (h11(fj*4.1) - 0.5)*0.4);
    float a = fj*2.39996;
    vec3 v = vec3(cos(a)*0.55, 2.7 + 0.5*h11(fj*7.1), -1.0 - 0.6*h11(fj*2.9));
    float rise = clamp(u/0.25, 0.0, 1.0);
    MP[j] = u < 0.25 ? top + vec3(0, -0.12 + 0.12*rise, 0) : top + v*(u - 0.25) + vec3(0, -0.5*3.1*(u - 0.25)*(u - 0.25), 0);
    MS[j] = 0.085*smoothstep(0.0, 0.2, u)*step(u, 5.0);
    MRR[j] = rotA(normalize(vec3(h11(fj), 1.0, h11(fj + 2.0))), u*4.0);
  }
}
float mugD(vec3 p, out float part){
  vec3 q = p - vec3(MUG.x, -HO.y + MH, MUG.z);
  float outer = sdCyl(q, MR, MH) - 0.02;
  float inner = sdCyl(q - vec3(0, 0.08, 0), MR - 0.06, MH);
  float cup = max(outer, -inner);
  vec3 hq = q - vec3(MR + 0.06, 0.02, 0);
  float handle = sdTorus(hq.xzy, vec2(0.20, 0.05));
  handle = max(handle, -(hq.x + 0.02));
  // 코코아 표면: 잔잔한 물결
  float surf = max(sdCyl(q, MR - 0.06, MH), q.y - (MH - 0.10 + 0.008*sin(length(q.xz)*24.0 - TAU*uT/T*6.0)));
  float d = min(min(cup, handle), surf);
  part = d == surf ? 1.0 : 0.0;
  return d;
}
float map(vec3 p){
  float part; float d = mugD(p, part);
  for(int j=0;j<NMM;j++){ if(MS[j] < 0.005) continue; vec3 q = transpose(MRR[j])*(p - MP[j]); d = min(d, sdCyl(q, MS[j], MS[j]*0.85) - MS[j]*0.25); }
  return d;
}
M mat(vec3 p, vec3 n){
  float part; float dm = mugD(p, part);
  float best = dm; int k = -1;
  for(int j=0;j<NMM;j++){ if(MS[j] < 0.005) continue; vec3 q = transpose(MRR[j])*(p - MP[j]); float d = sdCyl(q, MS[j], MS[j]*0.85) - MS[j]*0.25; if(d < best){ best = d; k = j; } }
  if(k >= 0){ M m = mk(k - 3*(k/3) == 0 ? vec3(0.90, 0.50, 0.60) : vec3(0.80, 0.78, 0.75), 0.8, 0.0); m.wrap = 0.5; m.sss = 0.9; m.bump = 0.2; m.bumpF = 30.0; return m; }   // 말랑한 마시멜로
  if(part > 0.5){ M m = mk(vec3(0.16, 0.05, 0.02), 0.20, 0.0); m.coat = 1.0; return m; }   // 윤기 나는 코코아
  // 머그: 빨강 바탕에 흰 눈송이 띠
  vec3 q = p - vec3(MUG.x, -HO.y + MH, MUG.z);
  float a = atan(q.z, q.x);
  float band = step(abs(q.y - 0.05), 0.12);
  vec2 g = vec2(a*MR*8.0, q.y*8.0); vec2 f = fract(g) - 0.5;
  float sf = band*step(length(f), 0.25)*step(0.0, 0.25 - abs(abs(f.x) - abs(f.y)));
  M m = mk(mix(XRED, vec3(0.85), max(band*0.0, sf)), 0.40, 0.0); m.coat = 1.0; m.bump = 0.03; m.bumpF = 40.0;   // 유약 바른 도자기
  if(abs(q.y - 0.05) > 0.11 && abs(q.y - 0.05) < 0.14) m.alb = vec3(0.85);
  return m;
}
