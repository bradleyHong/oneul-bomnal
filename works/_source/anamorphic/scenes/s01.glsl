// S01 새싹 — 비에 젖은 벽돌 바닥 틈에서 반들한 새싹이 벽돌을 밀어 올리며 솟아 잎을 펴고, 잎끝은 틀 밖 관객 쪽으로 뻗어 물방울을 떨군다. 잎을 접고 틈 속으로 쏙 숨으면 물이 튀고, 다시 솟는다.
// @lib _spring
// @post {"exposure":1.0,"sat":1.10,"contrast":1.10,"bloom":0.06}
#define DT 1.8
#define FLOOR_REFL puddleK(p)
#define HAS_WALLTINT
#define LKD vec3(-0.50, 0.72, -0.50)
#define KEYC vec3(2.55, 2.62, 2.62)
#define AMB_TOP L(vec3(0.58, 0.63, 0.68))
#define AMB_BOT L(vec3(0.26, 0.25, 0.23))
#define FRAMEC L(vec3(0.12, 0.11, 0.10))
#define BRICK1 L(vec3(0.50, 0.29, 0.21))
#define BRICK2 L(vec3(0.66, 0.46, 0.34))
#define MORTAR L(vec3(0.52, 0.52, 0.48))
#define BRICK_AGE 0.65
#define MOSS 0.0
#define MOSSC L(vec3(0.22, 0.34, 0.12))
#define RIMD vec3(0.45, 0.70, 0.80)
#define RIMC L(vec3(0.85, 0.95, 0.85))
#define HAS_PREP
#define ND 13
#define NSPL 8

// ── 비에 젖은 바닥: 짙게 젖은 벽돌, 이끼는 줄눈 틈에만, 작은 물웅덩이 셋 ──
float puddleM(vec2 xz){
  float m = 0.0;
  vec2 c[3]; c[0] = vec2(0.02, 0.64); c[1] = vec2(0.70, 0.34); c[2] = vec2(-1.05, 1.10);
  vec2 r[3]; r[0] = vec2(0.34, 0.12); r[1] = vec2(0.24, 0.11); r[2] = vec2(0.26, 0.12);
  for(int i=0;i<3;i++){
    float e = length((xz - c[i])/r[i]) - 1.0 + 0.35*(vnoise(xz*7.0 + float(i)*3.1) - 0.5);
    m = max(m, smoothstep(0.05, -0.12, e));
  }
  return m;
}
float puddleK(vec3 p){ return 0.80*puddleM(p.xz); }      // 엔진 바닥 반사 세기 (웅덩이에서만)
vec3 wallTint(vec3 p, float id, vec3 alb){
  vec3 MC = L(vec3(0.22, 0.34, 0.12));
  if(id > 2.5 && id < 3.5 && p.y < 0.0){
    // 바닥 벽돌 칸 (엔진과 같은 무늬) → 줄눈 틈 거리
    vec2 S = vec2(0.24, 0.12);
    float row = floor(p.z/S.y);
    vec2 q = vec2(p.x + mod(row, 2.0)*S.x*0.5, p.z);
    vec2 f = fract(q/S)*S; vec2 e2 = min(f, S - f); float e = min(e2.x, e2.y);
    float crack = 1.0 - smoothstep(0.006, 0.020, e);
    float mpat = smoothstep(0.40, 0.70, fbm(p.xz*2.2 + 4.0));
    alb = mix(alb, MC*(0.7 + 0.6*vnoise(p.xz*60.0)), crack*mpat*0.85);
    // 비에 젖어 짙고 살짝 차갑다
    alb *= 0.68;
    alb = mix(alb, vec3(dot(alb, vec3(0.33))), 0.15);
    float pm = puddleM(p.xz);
    alb = mix(alb, alb*0.45, pm);  // 고인 물은 더 어둡다
  } else if(id < 2.5 || id > 3.5){
    // 벽: 아래쪽만 젖은 얼룩과 줄눈 이끼 조금
    float low = smoothstep(-0.35, -0.93, p.y);
    alb *= 1.0 - 0.30*low;
    alb = mix(alb, MC, low*smoothstep(0.55, 0.75, fbm(p.zy*3.0 + p.xy*2.0))*0.5);
  }
  return alb;
}

const vec3 B0 = vec3(0.0, -0.93, 0.96);      // 줄눈 틈 (바닥 벽돌 7줄과 8줄 사이)
vec4 GS;                                      // 지금 상태 (줄기·펼침·크기·들림)
vec3 TP; float SR;                            // 줄기 끝 · 줄기 굵기
vec3 LD[2], LV[2], LN[2]; float LL[2], LW[2], LTH[2];
vec3 DP[ND]; float DR[ND];
mat3 BRK[3]; vec3 BRP[3];

// 하루의 순서 (15초): 다 자란 채 머물다 → 잎을 접고 → 틈 속으로 쏙 숨으며 물이 튄다 → 새로 솟아 잎을 편다
// 돌려주는 값: x 줄기 높이 · y 잎 펼침 · z 잎 크기 · w 벽돌 들림
vec4 stateAt(float t){
  if(t >= 13.4 || t < 7.6) return vec4(1.0);
  if(t < 8.5) return vec4(1.0, 1.0 - ease((t - 7.6)/0.9), 1.0, 1.0);
  if(t < 9.0){ float k = (t - 8.5)/0.5; k = k*k; return vec4(1.0 - k, 0.0, 1.0 - k, 1.0 - k); }
  if(t < 9.6) return vec4(0.0);
  float g = ease((t - 9.6)/3.8);
  return vec4(smoothstep(0.0, 0.55, g), smoothstep(0.35, 0.95, g), smoothstep(0.12, 0.85, g), smoothstep(0.0, 0.35, g));
}
// 시각 t 의 줄기 끝과 잎 틀 (잎 i: 0 오른쪽, 1 왼쪽)
void plantAt(float t, int i, out vec3 tp, out vec3 D, out vec3 V, out vec3 N, out float Ll, out float W, out float th){
  vec4 st = stateAt(t);
  float S = st.x, O = st.y, Ls = st.z;
  float h = mix(0.07, 0.90, S);
  float sw = 0.025*sin(TAU*(t/T*2.0)) + 0.015*sin(TAU*(t/T*3.0) + 1.0);   // 봄바람에 살짝
  tp = vec3(B0.x - 0.12*S + sw, B0.y + h, B0.z - 0.70*S*S);
  float s = i == 0 ? 1.0 : -1.0;
  vec3 dc = vec3(0.10*s, 1.0, 0.05);
  vec3 dO = i == 0 ? vec3(0.60, 0.64, -0.62) : vec3(-0.80, -0.04, -0.60);
  float fl = 0.04*sin(TAU*(t/T*3.0 + float(i)*0.37));                     // 잎 떨림
  D = normalize(mix(dc, dO, O) + vec3(0.0, fl, 0.0));
  vec3 n0 = normalize(mix(vec3(-s, 0.0, 0.0), i == 0 ? vec3(-0.45, 0.62, -0.62) : vec3(0.30, 0.80, -0.55), O));
  V = normalize(cross(n0, D)); N = cross(D, V);
  Ll = mix(0.10, i == 0 ? 1.80 : 1.62, Ls);
  W = mix(0.04, 0.42, Ls);
  th = mix(0.030, 0.070, Ls);
}
// 잎 지역 좌표 (u 길이, v 폭, w 두께 · 굽음 펴기)
vec3 leafQ(vec3 p, int i){
  vec3 o = p - TP;
  float u = dot(o, LD[i]), v = dot(o, LV[i]), w = dot(o, LN[i]);
  float Lf = max(LL[i], 0.05);
  float un = u/Lf;
  w += -0.30*v*v + 0.20*un*un*Lf;       // 가장자리는 오목하게 들리고 끝은 처진다
  return vec3(u, v, w);
}
float leafD(vec3 p, int i){
  // 멀면 잎을 감싼 캡슐까지 참 거리 (그림자·반사 광선이 큰 걸음으로 온다)
  float cb = sdCap(p, TP, TP + LD[i]*LL[i], LW[i] + 0.10);
  if(cb > 0.6) return cb;
  vec3 q = leafQ(p, i);
  float Lf = max(LL[i], 0.05);
  // 잎 윤곽: 두 원이 겹친 렌즈 (끝이 뾰족, 거리 정확) → 두께만큼 둥글게 부풀린다
  float b = Lf*0.5, W = LW[i];
  float rr = (b*b/W + W)*0.5, dd = (b*b/W - W)*0.5;
  vec2 v2 = abs(vec2(q.y, q.x - b - 0.03));
  float bb = sqrt(rr*rr - dd*dd);
  float d2 = ((v2.y - bb)*dd > v2.x*bb) ? length(v2 - vec2(0.0, bb)) : length(v2 - vec2(-dd, 0.0)) - rr;
  float ht = LTH[i]*0.5;
  float wz = q.z + 0.006*exp(-q.y*q.y/0.0012);                  // 가운데 잎맥 골
  float hte = ht*clamp(-d2/(W*0.55), 0.18, 1.0);                // 가운데 도톰, 가장자리 얇은 렌즈 단면
  float d = max(d2, abs(wz) - hte);
  return min(max(d*0.75, cb), 0.6);          // 경계 밖 값과 이음매 없이 (가파른 오르막이 없게)
}
float stemD(vec3 p, out float tt){
  vec3 a = B0 - vec3(0.0, 0.25, 0.0);
  vec3 b = vec3(B0.x, mix(B0.y, TP.y, 0.55), B0.z);
  return sdBez(p, a, b, TP, SR, SR*0.70, tt);
}
// 들린 바닥 벽돌 세 장
float bricksD(vec3 p, out int k){
  float d = 1e9; k = 0;
  for(int j=0;j<3;j++){
    vec3 q = BRK[j]*(p - BRP[j]);
    float e = sdRBox(q, vec3(0.113, 0.034, 0.053), 0.012);
    if(e < d){ d = e; k = j; }
  }
  return d;
}
float soilD(vec3 p){
  float hs = 0.012 + 0.055*GS.w;                 // 흙 둔덕: 대부분 바닥 아래, 위로 hs 만큼
  vec3 q = p - vec3(B0.x, B0.y - 0.09 + hs, B0.z);
  float d = sdEll(q, vec3(0.17, 0.09, 0.12));
  d += 0.012*(vnoise3(p*38.0) - 0.5);
  return d;
}

void prep(){
  GS = stateAt(uT);
  for(int i=0;i<2;i++){ vec3 tp; plantAt(uT, i, tp, LD[i], LV[i], LN[i], LL[i], LW[i], LTH[i]); TP = tp; }
  SR = mix(0.030, 0.078, GS.x);
  // 벽돌: 줄기가 밀어 올린 만큼 기운다
  float lift = GS.w;
  // 앞 벽돌 (7줄, 가운데) — 뒤쪽 모서리가 들린다 (앞 모서리 축)
  BRP[0] = vec3(0.0, -0.93 - 0.028 + 0.008, 0.90);
  BRK[0] = rotA(vec3(1, 0, 0), -0.50*lift)*rotA(vec3(0, 1, 0), 0.12*lift);
  BRP[0] += vec3(0.0, 0.075*lift, -0.03*lift);
  // 뒤 벽돌 둘 (8줄) — 앞쪽 모서리가 들리고 바깥으로 기운다
  BRP[1] = vec3(-0.12, -0.93 - 0.028 + 0.008, 1.02) + vec3(-0.025, 0.050, 0.010)*lift;
  BRK[1] = rotA(normalize(vec3(1, 0, 0.35)), 0.45*lift)*rotA(vec3(0, 0, 1), -0.18*lift);
  BRP[2] = vec3(0.12, -0.93 - 0.028 + 0.008, 1.02) + vec3(0.030, 0.040, 0.012)*lift;
  BRK[2] = rotA(normalize(vec3(1, 0, -0.30)), 0.40*lift)*rotA(vec3(0, 0, 1), 0.22*lift);
  // 물방울: 잎이 다 펴진 동안 (13.4초 → 다음 바퀴 7.6초) 잎을 타고 굴러 관객 쪽 가장자리에서 떨어진다
  float hw = mod(uT - 13.4, T);
  for(int k=0;k<ND;k++){ DR[k] = 0.0; DP[k] = vec3(0.0, -40.0, 0.0); }
  for(int k=0;k<4;k++){
    float fk = float(k);
    int li = 1;
    float s = hw - (0.4 + fk*1.8);
    if(s < 0.0 || s > 3.3) continue;
    float vo = (k == 1 || k == 3 ? -0.08 : 0.06);
    if(s < 1.8){
      float a = (s/1.8)*(s/1.8);
      float un = mix(0.32, 0.56, a), v = mix(vo, -LW[li]*0.97, a);
      float Lf = LL[li], u = un*Lf + 0.03;
      float top = LTH[li]*0.5*clamp((LW[li] - abs(v))/(LW[li]*0.55), 0.18, 1.0);
      float r = 0.060*smoothstep(0.0, 0.35, s);
      float w = top + r*0.80 + 0.30*v*v - 0.20*un*un*Lf;
      DP[k] = TP + LD[li]*u + LV[li]*v + LN[li]*w;
      DR[k] = r;
    } else {
      float tr = uT - (s - 1.8);
      vec3 tp, D, V, N; float Lf, W, th;
      plantAt(tr, li, tp, D, V, N, Lf, W, th);
      float un = 0.56, u = un*Lf + 0.03, v = -W*0.97;
      vec3 p0 = tp + D*u + V*v + N*(0.012 + 0.05 + 0.30*v*v - 0.20*un*un*Lf);
      float f = s - 1.8;
      DP[k] = p0 + (-V*0.45 + D*0.12)*f + vec3(0.0, -2.2, 0.0)*f*f;
      DR[k] = 0.058*(1.0 + 0.08*sin(f*28.0));
    }
  }
  {
    // 오른쪽 잎에 앉은 큰 물방울: 잎이 접히기 시작하면 굴러 떨어진다
    int k = 4;
    float un = 0.26, vo = -0.07;
    if(hw < 9.2){
      float r = 0.062*smoothstep(0.0, 0.8, hw);
      float Lf = LL[0], u = un*Lf + 0.03;
      DP[k] = TP + LD[0]*u + LV[0]*vo + LN[0]*(LTH[0]*0.5 + r*0.78 + 0.30*vo*vo - 0.20*un*un*Lf);
      DR[k] = r;
    } else if(hw < 10.4){
      vec3 tp, D, V, N; float Lf, W, th;
      plantAt(7.59, 0, tp, D, V, N, Lf, W, th);
      float u = un*Lf + 0.03;
      vec3 p0 = tp + D*u + V*vo + N*(th*0.5 + 0.048 + 0.30*vo*vo - 0.20*un*un*Lf);
      float f = hw - 9.2;
      DP[k] = p0 + vec3(0.05, 0.0, -0.10)*f + vec3(0.0, -2.6, 0.0)*f*f;
      DR[k] = 0.062*smoothstep(-0.93, -0.84, DP[k].y);
    }
  }
  // 새싹이 틈 속으로 숨는 순간 튀어 오르는 물방울
  float sf = uT - 8.92;
  if(sf > 0.0 && sf < 1.25){
    for(int j=0;j<NSPL;j++){
      float fj = float(j);
      float a = fj*TAU/float(NSPL) + 0.6*h11(fj*3.3);
      vec3 v = vec3(cos(a)*(0.45 + 0.25*h11(fj*5.1)), 1.45 + 0.45*h11(fj*7.7), sin(a)*0.35);
      vec3 q = B0 + vec3(0.0, 0.03, -0.02) + v*sf + vec3(0.0, -3.2, 0.0)*sf*sf;
      DP[5 + j] = q;
      DR[5 + j] = (0.030 + 0.016*h11(fj*2.9))*smoothstep(0.0, 0.05, sf)*smoothstep(-0.93, -0.86, q.y);
    }
  }
}
float map(vec3 p){
  float d = 1e9;
  // 식물 경계: 줄기 끝 둘레 큰 구
  float bd = length(p - TP) - (max(LL[0], LL[1]) + 0.25);
  float bs = length(p - vec3(B0.x, mix(B0.y, TP.y, 0.5), mix(B0.z, TP.z, 0.5))) - (0.5*(TP.y - B0.y) + 0.35);
  float bo = min(bd, bs);
  if(bo > 0.45) d = bo;
  else {
    float tt;
    d = stemD(p, tt);
    d = min(d, leafD(p, 0));
    d = min(d, leafD(p, 1));
    // 가운데 작은 본잎 눈
    float Ls = GS.y*GS.z;
    if(Ls > 0.01) d = smin(d, sdEll(p - TP - vec3(0.0, 0.07, -0.02)*Ls, vec3(0.035, 0.10, 0.030)*Ls), 0.03);
    d = min(d, 0.45);      // 경계 구와 이음매 없이 (가짜 반그림자 줄 방지)
  }
  // 바닥 근처: 들린 벽돌 · 흙
  float bb = length(p - vec3(B0.x, B0.y, B0.z)) - 0.42;
  if(bb > 0.45) d = min(d, bb);
  else { int k; d = min(d, min(min(bricksD(p, k), soilD(p)), 0.45)); }
  for(int k=0;k<ND;k++){
    if(DR[k] < 0.004) continue;
    d = min(d, length(p - DP[k]) - DR[k]);
  }
  return d;
}
M mat(vec3 p, vec3 n){
  // 물방울
  for(int k=0;k<ND;k++){
    if(DR[k] < 0.004) continue;
    if(length(p - DP[k]) - DR[k] < 0.004){
      M m = mk(L(vec3(0.16, 0.24, 0.24)), 0.03, 0.0);
      m.coat = 1.0;
      float back = max(dot(n, -normalize(LKD)), 0.0);
      m.emit = L(vec3(0.9, 1.0, 0.85))*(0.10 + 1.6*pow(back, 3.0)) + L(vec3(0.6, 0.78, 0.7))*0.22*pow(1.0 - max(dot(n, -VRD), 0.0), 2.0);
      return m;
    }
  }
  int k; float db = bricksD(p, k);
  float ds = soilD(p);
  if(db < 0.006 && db < ds){
    vec3 q = BRK[k]*(p - BRP[k]);
    M m = mk(brickAlb(q, float(k) + 3.0, BRICK1, BRICK2), 0.75, 0.0);
    float mz = vnoise(q.xz*22.0 + float(k));
    m.alb = mix(m.alb, MOSSC*(0.7 + 0.6*vnoise(q.xz*60.0)), smoothstep(0.55, 0.8, mz)*0.8);
    m.bump = 0.25; m.bumpF = 60.0;
    // 밑면·옆면은 젖은 흙
    m.alb *= mix(0.45, 1.0, smoothstep(-0.03, 0.01, q.y));
    return m;
  }
  if(ds < 0.01){
    M m = mk(L(vec3(0.22, 0.15, 0.10))*(0.7 + 0.5*vnoise(p.xz*70.0)), 0.45, 0.0);   // 젖은 흙
    m.bump = 0.5; m.bumpF = 90.0; m.coat = 0.25;
    return m;
  }
  float tt; float dst = stemD(p, tt);
  float d0 = leafD(p, 0), d1 = leafD(p, 1);
  if(dst < min(d0, d1) - 0.002){
    // 줄기: 아래는 희고 위로 갈수록 연두, 세로 결
    vec3 c = mix(L(vec3(0.80, 0.86, 0.62)), L(vec3(0.42, 0.72, 0.20)), smoothstep(0.15, 0.85, tt));
    c *= 0.92 + 0.08*sin(atan(p.x - TP.x, p.z - TP.z)*14.0);
    M m = mk(c, 0.28, 0.0);
    m.coat = 0.55; m.sss = 0.35; m.wrap = 0.25;
    return m;
  }
  int i = d0 < d1 ? 0 : 1;
  vec3 q = leafQ(p, i);
  float Lq = max(LL[i], 0.05);
  float un = clamp(q.x/Lq, 0.0, 1.0), vn = q.y/max(LW[i], 0.02);
  // 싱그러운 봄 초록: 잎자루 쪽은 조금 밝고 끝으로 짙어진다, 잎맥은 연하게
  vec3 c = mix(L(vec3(0.24, 0.45, 0.13)), L(vec3(0.08, 0.28, 0.08)), smoothstep(0.0, 0.85, un));
  c *= 0.88 + 0.24*vnoise(q.xy*vec2(9.0, 14.0));
  c = mix(c, L(vec3(0.30, 0.48, 0.14)), smoothstep(0.80, 1.0, abs(vn))*0.35);
  float mid = exp(-q.y*q.y/0.00018);
  float lat = smoothstep(0.10, 0.0, abs(fract(un*5.5 - abs(vn)*1.6) - 0.5) - 0.40)*smoothstep(0.1, 0.25, abs(vn))*smoothstep(0.95, 0.5, abs(vn));
  c = mix(c, L(vec3(0.44, 0.62, 0.28)), clamp(mid*0.65 + lat*0.28, 0.0, 1.0));
  float under = smoothstep(0.0, -0.4, dot(n, LN[i]));
  c = mix(c, L(vec3(0.36, 0.52, 0.26)), under*0.6);                 // 잎 뒷면은 연하고 뽀얗다
  M m = mk(c, 0.40, 0.0);
  m.coat = 0.16; m.sss = 0.10; m.wrap = 0.10;                       // 은은한 밀랍 윤기
  m.bump = 0.05; m.bumpF = 55.0;
  // 해가 잎 뒤에서 비칠 때만 잎살이 노르스름한 연두로 비친다
  float back = max(dot(-n, normalize(LKD)), 0.0);
  m.emit = L(vec3(0.62, 0.86, 0.22))*0.16*back*back*(0.6 + 0.4*un);
  return m;
}
