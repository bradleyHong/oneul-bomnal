// 05 구름 상자 — 뒤가 트인 하늘빛 상자에서 몽글한 구름 세 덩이가 피어올라 틀 밖으로 둥실 넘어온다.
// @post {"exposure":1.0,"sat":1.25,"contrast":1.06,"bloom":0.07}
#define DT 1.5
#define BACK_OPEN 1
#define HAS_OUTSIDE
#define HAS_PREP
#define WALL L(vec3(0.62, 0.86, 1.0))
#define GRID 0.28
#define GRIDW 0.011
#define GRIDK 0.20
#define FRAMEC L(vec3(0.10, 0.14, 0.22))
#define AMB_TOP L(vec3(0.55, 0.70, 0.95))
#define AMB_BOT L(vec3(0.55, 0.48, 0.60))
#define BACKC L(vec3(1.0, 0.75, 0.80))*0.7
#define LKD vec3(-0.35, 0.80, -0.48)
#define KEYC vec3(2.7, 2.5, 2.3)
#define FLOOR_REFL 0.05
#define STEPS 180
#define NC 3

vec3 outside(vec3 rd, vec3 ro){
  // 짙은 파랑 → 분홍 수평선, 해 하나
  float e = rd.y;
  vec3 c = mix(L(vec3(1.0, 0.66, 0.72)), L(vec3(0.25, 0.55, 1.0)), smoothstep(-0.02, 0.16, e));
  c = mix(c, L(vec3(0.04, 0.20, 0.85)), smoothstep(0.14, 0.40, e));
  vec3 sd = normalize(vec3(0.40, 0.10, 1.0));
  float d = max(dot(rd, sd), 0.0);
  c += vec3(6.0, 5.0, 4.2)*(0.04*pow(d, 12.0) + smoothstep(0.9998, 0.99992, d)*3.0);
  if(e < 0.0) c = mix(L(vec3(1.0, 0.70, 0.78)), L(vec3(0.75, 0.55, 0.85)), smoothstep(0.0, -0.4, e));
  return c;
}
vec3 CC[NC]; float CS[NC];
void prep(){
  for(int i=0;i<NC;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/3.0);
    // 바닥 너머 아래에서 피어올라 → 상자 안을 떠다니다 → 틀 밖 위·옆으로
    float side = i == 0 ? -1.0 : (i == 1 ? 1.0 : -0.3);
    vec3 a = vec3(side*0.9, -2.4, 6.0), b = vec3(side*0.5, -0.1, 3.0), c = vec3(side*0.3, 0.05, 0.9), d = vec3(side*1.6*A/2.0, 0.75 - fi*0.25, -1.6);
    float t = u;
    vec3 ab = mix(a, b, ease(t*2.0)), cd = mix(c, d, ease(t*1.6 - 0.6));
    CC[i] = mix(ab, cd, smoothstep(0.30, 0.62, t));
    CC[i].y += 0.06*sin(TAU*(uT/T*3.0 + fi*0.4));
    CS[i] = (i == 0 ? 1.0 : (i == 1 ? 0.8 : 0.65))*smoothstep(0.0, 0.08, u)*smoothstep(1.0, 0.94, u);
    if(CS[i] < 0.01) CC[i].y -= 40.0;
  }
}
float cloud(vec3 q, float s, float seed){
  if(s < 0.01) return 1e9;
  float d = 1e9;
  for(int j=0;j<12;j++){
    float fj = float(j);
    vec3 h = h33(vec3(seed, fj, 3.1));
    float x = (h.x - 0.5)*1.25;
    vec3 o = vec3(x, (0.05 + 0.32*h.y)*(1.0 - 1.4*x*x), (h.z - 0.5)*0.55)*s;
    float r = (0.30 - 0.20*abs(x) + 0.08*h11(seed*13.0 + fj))*s;
    d = smin(d, length(q - o) - r, 0.10*s);
  }
  d = -smin(-d, q.y + 0.10*s, 0.08*s);                         // 바닥이 납작한 구름
  vec3 nq = q*4.5/s + seed;
  float dn = (vnoise3(nq) - 0.5) + 0.5*(vnoise3(nq*2.3 + 7.0) - 0.5);
  return d + dn*0.075*s;
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NC;i++){
    vec3 q = p - CC[i];
    if(length(q) > 1.4*CS[i] + 0.3){ d = min(d, length(q) - 1.2*CS[i]); continue; }
    d = min(d, cloud(q, CS[i], float(i)*7.0 + 1.0));
  }
  return d*0.85;
}
M mat(vec3 p, vec3 n){
  M m = mk(L(vec3(1.0, 0.97, 0.98)), 0.75, 0.0);
  m.wrap = 0.6;                                                 // 빛이 구름 속으로 스민다
  // 아래쪽은 분홍 그늘, 위는 흰빛
  m.alb = mix(L(vec3(1.0, 0.70, 0.86)), m.alb, smoothstep(-0.6, 0.6, n.y));
  m.emit = L(vec3(1.0, 0.78, 0.86))*0.06*(1.0 - max(dot(n, -VRD), 0.0));
  return m;
}
