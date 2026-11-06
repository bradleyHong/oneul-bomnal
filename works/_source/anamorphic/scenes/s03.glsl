// S03 벚꽃 가지 — 굵고 굽은 벚나무 가지가 벽돌 뒷벽을 뚫고 들어와 틀 밖까지 뻗고, 꽃잎이 하나둘 떨어져 틀 턱으로 미끄러져 내린다.
// @lib _spring
// @post {"exposure":1.02,"sat":1.15,"contrast":1.08,"bloom":0.08}
#define DT 1.9
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_BACKWALL
#define HAS_PREP
#define LKD vec3(-0.45, 0.72, -0.52)
#define KEYC vec3(2.70, 2.55, 2.38)
#define AMB_TOP L(vec3(0.64, 0.62, 0.66))
#define AMB_BOT L(vec3(0.34, 0.29, 0.26))
#define BACKC L(vec3(1.0, 0.94, 0.84))*0.40
#define FRAMEC L(vec3(0.13, 0.11, 0.11))
#define BRICK1 L(vec3(0.54, 0.27, 0.19))
#define BRICK2 L(vec3(0.70, 0.43, 0.31))
#define MORTAR L(vec3(0.66, 0.62, 0.56))
#define BRICK_AGE 0.55
#define MOSS 0.35
#define RIMD vec3(0.25, 0.60, 0.90)
#define RIMC L(vec3(1.0, 0.92, 0.88))
#define NSEG 12
#define NCL 11
#define NFL 44
#define NPT 12
#define NLB 4

// ── 뒷벽의 깨진 구멍: 벽돌 칸 단위로 빠져 있다 (엔진 벽돌 무늬와 같은 칸) ──
const vec2 H = vec2(-0.72, 0.40);
const vec2 BS = vec2(0.24, 0.08);
vec2 cellOf(vec2 q){ float row = floor(q.y/BS.y); return vec2(floor((q.x + mod(row, 2.0)*BS.x*0.5)/BS.x), row); }
vec2 cellC(vec2 c){ return vec2((c.x + 0.5)*BS.x - mod(c.y, 2.0)*BS.x*0.5, (c.y + 0.5)*BS.y); }
float cellE(vec2 c){ vec2 d = (cellC(c) - H)/vec2(1.0, 0.82); return length(d) - 0.07*(h21(c + 3.1) - 0.5)*2.0; }
bool cellGone(vec2 c){ return cellE(c) < 0.29; }
bool cellLoose(vec2 c){ float e = cellE(c); return e >= 0.29 && e < 0.40 && h21(c + 7.7) > 0.70; }
bool backHole(vec3 q){ vec2 c = cellOf(q.xy); return cellGone(c) || cellLoose(c); }
// 구멍 너머: 봄볕 가득한 바깥이 하얗게 번진다
vec3 outside(vec3 rd, vec3 ro){
  float e = rd.y;
  return mix(L(vec3(0.80, 0.90, 0.70)), L(vec3(1.0, 0.97, 0.90)), smoothstep(-0.1, 0.25, e))*1.6;
}
vec3 backWall(vec3 p){
  float d = length((p.xy - H)/vec2(1.0, 0.82)) - 0.30;
  return L(vec3(1.0, 0.92, 0.80))*0.10*exp(-max(d, 0.0)*6.0);   // 구멍 둘레로 스민 빛
}

vec3 SA[NSEG], SB[NSEG]; vec2 SRR[NSEG];
vec3 CC[NCL];
vec3 FP[NFL]; mat3 FR[NFL]; float FS[NFL];
vec3 PP[NPT]; mat3 PR[NPT]; float PS[NPT];
vec3 LBP[NLB]; mat3 LBR[NLB];
float SWAY;

void seg(int i, vec3 a, vec3 b, float ra, float rb){ SA[i] = a; SB[i] = b; SRR[i] = vec2(ra, rb); }
mat3 frameN(vec3 n, float spin){                             // 법선 n 을 지역 y 로 (월드→지역)
  vec3 t = normalize(cross(n, abs(n.y) < 0.9 ? vec3(0, 1, 0) : vec3(1, 0, 0)));
  vec3 b = cross(t, n);
  mat3 m = transpose(mat3(t, n, b));
  return rotA(vec3(0, 1, 0), spin)*m;
}
void prep(){
  // 굽은 줄기: 벽 너머에서 구멍을 지나 방을 가로질러 틀 밖 오른쪽 위로
  vec3 M0 = vec3(H.x - 0.10, H.y + 0.06, DT + 0.60);
  vec3 M1 = vec3(H.x + 0.02, H.y - 0.02, DT - 0.15);
  vec3 M2 = vec3(-0.40, 0.12, 1.15);
  vec3 M3 = vec3(0.02, 0.28, 0.62);
  vec3 M4 = vec3(0.50, 0.40, 0.08);
  vec3 M5 = vec3(1.02, 0.66, -0.50);
  seg(0, M0, M1, 0.165, 0.150);
  seg(1, M1, M2, 0.150, 0.125);
  seg(2, M2, M3, 0.125, 0.100);
  seg(3, M3, M4, 0.100, 0.072);
  seg(4, M4, M5, 0.072, 0.040);
  // 곁가지 셋
  vec3 S1a = vec3(-0.78, -0.12, 0.70), S1b = vec3(-1.18, -0.30, 0.22);
  seg(5, M2 + vec3(-0.05, -0.04, 0.0), S1a, 0.075, 0.050);
  seg(6, S1a, S1b, 0.050, 0.026);
  vec3 S2a = vec3(0.22, 0.62, 0.50), S2b = vec3(0.10, 0.82, 0.12);
  seg(7, M3 + vec3(0.03, 0.05, 0.0), S2a, 0.060, 0.040);
  seg(8, S2a, S2b, 0.040, 0.022);
  vec3 S3a = vec3(0.86, 0.18, -0.10), S3b = vec3(1.28, 0.02, -0.48);
  seg(9, M4, S3a, 0.050, 0.034);
  seg(10, S3a, S3b, 0.034, 0.018);
  vec3 T1 = vec3(-0.18, -0.10, 0.92);
  seg(11, M2 + (M3 - M2)*0.45, T1, 0.040, 0.020);
  // 꽃 무리
  CC[0] = M5; CC[1] = S1b; CC[2] = S2b; CC[3] = S3b; CC[4] = M3 + vec3(-0.06, 0.15, -0.05); CC[5] = T1; CC[6] = S1a + vec3(0.02, -0.07, -0.03);
  CC[7] = mix(M3, M4, 0.55) + vec3(0.0, 0.11, -0.06); CC[8] = mix(M4, M5, 0.5) + vec3(-0.02, -0.10, -0.04); CC[9] = mix(S2a, S2b, 0.3) + vec3(0.08, 0.0, -0.05); CC[10] = mix(S3a, S3b, 0.2) + vec3(0.0, -0.08, -0.04);
  for(int i=0;i<NFL;i++){
    float fi = float(i);
    int j = i/4;
    vec3 hh = h33(vec3(fi*1.7, 3.3, 9.1)) - 0.5;
    vec3 off = hh*vec3(0.24, 0.18, 0.22);
    if(i - j*4 == 0) off *= 0.3;
    FP[i] = CC[j] + off;
    vec3 nf = normalize(off*2.5 + vec3(0.15, 0.35, -0.75) + (h33(vec3(fi, 7.0, 1.0)) - 0.5)*0.6);
    float fl = 0.10*sin(TAU*(uT/T*2.0 + fi*0.17));            // 바람에 꽃이 살짝 고개를 젓는다
    FR[i] = rotA(vec3(0, 0, 1), fl)*frameN(nf, fi*1.3);
    FS[i] = (j == 0 || j == 3 ? 0.095 : 0.082)*(0.85 + 0.3*h11(fi*5.1));
  }
  SWAY = 0.035*sin(TAU*uT/T*2.0) + 0.015*sin(TAU*uT/T*3.0 + 1.3);
  // 헐거워진 벽돌: 구멍 가장자리에서 관객 쪽으로 밀려 나왔다
  int nb = 0;
  for(int r=-6;r<=6;r++){
    for(int c=-3;c<=3;c++){
      if(nb >= NLB) continue;
      vec2 c0 = cellOf(H);
      vec2 cl = vec2(c0.x + float(c), c0.y + float(r));
      if(!cellLoose(cl)) continue;
      float hb = h21(cl + 1.9);
      vec2 cc = cellC(cl);
      LBP[nb] = vec3(cc, DT + 0.10 - 0.07 - 0.10*hb);
      LBR[nb] = rotA(normalize(vec3(hb - 0.5, 0.6, 0.3)), 0.10 + 0.12*hb);
      nb++;
    }
  }
  for(int k=0;k<NLB;k++) if(k >= nb){ LBP[k] = vec3(0, -40, 0); LBR[k] = mat3(1.0); }
  // 꽃잎: 꽃에서 떨어져 하늘하늘 내려앉고, 바닥을 미끄러져 틀 턱 너머로 떨어진다
  for(int i=0;i<NPT;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/float(NPT) + 0.02*h11(fi*9.1));
    int j = i - 5*(i/5);
    int cj = j == 0 ? 1 : (j == 1 ? 2 : (j == 2 ? 4 : (j == 3 ? 5 : 6)));
    vec3 hh = h33(vec3(fi, 2.2, 5.5));
    vec3 S = CC[cj] + (hh - 0.5)*vec3(0.16, 0.10, 0.14);
    float fy = -HO.y + 0.007;
    vec3 Lp = vec3(clamp(S.x + 0.25 + (hh.x - 0.5)*0.4, -1.5, 1.5), fy, 0.16 + 0.32*hh.z);
    vec3 ax = normalize(hh - 0.5 + vec3(0.3, 0.2, 0.1));
    float yaw = TAU*hh.y + u*2.0;
    vec3 p; float th = 0.0;
    if(i - 3*(i/3) == 2){
      // 틀 밖 꽃에서 떨어진 꽃잎: 바람을 타고 관객 쪽으로 다가오며 커진다
      int fj = i/3;
      vec3 S2 = CC[fj == 0 ? 0 : (fj == 1 ? 3 : (fj == 2 ? 8 : 7))] + (hh - 0.5)*vec3(0.14, 0.08, 0.10);
      float f = max(u - 0.05, 0.0)/0.95;
      p = S2 + vec3(-0.55*f + 0.10*sin(TAU*f*1.5 + hh.x*6.0), -1.9*pow(f, 1.4) + 0.05*sin(TAU*f*2.0), -1.7*f);
      PP[i] = p;
      PR[i] = rotA(vec3(0, 1, 0), yaw)*rotA(ax, 6.0*f + 0.8);
      PS[i] = smoothstep(0.0, 0.05, u);
      continue;
    }
    if(u < 0.06){ p = S; th = 0.0; }
    else if(u < 0.60){
      float f = (u - 0.06)/0.54;
      p = vec3(mix(S.x, Lp.x, f) + 0.12*sin(TAU*f*2.0 + hh.x*6.0)*(1.0 - f),
               mix(S.y, fy, f*f*(1.6 - 0.6*f)) + 0.03*sin(TAU*f*3.0)*(1.0 - f),
               mix(S.z, Lp.z, f));
      th = 7.0*(1.0 - f)*(1.0 - f);
    } else if(u < 0.86){
      float f = (u - 0.60)/0.26;
      p = vec3(Lp.x + 0.06*f, fy, mix(Lp.z, -0.012, f*f));
    } else {
      float f = (u - 0.86)*T;
      p = vec3(Lp.x + 0.06 + 0.10*f, fy - 2.2*f*f, -0.012 - 0.32*f);
      th = 3.5*f;
    }
    PP[i] = p;
    PR[i] = rotA(vec3(0, 1, 0), yaw)*rotA(ax, th);
    PS[i] = smoothstep(0.0, 0.05, u);
  }
}

float sway(vec3 p){ float w = clamp((DT - p.z)/(DT + 0.6), 0.0, 1.0); return SWAY*w*w; }
// 가지: 굵기가 줄어드는 원뿔 마디들을 부드럽게 이어 붙이고 옹이를 더한다
float branchD(vec3 p, out int si){
  float d = 1e9; si = 0;
  for(int i=0;i<NSEG;i++){
    float e = sdRCone(p, SA[i], SB[i], SRR[i].x, SRR[i].y);
    if(e < d) si = i;
    d = smin(d, e, 0.05);
  }
  return d;
}
float flowerD(vec3 q, float R){
  float a = atan(q.z, q.x); float sec = TAU/5.0;
  a -= floor(a/sec + 0.5)*sec;
  float r = length(q.xz);
  vec2 pp = vec2(r*cos(a), r*sin(a));
  vec2 e = (pp - vec2(0.55*R, 0.0))/vec2(0.47*R, 0.37*R);
  float d2 = (length(e) - 1.0)*0.37*R;
  d2 = max(d2, -(length(pp - vec2(1.05*R, 0.0)) - 0.10*R));     // 꽃잎 끝 오목한 홈
  float cup = 0.32*pp.x*pp.x/R;
  float d = max(d2, abs(q.y - cup) - 0.0055)*0.55;            // 넉넉히 작게 (그림자 줄무늬 방지)
  d = min(d, length(q - vec3(0.0, 0.03*R, 0.0)) - 0.15*R);     // 꽃 가운데
  return d;
}
float petalD(vec3 q){
  float d2 = (length(q.xz/vec2(0.050, 0.037)) - 1.0)*0.037;
  d2 = max(d2, -(length(q.xz - vec2(0.053, 0.0)) - 0.008));
  float cup = 2.2*q.z*q.z - 0.5*q.x*q.x;
  return max(d2, abs(q.y - cup) - 0.0040)*0.5;
}
float revealD(vec3 p){
  // 구멍 둘레 벽 두께 (벽돌 칸 모양 그대로)
  float slab = abs(p.z - DT - 0.12) - 0.115;
  vec2 q = p.xy;
  vec2 c0 = cellOf(q);
  bool solid0 = !(cellGone(c0) || cellLoose(c0));
  float dS = 1e9, dH = 1e9;
  for(int r=-1;r<=1;r++){
    float row = c0.y + float(r);
    float cx = floor((q.x + mod(row, 2.0)*BS.x*0.5)/BS.x);
    for(int c=-1;c<=1;c++){
      vec2 cl = vec2(cx + float(c), row);
      vec2 dd = abs(q - cellC(cl)) - BS*0.5;
      float bd = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0);
      if(cellGone(cl) || cellLoose(cl)) dH = min(dH, bd); else dS = min(dS, bd);
    }
  }
  float s2 = solid0 ? -max(dH, 0.0) : max(dS, 0.0);
  if(solid0 && dH > 1e8) s2 = -BS.y;
  return max(max(slab, s2), length((q - H)/vec2(1.0, 0.82)) - 0.62);
}
float wallLooseD(vec3 p, out int k){
  float d = 1e9; k = 0;
  for(int i=0;i<NLB;i++){
    float e = sdRBox(LBR[i]*(p - LBP[i]), vec3(0.112, 0.036, 0.10), 0.008);
    if(e < d){ d = e; k = i; }
  }
  return d;
}
float fallenD(vec3 p, out int k){
  // 바닥에 떨어진 벽돌 둘
  float d = sdRBox(rotA(vec3(0, 1, 0), 0.5)*(p - vec3(-0.50, -HO.y + 0.037, 1.45)), vec3(0.112, 0.036, 0.055), 0.008); k = 4;
  float e = sdRBox(rotA(normalize(vec3(0.3, 1, 0.2)), -0.8)*rotA(vec3(0, 0, 1), 0.35)*(p - vec3(-0.80, -HO.y + 0.045, 1.62)), vec3(0.06, 0.036, 0.055), 0.010);
  if(e < d){ d = e; k = 5; }
  return d;
}
float looseD(vec3 p, out int k){
  int k2; float a = wallLooseD(p, k), b = fallenD(p, k2);
  if(b < a){ k = k2; return b; }
  return a;
}
float map(vec3 p){
  float d = 1e9;
  // 벽 두께 · 헐거운 벽돌 (구멍 둘레만)
  float bw = max(abs(p.z - DT - 0.12) - 0.20, length((p.xy - H)/vec2(1.0, 0.82)) - 0.70);
  if(bw > 0.45) d = bw; else d = mix(max(revealD(p), bw), bw, smoothstep(0.25, 0.45, bw));
  // 경계 구와 매끈하게 이어 붙인다: 안쪽 값을 경계 값 아래로 내리지 않고 섞는다 (값이 뛰면 그림자에 둥근 줄무늬가 생긴다)
  int k;
  float bl = length(p - vec3(-0.66, -HO.y, 1.52)) - 0.35;
  d = min(d, bl > 0.45 ? bl : mix(max(fallenD(p, k), bl), bl, smoothstep(0.25, 0.45, bl)));
  float bh = length(p - vec3(H, DT)) - 0.75;
  d = min(d, bh > 0.45 ? bh : mix(max(wallLooseD(p, k), bh), bh, smoothstep(0.25, 0.45, bh)));
  // 가지 · 꽃 (바람에 끝이 흔들린다)
  vec3 ps = p; ps.y -= sway(p);
  float bb = 1e9;
  for(int i=0;i<NSEG;i++) bb = min(bb, sdCap(ps, SA[i], SB[i], SRR[i].x + 0.06));
  if(bb < 0.45){
    int si; float db = branchD(ps, si);
    db += 0.018*(vnoise3(ps*9.0) - 0.5) + 0.008*(vnoise3(ps*23.0) - 0.5);   // 옹이 · 울퉁불퉁한 껍질   // 옹이 · 울퉁불퉁한 껍질
    d = min(d, mix(max(db*0.85, bb), bb, smoothstep(0.25, 0.45, bb)));
  } else d = min(d, bb);
  for(int j=0;j<NCL;j++){
    float bc = length(ps - CC[j]) - 0.36;
    if(bc > 0.45){ d = min(d, bc); continue; }
    float df = 1e9;
    for(int i=0;i<4;i++){
      int fi = j*4 + i;
      df = min(df, flowerD(FR[fi]*(ps - FP[fi]), FS[fi]));
    }
    d = min(d, mix(max(df, bc), bc, smoothstep(0.25, 0.45, bc)));
  }
  for(int i=0;i<NPT;i++){
    if(PS[i] < 0.01) continue;
    float bp = length(p - PP[i]) - 0.06*PS[i];
    if(bp > 0.45){ d = min(d, bp); continue; }
    d = min(d, mix(max(petalD(PR[i]*(p - PP[i])/PS[i])*PS[i], bp), bp, smoothstep(0.25, 0.45, bp)));
  }
  return d;
}

M mat(vec3 p, vec3 n){
  // 떨어지는 꽃잎
  for(int i=0;i<NPT;i++){
    if(PS[i] < 0.01) continue;
    vec3 q = PR[i]*(p - PP[i])/PS[i];
    if(petalD(q)*PS[i] < 0.004){
      float r = length(q.xz/vec2(0.050, 0.037));
      M m = mk(mix(L(vec3(0.96, 0.56, 0.68)), L(vec3(1.0, 0.86, 0.90)), smoothstep(0.1, 0.9, (q.x/0.05)*0.5 + 0.5)), 0.82, 0.0);
      m.sss = 0.6; m.wrap = 0.5;
      m.emit = L(vec3(1.0, 0.80, 0.85))*0.025;
      return m;
    }
  }
  vec3 ps = p; ps.y -= sway(p);
  // 꽃
  for(int j=0;j<NCL;j++){
    if(length(ps - CC[j]) > 0.40) continue;
    for(int i=0;i<4;i++){
      int fi = j*4 + i;
      vec3 q = FR[fi]*(ps - FP[fi]);
      float R = FS[fi];
      if(flowerD(q, R) < 0.004){
        float r = length(q.xz)/R;
        vec3 c;
        if(r < 0.17){
          c = L(vec3(0.80, 0.30, 0.42));                                         // 꽃 가운데
          M m = mk(c, 0.6, 0.0); m.bump = 0.5; m.bumpF = 400.0; return m;
        }
        c = mix(L(vec3(0.90, 0.36, 0.52)), L(vec3(1.0, 0.76, 0.84)), smoothstep(0.15, 0.6, r));
        c = mix(c, L(vec3(1.0, 0.92, 0.94)), smoothstep(0.65, 1.0, r)*0.6);     // 끝은 하얗게 바랜다
        float a = atan(q.z, q.x);
        c = mix(c, L(vec3(0.98, 0.78, 0.84)), 0.25*sin(a*25.0)*sin(a*25.0)*smoothstep(0.3, 0.8, r));   // 꽃잎 결
        M m = mk(c, 0.82, 0.0);                                  // 벨벳 같은 꽃잎
        m.sss = 0.65; m.wrap = 0.45;
        m.emit = L(vec3(1.0, 0.80, 0.86))*0.025;
        return m;
      }
    }
  }
  // 벽 두께 · 헐거운 벽돌
  int k; float dl = looseD(p, k);
  float dr = revealD(p);
  if(min(dl, dr) < 0.006){
    vec3 q = dl < dr ? (k < 4 ? LBR[k]*(p - LBP[k]) : p*3.0) : p;
    vec3 alb = brickAlb(q*vec3(1.0, 1.0, 1.0), dl < dr ? float(k) + 2.0 : h21(cellOf(p.xy))*13.0, BRICK1, BRICK2);
    if(dr < dl){
      // 벽 안쪽 면: 칸 경계에 줄눈
      vec2 cq = p.xy; float row = floor(cq.y/BS.y);
      vec2 f = fract(vec2((cq.x + mod(row, 2.0)*BS.x*0.5)/BS.x, cq.y/BS.y))*BS;
      float e = min(min(f.x, BS.x - f.x), min(f.y, BS.y - f.y));
      alb = mix(alb, MORTAR, smoothstep(0.012, 0.006, e));
      alb *= 0.85;
    }
    M m = mk(alb, 0.85, 0.0); m.bump = 0.3; m.bumpF = 55.0;
    return m;
  }
  // 껍질: 붉은 갈색 벚나무 껍질, 가로 띠 무늬(피목), 결
  int si; float db = branchD(ps, si);
  vec3 ax = normalize(SB[si] - SA[si]);
  float along = dot(ps - SA[si], ax);
  float lent = smoothstep(0.55, 0.85, sin(along*60.0 + 3.0*vnoise3(ps*6.0)))*smoothstep(0.35, 0.6, vnoise3(ps*vec3(14.0, 14.0, 14.0)));
  vec3 c = mix(L(vec3(0.30, 0.17, 0.14)), L(vec3(0.20, 0.12, 0.11)), vnoise3(ps*18.0));
  c = mix(c, L(vec3(0.52, 0.40, 0.34)), lent*0.55);
  c = mix(c, L(vec3(0.38, 0.40, 0.28)), smoothstep(0.70, 0.85, vnoise3(ps*7.0 + 3.0))*0.35);   // 군데군데 이끼
  M m = mk(c, 0.82, 0.0);                                       // 거친 껍질 (흐린 반사는 생략해 빠르게)
  m.bump = 0.7; m.bumpF = 38.0;
  return m;
}
