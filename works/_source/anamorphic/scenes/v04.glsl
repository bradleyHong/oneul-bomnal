// V04 은행잎 내리는 날 — 높은 벽돌 우물방 천장의 채광창 너머로 노란 은행나무가 흔들리고, 비스듬한 가을 햇살 속으로 부채꼴 은행잎이 팔랑팔랑 맴돌며 내려와 바닥의 낙엽 더미에 사뿐히 쌓인다. 몇 잎은 틀을 넘어 관객 눈앞으로 커다랗게 날아온다.
// @lib _autumn
// @post {"exposure":1.02,"sat":1.15,"contrast":1.08,"bloom":0.10}
#define DT 2.2
#define STEPS 140
#define MAXD 12.0
#define HAS_PREP
#define HAS_WALLTINT
#define HAS_WALLLIGHT
#define LKD vec3(-0.22, 0.74, -0.63)
#define KEYC vec3(2.5, 1.85, 1.05)
#define AMB_TOP L(vec3(0.46, 0.40, 0.34))
#define AMB_BOT L(vec3(0.30, 0.20, 0.12))
#define RIMD vec3(0.25, 0.80, 0.55)
#define RIMC (L(vec3(1.0, 0.80, 0.45))*1.0)
#define FRAMEC L(vec3(0.07, 0.06, 0.05))
#define BRICK1 L(vec3(0.52, 0.25, 0.16))
#define BRICK2 L(vec3(0.68, 0.40, 0.25))
#define MORTAR L(vec3(0.60, 0.54, 0.45))
#define BRICK_AGE 0.55
#define MOSS 0.12
#define MOSSC L(vec3(0.36, 0.34, 0.12))
#define BRICKW 0.24
#define BRICKH 0.08
#define SNOW 5
#define SNOWD 0.05
#define SNOWC vec3(0.20, 0.16, 0.10)
#define NL 12
#define NF 16
#define NT (NL + NF)

// ── 햇빛 · 채광창 ──
const vec2 HC = vec2(0.0, 0.66);                   // 천장 채광창 가운데 (x, z)
const vec2 HH = vec2(0.24, 0.38);                  // 반크기
const vec3 LD = vec3(0.22, -0.74, 0.63)/1.0;       // 햇빛이 내려가는 방향 (= -LK)
const vec3 SUNC = vec3(1.0, 0.78, 0.45);
const vec3 SIG = vec3(0.05, 0.06, 0.08);
vec3 HAZE(){ return L(vec3(0.42, 0.30, 0.18)); }

vec2 upq(vec3 p){ vec3 ld = normalize(LD); float s = (0.93 - p.y)/(-ld.y); return p.xz - ld.xz*s; }
float skyD(vec2 q){ vec2 d = abs(q - HC) - HH + 0.05; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.05; }
float holeM(vec2 q){ return smoothstep(0.0, -0.05, skyD(q)); }
// 채광창 위 은행나무 가지 사이로 드는 빛 (얼룩진 햇빛)
float dapple(vec2 q){
  float w = TAU*uT/T;
  vec2 o = 0.05*vec2(sin(w), cos(w)) + 0.03*vec2(sin(2.0*w + 1.0), 0.0);
  float f = fbm(q*5.0 + o*3.0 + 2.0);
  return 0.30 + 0.70*smoothstep(0.42, 0.62, f);
}
float beamD(vec3 x){
  vec2 q = upq(x);
  float m = holeM(q);
  if(m <= 0.0) return 0.0;
  return m*dapple(q);
}
vec3 airFog(vec3 p, out vec3 tr){
  tr = vec3(1.0);
  if(p.z <= 0.0) return vec3(0.0);
  vec3 ro = vec3(0.0, 0.0, -ZC);
  vec3 dv = p - ro; float Lr = length(dv); vec3 rd = dv/Lr;
  float t0 = ZC/rd.z, d = max(Lr - t0, 0.0);
  tr = exp(-SIG*d);
  vec3 c = HAZE()*(1.0 - tr);
  float acc = 0.0;
  float jit = h21(gl_FragCoord.xy + fract(uT*7.0));
  for(int k=0;k<6;k++){
    float t = t0 + d*(float(k) + jit)/6.0;
    acc += beamD(ro + rd*t);
  }
  c += L(SUNC)*acc*d/6.0*0.16;
  return c;
}

// ── 은행잎 ──
// 단위 크기 부채꼴: 잎자루 붙는 곳이 원점, +y 로 펼친다. 가운데 갈라진 홈
float gink2(vec2 p){
  float r = length(p);
  float th = atan(p.x, p.y);
  float tm = 1.0;
  float R = 1.0 + 0.025*sin(th*13.0) - 0.06*th*th;
  float d = max(r - R, r*sin(clamp(abs(th) - tm, -1.5, 1.5)));
  float nd = max(abs(p.x) - 0.012 - 0.12*max(p.y - 0.55, 0.0), 0.55 - p.y);
  return max(d, -nd);
}
float sdGink(vec3 q, float s, float curl){
  vec2 p = q.xy/s + vec2(0.0, 0.45);
  vec2 pc = clamp(p, vec2(-1.0, -0.4), vec2(1.0, 1.1));
  float zb = q.z - s*curl*(0.30*pc.x*pc.x - 0.10*pc.y*pc.y);
  float d2 = gink2(p)*s;
  vec2 w = vec2(d2, abs(zb) - 0.0042);
  float d = min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
  float st = sdCap(vec3(q.xy, zb), vec3(0.0, -0.45*s, 0.0), vec3(0.03*s, -0.95*s, -0.03*s), 0.012*s + 0.0012);
  return min(d*0.8, st);
}
const vec3 MC = vec3(0.02, -0.93, 1.70);          // 낙엽 더미 (바닥 위)
const vec3 MRAD = vec3(0.31, 0.085, 0.50);
vec3 LP[NT]; mat3 LR[NT]; float LS[NT]; float LH[NT]; float LCU[NT];
float moundH(vec2 xz){ vec2 e = (xz - MC.xz)/MRAD.xz; return MRAD.y*sqrt(max(1.0 - dot(e, e), 0.0)); }
vec3 crom(vec3 a, vec3 b, vec3 c, vec3 d, float f){
  return 0.5*((2.0*b) + (-a + c)*f + (2.0*a - 5.0*b + 4.0*c - d)*f*f + (-a + 3.0*b - 3.0*c + d)*f*f*f);
}
const mat3 RFLAT = mat3(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, -1.0), vec3(0.0, 1.0, 0.0));   // 잎 판을 바닥에 눕힌다
void prep(){
  for(int i=0;i<NL;i++){
    float fi = float(i);
    float h = h11(fi*3.71 + 0.3), h2 = h11(fi*7.13 + 1.1), h3 = h11(fi*1.91 + 5.0);
    float u = fract(uT/T + (fi + 0.5*h2)/float(NL));
    bool fwd = (i - 4*(i/4)) == 1;                    // 네 잎에 하나는 관객 쪽으로
    vec3 S = vec3(mix(-0.10, 0.10, h), 1.25, mix(0.45, 0.88, h2));
    float rs = 0.05 + 0.07*h3;
    float ph = TAU*(1.3 + 0.8*h)*u + h*6.0;
    float amp = 1.0;
    vec3 P;
    if(fwd){
      float xe = (h - 0.5)*0.30;
      vec3 K0 = S, K1 = vec3(S.x*0.8, 0.55, S.z*0.8), K2 = vec3(xe*0.6, 0.02, 0.05), K3 = vec3(xe, -0.26, -1.30), K4 = vec3(xe*1.4, -2.6, -1.9);
      float x = u*4.0; int k = int(min(floor(x), 3.0)); float f = x - float(k);
      if(k == 0) P = crom(2.0*K0 - K1, K0, K1, K2, f);
      else if(k == 1) P = crom(K0, K1, K2, K3, f);
      else if(k == 2) P = crom(K1, K2, K3, K4, f);
      else P = crom(K2, K3, K4, 2.0*K4 - K3, f);
      rs *= 1.0 - 0.6*smoothstep(0.4, 0.75, u);
    } else {
      // 더미 위에 내려앉아 천천히 묻힌다
      vec2 E = vec2(mix(-0.18, 0.18, h2), mix(1.45, 1.98, h));
      float yl = MC.y + moundH(E) + 0.012;
      float uf = min(u/0.80, 1.0);
      vec2 xz = mix(S.xz, E, smoothstep(0.0, 1.0, uf));
      float y = mix(S.y, yl, uf*(0.85 + 0.15*uf));
            P = vec3(xz.x, y, xz.y);
      float land = smoothstep(0.62, 0.80, u);
      amp = 1.0 - land;
      rs *= 1.0 - land;
    }
    P += vec3(rs*cos(ph), 0.02*sin(ph*2.0), rs*sin(ph));
    LP[i] = P;
    LS[i] = (0.095 + 0.025*h3)*(fwd ? 1.0 : 1.0 - smoothstep(0.84, 1.0, u));   // 더미에 내려앉은 잎은 다른 잎들 속에 스며든다
    LH[i] = fract(h*5.3 + h2);
    LCU[i] = fwd ? 0.22 : 0.5 + 0.5*h3;
    float nf = 2.0 + floor(h3*2.0);
    mat3 tumble = rotA(vec3(1.0, 0.0, 0.0), amp*(0.25 + 1.15*sin(TAU*u*nf + h*5.0)))*rotA(vec3(0.0, 1.0, 0.0), amp*1.0*sin(TAU*u*(nf + 1.0) + h2*4.0));
    LR[i] = rotA(vec3(0.0, 1.0, 0.0), -ph*0.8 + h*3.0)*RFLAT*tumble;
  }
  // 낙엽 더미 위와 둘레에 가만히 누운 잎
  for(int j=0;j<NF;j++){
    int i = NL + j; float fj = float(j);
    float a = fj*2.39996 + 0.7, rf = sqrt((fj + 0.5)/13.0);
    vec3 base, nn;
    if(j < 13){
      vec2 xz = MC.xz + vec2(cos(a), sin(a))*rf*0.85*MRAD.xz;
      base = vec3(xz.x, MC.y + moundH(xz) + 0.010, xz.y);
      vec2 e = (xz - MC.xz)/MRAD.xz;
      nn = normalize(vec3(e.x*0.35, 1.0, e.y*0.25));
    } else {
      float b = fj*1.9;
      base = vec3(mix(-0.22, 0.20, h11(fj*3.1)), -0.93 + 0.006, mix(0.45, 1.25, h11(fj*5.7)));
      nn = vec3(0.0, 1.0, 0.0);
    }
    LP[i] = base; LS[i] = 0.090 + 0.02*h11(fj*2.0); LH[i] = h11(fj*9.1); LCU[i] = 0.25;
    vec3 zax = nn, xax = normalize(cross(vec3(sin(fj*1.7), 0.0, cos(fj*1.7)), zax)); vec3 yax = cross(zax, xax);
    LR[i] = mat3(xax, yax, zax);
  }
}
float moundD(vec3 p){
  vec3 q = p - MC;
  float d = sdEll(q, MRAD);
  if(d > 0.3) return d - 0.02;
  return min(d + 0.035*(vnoise3(p*9.0) - 0.5) + 0.012*(vnoise3(p*31.0) - 0.5), 0.3)*0.85 - 0.002;
}
float map(vec3 p){
  float d = moundD(p);
  for(int i=0;i<NT;i++){
    if(LS[i] < 0.004) continue;
    vec3 r = p - LP[i];
    float bd = length(r) - LS[i]*1.15;
    if(bd > 0.3){ d = min(d, bd); continue; }
    d = min(d, min(sdGink(transpose(LR[i])*r, LS[i], LCU[i]), 0.3));
  }
  return d;
}
vec3 leafCol(float hc){
  vec3 a = L(vec3(0.98, 0.80, 0.16)), b = L(vec3(0.96, 0.62, 0.08)), g = L(vec3(0.80, 0.80, 0.22));
  return hc < 0.7 ? mix(a, b, hc/0.7) : mix(a, g, (hc - 0.7)/0.3);
}
M mat(vec3 p, vec3 n){
  float best = moundD(p); int k = -1;
  for(int i=0;i<NT;i++){
    if(LS[i] < 0.004) continue;
    vec3 r = p - LP[i];
    if(length(r) > LS[i]*1.2) continue;
    float d = sdGink(transpose(LR[i])*r, LS[i], LCU[i]);
    if(d < best){ best = d; k = i; }
  }
  vec3 tr; vec3 fog = airFog(p, tr);
  float sun = beamD(p);
  M m;
  if(k < 0){
    // 더미: 겹겹이 쌓인 은행잎 조각
    vec2 uv = p.xz*vec2(15.0, 17.0) + p.y*9.0;
    float id = vorId(uv);
    float vb = vor2(uv).y;
    vec3 c = leafCol(id)*(0.35 + 0.65*vnoise(uv*2.7))*(0.45 + 0.55*id)*(0.45 + 0.55*smoothstep(0.0, 0.12, vb));
    m = mk(c, 0.7, 0.0);
    m.sss = 0.15;
    m.emit = c*L(SUNC)*sun*max(n.y, 0.0)*0.9;
  } else {
    vec3 q = transpose(LR[k])*(p - LP[k]);
    vec2 lp = q.xy/LS[k] + vec2(0.0, 0.45);
    float r = length(lp), th = atan(lp.x, lp.y);
    vec3 c = leafCol(LH[k]);
    c = mix(c*vec3(0.9, 1.05, 0.6), c, smoothstep(0.05, 0.45, r));          // 잎자루 쪽은 연둣빛
    c = mix(c, c*vec3(0.75, 0.55, 0.35), smoothstep(0.80, 1.0, r)*0.55);    // 가장자리는 조금 짙게
    float vein = abs(fract(th*26.0/TAU) - 0.5);
    c *= 0.88 + 0.12*smoothstep(0.05, 0.25, vein);                            // 부채살 잎맥
    c *= 0.92 + 0.16*vnoise(lp*14.0 + LH[k]*9.0);
    m = mk(c, 0.42, 0.0);
    m.wrap = 0.25; m.sss = 0.30;
    vec3 ld = -normalize(LD);
    float back = max(dot(n, -ld), 0.0);
    m.emit = c*L(SUNC)*sun*(max(dot(n, ld), 0.0) + 0.6*back)*1.1;             // 햇빛을 받거나 햇빛에 비쳐 빛난다
  }
  m.alb *= tr;
  m.emit = m.emit*tr + fog;
  return m;
}

// ── 벽돌: 채광창 하늘 · 햇빛 자국 ──
float softShadowN(vec3 ro, vec3 rd, float k, int N);
vec3 gEm;
float cavAt(vec3 p, float id, float t){
  vec2 uv = id < 2.5 ? p.zy : (id < 3.5 ? p.xz : p.xy);
  float pw = t*(2.0/uRes.y)/ZC*1.2;
  vec2 S = vec2(BRICKW, BRICKH);
  if(id > 2.5 && id < 3.5 && p.y < 0.0) S = vec2(BRICKW, BRICKW*0.5);
  float row = floor(uv.y/S.y);
  vec2 q = uv; q.x += mod(row, 2.0)*S.x*0.5;
  vec2 f = fract(q/S)*S;
  float mw = 0.0075;
  vec2 e2 = min(f, S - f); float e = min(e2.x, e2.y);
  float mortar = 1.0 - smoothstep(mw - pw, mw + pw, e);
  vec2 tl = vec2(1.0 - smoothstep(mw, mw + 0.016, e2.x), 1.0 - smoothstep(mw, mw + 0.016, e2.y))*(1.0 - mortar);
  return mortar*0.55 + max(tl.x, tl.y)*0.10;
}
float aoAt(vec3 p, float id){
  float dx = HO.x - abs(p.x), dy = HO.y - abs(p.y), dz = DT - p.z;
  float a = 1.0;
  if(id != 2.0) a *= 0.42 + 0.58*smoothstep(0.0, 0.45, dx);
  if(id != 3.0) a *= 0.42 + 0.58*smoothstep(0.0, 0.45, dy);
  if(id != 4.0) a *= 0.42 + 0.58*smoothstep(0.0, 0.45, dz);
  return a;
}
vec3 skyCol(vec3 rd){
  vec2 sq = rd.xz/max(rd.y, 0.08);
  float w = TAU*uT/T;
  vec3 c = mix(L(vec3(1.0, 0.92, 0.75))*3.0, L(vec3(0.62, 0.78, 0.98))*1.6, smoothstep(0.0, 0.8, length(sq - vec2(-0.2, -0.6))));
  float f = fbm(sq*3.2 + 0.04*vec2(sin(w), cos(w)) + 5.0);
  float leaf = smoothstep(0.36, 0.50, f);
  vec3 gold = L(vec3(1.0, 0.76, 0.18))*(1.2 + 1.2*vnoise(sq*30.0));
  c = mix(c, gold, leaf*0.85);
  float br = smoothstep(0.035, 0.0, abs(sq.x*0.8 + sq.y*0.5 + 0.1*sin(sq.y*4.0) - 0.15));   // 가지 하나
  c = mix(c, L(vec3(0.20, 0.13, 0.08)), br*0.9);
  return c;
}
vec3 wallTint(vec3 p, float id, vec3 a){
  vec3 tr; vec3 fog = airFog(p, tr);
  gEm = fog;
  bool ceil = id > 2.5 && id < 3.5 && p.y > 0.0;
  float t = length(p - vec3(0.0, 0.0, -ZC));
  if(ceil){
    float sd = skyD(p.xz);
    if(sd < 0.0){
      vec3 rd = normalize(p - vec3(0.0, 0.0, -ZC));
      gEm += skyCol(rd)*tr;
      a = vec3(1e-3);
    } else a *= tr*(0.45 + 0.55*smoothstep(0.0, 0.09, sd));
  } else a *= tr;
  gEm /= max(a, vec3(1e-4))*max(1.0 - cavAt(p, id, t), 0.3)*max(aoAt(p, id), 0.02);
  return a;
}
vec3 wallLight(vec3 p, vec3 n){
  vec2 q = upq(p);
  float m = holeM(q);
  vec3 c = vec3(0.0);
  vec3 ld = -normalize(LD);
  float ndl = max(dot(n, ld), 0.0);
  if(m > 0.0 && ndl > 0.0){
    float sh = softShadowN(p + n*0.004, ld, 14.0, 32);
    c = L(SUNC)*m*dapple(q)*ndl*sh*2.2;
  }
  return c + gEm;
}
