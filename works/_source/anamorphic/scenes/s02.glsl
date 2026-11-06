// S02 봄바람 연 — 벽돌 방 아치 창 너머 봄 하늘에서 줄을 단 방패연·가오리연이 날아들고, 줄이 끊어진 연은 긴 꼬리를 펄럭이며 재주를 넘어 틀 밖 관객 곁으로 지나간다.
// @lib _spring
// @post {"exposure":1.0,"sat":1.25,"contrast":1.08,"bloom":0.07}
#define DT 2.0
#define HAS_HOLE
#define HAS_BACKWALL
#define HAS_OUTSIDE
#define HAS_PREP
#define LKD vec3(-0.50, 0.70, -0.52)
#define KEYC vec3(2.75, 2.62, 2.40)
#define AMB_TOP L(vec3(0.54, 0.60, 0.68))
#define AMB_BOT L(vec3(0.34, 0.30, 0.26))
#define BACKC L(vec3(0.85, 0.92, 1.0))*0.55
#define FRAMEC L(vec3(0.14, 0.12, 0.11))
#define BRICK1 L(vec3(0.62, 0.38, 0.28))
#define BRICK2 L(vec3(0.80, 0.60, 0.45))
#define MORTAR L(vec3(0.80, 0.77, 0.70))
#define BRICK_AGE 0.35
#define MOSS 0.30
#define MOSSC L(vec3(0.36, 0.48, 0.16))
#define RIMD vec3(0.30, 0.55, 0.90)
#define RIMC L(vec3(0.95, 0.97, 1.0))
#define NK 4
#define BRICKH0 0.08

// 뒷벽의 큰 아치 창: 낮은 창턱, 옆 기둥 위로 납작한 반원
const float AW = 1.08, AS = -0.80, AY = -0.10, AH = 0.90;
float archD(vec2 q){                                          // 창 모양 안쪽 음수 (근사 거리)
  float e = max(abs(q.x) - AW, AS - q.y);
  float r = length(vec2(q.x/AW, (q.y - AY)/AH)) - 1.0;
  float cap = r*min(AW, AH);
  return max(e, q.y > AY ? cap : -1e9);
}
bool backHole(vec3 q){ return archD(q.xy) < 0.0; }
vec3 backWall(vec3 p){
  // 창가로 스미는 봄볕: 창 둘레 벽돌이 은은히 밝다
  float e = archD(p.xy);
  return L(vec3(0.95, 0.92, 0.80))*0.10*exp(-max(e, 0.0)*5.0);
}

// ── 봄 하늘: 연한 파랑 · 뭉게구름 · 먼 초록 언덕 ──
// 뭉게구름 한 덩이 (방위각·높이 공간의 둥근 덩이 몇 개 + 결)
float cloudPuff(vec2 q, float seed){
  float dsum = 0.0;
  for(int k=0;k<5;k++){
    float fk = float(k);
    vec2 c = vec2((fk - 2.0)*0.032 + 0.01*h11(seed + fk), 0.012*h11(seed*3.1 + fk) + 0.010*(1.0 - abs(fk - 2.0)*0.5));
    float r = 0.030 - 0.006*abs(fk - 2.0) + 0.006*h11(seed*7.3 + fk);
    dsum = max(dsum, smoothstep(r, r*0.55, length((q - c)*vec2(1.0, 1.35))));
  }
  float edge = fbm(q*70.0 + seed*9.0);
  return clamp(dsum*1.15 - 0.30*(1.0 - edge), 0.0, 1.0)*smoothstep(-0.012, 0.004, q.y);   // 바닥은 납작
}
vec3 outside(vec3 rd, vec3 ro){
  float e = rd.y + 0.10;                                    // 지평선을 조금 아래로
  float az = atan(rd.x, rd.z);
  vec3 c = mix(L(vec3(0.93, 0.93, 0.90)), L(vec3(0.60, 0.76, 0.95)), smoothstep(0.0, 0.22, e));
  c = mix(c, L(vec3(0.42, 0.62, 0.92)), smoothstep(0.18, 0.6, e));
  vec3 sd = normalize(vec3(0.55, 0.30, 1.0));
  float sg = max(dot(rd, sd), 0.0);
  c += L(vec3(1.0, 0.95, 0.80))*(0.25*pow(sg, 8.0) + 0.6*pow(sg, 90.0));
  if(e > 0.0){
    // 옅은 새털구름 (거의 그대로)
    vec2 cp = rd.xz/(e + 0.06)*0.55;
    float wisp = smoothstep(0.58, 0.85, fbm(cp*vec2(0.8, 2.2) + vec2(3.0, 1.0)));
    c = mix(c, L(vec3(0.97, 0.97, 0.98)), wisp*smoothstep(0.06, 0.16, e)*0.35);
    // 뭉게구름 넷: 15초에 정확히 한 칸씩 오른쪽으로 흘러 (창 밖 벽 뒤에서 되돌아온다)
    for(int k=0;k<4;k++){
      float fk = float(k);
      float x = -0.48 + 0.96*fract(uT/T + fk*0.25 + 0.1*h11(fk*5.0));
      vec2 q = vec2(az - x, e - (0.10 + 0.045*fk - 0.03*float(k/2)));
      if(abs(q.x) > 0.13) continue;
      float m = cloudPuff(q, fk*3.7 + 1.0);
      vec3 cc = mix(L(vec3(0.76, 0.80, 0.90)), L(vec3(1.0, 0.99, 0.97)), smoothstep(-0.01, 0.02, q.y));
      c = mix(c, cc*1.06, m*0.95);
    }
  }
  // 먼 산 · 나무줄 · 풀밭 언덕
  float h1 = 0.035 + 0.030*fbm(vec2(az*3.0, 1.0));
  float h2 = 0.005 + 0.022*fbm(vec2(az*6.0 + 4.0, 2.0));
  if(e < h1) c = mix(c, L(vec3(0.66, 0.74, 0.76)), 0.72);   // 푸르스름한 먼 산
  // 먼 산자락의 벚꽃 안개: 연분홍·흰 덩이가 뿌옇게
  {
    float hz = fbm(vec2(az*22.0, 7.0));
    float ht = h1 - 0.004 + 0.010*smoothstep(0.4, 0.8, hz);
    if(e < ht && e > h2) c = mix(c, mix(L(vec3(0.96, 0.86, 0.90)), L(vec3(0.97, 0.96, 0.93)), fbm(vec2(az*40.0, e*80.0))), 0.55*smoothstep(0.35, 0.7, hz));
  }
  // 가까운 언덕 등성이의 봄 나무: 둥근 수관, 몇 그루는 벚꽃
  {
    float cell = floor(az*36.0 + 0.5);
    float fx = az*36.0 - cell;
    float hr = h21(vec2(cell, 3.0));
    float th = (0.010 + 0.014*hr)*step(0.30, hr);
    float top = h2 + th*sqrt(max(1.0 - fx*fx*4.4, 0.0));
    if(e < top && e > h2 - 0.004 && th > 0.0){
      vec3 tc = hr > 0.72 ? L(vec3(0.97, 0.80, 0.86)) : (hr > 0.55 ? L(vec3(0.96, 0.95, 0.90)) : L(vec3(0.42, 0.58, 0.30)));
      tc *= 0.85 + 0.25*smoothstep(-0.3, 0.4, fx) + 0.10*vnoise(vec2(az*300.0, e*300.0));
      c = mix(c, tc, 0.85);
    }
  }
  if(e < h2){
    float f = fbm(vec2(az*10.0, e*30.0)), f2 = fbm(vec2(az*40.0, e*90.0) + 5.0);
    c = mix(L(vec3(0.56, 0.68, 0.50)), L(vec3(0.66, 0.78, 0.42)), smoothstep(0.0, -0.10, e));   // 아지랑이 낀 풀밭 언덕
    c *= 0.84 + 0.22*f + 0.10*f2;
    c = mix(c, L(vec3(0.36, 0.52, 0.30)), smoothstep(0.62, 0.78, f2)*0.5);                    // 덤불 그늘
  }
  return c;
}
vec3 KP[NK]; mat3 KR[NK]; float KS[NK]; float KT[NK]; float KF[NK];
#define NTN 14
vec3 TN[2*NTN]; vec4 TB[2];                  // 가오리연 꼬리 마디 · 꼬리 경계 캡슐 (시작 xyz, 반지름 w)
vec3 TE[2];
vec4 TAX[2*NTN]; vec3 TSD[2*NTN];
vec3 SE[NK], SC[NK], SW[NK], SW2[NK], SF[NK]; float SON[NK]; vec4 SBd[NK];   // 연줄
vec3 cr(vec3 a, vec3 b, vec3 c, vec3 d, float t){            // 캣멀롬 곡선
  return 0.5*((2.0*b) + (-a + c)*t + (2.0*a - 5.0*b + 4.0*c - d)*t*t + (-a + 3.0*b - 3.0*c + d)*t*t*t);
}
vec3 kitePath(int i, float u){
  float fi = float(i);
  float side = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
  float j = h11(fi*3.7 + 1.0) - 0.5;
  vec3 P[6];
  P[0] = vec3(-side*1.5 + j, 1.4, 22.0);
  P[1] = vec3(-side*0.8 + j*0.8, 0.85 + 0.2*j, 13.0);        // 먼 하늘
  P[2] = vec3(-side*0.30 + 0.3*j, 0.32 + 0.15*j, DT + 0.9);   // 아치 창을 지나
  P[3] = vec3(side*0.10 + j*0.3, (side > 0.0 ? 0.0 : 0.25) + 0.12*j, 1.10);        // 방 한가운데
  // 틀을 넘어: 오른쪽 방패연은 오른쪽 위 모서리로 솟고, 왼쪽 가오리연은 왼쪽 옆으로 빠져나간다
  // (끝점이 멀고, 조명 반대쪽이라 상자 안에 그림자가 남지 않는다)
  P[4] = side > 0.0 ? vec3(0.95, 0.45 + 0.15*j, -0.30) : vec3(-0.95, 0.22 + 0.10*j, -0.30);
  P[5] = side > 0.0 ? vec3(3.0, 2.2, -2.2) : vec3(-4.2, 0.30, -1.0);
  // 시간 배분: 하늘 0.30 · 들어옴 0.22 · 방 안 0.24 · 틀 너머 0.24 (틀 곁에서 머물다 빠져나간다)
  if(u < 0.30) return cr(P[0], P[1], P[2], P[3], u/0.30);
  if(u < 0.52) return cr(P[1], P[2], P[3], P[4], (u - 0.30)/0.22);
  if(u < 0.76) return cr(P[2], P[3], P[4], P[5], (u - 0.52)/0.24);
  float t = (u - 0.76)/0.24;
  return cr(P[3], P[4], P[5], P[5] + (P[5] - P[4]), t*t*(1.6 - 0.6*t));
}
// 재주넘기까지 더한 연의 자리
vec3 fullPos(int i, float u){
  vec3 p = kitePath(i, u);
  float lp = (i == 1 || i == 2) ? smoothstep(0.50, 0.70, u) : 0.0;
  float ph = TAU*lp, R = 0.42;
  return p + vec3(0.0, R*(1.0 - cos(ph)), -R*sin(ph)*0.6);
}
float segD(vec3 p, vec3 a, vec3 b){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0); return length(pa - ba*h); }
void prep(){
  for(int i=0;i<NK;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/float(NK));
    vec3 v = kitePath(i, min(u + 0.01, 0.999)) - kitePath(i, u);
    float lp = (i == 1 || i == 2) ? smoothstep(0.50, 0.70, u) : 0.0;
    float ph = TAU*lp;
    KP[i] = fullPos(i, u);
    float side = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
    float roll = 0.30*sin(TAU*(u*3.0 + fi*0.3)) - side*0.25*smoothstep(0.55, 0.95, u);
    float yaw = clamp(atan(v.x, -v.z), -0.9, 0.9)*0.45;
    float bob = 0.15*sin(TAU*(u*4.0 + fi)) + 0.05*sin(TAU*(uT/T*9.0 + fi*0.7));   // 바람결에 고개를 끄덕인다
    KR[i] = rotA(vec3(0, 1, 0), yaw)*rotA(vec3(1, 0, 0), -0.35 - ph + bob)*rotA(vec3(0, 0, 1), roll);
    KS[i] = 1.55*(i == 0 ? 1.0 : (i == 1 ? 0.92 : (i == 2 ? 0.88 : 0.95)))*smoothstep(0.0, 0.04, u)*smoothstep(1.0, 0.97, u);
    KT[i] = mod(fi, 2.0);
    KF[i] = fi*1.7;
    // ── 연줄: 등 쪽 고리에서 아치 창을 지나 먼 언덕의 연 날리는 이에게 ──
    // 오른쪽으로 나가는 연은 창의 왼쪽 아래 귀퉁이로, 왼쪽 연은 오른쪽 아래로 → 줄이 방을 비스듬히 가로질러 보인다
    float sx = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
    vec3 Wn = vec3(sx*(0.72 + 0.10*float(i/2)), -0.60 + 0.08*float(i/2), DT + 0.30);
    vec3 F = vec3(sx*(4.0 + 1.5*float(i/2)), -1.6, 30.0);
    vec3 E = KP[i] + KR[i]*vec3(0.0, 0.04, 0.03)*KS[i];
    float ucut = 0.66;                                      // 방 한가운데서 줄이 끊어져 연은 자유롭게 틀 밖으로
    SON[i] = 1.0;
    vec3 W2 = Wn;
    if(u > ucut){
      float f = (u - ucut)*T;
      vec3 cutE = fullPos(i, ucut);
      if(f < 1.3){ float k = ease(f/1.3); E = mix(cutE, Wn, k) + vec3(0.0, -0.30*sin(3.14159*k), 0.0); }
      else { E = Wn; W2 = mix(Wn, F, ease((f - 1.3)/1.7)); if(f > 3.0) SON[i] = 0.0; }
    }
    // 연이 아직 창 밖 하늘에 있으면 줄은 곧게
    vec3 Wl = mix(E, F, 0.25);
    vec3 We = mix(Wl, Wn, smoothstep(DT + 0.6, DT - 0.2, E.z));
    float len = length(We - E);
    SE[i] = E; SW[i] = We; SW2[i] = mix(W2, We, 0.0); SF[i] = F;
    if(u <= ucut) SW2[i] = We;
    SC[i] = mix(E, We, 0.5) + vec3(0.0, -0.18*len, 0.0);
    if(u <= 0.02) SON[i] = 0.0;
    // 경계 캡슐: 끝점 E–F, 반지름 = 꺾임·처짐까지
    vec3 a = SE[i], b = SF[i];
    float rr = max(max(segD(SC[i], a, b), segD(SW[i], a, b)), segD(SW2[i], a, b)) + 0.06;
    SBd[i] = vec4(rr, 0.0, 0.0, 0.0);
    if(KS[i] < 0.01) KP[i].y -= 50.0;
  }
  // ── 가오리연 꼬리: 연이 지나온 길을 따라 늘어지며 펄럭인다 ──
  for(int t=0;t<2;t++){
    int i = t == 0 ? 1 : 3;
    float fi = float(i);
    float u = fract(uT/T + fi/float(NK));
    vec3 off = KR[i]*vec3(0.0, -0.30, 0.0)*KS[i];
    TN[t*NTN] = KP[i] + off;
    // 지나온 길을 마디 길이만큼씩 거슬러 (속도로 걸음 크기를 정해 계산을 줄인다)
    float uu = u;
    vec3 last = fullPos(i, u);
    for(int n=1;n<NTN;n++){
      float sp = length(last - fullPos(i, max(uu - 0.004, 0.0)))/0.004;
      uu = max(uu - clamp(0.15*KS[i]/max(sp, 1e-3), 0.0015, 0.03), 0.0);
      vec3 q = fullPos(i, uu);
      float fn = float(n)/float(NTN - 1);
      vec3 ax = normalize(q - last + vec3(0.0, 0.0, 1e-4));
      vec3 sd = normalize(cross(ax, vec3(0.0, 1.0, 0.0)) + vec3(0.0, 0.001, 0.0));
      vec3 up = cross(sd, ax);
      float w = TAU*(uT/T*8.0) - fn*7.0 + fi;
      vec3 fl = (sd*sin(w) + up*0.7*cos(w*0.8 + 1.0))*0.20*fn*KS[i] + vec3(0.0, -0.32*fn*fn*KS[i], 0.0);
      TN[t*NTN + n] = q + off + fl;
      last = q;
    }
    // 마디마다 띠의 방향을 미리 잰다
    for(int k=0;k<NTN - 1;k++){
      vec3 ba = TN[t*NTN + k + 1] - TN[t*NTN + k];
      float l = max(length(ba), 1e-4); vec3 ax = ba/l;
      float tw = 0.9*sin(TAU*(uT/T*5.0) - float(k)*0.45 + float(t)*2.0);
      vec3 sd = normalize(cross(ax, normalize(vec3(sin(tw), cos(tw), 0.35))));
      TAX[t*NTN + k] = vec4(ax, l); TSD[t*NTN + k] = sd;
    }
    // 경계 캡슐
    vec3 a = TN[t*NTN], b = TN[t*NTN + NTN - 1];
    float rr = 0.0;
    for(int k=1;k<NTN - 1;k++) rr = max(rr, segD(TN[t*NTN + k], a, b));
    TB[t] = vec4(rr + 0.08, 0.0, 0.0, 0.0);
    TE[t] = b;
    if(KS[i] < 0.01){ TB[t].x = -1.0; }
  }
}
float tailD(vec3 p, int t, out float sp){
  float d = 1e9; sp = 0.0;
  int i = t == 0 ? 1 : 3;
  for(int k=0;k<NTN - 1;k++){
    float fk = float(k)/float(NTN - 1);
    vec4 al = TAX[t*NTN + k]; vec3 sd = TSD[t*NTN + k];
    vec3 pa = p - TN[t*NTN + k];
    float w = (0.026 - 0.010*fk)*KS[i];
    float aa = dot(pa, al.xyz), ss = dot(pa, sd);
    float nn = length(pa - al.xyz*aa - sd*ss);
    float e = length(vec3(aa - clamp(aa, 0.0, al.w), ss - clamp(ss, -w, w), nn)) - 0.004;   // 폭 2w 종이 띠
    if(e < d){ d = e; sp = fk; }
  }
  return d;
}
float stringD(vec3 p, int i){
  float r0 = 0.0045 + 0.0012*max(SE[i].z + 0.5, 0.0);
  float tt;
  float d = sdBez(p, SE[i], SC[i], SW[i], r0, 0.0045 + 0.0012*max(SW[i].z + 0.5, 0.0), tt);
  d = min(d, sdCap(p, SW2[i], SF[i], 0.0045 + 0.0012*clamp(p.z + 0.5, 0.0, 30.0)));
  return d;
}
// ── 연 모양 ── (지역 좌표: 연 면 = xy, +z = 등 쪽, 관객은 -z 쪽에서 본다)
float sdRhomb(vec2 p, vec2 b){
  p = abs(p);
  vec2 bb = b - 2.0*p;
  float h = clamp((bb.x*b.x - bb.y*b.y)/dot(b, b), -1.0, 1.0);
  float d = length(p - 0.5*b*vec2(1.0 - h, 1.0 + h));
  return d*sign(p.x*b.y + p.y*b.x - b.x*b.y);
}
float sparD(vec2 a, vec2 b, vec3 q, float bow){
  vec3 A = vec3(a, 0.0), B = vec3(b, 0.0);
  A.z = 0.012 + bow*A.x*A.x; B.z = 0.012 + bow*B.x*B.x;
  return sdCap(q, A, B, 0.0085);
}
// part: 0 종이 · 1 대나무 살 · 2 꼬리
float kiteD(vec3 q, float type, float ph, out float part){
  // 바람에 활처럼 휜 면 + 종이가 바르르 떨리는 잔물결
  float bow = 0.22 + 0.09*sin(TAU*(uT/T*6.0) + ph);
  vec3 qb = q; qb.z -= bow*q.x*q.x + 0.010*sin(9.0*q.y + 2.0*q.x - TAU*uT/T*10.0 + ph)*smoothstep(0.05, 0.25, abs(q.x) + 0.3*abs(q.y));
  float d2, ds;
  if(type < 0.5){
    // 방패연: 네모 종이 + 가운데 방구멍, 살 다섯
    vec2 hb = vec2(0.25, 0.33);
    vec2 e = abs(qb.xy) - hb;
    d2 = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
    d2 = max(d2, -(length(qb.xy - vec2(0.0, -0.01)) - 0.085));
    ds = sparD(vec2(0.0, -0.33), vec2(0.0, 0.33), q, bow);
    ds = min(ds, sparD(vec2(-0.25, 0.32), vec2(0.25, 0.32), q, bow));
    ds = min(ds, sparD(vec2(-0.25, 0.0), vec2(0.25, 0.0), q, bow));
    ds = min(ds, sparD(vec2(-0.25, 0.33), vec2(0.25, -0.33), q, bow));
    ds = min(ds, sparD(vec2(0.25, 0.33), vec2(-0.25, -0.33), q, bow));
  } else {
    // 가오리연: 마름모 종이 (꼬리는 따로, 지나온 길을 따라)
    d2 = sdRhomb(qb.xy - vec2(0.0, 0.04), vec2(0.28, 0.34));
    ds = sparD(vec2(0.0, -0.30), vec2(0.0, 0.38), q, bow);
    ds = min(ds, sparD(vec2(-0.27, 0.06), vec2(0.27, 0.06), q, bow));
  }
  float dp = max(d2, abs(qb.z) - 0.0065)*0.85;
  float d = min(dp, ds);
  part = d == dp ? 0.0 : 1.0;
  return d;
}
// 아치 창의 벽 두께 (창 둘레 안쪽 면 · 창턱)
float revealD(vec3 p){ return max(abs(p.z - DT - 0.16) - 0.16, -archD(p.xy)); }
float map(vec3 p){
  float d = 1e9;
  float bz = abs(p.z - DT - 0.16) - 0.16;
  if(bz > 0.45) d = bz; else d = min(revealD(p), 0.45);
  for(int i=0;i<NK;i++){
    if(KS[i] < 0.01) continue;
    vec3 o = (p - KP[i])/KS[i];
    float bc = length(o) - 0.48;
    if(bc > 0.45){ d = min(d, bc*KS[i]); continue; }
    vec3 q = transpose(KR[i])*o;
    float part;
    float dk = kiteD(q, KT[i], KF[i], part);
    d = min(d, min(dk, 0.45)*KS[i]);
  }
  // 꼬리 · 연줄: 경계 캡슐 밖이면 캡슐 거리, 안이면 참 거리 (경계값에서 이어진다)
  for(int t=0;t<2;t++){
    if(TB[t].x < 0.0) continue;
    float bt = sdCap(p, TN[t*NTN], TE[t], TB[t].x);
    if(bt > 0.3){ d = min(d, bt); continue; }
    float sp; d = min(d, min(tailD(p, t, sp), 0.3));
  }
  for(int i=0;i<NK;i++){
    if(SON[i] < 0.5) continue;
    float bs = sdCap(p, SE[i], SF[i], SBd[i].x);
    if(bs > 0.3){ d = min(d, bs); continue; }
    d = min(d, min(stringD(p, i), 0.3));
  }
  return d;
}
M mat(vec3 p, vec3 n){
  if(revealD(p) < 0.004){
    vec3 alb;
    if(n.y > 0.7) alb = L(vec3(0.78, 0.74, 0.66))*(0.85 + 0.25*vnoise(p.xz*30.0));     // 돌 창턱
    else {
      vec2 uv = vec2(p.z*0.0 + (abs(n.x) > 0.5 ? p.z : p.x), p.y);
      float row = floor(uv.y/BRICKH0);
      vec2 cid = vec2(floor((uv.x + mod(row, 2.0)*0.06)/0.12), row);
      vec2 f = fract(vec2((uv.x + mod(row, 2.0)*0.06)/0.12, uv.y/BRICKH0));
      float mort = 1.0 - smoothstep(0.03, 0.09, min(min(f.x, 1.0 - f.x)*1.5, min(f.y, 1.0 - f.y)));
      alb = mix(brickAlb(p*3.0, h21(cid)*31.0, BRICK1, BRICK2), MORTAR, mort);
    }
    M m = mk(alb, 0.8, 0.0); m.bump = 0.2; m.bumpF = 50.0;
    return m;
  }
  for(int i=0;i<NK;i++){
    if(SON[i] < 0.5) continue;
    if(stringD(p, i) < 0.003){ M m = mk(L(vec3(0.88, 0.84, 0.76)), 0.7, 0.0); m.sss = 0.3; return m; }   // 무명 연줄
  }
  for(int t=0;t<2;t++){
    if(TB[t].x < 0.0) continue;
    float sp;
    if(tailD(p, t, sp) < 0.004){
      vec3 tc = t == 0 ? L(vec3(0.95, 0.38, 0.50)) : L(vec3(1.0, 0.62, 0.30));
      tc = mix(tc, L(vec3(1.0, 0.95, 0.80)), smoothstep(0.45, 0.55, fract(sp*3.0 + 0.25))*0.5);   // 마디마다 두 색 종이 띠
      M m = mk(tc, 0.6, 0.0); m.sss = 0.45; m.wrap = 0.4;
      m.emit = tc*0.08;
      return m;
    }
  }
  int k = 0; float best = 1e9; vec3 bq = vec3(0); float bpart = 0.0;
  for(int i=0;i<NK;i++){
    if(KS[i] < 0.01) continue;
    vec3 q = transpose(KR[i])*((p - KP[i])/KS[i]);
    float part; float dd = kiteD(q, KT[i], KF[i], part)*KS[i];
    if(dd < best){ best = dd; k = i; bq = q; bpart = part; }
  }
  if(bpart > 0.5 && bpart < 1.5){
    M m = mk(L(vec3(0.62, 0.46, 0.26)), 0.45, 0.0);            // 대나무 살
    m.bump = 0.2; m.bumpF = 160.0;
    return m;
  }
  // 봄빛 한지: 연마다 바탕 · 머리띠 · 꼭지 · 귀퉁이 색
  vec3 base, acc, acc2;
  if(k == 0){ base = L(vec3(0.98, 0.96, 0.90)); acc = L(vec3(0.12, 0.25, 0.70)); acc2 = L(vec3(0.88, 0.12, 0.20)); }
  else if(k == 1){ base = L(vec3(1.00, 0.86, 0.36)); acc = L(vec3(0.98, 0.45, 0.55)); acc2 = L(vec3(0.95, 0.40, 0.50)); }
  else if(k == 2){ base = L(vec3(1.00, 0.93, 0.70)); acc = L(vec3(0.10, 0.48, 0.30)); acc2 = L(vec3(0.98, 0.50, 0.16)); }
  else { base = L(vec3(0.62, 0.80, 1.00)); acc = L(vec3(1.00, 0.97, 0.92)); acc2 = L(vec3(1.0, 0.62, 0.35)); }
  vec3 c = base;
  vec2 uv = bq.xy;
  if(KT[k] < 0.5){
    float aa = 0.004;
    c = mix(c, acc, smoothstep(0.255 - aa, 0.255 + aa, uv.y));                       // 머리띠 (꼭지 위 색 띠)
    float kk = length(uv - vec2(0.0, 0.155)) - 0.068;                                // 꼭지: 둥근 해
    c = mix(c, acc2, smoothstep(aa, -aa, kk));
    float hr = length(uv - vec2(0.0, -0.01));                                        // 방구멍 둘레 가는 테
    c = mix(c, acc, smoothstep(aa, -aa, abs(hr - 0.097) - 0.008)*0.85);
    vec2 cu = vec2(0.25 - abs(uv.x), uv.y + 0.33);                                   // 아래 귀퉁이 세모 (귀)
    float corner = cu.x + cu.y - 0.15;
    vec3 cc = uv.x < 0.0 ? acc2 : acc;
    c = mix(c, cc, smoothstep(aa, -aa, corner));
    float tcn = (0.25 - abs(uv.x)) + (0.255 - uv.y) - 0.10;                          // 위 귀퉁이는 머리띠 아래로 작은 세모
    c = mix(c, uv.x < 0.0 ? acc : acc2, smoothstep(aa, -aa, tcn)*step(uv.y, 0.255));
    c = mix(c, acc*0.8, smoothstep(0.240, 0.244, abs(uv.x))*0.7);                     // 양옆 가는 테
  } else {
    float rd = sdRhomb(uv - vec2(0.0, 0.04), vec2(0.28, 0.34));
    float band = abs(fract((uv.y - abs(uv.x)*1.1)*6.0) - 0.5);    // 가운데 V 줄무늬
    c = mix(c, acc, smoothstep(0.32, 0.34, band)*smoothstep(-0.05, -0.065, rd));
    c = mix(c, acc2, smoothstep(-0.028, -0.022, rd));            // 가장자리 테

  }
  float fib = vnoise(uv*90.0)*0.5 + vnoise(uv*23.0)*0.5;         // 한지 섬유 결
  c *= 0.90 + 0.14*fib;
  M m = mk(c, 0.62, 0.0);
  m.sss = 0.35; m.wrap = 0.35;
  m.bump = 0.035; m.bumpF = 120.0;
  // 뒤에서 오는 하늘빛이 한지를 비쳐 은은히 밝다 (대나무 살 자리는 그림자)
  float sp = 1e9;
  if(KT[k] < 0.5){
    sp = min(abs(uv.x), abs(uv.y));
    sp = min(sp, abs(uv.x*0.33 - uv.y*0.25)/0.4125);
    sp = min(sp, abs(uv.x*0.33 + uv.y*0.25)/0.4125);
    sp = min(sp, abs(uv.y - 0.32));
  } else sp = min(abs(uv.x), abs(uv.y - 0.06));
  float through = 1.0 - 0.55*smoothstep(0.016, 0.006, sp);
  float back = 0.5 + 0.5*smoothstep(-0.2, 0.6, dot(n, vec3(0.0, 0.0, -1.0)));
  m.emit = c*L(vec3(0.95, 0.97, 1.0))*0.10*through*back;
  return m;
}
