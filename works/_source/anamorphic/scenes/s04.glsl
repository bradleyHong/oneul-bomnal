// S04 여름 파도 — 모래빛 벽돌 방 뒤로 한여름 바다가 열려 있다. 청록 파도가 밀려와 몸을 세우고, 유리 같은 물마루가 틀을 넘어 관객 쪽으로 쏟아진 뒤 다시 바다로 빠져나간다.
// @post {"exposure":1.0,"sat":1.18,"contrast":1.08,"bloom":0.07}
#define WALLSTYLE 2
#define PBR2
#define DT 1.7
#define BACK_OPEN 1
#define HAS_OUTSIDE
#define HAS_PREP
#define BRICK1 L(vec3(0.90, 0.68, 0.47))
#define BRICK2 L(vec3(0.97, 0.83, 0.62))
#define MORTAR L(vec3(0.94, 0.89, 0.78))
#define BRICK_AGE 0.22
#define BFLOOR 1
#define KEYC vec3(3.1, 2.95, 2.65)
#define LKD vec3(-0.35, 0.82, -0.46)
#define AMB_TOP L(vec3(0.58, 0.68, 0.80))
#define AMB_BOT L(vec3(0.48, 0.44, 0.38))
#define BACKC L(vec3(0.55, 0.85, 1.0))*0.55
#define RIMD vec3(0.30, 0.40, 0.85)
#define RIMC L(vec3(1.0, 0.96, 0.88))*0.22
#define FRAMEC L(vec3(0.22, 0.20, 0.18))
#define MAXD 26.0
#define NDROP 22

float sq(float x){ return x*x; }
const float Y0 = -0.80;          // 잔잔한 물 높이 (바닥 -0.93)
const float LE = 1.28;           // 물마루 고리를 앞쪽(-z)으로 늘이는 비

vec3 outside(vec3 rd, vec3 ro){
  // 한여름 하늘: 수평선은 희고 위로 갈수록 짙은 파랑, 뭉게구름 몇 덩이. 수평선 아래는 먼바다
  float e = rd.y;
  vec3 c = mix(L(vec3(0.86, 0.94, 1.0)), L(vec3(0.40, 0.66, 0.98)), smoothstep(0.0, 0.18, e));
  c = mix(c, L(vec3(0.16, 0.42, 0.90)), smoothstep(0.15, 0.55, e));
  vec2 cq = rd.xz/max(e + 0.06, 0.02);
  float cl = fbm(cq*0.55 + vec2(0.05*uT/T*TAU*0.0, 3.0));
  float cm = smoothstep(0.52, 0.78, cl)*smoothstep(0.02, 0.10, e);
  vec3 cloudC = mix(L(vec3(0.80, 0.84, 0.92)), vec3(1.25, 1.22, 1.18), smoothstep(0.5, 0.9, fbm(cq*1.1 + 7.0)));
  c = mix(c, cloudC, cm*0.9);
  if(ro.y < -0.3){                                              // 물에 비친 하늘은 짙은 여름 파랑으로 (편광 필터처럼)
    c = mix(L(vec3(0.30, 0.56, 0.82)), L(vec3(0.12, 0.34, 0.72)), smoothstep(0.0, 0.35, e));
    c = mix(c, cloudC*0.85, cm*0.8);
  }
  if(e < 0.0){
    vec3 sea = mix(L(vec3(0.42, 0.62, 0.80)), L(vec3(0.10, 0.36, 0.55)), smoothstep(0.0, -0.03, e));
    c = sea;
  }
  return c;
}

// ── 파도 시간표 ──
// 물마루는 오른쪽 벽부터 왼쪽으로 차례로 말려 부서진다 (자리마다 시각이 PEEL 만큼 앞선다)
#define PEEL 0.07
float SHORE, SWASH, GB, AZ, AA;
vec3 DP[NDROP]; vec3 DV[NDROP]; float DR[NDROP];
void prep(){
  float u = uT/T;
  float a = smoothstep(0.03, 0.44, u);            // 먼바다에서 밀려옴
  AA = a*a; AZ = 1.0 - sq(1.0 - a);
  GB = smoothstep(0.60, 0.86, u);                 // 다시 바다로 빠져나감
  // 물가: 잔잔할 땐 살짝 찰랑, 파도가 부서지면 물보라가 틀 앞까지 밀려왔다 빠진다
  float sw = smoothstep(0.58, 0.68, u)*(1.0 - smoothstep(0.70, 0.94, u));
  SWASH = sw;
  SHORE = mix(0.66 + 0.06*sin(TAU*u*3.0), 0.30, sw);
  // 물방울: 부서지는 물마루 앞에서 관객 쪽으로 튀어 화면 아래로 빠진다
  for(int i=0;i<NDROP;i++){
    float fi = float(i);
    vec3 h = h33(vec3(fi*1.7, 3.3, 9.1));
    float x0 = (h.y - 0.5)*2.0*1.6;
    float ul = 0.552 - PEEL*x0/1.93 + 0.03*h.x;
    float life = (u - ul)*T;                        // 초
    vec3 p0 = vec3(x0, -0.30 + 0.35*h.z, -0.80 - 0.1*h.x);
    vec3 v0 = vec3(x0*0.25 + (h.z - 0.5)*0.4, 0.15 + 0.55*h.y, -0.85 - 0.45*h.z);
    float on = step(0.0, life)*step(life, 1.1);
    float tl = clamp(life, 0.0, 1.1);
    DP[i] = p0 + v0*tl + vec3(0.0, -2.0*tl*tl, 0.0);
    DV[i] = v0 + vec3(0.0, -4.0*tl, 0.0);
    DR[i] = on*(0.014 + 0.020*fract(h.x*7.3))*smoothstep(0.0, 0.10, tl);
    if(on < 0.5) DP[i].y -= 40.0;
  }
}

// 자리 x 의 파도 모양
struct WV { float zc; float hh; float b; float f; float crest; };
WV wave(float x){
  float xn = x/1.93;
  float ux = uT/T + PEEL*xn;
  WV w;
  w.b = smoothstep(0.38, 0.535, ux);                         // 물마루가 말려 나옴
  w.f = clamp((ux - 0.535)/0.08, 0.0, 1.0);                  // 물마루가 틀 밖 아래로 쏟아짐
  float c = smoothstep(0.57, 0.67, ux);                     // 몸통이 무너짐
  w.zc = mix(mix(9.0, 1.15, AZ), 0.50, w.b);
  w.zc = mix(w.zc, 3.6, GB) + 0.13*xn*xn;
  w.hh = 1.30*AA*(1.0 - c)*(1.0 - 0.10*xn*xn);
  w.crest = smoothstep(0.50, 0.62, ux)*(1.0 - smoothstep(0.74, 0.92, ux));
  return w;
}

// 물: part 0 = 바다 판, 1 = 물마루, 2 = 물방울.  lt = 물마루 위 위치(0 뿌리 → 1 끝)
float water(vec3 p, out float part, out float lt){
  part = 0.0; lt = 0.0;
  float u = uT/T;
  WV W = wave(p.x);
  // 바다 판: 잔물결 + 큰 너울 + 물가
  float fadeR = 1.0 - smoothstep(2.5, 9.0, p.z);
  float rip = (0.006*sin(dot(p.xz, vec2(4.1, 6.3)) - TAU*u*6.0 + 1.3*sin(p.x*0.9 + p.z*0.7))
            + 0.005*sin(dot(p.xz, vec2(-5.7, 5.2)) - TAU*u*8.0 + 1.1*sin(p.z*1.3 - p.x*0.6))
            + 0.004*sin(dot(p.xz, vec2(9.3, 7.1)) - TAU*u*11.0 + 2.0*vnoise(p.xz*0.8)))*fadeR
            + 0.010*sin(p.z*2.6 + 0.5*sin(p.x*1.1) - TAU*u*4.0);
  float y0 = Y0 - 0.17*(1.0 - smoothstep(SHORE - 0.45, SHORE + 0.35, p.z));
  y0 += 0.04*SWASH*(1.0 - smoothstep(0.3, 1.4, p.z));
  float dz = p.z - W.zc;
  float w = dz < 0.0 ? mix(0.55, 0.32, W.b) : 1.7;
  float gs = exp(-dz*dz/(w*w));
  float hgt = y0 + W.hh*gs + rip*(1.0 - 0.6*gs);
  float dh = W.hh*gs*(-2.0*dz/(w*w));
  // 가파른 파도 얼굴 앞에선 세로 간격이 실제 거리보다 커서 광선이 물속으로 넘어간다 → 얼굴 기울기 최댓값으로 묶는다
  float wf = mix(0.55, 0.32, W.b);
  float smax = 0.86*W.hh/wf*exp(-sq(max(dz + 0.3, 0.0))*0.0)*smoothstep(-2.5, -0.2, dz)*(1.0 - smoothstep(0.4, 1.2, dz));
  float d = (p.y - hgt)/sqrt(1.0 + max(dh*dh, smax*smax))*0.75;
  d = max(d, -p.z - 0.004);
  d = max(d, -max(p.z - 0.15, min(p.y + 0.936, 1.932 - abs(p.x))));     // 틀 가까이에선 바닥 아래·벽 밖으로 물이 비치지 않게
  // 물마루: 꼭대기에서 앞으로 말려 나오는 유리 띠, 다 말리면 틀 앞으로 쏟아져 내린다
  {   // 거리장이 끊기지 않게 늘 계산하고, 없을 땐 안쪽으로 밀어 넣는다 (끊기면 그림자가 검게 번진다)
    float R = mix(0.22, 0.66, W.b)*(1.0 + 0.05*sin(p.x*2.1 + 0.7));
    float ph = 2.4*W.b;
    float tf = W.f;
    vec2 C = vec2(W.zc - 0.04 - 0.25*tf, Y0 + W.hh/(1.0 - 0.0) - R - 2.4*tf*tf);
    vec2 v = vec2(p.z, p.y) - C;
    float dl;
    {
      vec2 vs = vec2(v.x/LE, v.y);
      float hph = ph*0.5;
      float pa = atan(-vs.x, vs.y);
      float rel = mod(pa - hph + 3.14159265, 6.2831853) - 3.14159265;
      float th0 = 0.13*smoothstep(0.0, 0.2, W.b), th1 = th0*0.28;
      if(abs(rel) <= hph){
        float s = (rel + hph)/max(ph, 1e-3);
        dl = abs(length(vs) - R) - mix(th0, th1, s*s);
        lt = s;
      } else {
        vec2 e0 = vec2(0.0, R), e1 = R*vec2(-sin(ph), cos(ph));
        float d0 = length(vs - e0) - th0, d1 = length(vs - e1) - th1;
        dl = min(d0, d1); lt = d1 < d0 ? 1.0 : 0.0;
      }
      dl *= 0.55/(1.0 + 1.7*tf);
    }
    dl += 0.6*(1.0 - smoothstep(0.0, 0.10, W.b)) + 3.0*smoothstep(0.80, 1.0, W.f);
    dl = max(dl, abs(p.x) - 1.90);
    if(dl < d + 0.12){ part = 1.0; }
    d = smin(d, dl, 0.16);
  }
  // 물방울
  for(int i=0;i<NDROP;i++){
    if(DR[i] < 0.002) continue;
    vec3 q = p - DP[i];
    float bd = length(q) - DR[i]*2.0;
    if(bd > 0.3){ d = min(d, bd); continue; }
    float dd = length(q) - DR[i];
    if(dd < d){ part = 2.0; }
    d = min(d, dd);
  }
  return d;
}
float map(vec3 p){ float pt, lt; return water(p, pt, lt); }

M mat(vec3 p, vec3 n){
  float part, lt;
  water(p, part, lt);
  WV W = wave(p.x);
  float u = uT/T;
  float hfr = clamp((p.y - Y0)/1.3, 0.0, 1.0);
  vec3 deep = L(vec3(0.00, 0.05, 0.09));
  M m = mk(deep, 0.03, 0.0);
  float cosV = max(dot(n, -VRD), 0.0);
  float vf = pow(1.0 - cosV, 2.0);
  // 물 두께: 파도 얼굴은 그 높이에서 몸통이 얼마나 두꺼운지, 물마루는 얇은 막
  float thick;
  if(part > 0.5) thick = 0.22*(1.0 - 0.7*lt*lt);
  else {
    float r = clamp((p.y - Y0)/max(W.hh, 0.02), 1e-3, 1.0);
    thick = mix(3.0, 2.1*sqrt(-log(r)), smoothstep(0.05, 0.25, W.hh));
  }
  // 빛이 물을 지나며 빨강부터 먹힌다: 얇으면 밝은 옥빛, 두꺼우면 깊은 청록
  vec3 trans = exp(-thick*vec3(3.2, 1.05, 1.25));
  float streak = 0.8 + 0.4*fbm(vec2(p.x*7.0, p.y*1.2 - p.z*1.2 + 0.4*sin(TAU*u)));     // 얼굴을 타고 오르는 물결 줄
  m.emit = L(vec3(0.30, 0.95, 0.82))*trans*0.42*streak*(0.55 + 0.45*vf) + L(vec3(0.0, 0.10, 0.14))*0.05;
  if(part > 0.5 && part < 1.5) m.emit += L(vec3(0.45, 1.0, 0.85))*0.10*vf*(0.5 + 0.5*lt);   // 얇은 물마루의 속빛
  // 얕은 물: 아래 벽돌 바닥이 비쳐 맑은 옥빛
  float near = (1.0 - smoothstep(0.4, 2.6, p.z))*step(part, 0.5)*(1.0 - smoothstep(0.0, 0.25, hfr));
  m.emit += L(vec3(0.20, 0.80, 0.72))*0.06*near;
  float depth = p.y + 0.93;
  float shallow = (1.0 - smoothstep(0.02, 0.12, depth))*step(part, 0.5);
  m.alb = mix(m.alb, L(vec3(0.62, 0.66, 0.50)), shallow*0.7);
  m.emit = mix(m.emit, L(vec3(0.40, 0.70, 0.58))*0.14, shallow*0.6);
  // 거품: 흐름 방향으로 길게 늘어진 가는 줄
  float flow = p.y*0.8 + p.z*0.6;
  float wx = 2.5*vnoise(vec2(p.x*3.0, flow*2.0) + 4.0);
  float s1 = vnoise(vec2(p.x*34.0 + wx*6.0, flow*5.0 + 0.6*sin(TAU*u)));
  float s2 = vnoise(vec2(p.x*71.0 + wx*9.0, flow*9.0 + 3.0));
  float rid = 1.0 - abs(2.0*(0.65*s1 + 0.35*s2) - 1.0);
  float n1 = vnoise(vec2(p.x, flow)*13.0)*0.5 + vnoise(vec2(p.x, flow)*33.0 + 5.0)*0.5;
  float amtL = 0.0, amtS = 0.0, line = 0.0;
  if(part > 0.5 && part < 1.5) amtL = smoothstep(0.78, 1.0, lt)*1.1 + 0.35*W.crest*smoothstep(0.5, 1.0, lt) + smoothstep(0.0, 0.6, W.f)*0.8;
  float n2 = fbm(p.xz*5.0 + vec2(0.0, 0.8*sin(TAU*u)));
  if(part < 0.5){
    amtL = W.crest*smoothstep(0.45, 0.90, hfr)*1.1;                                      // 무너지는 꼭대기
    float low = 1.0 - smoothstep(Y0 + 0.02, Y0 + 0.15, p.y);
    amtS = 0.9*SWASH*(1.0 - smoothstep(0.2, 1.8, p.z))*low;                              // 밀려온 물보라
    amtS += 0.30*W.crest*(1.0 - smoothstep(0.3, 2.5, p.z))*low;
    line = exp(-sq((p.z - SHORE - 0.02)/0.035))*(0.55 + 0.45*n2)*(1.0 - smoothstep(0.08, 0.35, AA*(1.0 - GB)));   // 물가의 하얀 띠 (큰 파도가 오면 물이 빠지며 사라진다 — 파도 얼굴에 흰 띠로 비치지 않게)
  }
  amtL = clamp(amtL, 0.0, 1.0); amtS = clamp(amtS, 0.0, 1.0);
  float fm = smoothstep(0.80 - amtL*0.45, 0.97 - amtL*0.45, rid*(0.55 + 0.45*n1) + 0.25*amtL)*smoothstep(0.0, 0.15, amtL);
  fm = max(fm, smoothstep(0.62, 0.80, n1 + 0.45*amtL - 0.25)*amtL);
  if(amtS > 0.0){
    // 밀려온 물보라: 앞뒤(흐름) 방향으로 길쭉한 거품 줄
    float wz = 2.0*vnoise(p.xz*vec2(2.0, 1.2) + 9.0);
    float t1 = vnoise(vec2(p.x*26.0 + wz*5.0, p.z*3.5 + 0.8*sin(TAU*u)));
    float t2 = vnoise(vec2(p.x*55.0 + wz*8.0, p.z*6.0 + 2.0));
    float rz = 1.0 - abs(2.0*(0.6*t1 + 0.4*t2) - 1.0);
    float sw = smoothstep(0.88 - 0.28*amtS, 0.99 - 0.28*amtS, rz*(0.6 + 0.4*n2));
    float dense = smoothstep(0.84 - 0.25*amtS, 0.97 - 0.25*amtS, n2);
    fm = max(fm, clamp(max(sw*0.9, dense*amtS), 0.0, 1.0)*smoothstep(0.0, 0.25, amtS));
  }
  fm = max(fm, clamp(line, 0.0, 1.0)*0.85);
  m.alb = mix(m.alb, vec3(0.86, 0.91, 0.93), fm);
  m.rough = mix(m.rough, 0.55, fm);
  m.sss = 0.6*fm;
  m.emit *= 1.0 - 0.85*fm;
  m.bump = 0.14*(1.0 - fm); m.bumpF = 7.0;
  // 해 반사 띠: 그 자리만 물결을 세게 흔들어 반짝이로 흩는다
  float gl = smoothstep(0.82, 0.99, dot(reflect(VRD, n), normalize(LKD)));
  m.bump += 0.35*gl*(1.0 - fm); m.bumpF = mix(7.0, 24.0, gl); m.rough = mix(m.rough, 0.16, gl);
  // 벽 가까이: 햇빛 받은 벽돌 반사가 얼룩지지 않게 흐리게
  float wf = smoothstep(0.95, 1.75, abs(p.x));
  m.rough = mix(m.rough, 0.32, wf*(1.0 - fm)); m.bump *= 1.0 - 0.8*wf;
  if(part > 1.5){
    m = mk(vec3(0.80, 0.88, 0.90), 0.25, 0.0);                  // 물보라: 하얗게 부서진 물방울
    m.sss = 0.5; m.emit = L(vec3(0.3, 0.9, 0.8))*0.03;
  }
  return m;
}
