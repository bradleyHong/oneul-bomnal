// 06 녹는 빛 — 바닥의 사탕빛 액체가 출렁이며 방울을 띄우고, 방울은 틀 밖으로 흘러나와 관객 앞에서 길게 늘어지며 떨어진다.
// @post {"exposure":1.0,"sat":1.25,"contrast":1.1,"bloom":0.06}
#define DT 1.8
#define WALL L(vec3(0.70, 0.95, 0.88))
#define GRID 0.24
#define GRIDW 0.011
#define GRIDK 0.25
#define FRAMEC L(vec3(0.08, 0.14, 0.13))
#define AMB_TOP L(vec3(0.55, 0.75, 0.78))
#define AMB_BOT L(vec3(0.38, 0.42, 0.40))
#define LKD vec3(-0.45, 0.75, -0.50)
#define FLOOR_REFL 0.07
#define HAS_PREP
#define NO 5
#define ND 3

vec3 OB[NO]; float OR[NO];
vec3 DP[ND]; vec3 DV[ND]; float DR[ND];
void prep(){
  float ph = TAU*uT/T;
  float fy = -HO.y;
  for(int i=0;i<NO;i++){
    float fi = float(i);
    float a = ph*(i < 2 ? 1.0 : 2.0)*(mod(fi, 2.0) < 0.5 ? 1.0 : -1.0) + fi*1.7;
    OB[i] = vec3(0.75*sin(a) + 0.25*sin(2.0*a + fi), fy + 0.25 + 0.22*(0.5 + 0.5*sin(a*1.5 + fi)), 1.05 + 0.32*cos(a));
    OR[i] = 0.20 + 0.07*h11(fi*5.1);
  }
  for(int i=0;i<ND;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/3.0);
    float sx = (fi - 1.0)*0.75;
    vec3 a = vec3(sx*0.5, fy + 0.15, 1.1);          // 웅덩이 속
    vec3 b = vec3(sx*0.8, fy + 0.85, 0.75);         // 떠오름
    vec3 c = vec3(sx*1.2, fy + 0.55, -0.55);        // 틀 너머로
    float r = 0.24;
    vec3 v = vec3(0);
    if(u < 0.30){ DP[i] = mix(a, b, ease(u/0.30)); }
    else if(u < 0.62){ float k = ease((u - 0.30)/0.32); DP[i] = mix(b, c, k) + vec3(0, 0.12*sin(3.14159*k), 0); }
    else { float t = (u - 0.62)*T; DP[i] = c + vec3(sx*0.15*t, -0.5*3.0*t*t, -0.25*t); v = vec3(0, -3.0*t, 0); }
    DV[i] = v*0.12;                                   // 떨어지는 속도만큼 길게
    DR[i] = r*smoothstep(0.0, 0.05, u);
  }
}
float map(vec3 p){
  float fy = -HO.y;
  // 바닥 웅덩이: 납작한 타원 + 잔물결
  vec3 pq = p - vec3(0.0, fy, 1.05);
  float pool = length(pq*vec3(1.0/1.25, 1.0/0.22, 1.0/0.60)) - 1.0;
  pool *= 0.2;
  pool += 0.012*sin(9.0*length(pq.xz) - TAU*uT/T*6.0);
  float d = pool;
  for(int i=0;i<NO;i++) d = smin(d, length(p - OB[i]) - OR[i], 0.28);
  for(int i=0;i<ND;i++){
    if(DR[i] < 0.01) continue;
    float dd = sdCap(p, DP[i], DP[i] - DV[i], DR[i]*(1.0 - 0.25*clamp(length(DV[i])*2.0, 0.0, 1.0)));
    d = smin(d, dd, 0.22);
  }
  return d;
}
M mat(vec3 p, vec3 n){
  float h = clamp((p.y + HO.y)/1.2, 0.0, 1.0);
  vec3 c = mix(L(vec3(1.0, 0.10, 0.48)), L(vec3(1.0, 0.45, 0.22)), h);
  c = mix(c, L(vec3(0.83, 1.0, 0.23)), smoothstep(0.75, 1.0, h));
  M m = mk(c, 0.05, 0.0);
  m.iri = 0.2;
  m.wrap = 0.25;
  m.emit = c*0.06*pow(1.0 - max(dot(n, -VRD), 0.0), 2.0);   // 가장자리로 빛이 비친다
  return m;
}
