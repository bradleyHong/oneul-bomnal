// S09 눈덩이 — 눈 내리는 검붉은 벽돌 방. 새벽빛 아치 너머에서 작은 눈덩이가 굴러 들어와 눈을 모으며 커지고, 벽돌 바닥에 길을 남긴 채 틀을 넘어 관객 쪽으로 굴러 나온다.
// @lib _winter
// @post {"exposure":0.92,"sat":1.08,"contrast":1.08,"bloom":0.08}
#define DT 1.8
#define BRICK1 L(vec3(0.46, 0.18, 0.13))
#define BRICK2 L(vec3(0.60, 0.27, 0.19))
#define MORTAR L(vec3(0.46, 0.45, 0.46))
#define BRICK_AGE 0.65
#define KEYC vec3(1.55, 1.28, 1.02)
#define LKD vec3(-0.45, 0.62, -0.64)
#define AMB_TOP L(vec3(0.36, 0.43, 0.64))
#define AMB_BOT L(vec3(0.24, 0.26, 0.34))
#define BACKC L(vec3(0.95, 0.75, 0.70))*0.35
#define RIMC L(vec3(1.0, 0.84, 0.72))*1.5
#define FRAMEC L(vec3(0.07, 0.065, 0.07))
#define SNOW 6
#define SNOWD 0.10
#define SNOWC vec3(0.75, 0.80, 0.90)
#define MAXD 24.0
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_BACKWALL
#define HAS_PREP
#define NB 2
const float AW = 0.62, AYC = 0.0;     // 아치 반폭 · 반원 중심 높이
const float LY = -0.28;                // 돌 선반 윗면 높이
const vec3 FOGC = vec3(0.30, 0.34, 0.48);
const vec3 LS = vec3(0.0, 0.1936, 0.9811);   // 아치 너머 낮은 새벽 해 쪽
const vec3 SUNC = vec3(5.0, 3.1, 1.75);
float GRV;                                        // 이 점의 눈덩이 길(0..1)
const float ZS = DT + 3.0;            // 눈덩이 출발 (아치 너머 안개 속)
const float R0 = 0.085, REND = 0.72;  // 처음·마지막 반지름
const float RUN = 10.0;               // 구르는 시간(초)

float archD(vec2 q){ vec2 c = q - vec2(0.0, AYC); return c.y > 0.0 ? length(c) - AW : abs(c.x) - AW; }
bool backHole(vec3 q){ return archD(q.xy) < 0.0; }
vec3 backWall(vec3 p){ float d = archD(p.xy); return L(vec3(1.0, 0.78, 0.66))*0.08*exp(-max(d, 0.0)*5.0); }   // 아치 둘레로 번지는 새벽빛
vec3 outside(vec3 rd, vec3 ro){
  float e = rd.y;
  if(e < 0.0) return FOGC;
  vec3 c = mix(FOGC, L(vec3(0.98, 0.78, 0.70))*1.3, smoothstep(0.0, 0.12, e));     // 지평선 위 복숭앗빛
  c = mix(c, L(vec3(0.50, 0.60, 0.88))*0.9, smoothstep(0.12, 0.50, e));             // 위로 갈수록 찬 하늘
  c += L(vec3(1.0, 0.86, 0.66))*0.9*exp(-abs(e - 0.03)*28.0)*exp(-abs(rd.x/max(rd.z, 0.1) - 0.12)*3.0);
  return c;
}

// 눈덩이 상태
vec3 BP[NB]; float BR[NB]; mat3 BM[NB]; float ZB[NB], FADE[NB], LXS[NB], LXE[NB];
float CC;
void prep(){
  float fy = -HO.y;
  CC = log(REND/R0)/ZS;
  for(int i=0;i<NB;i++){
    float fi = float(i);
    float s = mod(uT - fi*7.5, T);
    float xs = i == 0 ? -0.18 : 0.20, xe = i == 0 ? -0.52 : 0.56;
    LXS[i] = xs; LXE[i] = xe;
    float u = clamp(s/RUN, 0.0, 1.0);
    float d = ZS*(0.6*u + 0.4*u*u);                         // 조금씩 빨라진다
    float r = R0*exp(CC*d);                                 // 구를수록 눈이 붙어 커진다
    float k = (xe - xs)/ZS;
    vec3 p = vec3(mix(xs, xe, d/ZS), fy + r - 0.012, ZS - d);
    float th = (1.0 - exp(-CC*d))/(CC*R0);                  // 굴러간 각 = ∫dd/r
    ZB[i] = p.z;
    if(s > RUN){                                            // 틀 끝 턱을 넘어 관객 쪽으로 떨어진다
      float u2 = s - RUN, v = ZS*(0.6 + 0.8)/RUN;
      float zz = v*u2 + 0.6*u2*u2;
      p += vec3(k*zz, -0.5*2.2*u2*u2, -zz);
      th += zz/r;
      ZB[i] = -1.0;
      if(u2 > 2.2){ r = 0.0; p = vec3(0.0, -30.0, -3.0); }
    }
    BR[i] = r*smoothstep(0.0, 0.8, s);
    BP[i] = p;
    BM[i] = rotA(vec3(-1.0, 0.0, -k), th);
    FADE[i] = 1.0 - smoothstep(12.3, 14.8, s);               // 내리는 눈이 바퀴 자국을 다시 덮는다
  }
}

// 쌓인 눈 높이 (벽 쪽 눈더미 · 뒷벽 눈더미 · 바퀴 자국)
float groundH(vec2 xz){
  float fy = -HO.y;
  float x = xz.x, z = xz.y;
  float n1 = vnoise(xz*vec2(1.7, 2.3) + 3.0), n2 = vnoise(xz*7.0 + 11.0);
  float h = 0.050 + 0.035*n1 + 0.008*n2 + 0.025*vnoise(xz*0.9 + 5.0);
  float dx = HO.x - abs(x);
  h += 0.007*vnoise(xz*vec2(4.0, 7.0) + n1*3.0);                               // 바람 물결
  h += (0.11 + 0.08*n1)*exp(-dx*dx*30.0);
  if(z < DT){ float dz = DT - z; h += (0.08 + 0.05*n1)*exp(-dz*dz*30.0)*smoothstep(AW - 0.05, AW + 0.30, abs(x)); }
  else h += 0.02 + 0.30*smoothstep(DT + 1.0, DT + 7.0, z)*vnoise(xz*vec2(0.55, 0.35) + 2.0);
  if(z < DT) h = mix(0.010, h, smoothstep(-0.02, 0.40, z));                     // 앞 턱으로 갈수록 얇아져 흰 띠가 없다
  float H = fy + h;
  GRV = 0.0;
  for(int i=0;i<NB;i++){
    if(FADE[i] < 0.001 || z > ZS || z < ZB[i]) continue;
    float dd = ZS - z;
    float lx = mix(LXS[i], LXE[i], dd/ZS);
    float w = R0*exp(CC*dd)*0.66;
    float ax = abs(x - lx);
    float g = smoothstep(w, w*0.55, ax)*smoothstep(ZB[i], ZB[i] + 0.03, z);
    float tgt = fy + 0.004 + 0.012*smoothstep(DT - 0.05, DT + 0.05, z);           // 방 안은 벽돌이 드러나고 밖은 다져진 눈
    H = mix(H, tgt, g*FADE[i]);
    GRV = max(GRV, g*smoothstep(0.35, 0.9, FADE[i]));
    H += 0.018*exp(-(ax - w)*(ax - w)/(w*w*0.06))*FADE[i];                         // 밀려난 눈 둔덕
  }
  return H;
}
float groundD(vec3 p){
  float fy = -HO.y;
  if(p.y > fy + 0.75) return p.y - fy - 0.70;
  float g = (p.y - groundH(p.xz))*0.62;
  vec2 c = vec2(g, -p.z - 0.004);                                                 // 앞 턱에서 둥글게 끝나는 눈
  g = length(max(c + 0.012, 0.0)) + min(max(c.x, c.y), 0.0) - 0.012;
  g = max(g, (fy - 0.02) - p.y);
  return max(g, p.z - DT - 9.0);
}
// 돌 선반 (옆벽 둘, 뒷벽 아치 양쪽) + 위에 쌓인 눈. part 0 돌 · 1 눈
float ledgeD(vec3 p, out float part){
  part = 0.0;
  vec3 qs = vec3(HO.x - abs(p.x), p.y - LY, p.z);
  vec3 qb = vec3(DT - p.z, p.y - LY, abs(p.x));
  float ms = DT*0.5, mb = (HO.x - AW - 0.22)*0.5, cb = AW + 0.22 + mb;
  float st = min(sdRBox(qs - vec3(0.02, -0.045, ms), vec3(0.085, 0.045, ms), 0.008),
                 sdRBox(qb - vec3(0.02, -0.045, cb), vec3(0.085, 0.045, mb), 0.008));
  float nz = vnoise(vec2(p.z + p.x, p.y)*4.0);
  float cs = sdRBox(qs - vec3(0.04, 0.012 - 0.010*nz, ms), vec3(0.085, 0.034, ms + 0.01), 0.030);
  float cbk = sdRBox(qb - vec3(0.04, 0.012 - 0.010*nz, cb), vec3(0.085, 0.034, mb + 0.01), 0.030);
  float sn = min(cs, cbk) - 0.006*vnoise3(p*30.0);
  part = sn < st ? 1.0 : 0.0;
  return min(st, sn);
}
// 돌 아치: 뒷벽에서 도드라진 테 + 이맛돌 + 두꺼운 벽 속 터널
float archSD(vec3 p){
  float d2 = archD(p.xy);
  float ring = max(abs(d2 - 0.075) - 0.075, abs(p.z - (DT - 0.04)) - 0.04) - 0.004;
  float key = sdRBox(p - vec3(0.0, AYC + AW + 0.085, DT - 0.055), vec3(0.075, 0.11, 0.055), 0.008);
  float tun = max(max(-d2, d2 - 0.3), abs(p.z - (DT + 0.25)) - 0.25);
  return min(min(ring, key), tun);
}
float ballD(int i, vec3 p){
  vec3 q = transpose(BM[i])*(p - BP[i]);
  float r = BR[i];
  float d = length(q) - r;
  return d + r*(0.045*(vnoise3(q/r*2.6) - 0.5) + 0.018*(vnoise3(q/r*8.0 + 3.0) - 0.5));   // 뭉친 눈 덩어리 결
}
float map(vec3 p){
  float d = groundD(p);
  if(abs(p.y - LY) < 0.3){ float pt; d = min(d, ledgeD(p, pt)); } else d = min(d, abs(p.y - LY) - 0.12);
  if(p.z > DT - 0.6 && p.z < DT + 1.0) d = min(d, archSD(p)); else d = min(d, abs(p.z - DT - 0.2) - 0.5);
  for(int i=0;i<NB;i++){
    if(BR[i] < 0.01) continue;
    float bd = length(p - BP[i]) - BR[i]*1.12;
    if(bd > 0.3){ d = min(d, bd); continue; }
    d = min(d, ballD(i, p)*0.85);
  }
  return d;
}

// 아치를 지나 들어오는 새벽 햇살: 아치 구멍을 지나는가 × 물체 그림자
float sunVis(vec3 p, vec3 n){
  float vis = 1.0;
  if(p.z < DT){
    float t = (DT - p.z)/LS.z; vec2 q = (p + LS*t).xy;
    float pen = 0.01 + 0.02*t;
    vis = smoothstep(pen, -pen, archD(q));
    if(vis < 0.001) return 0.0;
  }
  float res = 1.0, tt = 0.03 + 0.03*rnd(), ph = 1e10;                           // 걸음을 흔들어 줄무늬 대신 고운 잡음 → 72표본이 지운다
  vec3 o = p + n*0.02;
  for(int i=0;i<44;i++){
    float h = map(o + LS*tt);
    float y = h*h/(2.0*ph), dd = sqrt(max(h*h - y*y, 0.0));
    res = min(res, 10.0*dd/max(1e-4, tt - y));
    ph = h;
    tt += clamp(h, 0.02, 0.25);
    if(res < 0.01 || tt > 4.0) break;
  }
  res = clamp(res, 0.0, 1.0);
  return vis*res*res*(3.0 - 2.0*res);
}
vec3 sunLight(vec3 p, vec3 n, M m, float sss){
  float nl = dot(n, LS);
  if(nl < -0.3) return vec3(0.0);
  float vis = sunVis(p, n);
  if(vis < 0.001) return vec3(0.0);
  vec3 c = m.alb*SUNC*max((nl + 0.3)/1.3, 0.0)*vis;
  float rim = pow(1.0 - max(dot(n, -VRD), 0.0), 3.0);                            // 역광 테두리: 눈 속으로 스민 빛
  c += SUNC*m.alb*rim*sss*2.4*vis;
  if(m.glit > 0.0){                                                              // 햇살 속 반짝이는 눈 결정
    vec3 gq = p*260.0; vec3 hh = h33(floor(gq) + 3.1);
    vec3 gn = normalize(n + (hh - 0.5)*1.1);
    float sp = pow(max(dot(reflect(VRD, gn), LS), 0.0), 300.0)*step(0.55, hh.x);
    c += SUNC*sp*smoothstep(0.5, 0.15, length(fract(gq) - 0.5))*vis*9.0;
  }
  return c;
}
// 눈덩이가 지나간 길에 드러난 젖은 벽돌 포장
M pavers(vec3 p){
  vec2 uv = p.xz; vec2 S = vec2(0.24, 0.12);
  float row = floor(uv.y/S.y); uv.x += mod(row, 2.0)*S.x*0.5;
  vec2 cid = floor(uv/S), f = fract(uv/S)*S, e2 = min(f, S - f);
  float h = h21(cid + 3.3);
  float mo = 1.0 - smoothstep(0.006, 0.010, min(e2.x, e2.y));
  vec3 bc = mix(L(vec3(0.42, 0.17, 0.12)), L(vec3(0.56, 0.25, 0.17)), h)*(0.8 + 0.3*vnoise(p.xz*40.0));
  M m = mk(mix(bc, L(vec3(0.40, 0.40, 0.42)), mo), mix(0.30, 0.7, mo), 0.0);
  float sn = smoothstep(0.55, 0.85, vnoise(p.xz*18.0) + mo*0.4);                  // 줄눈과 가장자리에 남은 눈
  m.alb = mix(m.alb, vec3(0.7, 0.73, 0.8), sn); m.rough = mix(m.rough, 0.85, sn);
  return m;
}
M mat(vec3 p, vec3 n){
  // 눈덩이
  for(int i=0;i<NB;i++){
    if(BR[i] < 0.01) continue;
    if(length(p - BP[i]) - BR[i] < BR[i]*0.08 + 0.004){
      M m = snowMat(0.30); m.sss = 0.15; m.wrap = 0.05;
      vec3 q = transpose(BM[i])*(p - BP[i]);
      float band = vnoise3(q/BR[i]*vec3(1.0, 5.0, 1.0));                         // 감겨 붙은 눈 겹
      m.alb *= 0.93 + 0.10*band;
      m.emit = sunLight(p, n, m, 1.3);
      return m;
    }
  }
  float pt; float dl = ledgeD(p, pt);
  float da = archSD(p);
  float dg = groundD(p);
  M m;
  if(dl < da && dl < dg){
    if(pt > 0.5) m = snowMat(0.20);
    else m = stoneMat(p, smoothstep(0.012, 0.0, abs(fract(p.z*2.2 + p.x*2.2) - 0.5) - 0.49));
  } else if(da < dg){
    float a = atan(p.y - AYC, p.x);
    float vj = p.y > AYC ? smoothstep(0.010, 0.0, abs(fract(a/3.14159*9.0) - 0.5) - 0.485) : smoothstep(0.012, 0.0, abs(fract((p.y + 0.93)*3.0) - 0.5) - 0.485);
    m = stoneMat(p, vj);
  } else {
    m = snowMat(0.05); m.bumpF = 70.0;
    groundH(p.xz);
    if(GRV > 0.01 && p.z < DT){ M b = pavers(p); float k = smoothstep(0.3, 0.8, GRV); m.alb = mix(m.alb, b.alb, k); m.rough = mix(m.rough, b.rough, k); m.sss *= 1.0 - k; m.glit *= 1.0 - k; m.wrap *= 1.0 - k; }
  }
  m.emit = sunLight(p, n, m, m.sss);
  // 아치 너머: 새벽빛 받은 눈밭이 안개 속으로
  if(p.z > DT + 0.05){
    float glow = smoothstep(DT + 0.05, DT + 0.6, p.z);
    m.emit += L(vec3(1.0, 0.82, 0.74))*0.20*glow*(0.4 + 0.6*max(n.y, 0.0));
    float f = 1.0 - exp(-max(p.z - DT - 0.5, 0.0)*0.38);
    m.alb *= 1.0 - f; m.sss *= 1.0 - f; m.glit *= 1.0 - f;
    m.emit = mix(m.emit, FOGC, f);
  }
  return m;
}
