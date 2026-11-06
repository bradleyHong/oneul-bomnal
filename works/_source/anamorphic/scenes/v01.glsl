// V01 구슬 길 — 높은 벽돌 샤프트 가운데 호두나무 기둥을 놋쇠 레일이 감아 내려오고, 천장의 놋쇠 상자에서 나온 유리·진주·놋쇠 구슬이 끊임없이 굴러 내려와 마지막 굽이에서 틀 밖 관객 쪽으로 커다랗게 굴러 나온다.
// @post {"exposure":1.04,"sat":1.12,"contrast":1.10,"bloom":0.08}
#define WALLSTYLE 2
#define PBR2
#define DT 1.5
#define HAS_PREP
#define LKD vec3(-0.18, 0.32, -0.93)
#define KEYC vec3(2.75, 2.55, 2.25)
#define AMB_TOP L(vec3(0.50, 0.48, 0.50))
#define AMB_BOT L(vec3(0.26, 0.21, 0.18))
#define FRAMEC L(vec3(0.10, 0.085, 0.075))
#define BRICK1 L(vec3(0.50, 0.24, 0.17))
#define BRICK2 L(vec3(0.66, 0.40, 0.28))
#define MORTAR L(vec3(0.60, 0.56, 0.50))
#define BRICK_AGE 0.45
#define RIMD vec3(0.35, 0.55, 0.80)
#define RIMC L(vec3(0.95, 0.88, 0.80))
#define NB 14
#define NQ 8

const float ZC0 = 0.80;     // 기둥 자리 (깊이)
const float RH = 0.228;     // 나선 반지름 (레일 가운데)
const float RW = 0.024;     // 레일 반간격
const float RT = 0.0085;    // 레일 굵기
const float RB = 0.042;     // 구슬 반지름
const float NT = 3.5;       // 감은 수
const float YE = -0.14;     // 나선 끝 높이
const float PI_ = 3.14159265;

mat3 rotA(vec3 ax, float a){
  ax = normalize(ax); float c = cos(a), s = sin(a), k = 1.0 - c;
  return mat3(c + ax.x*ax.x*k, ax.y*ax.x*k + ax.z*s, ax.z*ax.x*k - ax.y*s,
              ax.x*ax.y*k - ax.z*s, c + ax.y*ax.y*k, ax.z*ax.y*k + ax.x*s,
              ax.x*ax.z*k + ax.y*s, ax.y*ax.z*k - ax.x*s, c + ax.z*ax.z*k);
}

float P;      // 나선 한 바퀴 높이
float HB;     // 레일 가운데에서 구슬 중심까지 높이
float LH, LR, VS;
vec3 HE, HD;
vec3 Q[NQ]; vec3 QS[NQ]; float QL[NQ];
vec3 BP[NB]; mat3 BR[NB]; float BK[NB];

vec3 bez(float t){
  vec3 P0 = vec3(RH, YE, ZC0), P1 = vec3(RH, YE - 0.05, 0.05);
  vec3 P2 = vec3(0.07, YE - 0.30, -0.55), P3 = vec3(0.02, YE - 0.50, -1.38);
  float s = 1.0 - t;
  return s*s*s*P0 + 3.0*s*s*t*P1 + 3.0*s*t*t*P2 + t*t*t*P3;
}

void prep(){
  P = (HO.y - 0.13 - YE)/NT;
  HB = sqrt((RB + RT)*(RB + RT) - RW*RW);
  float cir = TAU*RH;
  LH = NT*sqrt(cir*cir + P*P);
  // 마지막 굽이: 관객 쪽으로 휘어 나오는 레일
  LR = 0.0;
  for(int i=0;i<NQ;i++){
    Q[i] = bez(float(i)/float(NQ - 1));
    if(i > 0) LR += length(Q[i] - Q[i-1]);
    QL[i] = LR;
  }
  for(int i=0;i<NQ;i++){
    vec3 tg = i == 0 ? vec3(0, 0, -1) : (i == NQ - 1 ? normalize(Q[i] - Q[i-1]) : normalize(Q[i+1] - Q[i-1]));
    QS[i] = normalize(cross(tg, vec3(0, 1, 0)));
  }
  float phE = (HO.y - 0.13 - YE)/P*TAU;
  HE = vec3(RH*cos(phE), HO.y - 0.13, ZC0 + RH*sin(phE));
  HD = normalize(vec3(sin(phE), 0.0, -cos(phE)));
  float LF = 1.9;                                   // 날아 떨어지는 몫 (보이지 않는 곳까지)
  float L0 = 0.16;                                  // 상자 속에서 기다리는 몫
  float Ltot = L0 + LH + LR + LF;
  VS = Ltot/T;                                       // 15초에 한 바퀴
  for(int i=0;i<NB;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/float(NB));
    float s = u*Ltot - L0;
    vec3 c; mat3 R;
    if(s < 0.0){
      c = HE + vec3(0, HB, 0) + HD*s;
      R = rotA(vec3(1, 0, 0), -s/RB);
    } else if(s < LH){
      float th = s/LH*NT*TAU;                        // 내려온 각
      float ph = NT*TAU - th;                        // 위에서부터 줄어드는 각 (끝에서 0)
      c = vec3(RH*cos(ph), YE + P*ph/TAU + HB, ZC0 + RH*sin(ph));
      R = rotA(vec3(1, 0, 0), -s/RB)*rotA(vec3(0, 1, 0), -ph);
    } else if(s < LH + LR){
      float sr = s - LH;
      int k = 0;
      for(int j=1;j<NQ;j++) if(QL[j] < sr) k = j;
      int k2 = min(k + 1, NQ - 1);
      float f = clamp((sr - QL[k])/max(QL[k2] - QL[k], 1e-4), 0.0, 1.0);
      c = mix(Q[k], Q[k2], f) + vec3(0, HB, 0);
      vec3 tg = normalize(Q[k2] - Q[k]);
      R = rotA(vec3(1, 0, 0), -s/RB)*rotA(vec3(0, 1, 0), atan(tg.x, -tg.z));
    } else {
      float tau = (s - LH - LR)/VS;
      vec3 tg = normalize(Q[NQ-1] - Q[NQ-2]);
      c = Q[NQ-1] + vec3(0, HB, 0) + tg*VS*tau*1.15 + vec3(0, -2.6*tau*tau, 0);
      R = rotA(vec3(1, 0, 0), -s/RB - tau*3.0)*rotA(vec3(0, 1, 0), atan(tg.x, -tg.z));
    }
    BP[i] = c; BR[i] = R;
    BK[i] = mod(fi*5.0, 7.0);                         // 구슬 종류
  }
}

// 나선 위 각 ph 의 레일 가운데 높이
float helixY(float ph){ return YE + P*ph/TAU; }

// 나선 레일 둘
float helixD(vec3 p){
  vec2 d = p.xz - vec2(0.0, ZC0);
  float r = length(d);
  float a = atan(d.y, d.x);
  float k = floor((p.y - YE)/P - a/TAU + 0.5);
  float ph = a + TAU*k;
  float phc = clamp(ph, 0.0, NT*TAU);
  float yh = helixY(ph);
  float ca = TAU*RH/sqrt(TAU*RH*TAU*RH + P*P);
  float dy = (p.y - yh)*ca;
  float d1 = length(vec2(r - (RH - RW), dy)) - RT;
  float d2 = length(vec2(r - (RH + RW), dy)) - RT;
  float dd = min(d1, d2);
  float oor = abs(ph - phc)*RH;
  return oor > 0.0 ? length(vec2(max(dd, 0.0), oor)) : dd;
}
// 기둥에서 레일 아래로 뻗은 놋쇠 살 (90도마다)
float spokeD(vec3 p){
  vec2 d = p.xz - vec2(0.0, ZC0);
  float a = atan(d.y, d.x);
  float as = floor(a/(PI_*0.5) + 0.5)*(PI_*0.5);
  float k = floor((p.y - YE)/P - as/TAU + 0.5);
  float ph = as + TAU*k;
  if(ph < -0.01) ph += TAU;
  if(ph > NT*TAU + 0.01) ph -= TAU;
  float ys = helixY(ph) - RT - 0.006;
  vec2 dir = vec2(cos(as), sin(as));
  float al = dot(d, dir), pe = d.x*dir.y - d.y*dir.x;
  float t = clamp(al, 0.03, RH + RW + 0.012);
  return length(vec3(al - t, p.y - ys, pe)) - 0.0065;
}
// 호두나무 기둥 + 놋쇠 고리
float poleD(vec3 p){
  vec2 d = p.xz - vec2(0.0, ZC0);
  float r = length(d);
  float c = max(r - 0.034, p.y - (HO.y - 0.09));
  c = min(c, length(p - vec3(0.0, HO.y - 0.075, ZC0)) - 0.046);     // 놋쇠 꼭지 구슬
  float yy = p.y - 0.12;
  float rg = yy - 0.30*floor(yy/0.30 + 0.5);
  float ring = max(r - 0.040, abs(rg) - 0.008);
  float base = max(r - 0.075 + 0.25*max(p.y + 0.93, 0.0), p.y + 0.93 - 0.06);   // 바닥 받침
  return min(min(c, ring - 0.002), base);
}
// 마지막 굽이 레일 + 받침 기둥 + 끝마개
float runD(vec3 p){
  float d = 1e9;
  for(int i=1;i<NQ;i++){
    for(int sd=-1;sd<=1;sd+=2){
      float fs = float(sd)*RW;
      d = min(d, sdCap(p, Q[i-1] + QS[i-1]*fs, Q[i] + QS[i]*fs, RT));
    }
  }
  // 받침 기둥 (상자 안 바닥에 선다)
  vec3 s0 = bez(0.26);
  d = min(d, sdCap(p, s0 - vec3(0, 0.02, 0), vec3(s0.x, -HO.y, s0.z), 0.008));
  d = min(d, max(length(p.xz - s0.xz) - 0.03, p.y + HO.y - 0.012));
  // 가로대 (두 레일을 잇는다)
  for(int i=1;i<NQ;i++){
    vec3 q = Q[i] - vec3(0, RT + 0.005, 0);
    d = min(d, sdCap(p, q - QS[i]*(RW + 0.008), q + QS[i]*(RW + 0.008), 0.005));
  }
  // 끝마개
  vec3 e = Q[NQ-1];
  d = min(d, length(p - e - QS[NQ-1]*RW) - RT*1.6);
  d = min(d, length(p - e + QS[NQ-1]*RW) - RT*1.6);
  return d;
}
// 천장에 매단 놋쇠 상자: 구슬이 상자의 어두운 구멍에서 굴러 나온다
float collarD(vec3 p){
  vec3 q = p - HE;
  vec3 sd = vec3(-HD.z, 0.0, HD.x);
  vec3 l = vec3(dot(q, HD), q.y, dot(q, sd));
  return sdRBox(l - vec3(-0.075, 0.06, 0.0), vec3(0.075, 0.105, 0.075), 0.012);
}
float marbleD(vec3 p, out int id){
  float d = 1e9; id = 0;
  for(int i=0;i<NB;i++){
    float e = length(p - BP[i]) - RB;
    if(e < d){ d = e; id = i; }
  }
  return d;
}
float trackD(vec3 p){
  // 나선 몸통 경계: 기둥 축 둘레 원통
  vec2 d = p.xz - vec2(0.0, ZC0);
  float bc = length(d) - (RH + RW + 0.05);
  float h = bc > 0.3 ? bc : min(min(helixD(p), spokeD(p)), poleD(p));
  h = min(h, collarD(p));
  // 굽이 경계 상자
  float bb = sdBox(p - vec3(0.13, -0.50, -0.30), vec3(0.24, 0.48, 1.18));
  h = min(h, bb > 0.3 ? bb : runD(p));
  return h;
}
float map(vec3 p){
  int id;
  return min(trackD(p), marbleD(p, id));
}

M mat(vec3 p, vec3 n){
  int id; float dm = marbleD(p, id);
  vec3 brass = L(vec3(0.95, 0.74, 0.40));
  if(dm < 0.003){
    vec3 q = BR[id]*(p - BP[id])/RB;
    float k = BK[id];
    if(k < 1.5){
      // 진주빛 구슬
      M m = mk(L(vec3(0.74, 0.72, 0.70)), 0.22, 0.0);
      m.coat = 1.0; m.iri = 0.35; m.sss = 0.12;
      return m;
    }
    if(k < 2.5){
      // 놋쇠 구슬
      M m = mk(brass, 0.10, 1.0);
      return m;
    }
    // 유리 구슬: 짙은 빛깔 + 속 소용돌이 (고양이 눈)
    vec3 tint = k < 3.5 ? L(vec3(0.10, 0.35, 0.85)) : (k < 4.5 ? L(vec3(0.95, 0.48, 0.10)) : (k < 5.5 ? L(vec3(0.10, 0.62, 0.42)) : L(vec3(0.80, 0.12, 0.18))));
    float sw = q.y*cos(q.x*2.2) + q.z*sin(q.x*2.2);
    float vane = smoothstep(0.22, 0.06, abs(sw))*smoothstep(1.0, 0.55, abs(q.x));
    M m = mk(tint*0.18, 0.04, 0.0);
    m.coat = 1.0;
    float cv = max(dot(n, -VRD), 0.0);
    m.emit = tint*(0.08 + 0.55*cv*cv) + mix(vec3(1.0), tint, 0.4)*vane*0.35*cv;
    return m;
  }
  if(collarD(p) < 0.004){
    vec3 q = p - HE;
    float ax = dot(q, HD);
    float rr = length(q - HD*ax - vec3(0, HB*0.6, 0));
    vec3 c = mix(L(vec3(0.30, 0.17, 0.10)), L(vec3(0.42, 0.25, 0.14)), vnoise(vec2(q.x*8.0 + q.z*8.0, q.y*60.0)));
    if(abs(ax) < 0.01){
      if(rr < 0.060){ M m = mk(vec3(0.004), 0.9, 0.0); return m; }            // 구멍 속
      if(rr < 0.072){ M m = mk(L(vec3(0.30, 0.17, 0.10)), 0.3, 0.0); return m; }   // 호두나무 테
    }
    M m = mk(L(vec3(0.95, 0.74, 0.40))*0.9, 0.24, 1.0);
    return m;
  }
  vec2 d = p.xz - vec2(0.0, ZC0);
  float r = length(d);
  float dp = poleD(p);
  if(dp < 0.004 && r < 0.0395 && p.y > -0.86 && p.y < HO.y - 0.10){
    // 호두나무: 세로 나뭇결
    float a = atan(d.y, d.x);
    float g = vnoise(vec2(a*6.0, p.y*1.5))*0.6 + vnoise(vec2(a*22.0, p.y*4.0))*0.4;
    vec3 c = mix(L(vec3(0.28, 0.16, 0.09)), L(vec3(0.42, 0.26, 0.15)), g);
    c *= 0.85 + 0.3*smoothstep(0.4, 0.6, sin(a*3.0 + p.y*40.0 + g*6.0)*0.5 + 0.5)*0.4;
    M m = mk(c, 0.38, 0.0); m.coat = 0.30;
    return m;
  }
  M m = mk(brass, 0.16, 1.0);
  return m;
}
