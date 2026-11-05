// X08 생강빵 행진 — 생강빵 사람들이 뒷벽 문에서 깡충깡충 줄지어 나와, 틀 끝에서 관객 쪽으로 폴짝 뛰어든다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.22,"contrast":1.1,"bloom":0.06}
#define DT 1.8
#define SNOW 6
#define SNOWD 0.12
#define FLOOR_REFL 0.14
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.42, 0.38, 0.42))
#define AMB_BOT L(vec3(0.24, 0.17, 0.16))
#define CYE L(vec3(1.0, 0.62, 0.30))
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_BACKWALL
#define HAS_PREP
#define NM 5
const float DWH = 0.36, DHH = 0.62;
bool backHole(vec3 q){ vec2 b = vec2(q.x, q.y + HO.y); return abs(b.x) < DWH && b.y < DHH*2.0 - DWH && b.y > 0.0 || length(b - vec2(0, DHH*2.0 - DWH)) < DWH; }
vec3 outside(vec3 rd, vec3 ro){ return L(vec3(1.0, 0.60, 0.30))*0.45 + L(vec3(1.0, 0.85, 0.5))*0.4*smoothstep(0.2, -0.2, rd.y); }
vec3 backWall(vec3 p){
  vec2 b = vec2(p.x, p.y + HO.y);
  float d = b.y < DHH*2.0 - DWH ? abs(b.x) - DWH : length(b - vec2(0, DHH*2.0 - DWH)) - DWH;
  return L(vec3(1.0, 0.7, 0.35))*(smoothstep(0.02, 0.0, abs(d - 0.012))*2.2 + exp(-max(d, 0.0)*8.0)*0.3);
}
vec3 MP[NM]; mat3 MR[NM]; float MS[NM];
void prep(){
  for(int i=0;i<NM;i++){
    float fi = float(i);
    float s0 = 0.30;
    MS[i] = s0;
    float t = mod(uT - fi*3.0, T);
    float hop = 0.75;
    float lane = (h11(fi*3.3) - 0.5)*1.4;
    float fy = -HO.y + 0.88*s0 + 0.01;
    vec3 p; float rx = 0.0, rz = 0.0;
    float z0 = DT + 0.3, vz = 0.42;
    float ze = 0.0;
    float tEdge = (z0 - ze)/vz;
    if(t < tEdge){
      float k = fract(t/hop);
      p = vec3(lane*smoothstep(0.0, 2.0, t), fy + 0.32*4.0*k*(1.0 - k), z0 - vz*t);
      rz = 0.18*sin(TAU*t/hop*0.5);
    } else {
      float u = t - tEdge;
      p = vec3(lane + sign(lane + 0.01)*0.5*u, fy + 2.3*u - 0.5*3.2*u*u, -1.0*u);
      rx = -u*2.2;                                            // 앞으로 공중제비
    }
    MP[i] = p; MR[i] = rotA(vec3(1, 0, 0), rx)*rotA(vec3(0, 0, 1), rz);
  }
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NM;i++){
    vec3 q = transpose(MR[i])*(p - MP[i]);
    float bd = length(q) - MS[i]*1.1;
    if(bd > 0.3){ d = min(d, bd); continue; }
    d = min(d, sdGinger(q, MS[i]));
  }
  return d;
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9;
  for(int i=0;i<NM;i++){ float d = length(p - MP[i]); if(d < best){ best = d; k = i; } }
  vec3 q = transpose(MR[k])*(p - MP[k]);
  vec2 u = q.xy/MS[k];
  M m = mk(vec3(0.42, 0.16, 0.05), 0.75, 0.0);
  m.wrap = 0.2; m.bump = 0.55; m.bumpF = 32.0; m.sss = 0.15;   // 구운 과자 결
  if(q.z < 0.0){
    // 앞면 흰 설탕: 눈·입·단추·팔다리 물결 줄
    float ic = 1e9;
    ic = min(ic, length(u - vec2(-0.10, 0.68)) - 0.045); ic = min(ic, length(u - vec2(0.10, 0.68)) - 0.045);
    for(int j=0;j<5;j++){ float a = -0.7 + float(j)*0.35; ic = min(ic, length(u - vec2(sin(a)*0.15, 0.55 - 0.04*cos(a))) - 0.025); }
    ic = min(ic, length(u - vec2(0, 0.18)) - 0.05); ic = min(ic, length(u - vec2(0, -0.05)) - 0.05);
    float wav = abs(abs(u.x) - 0.50 - 0.03*sin(u.y*40.0)) - 0.025;
    if(u.y > -0.05 && u.y < 0.22) ic = min(ic, wav);
    float wl = abs(u.y + 0.70 + 0.03*sin(u.x*40.0)) - 0.025;
    if(abs(u.x) > 0.12) ic = min(ic, wl);
    if(ic < 0.0){ m.alb = vec3(0.85); m.rough = 0.40; m.bump = 0.08; m.sss = 0.6; m.coat = 0.4; }   // 설탕 아이싱
    vec2 bt = u - vec2(0, 0.06); if(length(vec2(bt.x, mod(bt.y + 0.12, 0.23) - 0.115)) < 0.04 && abs(bt.y) < 0.2) m.alb = k - 2*(k/2) == 0 ? XRED : XGREEN;
  }
  return m;
}
