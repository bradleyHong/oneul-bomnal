// X03 캔디케인 숲 — 바닥 홈에서 지팡이 사탕들이 빙글 돌며 솟고, 앞줄은 관객 쪽으로 기울어 고리가 틀 밖까지 걸쳐 나온다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.25,"contrast":1.1,"bloom":0.07}
#define DT 1.9
#define SNOW 6
#define SNOWD 0.14
#define FLOOR_REFL 0.14
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.36, 0.33, 0.44))
#define AMB_BOT L(vec3(0.20, 0.14, 0.18))
#define CYE L(vec3(1.0, 0.30, 0.40))
#define HAS_PREP
#define NC 9
vec3 CB[NC]; mat3 CR[NC]; float CH[NC];
void prep(){
  for(int i=0;i<NC;i++){
    float fi = float(i);
    float row = floor(fi/3.0), col = fi - row*3.0;
    vec3 base = vec3((col - 1.0)*1.15 + (row - 1.0)*0.25, -HO.y, 1.55 - row*0.55);
    float ph = fract(uT/T + h11(fi*2.1));
    float rise = smoothstep(0.0, 0.25, ph)*(1.0 - smoothstep(0.75, 1.0, ph));     // 솟았다 들어간다
    float h = (0.75 + 0.35*h11(fi*4.4))*(row == 2.0 ? 1.25 : 1.0);
    CH[i] = h;
    CB[i] = base + vec3(0, -h*1.15*(1.0 - rise), 0);
    float tilt = row == 2.0 ? 1.05*smoothstep(0.30, 0.50, ph)*(1.0 - smoothstep(0.62, 0.78, ph)) : 0.0;
    float spin = TAU*(uT/T*(col == 1.0 ? -1.0 : 1.0)) + fi;
    CR[i] = rotA(vec3(1, 0, 0), -tilt)*rotA(vec3(0, 1, 0), spin);
  }
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NC;i++){
    vec3 q = transpose(CR[i])*(p - CB[i]);
    d = min(d, sdCane(q, CH[i], 0.055));
  }
  return max(d, -(p.y + HO.y) - 0.0 < 0.0 ? d : d);   // 바닥 아래로 들어간 부분은 바닥이 가린다
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9; vec3 bq;
  for(int i=0;i<NC;i++){ vec3 q = transpose(CR[i])*(p - CB[i]); float d = sdCane(q, CH[i], 0.055); if(d < best){ best = d; k = i; bq = q; } }
  float st = caneStripe(bq, CH[k]);
  vec3 c2 = k - 3*(k/3) == 1 ? XGREEN : XRED;
  M m = mk(mix(vec3(0.74, 0.72, 0.70), c2, st), 0.12, 0.0);
  m.wrap = 0.15; m.coat = 1.0; m.rough = 0.35; m.sss = 0.25; m.bump = 0.03; m.bumpF = 50.0;   // 사탕: 겉은 유리처럼, 속은 빛이 스민다
  return m;
}
