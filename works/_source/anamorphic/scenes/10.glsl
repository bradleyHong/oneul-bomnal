// 10 빛 해파리 — 뒤가 트인 깊은 물빛 상자. 빛나는 해파리 셋이 우산을 오므렸다 펴며 헤엄쳐 와 틀 밖 관객 머리 위로 지나간다.
// @post {"exposure":1.05,"sat":1.25,"contrast":1.1,"bloom":0.10}
#define DT 1.6
#define BACK_OPEN 1
#define HAS_OUTSIDE
#define HAS_PREP
#define WALL L(vec3(0.20, 0.42, 0.55))
#define GRID 0.28
#define GRIDW 0.009
#define GRIDK 0.30
#define GRIDC L(vec3(0.40, 1.0, 0.95))*0.05
#define FRAMEC L(vec3(0.04, 0.08, 0.10))
#define AMB_TOP L(vec3(0.25, 0.55, 0.70))
#define AMB_BOT L(vec3(0.08, 0.16, 0.25))
#define BACKC L(vec3(0.20, 0.80, 1.0))*0.6
#define KEYC vec3(1.6, 1.7, 1.8)
#define LKD vec3(-0.30, 0.85, -0.42)
#define FLOOR_REFL 0.10
#define MAXD 30.0
#define NJ 3

vec3 outside(vec3 rd, vec3 ro){
  // 깊은 물: 위는 밝은 청록, 아래는 남색. 위에서 내리꽂는 빛줄기
  float e = rd.y;
  vec3 c = mix(L(vec3(0.02, 0.06, 0.22)), L(vec3(0.10, 0.62, 0.80)), smoothstep(-0.5, 0.45, e));
  c = mix(c, L(vec3(0.55, 0.95, 1.0)), smoothstep(0.35, 0.9, e)*0.8);
  float ray = pow(max(sin(rd.x/max(rd.z, 0.1)*7.0 + 1.3*sin(TAU*uT/T)) * 0.5 + 0.5, 0.0), 6.0);
  c += L(vec3(0.6, 1.0, 1.0))*ray*0.35*smoothstep(-0.2, 0.5, e);
  return c;
}
vec3 JP[NJ]; vec3 JX[NJ]; vec3 JY[NJ]; vec3 JZ[NJ]; float JS[NJ]; float JK[NJ];
void prep(){
  for(int i=0;i<NJ;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/3.0);
    vec3 a = vec3((fi - 1.0)*1.6, -1.6 + fi*0.3, 11.0);
    // 끝은 관객 머리 위 뒤쪽 멀리: 화면에서도, 상자 안 그림자에서도 사라진 뒤 처음으로 돌아간다
    vec3 b = i == 0 ? vec3(-1.6*A/2.0, 2.9, -3.2) : (i == 1 ? vec3(1.7*A/2.0, 2.7, -3.0) : vec3(0.3, 3.0, -3.3));
    float pulses = 5.0;
    float sw = u - 0.012*sin(TAU*u*pulses)/(TAU/pulses);   // 오므릴 때 앞으로 쑥
    JP[i] = mix(a, b, sw) + vec3(0.0, -0.9*sin(3.14159*sw)*0.35, 0.0) + vec3(0, 0.6*smoothstep(0.4, 1.0, sw)*sw, 0)*0.0;
    JK[i] = 0.5 + 0.5*cos(TAU*u*pulses);                    // 1 = 활짝, 0 = 오므림
    vec3 dir = normalize(b - a + vec3(0, 1.4, 0));
    JY[i] = normalize(vec3(0, 1, 0) + 0.45*dir);            // 우산 꼭대기는 위로, 가는 쪽으로 조금 기울어
    JX[i] = normalize(cross(vec3(0, 0, 1), JY[i]));
    JZ[i] = cross(JX[i], JY[i]);
    JS[i] = (i == 0 ? 0.42 : (i == 1 ? 0.34 : 0.28))*smoothstep(0.0, 0.06, u);
  }
}
float jelly(vec3 q, float s, float k, float seed){
  // 우산: 납작한 반구 껍데기, 오므리면 좁고 길어진다
  float rw = s*(0.85 + 0.15*k), rh = s*(0.75 - 0.12*k);
  vec3 er = vec3(rw, rh, rw);
  float k0 = length(q/er), k1 = length(q/(er*er));
  float bell = k0*(k0 - 1.0)/k1;                            // 타원체 거리 (넘지 않는 근사)
  float d = max(bell, -(q.y + 0.02*s));                     // 속이 찬 우산 (빛나는 젤리)
  d += 0.02*s*sin(atan(q.z, q.x)*8.0)*smoothstep(0.1*s, -0.05*s, q.y);  // 가장자리 주름
  // 촉수 다섯: 아래로 늘어지며 물결
  for(int t=0;t<7;t++){
    float ft = float(t);
    float an = ft*0.8976 + seed;
    vec3 r0 = vec3(cos(an)*rw*0.55, -0.02*s, sin(an)*rw*0.55);
    float ph = TAU*uT/T*5.0 + ft*1.3 + seed;
    vec3 r1 = r0 + vec3(0.10*s*sin(ph), -0.60*s, 0.10*s*cos(ph));
    vec3 r2 = r1 + vec3(0.16*s*sin(ph + 1.2), -0.70*s, 0.16*s*cos(ph + 1.0));
    vec3 r3 = r2 + vec3(0.22*s*sin(ph + 2.4), -0.80*s, 0.22*s*cos(ph + 2.0));
    float w = 0.030*s;
    d = smin(d, min(sdCap(q, r0, r1, w*1.6), min(sdCap(q, r1, r2, w*1.2), sdCap(q, r2, r3, w*0.8))), 0.03*s);
  }
  return d;
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NJ;i++){
    if(JS[i] < 0.01) continue;
    vec3 o = p - JP[i];
    vec3 q = vec3(dot(o, JX[i]), dot(o, JY[i]), dot(o, JZ[i]));
    float bd = length(q + vec3(0, JS[i]*1.0, 0)) - JS[i]*2.7;
    if(bd > 0.3){ d = min(d, bd); continue; }                // 경계 구 밖에선 거리만 (가짜 반그림자가 안 생기게 여유를 둔다)
    d = min(d, jelly(q, JS[i], JK[i], float(i)*2.1));
  }
  return d;
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9; vec3 bq;
  for(int i=0;i<NJ;i++){
    vec3 o = p - JP[i]; vec3 q = vec3(dot(o, JX[i]), dot(o, JY[i]), dot(o, JZ[i]));
    float dd = length(q) - JS[i]; if(dd < best){ best = dd; k = i; bq = q; }
  }
  vec3 c = k == 0 ? L(vec3(1.0, 0.35, 0.75)) : (k == 1 ? L(vec3(0.83, 1.0, 0.23)) : L(vec3(0.55, 0.65, 1.0)));
  float rim = pow(1.0 - max(dot(n, -VRD), 0.0), 2.0);
  float tent = smoothstep(-0.05, -0.2, bq.y/JS[k]);
  M m = mk(c*0.4, 0.15, 0.0);
  m.wrap = 0.8;
  // 속에서 빛나는 젤리: 가장자리가 더 밝고, 오므릴 때 맥박처럼 밝아진다
  m.emit = c*(0.25 + 1.6*rim + 0.6*(1.0 - JK[k]))*(1.0 - 0.35*tent);
  m.emit += L(vec3(1.0, 0.95, 0.9))*0.9*smoothstep(0.6, 0.95, bq.y/JS[k])*(1.0 - JK[k]);
  return m;
}
