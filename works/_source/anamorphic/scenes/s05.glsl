// S05 반딧불 여름밤 — 푸르게 어두운 벽돌 방 뒤로 별이 쏟아지는 여름밤 풀밭이 열려 있다. 반딧불 수백 마리와 풍등 몇 개가 방을 지나 틀 밖 관객 쪽으로 떠오르고, 따뜻한 불빛이 벽돌을 물들인다.
// @post {"exposure":1.15,"sat":1.15,"contrast":1.06,"bloom":0.16}
#define WALLSTYLE 2
#define PBR2
#define DT 1.7
#define BACK_OPEN 1
#define HAS_OUTSIDE
#define HAS_PREP
// 달빛은 관객 쪽에서 상자 안으로 곧게 (벽·바닥에 그림자 계산이 없어 빠르다)
#define LKD vec3(0.0, 0.0, -1.0)
#define KEYC vec3(0.10, 0.13, 0.22)
#define AMB_TOP L(vec3(0.27, 0.32, 0.48))
#define AMB_BOT L(vec3(0.14, 0.14, 0.19))
#define BACKC L(vec3(0.18, 0.26, 0.45))*0.5
#define RIMD vec3(0.0, 0.45, 1.0)
#define RIMC L(vec3(0.35, 0.45, 0.75))*0.6
#define FRAMEC L(vec3(0.05, 0.05, 0.06))
#define FLOOR_REFL 0.025
#define MAXD 14.0
#define BRICK_AGE 0.55
#define MOSS 0.55
#define MOSSC L(vec3(0.16, 0.26, 0.10))
#define BRICK1 L(vec3(0.52, 0.30, 0.24))
#define BRICK2 L(vec3(0.62, 0.42, 0.32))
#define MORTAR L(vec3(0.50, 0.47, 0.44))
#define HAS_WALLLIGHT
#define NL 3

float sq(float x){ return x*x; }
const vec3 LAMPC = vec3(1.0, 0.42, 0.12);
const vec3 FFC = vec3(0.62, 1.0, 0.16);

// ── 풍등 ──
vec3 LP[NL]; float LS[NL]; float LI[NL]; mat3 LR[NL]; float LF[NL];
void prep(){
  float u0 = uT/T;
  for(int i=0;i<NL;i++){
    float fi = float(i);
    float u = fract(u0 + fi/float(NL));
    // 먼 풀밭에서 떠올라 → 방 안을 천천히 지나 → 틀 가운데쯤을 넘어 관객 쪽으로 커지며 → 위·옆으로 빠져나간다
    vec3 a = i == 0 ? vec3(-1.3, -0.55, 9.0) : (i == 1 ? vec3(1.4, -0.60, 8.5) : vec3(0.2, -0.55, 9.5));
    vec3 b = i == 0 ? vec3(-0.5, -0.80, -1.5) : (i == 1 ? vec3(0.6, -0.85, -1.5) : vec3(0.0, -0.75, -1.6));
    vec3 c = i == 0 ? vec3(-2.7, 1.8, -2.0) : (i == 1 ? vec3(2.7, 1.7, -2.0) : vec3(0.5, 1.9, -2.1));
    float w = u + 0.5*sin(TAU*u)/TAU;                       // 방 안에서 느리게
    vec3 ab = mix(a, b, w), bc = mix(b, c, w);
    LP[i] = mix(ab, bc, w);
    LP[i].x += 0.10*sin(TAU*(u0*2.0 + fi*0.37));
    LP[i].y += 0.05*sin(TAU*(u0*3.0 + fi*0.21));
    LS[i] = (i == 0 ? 0.30 : (i == 1 ? 0.26 : 0.34))*smoothstep(0.0, 0.05, u);
    LI[i] = smoothstep(0.0, 0.10, u)*(1.0 - smoothstep(0.82, 0.98, u));
    float sp = TAU*(u0*(i == 1 ? -1.0 : 1.0) + fi*0.3);
    float tl = 0.10*sin(TAU*(u0*2.0 + fi*0.5));
    LR[i] = mat3(cos(sp), 0.0, sin(sp), 0.0, 1.0, 0.0, -sin(sp), 0.0, cos(sp))*mat3(1.0, 0.0, 0.0, 0.0, cos(tl), sin(tl), 0.0, -sin(tl), cos(tl));
    LF[i] = 1.0 + 0.035*sin(TAU*(u0*23.0 + fi*0.3)) + 0.025*sin(TAU*(u0*37.0 + fi*0.7));
    if(LS[i] < 0.005) LP[i].y -= 40.0;
  }
}
float sdLantern(vec3 q, float s){
  // 풍등: 둥근 지붕의 종이 몸통, 밑은 뚫려 있고 안에 불꽃. 아래 철사 고리와 십자 철사에 연료 덩이
  float h = 0.60*s;
  float t = clamp((q.y + h)/(1.0*h + 0.1*s), 0.0, 1.0);
  float r = mix(0.36*s, 0.52*s, t);
  vec2 d2 = vec2(length(q.xz) - r, abs(q.y + 0.2*s) - 0.45*s);
  float low = (min(max(d2.x, d2.y), 0.0) + length(max(d2, 0.0)))*0.95 - 0.05*s;
  vec3 tq = q - vec3(0.0, 0.18*s, 0.0);
  float dome = (length(tq*vec3(1.0, 0.82, 1.0)) - 0.55*s)*0.82;
  float body = smin(low, dome, 0.22*s);
  // 밑 구멍: 속을 파낸다 (종이 두께만 남김)
  float cav = max(length(q.xz) - 0.31*s, q.y + 0.02*s);
  body = max(body, -cav);
  float ring = sdTorus(q + vec3(0.0, h + 0.04*s, 0.0), vec2(0.34*s, 0.022*s));
  float yw = -h - 0.04*s;
  float wire = min(sdCap(q, vec3(-0.33*s, yw, 0.0), vec3(0.33*s, yw, 0.0), 0.012*s), sdCap(q, vec3(0.0, yw, -0.33*s), vec3(0.0, yw, 0.33*s), 0.012*s));
  float fuel = sdRBox(q - vec3(0.0, yw + 0.02*s, 0.0), vec3(0.06*s, 0.035*s, 0.06*s), 0.012*s);
  vec3 fq = q - vec3(0.0, yw + 0.17*s, 0.0);
  float flame = length(fq*vec3(1.0, 0.55, 1.0)) - 0.07*s;
  return min(min(body, ring), min(min(wire, fuel), flame));
}
// ── 반딧불: 칸마다 한 마리, 무리 전체가 천천히 관객 쪽으로 흘러온다 ──
const vec3 FCELL = vec3(0.40, 0.34, 0.40);
#define FNZ 8.0                       // 15초에 흘러오는 칸 수 (이 주기로 무늬가 이어진다)
float ffRegion(vec3 w){
  // 반딧불이 사는 곳: 상자 안(벽에서 조금 떨어져), 뒤로는 풀밭 위, 앞으로는 틀 밖까지 넓어진다
  float fz = max(-w.z, 0.0);
  vec3 c = vec3(0.0, -0.02 + 0.25*fz, 1.0);
  vec3 b = vec3(1.70 + 0.45*fz, 0.80 + 0.30*fz, 2.55);
  return sdBox(w - c, b);
}
vec3 ffPos(vec3 id, float zoff, out float r, out float glow){
  vec3 h = h33(id*vec3(1.0, 1.0, 1.0) + vec3(0.0, 0.0, 0.0));
  float u = uT/T;
  vec3 o = (h - 0.5)*0.10;
  o += vec3(0.035*sin(TAU*(u*2.0 + h.x)), 0.03*sin(TAU*(u*3.0 + h.y)), 0.035*cos(TAU*(u*2.0 + h.z)));
  vec3 w = (id + 0.5)*FCELL + o - vec3(0.0, 0.0, FNZ*FCELL.z*u - zoff);
  float exist = step(h.x*0.7 + h.z*0.3, 0.55 - 0.18*smoothstep(0.0, -1.5, w.z));
  float reg = ffRegion(w);
  r = (0.008 + 0.006*h.y)*exist*clamp(-reg/0.25, 0.0, 1.0);
  float k = floor(2.0 + 3.99*fract(h.y*13.7));
  glow = 0.03 + 0.97*pow(0.5 + 0.5*sin(TAU*(u*k + h.z)), 6.0);
  return w;
}
float fireflies(vec3 p, out vec3 fp, out float fglow){
  fp = vec3(0.0); fglow = 0.0;
  float rb = ffRegion(p);
  if(rb > 0.3) return rb;
  vec3 q = p + vec3(0.0, 0.0, FNZ*FCELL.z*uT/T);
  vec3 i0 = floor(q/FCELL - 0.5);
  float d = 1e9;
  for(int k=0;k<8;k++){
    vec3 id = i0 + vec3(float(k & 1), float((k >> 1) & 1), float((k >> 2) & 1));
    // 무늬가 15초마다 같아지도록 깊이 칸 번호는 FNZ 로 감는다
    vec3 hid = vec3(id.x, id.y, mod(id.z, FNZ));
    float r, gl;
    vec3 w = ffPos(hid, (id.z - hid.z)*FCELL.z, r, gl);
    float dd = length(p - w) - max(r, 1e-4);
    if(r < 1e-4) dd = max(dd, 0.12);
    if(dd < d){ d = dd; fp = w; fglow = gl; }
  }
  return max(d, rb);
}

float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NL;i++){
    if(LS[i] < 0.005) continue;
    vec3 q = transpose(LR[i])*(p - LP[i]);
    float bd = length(q) - LS[i]*1.0;
    if(bd > 0.3){ d = min(d, bd); continue; }
    d = min(d, sdLantern(q, LS[i]));
  }
  vec3 fp; float fg;
  d = min(d, fireflies(p, fp, fg));
  return d;
}

// 풍등·반딧불이 벽돌·바닥·천장에 주는 빛 (선형 빛, 엔진이 바탕색·그늘을 곱한다)
vec3 wallLight(vec3 p, vec3 n){
  vec3 g = vec3(0.0);
  for(int i=0;i<NL;i++){
    if(LI[i] < 0.001) continue;
    vec3 lp = LP[i] + LR[i]*vec3(0.0, -0.25*LS[i], 0.0);          // 불꽃 자리
    vec3 d = lp - p; float r2 = dot(d, d);
    float ndl = max(dot(n, d)*inversesqrt(r2), 0.0);
    g += L(vec3(1.0, 0.55, 0.22))*LI[i]*LF[i]*(0.10 + 0.90*ndl)*0.20*(LS[i]/0.3)/(r2 + 0.03);
  }
  vec3 fp; float fg;
  float df = fireflies(p, fp, fg);
  if(df < 0.6){
    vec3 d = fp - p; float r2 = dot(d, d);
    g += L(FFC)*fg*max(dot(n, d)*inversesqrt(r2), 0.0)*0.0016/(r2 + 0.004);
  }
  return g;
}

vec3 outside(vec3 rd, vec3 ro){
  // 여름밤 하늘: 지평선 쪽은 옅은 남청, 위로는 깊은 밤. 은하수, 별, 먼 숲 실루엣, 어두운 풀밭과 먼 반딧불
  float e = rd.y;
  vec3 c = mix(L(vec3(0.10, 0.15, 0.27)), L(vec3(0.015, 0.025, 0.07)), smoothstep(0.0, 0.45, e));
  vec2 sp = rd.xy/max(rd.z, 0.15);
  // 은하수: 비스듬한 띠
  vec3 nm = normalize(vec3(0.55, -0.35, 0.25));
  float band = exp(-sq(dot(rd, nm))*18.0);
  float mw = fbm(sp*3.0 + 2.0)*0.7 + fbm(sp*9.0)*0.3;
  float dust = smoothstep(0.45, 0.75, fbm(sp*5.0 + 9.0));
  c += L(vec3(0.55, 0.62, 0.85))*band*(0.25 + smoothstep(0.3, 0.8, mw))*0.30*(1.0 - 0.75*dust)*smoothstep(0.0, 0.15, e);
  // 별
  for(int l=0;l<2;l++){
    if(ro.y < -0.8) break;                                          // 젖은 바닥에 비친 하늘엔 별을 빼 먼지처럼 보이지 않게
    float sc = l == 0 ? 55.0 : 120.0;
    vec2 g = sp*sc + float(l)*17.0; vec2 gi = floor(g); float r = h21(gi);
    float tw = 0.7 + 0.3*sin(TAU*(uT/T*floor(2.0 + r*3.0) + r*9.0));
    float s = step(l == 0 ? 0.972 : 0.93, r)*smoothstep(l == 0 ? 0.26 : 0.20, 0.0, length(fract(g) - 0.5 - (h21(gi + 3.1) - 0.5)*0.4));
    float br = fract(r*91.7);
    c += mix(vec3(0.8, 0.88, 1.15), vec3(1.15, 0.95, 0.75), step(0.7, fract(r*37.0)))*s*tw*(l == 0 ? 0.4 + 1.6*br*br : 0.25 + 0.3*br)*(0.6 + 1.2*band);
  }
  c += L(vec3(0.10, 0.22, 0.30))*0.35*exp(-max(e, 0.0)*14.0);              // 지평선의 옅은 여름밤 빛
  // 먼 언덕 (푸른 안개) 과 가까운 숲 실루엣
  float hill = 0.020 + 0.030*fbm(vec2(sp.x*1.3 + 4.0, 2.0));
  float tree = 0.008 + 0.020*fbm(vec2(sp.x*2.6, 1.0)) + 0.016*smoothstep(0.55, 0.85, fbm(vec2(sp.x*11.0, 3.0)));
  if(e < hill) c = mix(c, L(vec3(0.05, 0.08, 0.13)), 0.85);
  if(e < tree){
    c = L(vec3(0.012, 0.020, 0.032));
    if(e < 0.0){
      // 풀밭: 땅 위 좌표로 펼쳐 결을 주고, 반딧불이 풀 위에 떠 있다
      float tg = 0.93/max(-e, 0.004);
      vec2 gp = rd.xz*tg;
      float gr = fbm(gp*vec2(1.5, 0.6)) + 0.4*vnoise(gp*vec2(9.0, 3.0));
      c = mix(L(vec3(0.012, 0.024, 0.022)), L(vec3(0.050, 0.080, 0.085)), smoothstep(0.35, 1.1, gr))*(0.70 + 0.30*smoothstep(30.0, 4.0, tg)) + L(vec3(0.08, 0.12, 0.17))*smoothstep(3.5, 14.0, tg);
      c += L(FFC)*0.004*smoothstep(4.0, 16.0, tg)*smoothstep(40.0, 14.0, tg);   // 먼 풀밭 위 반딧불 무리의 옅은 빛
      for(int l=0;l<2;l++){
        vec2 cell = l == 0 ? vec2(0.55) : vec2(0.31);
        vec2 gi = floor(gp/cell); vec3 hh = h33(vec3(gi, 7.0 + float(l)*3.0));
        vec2 fc = (gi + hh.xy*0.6 + 0.2)*cell;
        vec3 wc = vec3(fc.x, -0.88 + 0.06*hh.z, fc.y);
        float dw = length(wc);
        float dd = length(cross(rd, wc/dw));                                 // 화면에서 둥글게 (각도로 잰다)
        float rr = max(0.014/dw, 0.0016);
        float gl = pow(0.5 + 0.5*sin(TAU*(uT/T*floor(2.0 + hh.z*3.0) + hh.x*7.0)), 6.0);
        float fade = smoothstep(26.0, 3.0, dw);
        c += L(FFC)*step(hh.z, l == 0 ? 0.45 : 0.25)*smoothstep(rr, rr*0.2, dd)*gl*2.0*fade;
      }
    }
  }
  // 가까운 풀밭: 깊이별 풀잎 실루엣 판 네 장 (가까운 것부터). 판마다 풀 위에 반딧불
  if(ro.y > -0.8 && rd.z > 0.0 && e < 0.0){
    vec3 fly = vec3(0.0);
    for(int k=0;k<4;k++){
      float fk = float(k);
      float zk = 1.95 + fk*0.75 + fk*fk*0.45;
      float t = (zk - ro.z)/rd.z;
      vec3 q = ro + rd*t;
      float pw = t*2.6/688.0;                                         // 이 깊이에서 화소 하나 크기쯤
      // 반딧불 (풀 위 0~0.45)
      vec2 fc2 = vec2(q.x/0.30 + fk*3.7, (q.y + 0.93)/0.15);
      vec2 fi = floor(fc2); vec3 hf = h33(vec3(fi, fk + 11.0));
      if(hf.z < 0.30 && fi.y >= 0.0 && fi.y < 3.0){
        vec2 o = (fract(fc2) - (0.2 + 0.6*hf.xy))*vec2(0.30, 0.15);
        o += vec2(0.03*sin(TAU*(uT/T*2.0 + hf.x)), 0.02*sin(TAU*(uT/T*3.0 + hf.y)));
        float gl = pow(0.5 + 0.5*sin(TAU*(uT/T*floor(2.0 + hf.y*3.0) + hf.z*9.0)), 6.0);
        float rr = max(0.012, pw*1.2);
        fly += L(FFC)*smoothstep(rr, rr*0.15, length(o))*(0.2 + 2.2*gl);
      }
      // 풀잎: 칸마다 한 잎, 끝이 뾰족하고 조금씩 기운다. 겹쳐 보이게 두 줄
      float hit = 0.0, hy = 0.0;
      for(int j=0;j<2;j++){
        float bw = 0.032*(1.0 + 0.35*fk);
        float xx = q.x/bw + fk*7.3 + float(j)*0.5;
        float xi = floor(xx), fx = fract(xx);
        vec3 hb = h33(vec3(xi, fk, 3.0 + float(j)));
        float hg = (0.06 + 0.34*hb.x*hb.x)*(1.15 - 0.12*fk)*(0.55 + 0.7*vnoise(vec2(q.x*0.9 + fk*3.0, 1.0)));
        float y = (q.y + 0.93)/hg;
        float lean = (hb.y - 0.5)*0.9 + 0.12*sin(TAU*(uT/T*2.0) + q.x*1.7 + fk);
        float cx = 0.5 + lean*y*y*0.8;
        float hw = 0.46*(1.0 - y);                                    // 땅 아래로는 잎이 넓어져 빽빽한 풀숲이 된다
        float in1 = (1.0 - smoothstep(hw - pw/bw, hw + pw/bw, abs(fx - cx)))*step(y, 1.0);
        if(in1 > hit){ hit = in1; hy = clamp(y, 0.0, 1.0); }
      }
      if(hit > 0.0){
        vec3 gc = mix(L(vec3(0.004, 0.008, 0.009)), L(vec3(0.07, 0.10, 0.13)), pow(hy, 3.0));   // 잎끝에 밤하늘 빛이 살짝
        gc = mix(gc, L(vec3(0.07, 0.11, 0.16)), 0.22*fk);                                     // 먼 판일수록 푸른 밤안개
        gc += L(FFC)*0.004*(1.0 - hy);
        c = mix(c, gc, hit);
        if(hit > 0.99) return c + fly;
      }
    }
    c += fly;
  }
  return c;
}

M mat(vec3 p, vec3 n){
  // 가장 가까운 풍등 / 반딧불
  int k = -1; float best = 1e9; vec3 bq = vec3(0.0);
  for(int i=0;i<NL;i++){
    if(LS[i] < 0.005) continue;
    vec3 q = transpose(LR[i])*(p - LP[i]);
    float dd = sdLantern(q, LS[i]);
    if(dd < best){ best = dd; k = i; bq = q/LS[i]; }
  }
  vec3 fp; float fg;
  float df = fireflies(p, fp, fg);
  float cosV = max(dot(n, -VRD), 0.0);
  if(df < best){
    M m = mk(vec3(0.025, 0.03, 0.015), 0.4, 0.0);
    m.emit = L(FFC)*fg*(1.2 + 6.0*cosV*cosV);
    return m;
  }
  float li = k == 0 ? LF[0]*LI[0] + (1.0 - LI[0]) : (k == 1 ? LF[1]*LI[1] + (1.0 - LI[1]) : LF[2]*LI[2] + (1.0 - LI[2]));
  float yw = -0.64;
  // 불꽃
  vec3 fq = bq - vec3(0.0, yw + 0.17, 0.0);
  if(length(fq*vec3(1.0, 0.55, 1.0)) < 0.085){
    M m = mk(vec3(0.0), 0.5, 0.0);
    m.emit = mix(L(vec3(1.0, 0.45, 0.10)), vec3(1.0, 0.85, 0.55), smoothstep(0.08, 0.0, length(fq*vec3(1.0, 0.55, 1.0))))*16.0*li;
    return m;
  }
  // 철사 고리 · 십자 철사 · 연료 덩이
  if(bq.y < -0.60){
    M m = mk(L(vec3(0.20, 0.17, 0.14)), 0.45, 0.5);
    m.emit = L(LAMPC)*0.5*li*smoothstep(-0.75, -0.62, bq.y);
    return m;
  }
  float rr = length(bq.xz);
  // 속: 구멍 안쪽 종이는 불꽃 바로 곁이라 아주 밝다
  if(rr < 0.33 && bq.y < -0.0 && dot(n, normalize(vec3(bq.x, 0.0, bq.z) + 1e-4)) < 0.2){
    M m = mk(L(vec3(0.9, 0.6, 0.35)), 0.7, 0.0);
    m.emit = L(vec3(1.0, 0.62, 0.25))*(5.0 + 5.0*smoothstep(-0.1, -0.5, bq.y))*li;
    return m;
  }
  // 종이: 세로 이음매 · 가는 대나무 테 · 결 · 아래가 더 밝은 불빛
  float an = atan(bq.z, bq.x);
  float seam = 1.0 - smoothstep(0.0, 0.05, abs(fract(an/TAU*6.0) - 0.5) - 0.455);
  float rib = 1.0 - smoothstep(0.0, 0.035, abs(fract(bq.y*2.6 + 0.35) - 0.5) - 0.465);
  float fiber = 0.85 + 0.3*vnoise(vec2(an*9.0, bq.y*14.0));
  float lowg = smoothstep(0.55, -0.6, bq.y);
  vec3 paper = L(vec3(0.80, 0.48, 0.28));
  M m = mk(paper, 0.65, 0.0);
  m.wrap = 0.6;
  float glow = (1.3 + 3.4*lowg)*(1.0 - 0.50*seam)*(1.0 - 0.55*rib)*fiber*(0.50 + 0.50*cosV);
  vec3 ec = mix(L(vec3(1.0, 0.50, 0.16)), L(vec3(1.0, 0.34, 0.06)), 0.5 + 0.5*lowg);
  m.emit = ec*glow*li;
  m.alb *= 1.0 - 0.5*max(seam, rib);
  return m;
}
