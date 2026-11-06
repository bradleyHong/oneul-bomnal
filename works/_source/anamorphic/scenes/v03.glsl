// V03 해파리 우물 — 물에 잠긴 깊고 높은 벽돌 우물. 천장의 둥근 우물 입구로 물 위 햇빛이 빛기둥이 되어 떨어지고, 바닥 깊은 구멍에서 은은히 빛나는 해파리들이 갓을 오므렸다 펴며 천천히 떠올라 빛 속으로 사라진다. 한 마리는 앞으로 다가와 틀을 넘어 관객 눈앞에서 크게 지나간다.
// @post {"exposure":1.08,"sat":1.12,"contrast":1.08,"bloom":0.14}
#define WALLSTYLE 2
#define PBR2
#define DT 2.2
#define STEPS 140
#define MAXD 12.0
#define HAS_PREP
#define HAS_WALLTINT
#define HAS_WALLLIGHT
#define LKD vec3(0.10, 0.62, -0.78)
#define KEYC vec3(0.55, 0.85, 0.90)
#define AMB_TOP L(vec3(0.30, 0.55, 0.58))
#define AMB_BOT L(vec3(0.04, 0.09, 0.12))
#define RIMD vec3(0.0, 1.0, 0.35)
#define RIMC L(vec3(0.55, 0.90, 1.0))*0.9
#define FRAMEC L(vec3(0.05, 0.06, 0.07))
#define BRICK1 L(vec3(0.46, 0.30, 0.24))
#define BRICK2 L(vec3(0.58, 0.44, 0.34))
#define MORTAR L(vec3(0.46, 0.48, 0.44))
#define BRICK_AGE 0.75
#define MOSS 0.55
#define MOSSC L(vec3(0.16, 0.34, 0.26))
#define SNOW 6
#define SNOWD 0.07
#define SNOWC vec3(0.10, 0.16, 0.17)
#define NJ 5
#define BRICKW 0.24
#define BRICKH 0.08

// ── 물 ──
const vec3 SIG = vec3(0.62, 0.26, 0.22);            // 붉은빛이 먼저 스러진다
const vec2 HC = vec2(0.0, 1.10);                   // 천장 우물 입구 가운데 (x, z)
const float HR = 0.26;
const vec3 LD = vec3(0.0, -0.976, -0.215);         // 빛기둥 방향 (아래로, 관객 쪽으로 조금)
vec3 FOGT(){ return L(vec3(0.10, 0.36, 0.40)); }   // 위쪽 물빛
vec3 FOGB(){ return L(vec3(0.015, 0.07, 0.10)); }  // 깊은 물빛
const vec3 SUNC = vec3(0.55, 1.05, 1.0);

vec2 upq(vec3 p){ float s = (0.93 - p.y)/(-LD.y); return p.xz - LD.xz*s; }   // 이 점을 지나는 빛줄이 천장에서 온 곳
float holeM(vec2 q){ return smoothstep(HR, HR - 0.07, length(q - HC)); }
// 물결 빛무늬 (시간은 정수 배 각도만 → 15초 루프)
float caus(vec2 uv){
  vec2 p = uv*7.0;
  vec2 i = p; float c = 1.0; float w = TAU*uT/T;
  for(int n=0;n<4;n++){
    float t = w*float(n + 1) + float(n)*1.7;
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0/length(vec2(p.x/(sin(i.x + t)/0.006), p.y/(cos(i.y + t)/0.006)));
  }
  c /= 4.0; c = clamp(1.17 - pow(c, 1.4), 0.0, 1.0);
  return pow(abs(c), 7.0);
}
float beamD(vec3 x){
  vec2 q = upq(x);
  float m = holeM(q);
  if(m <= 0.0) return 0.0;
  float w = TAU*uT/T;
  float s = vnoise(q*vec2(11.0, 9.0) + 0.9*vec2(cos(w), sin(w)));
  s = 0.10 + 0.90*smoothstep(0.35, 0.90, s)*(0.6 + 0.4*vnoise(q*vec2(23.0, 19.0) - 0.5*vec2(sin(w), cos(w))));
  return m*s*exp(-(0.93 - x.y)*0.55);
}
// 카메라에서 p 까지 물속 구간: 투과율 tr, 산란빛 반환
vec3 waterFog(vec3 p, out vec3 tr){
  tr = vec3(1.0);
  if(p.z <= 0.0) return vec3(0.0);
  vec3 ro = vec3(0.0, 0.0, -ZC);
  vec3 dv = p - ro; float Lr = length(dv); vec3 rd = dv/Lr;
  float t0 = ZC/rd.z, d = max(Lr - t0, 0.0);
  tr = exp(-SIG*d);
  float ym = ro.y + rd.y*(t0 + 0.5*d);
  vec3 fc = mix(FOGB(), FOGT(), smoothstep(-1.0, 1.0, ym));
  vec3 c = fc*(1.0 - tr);
  vec3 acc = vec3(0.0);
  float jit = h21(gl_FragCoord.xy + fract(uT*7.0));
  for(int k=0;k<8;k++){
    float t = t0 + d*(float(k) + jit)/8.0;
    acc += beamD(ro + rd*t)*exp(-SIG*(t - t0));
  }
  c += L(SUNC)*acc*d/8.0*0.40;
  return c;
}

// ── 해파리 ──
vec3 JP[NJ]; mat3 JR[NJ]; float JS[NJ]; float JC[NJ]; vec3 JV[NJ]; float JH[NJ];
mat3 frameFrom(vec3 up){
  vec3 y = normalize(up); vec3 x = normalize(cross(vec3(0.0, 0.0, 1.0), y)); vec3 z = cross(x, y);
  return mat3(x, y, z);
}
vec3 jPath(int i, float u){
  float fi = float(i);
  float h = h11(fi*3.7 + 1.3), h2 = h11(fi*5.9 + 2.1);
  if(i == 0){
    // 주인공: 우물 구멍에서 떠올라 앞으로 다가와 틀을 넘어 관객 눈앞 위로 빠져나간다 (캣멀롬 곡선)
    vec3 P[5];
    P[0] = vec3(0.0, -1.45, 1.20); P[1] = vec3(-0.02, -0.45, 1.05); P[2] = vec3(0.0, 0.02, 0.40);
    P[3] = vec3(0.04, 0.30, -0.95); P[4] = vec3(0.06, 3.0, -2.3);
    float x = u*4.0; int k = int(min(floor(x), 3.0)); float f = x - float(k);
    vec3 a = P[max(k - 1, 0)], b = P[k], c = P[k + 1], d = P[min(k + 2, 4)];
    if(k == 0) a = 2.0*b - c;
    if(k == 3) d = 2.0*c - b;
    return 0.5*((2.0*b) + (-a + c)*f + (2.0*a - 5.0*b + 4.0*c - d)*f*f + (-a + 3.0*b - 3.0*c + d)*f*f*f);
  }
  float y = mix(-1.35, 1.95, u);
  float x0 = (fi < 2.5 ? -1.0 : 1.0)*(0.08 + 0.05*h);
  float z0 = mix(0.70, 1.75, h2);
  float k = smoothstep(0.45, 0.92, u);
  vec3 a = vec3(x0 + 0.05*sin(TAU*(u + h)), y, z0);
  return mix(a, vec3(HC.x + 0.03*(h - 0.5), y, HC.y + 0.06*(h2 - 0.5)), k);
}
void prep(){
  float w = uT/T;
  for(int i=0;i<NJ;i++){
    float fi = float(i);
    float u = fract(w + fi/float(NJ) + 0.13);
    vec3 p = jPath(i, u), p2 = jPath(i, min(u + 0.01, 1.0));
    JV[i] = (p2 - p)/0.01/T;
    float pulse = 0.5 + 0.5*cos(TAU*(w*5.0 + fi*0.31));          // 15초에 다섯 번 오므린다
    JC[i] = pulse;
    p.y += 0.035*sin(TAU*(w*5.0 + fi*0.31) - 0.9);                // 오므릴 때 쑥 오른다
    JP[i] = p;
    JS[i] = i == 0 ? 0.175 : 0.105 + 0.035*h11(fi*7.3);
    JH[i] = i == 0 ? 0.04 : h11(fi*2.9 + 0.4);
    vec3 up = vec3(JV[i].x*1.2, 1.0, JV[i].z*1.4) + 0.12*vec3(sin(TAU*(w + fi*0.2)), 0.0, cos(TAU*(w*2.0 + fi*0.3)));
    JR[i] = frameFrom(up);
  }
}
// 갓: 오목한 속을 가진 둥근 갓, 가장자리는 물결 모양
float sdBell(vec3 q, float s, float c, out float rimT){
  float r = s*(1.0 - 0.14*c), h = s*(0.62 + 0.12*c);
  float a = atan(q.z, q.x);
  float sc = 1.0 + 0.025*cos(a*16.0)*smoothstep(0.0, -0.3*h, q.y);
  vec3 qq = vec3(q.x/sc, q.y, q.z/sc);
  float k0 = length(qq/vec3(r, h, r)), k1 = length(qq/vec3(r*r, h*h, r*r));
  float outer = k0*(k0 - 1.0)/max(k1, 1e-5);
  vec3 iq = qq - vec3(0.0, -0.30*h, 0.0); vec3 ir = vec3(0.86*r, 0.78*h, 0.86*r);
  float j0 = length(iq/ir), j1 = length(iq/(ir*ir));
  float inner = j0*(j0 - 1.0)/max(j1, 1e-5);
  float d = max(outer, -inner);
  d = max(d, -(q.y + 0.20*h));
  rimT = clamp(-q.y/h, 0.0, 1.0);
  return d*0.8;
}
// 촉수: 갓 가장자리에서 늘어뜨린 가는 실 (모두 같은 물결을 탄다 → 각도 반복)
float sdTent(vec3 q, float s, int i, out float tt){
  float len = s*(i == 0 ? 4.6 : 4.0);
  float yb = -0.12*s;
  float dep = clamp((yb - q.y)/len, 0.0, 1.0);
  float w = uT/T, fi = float(i);
  vec2 sway = vec2(sin(TAU*(w*5.0 - dep*1.6 + fi*0.3)), cos(TAU*(w*5.0 - dep*1.3 + fi*0.7)))*0.12*s*dep*dep;
  sway -= JV[i].xz*len*dep*dep*1.6;                                // 움직이는 반대쪽으로 끌린다
  vec2 xz = q.xz - sway;
  float rr = s*(0.88 - 0.25*dep + 0.06*JC[i]*(1.0 - dep));
  float a = atan(xz.y, xz.x);
  float N = 14.0, sec = TAU/N;
  float ai = floor(a/sec + 0.5);
  float hh = h11(ai*7.1 + fi*3.3);
  float da = a - ai*sec - 0.10*sin(dep*5.0 + hh*6.0)*dep;
  rr *= 0.92 + 0.12*hh;
  float pr = length(xz);
  vec2 lp = vec2(pr*cos(da) - rr, pr*sin(da));
  float rad = mix(0.0042, 0.0022, dep)*(i == 0 ? 0.72 : 1.0);
  float le = len*(0.55 + 0.45*hh);
  float dy = max(q.y - yb, 0.0) + max(yb - le - q.y, 0.0);
  tt = dep;
  return (length(vec3(lp, dy)) - rad)*0.75;
}
// 입팔: 가운데서 늘어지는 네 갈래 주름 띠
float sdArms(vec3 q, float s, int i, out float tt){
  float len = s*2.1;
  float yb = -0.05*s;
  float dep = clamp((yb - q.y)/len, 0.0, 1.0);
  float w = uT/T, fi = float(i);
  vec2 sway = vec2(sin(TAU*(w*5.0 - dep*1.2 + fi*0.5)), cos(TAU*(w*5.0 - dep*1.1 + fi*0.9)))*0.08*s*dep;
  sway -= JV[i].xz*len*dep*1.2;
  vec2 xz = q.xz - sway;
  float a = atan(xz.y, xz.x) + 0.6*dep;
  float sec = TAU/4.0;
  float da = a - (floor(a/sec) + 0.5)*sec;
  float pr = length(xz);
  vec2 lp = vec2(pr*cos(da), pr*sin(da));
  float wd = s*(0.10 + 0.12*sin(3.14159*min(dep*1.25, 1.0)));
  float fr = 0.25*s*0.10*sin(dep*38.0 - TAU*w*5.0);                 // 주름
  vec2 sz = vec2(wd, 0.016*s + 0.006);
  vec2 lq = vec2(lp.x - (0.10*s + wd*0.6), lp.y - fr*(lp.x/(wd + 1e-3)));
  vec2 dd = abs(lq) - sz;
  float d2 = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0);
  float dy = max(q.y - yb, 0.0) + max(yb - len - q.y, 0.0);
  tt = dep;
  return (length(vec2(max(d2, 0.0), dy)) + min(d2, 0.0) - 0.004)*0.7;
}
float jelly(vec3 p, int i, out float part, out float tt){
  vec3 q = transpose(JR[i])*(p - JP[i]);
  float s = JS[i];
  float rimT;
  float b = sdBell(q, s, JC[i], rimT);
  float t1, t2;
  float te = sdTent(q, s, i, t1);
  float ar = sdArms(q, s, i, t2);
  part = 0.0; tt = rimT;
  float d = b;
  if(te < d){ d = te; part = 1.0; tt = t1; }
  if(ar < d){ d = ar; part = 2.0; tt = t2; }
  return d;
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NJ;i++){
    float s = JS[i];
    vec3 c = JP[i] - JR[i][1]*s*1.9;
    float bd = length(p - c) - s*2.9;
    if(bd > 0.3){ d = min(d, bd); continue; }
    float pa, tt;
    d = min(d, min(jelly(p, i, pa, tt), 0.3));
  }
  return d;
}
vec3 jellyCol(float h){
  vec3 a = L(vec3(0.70, 0.92, 1.00));                 // 달빛 흰빛
  vec3 b = L(vec3(0.95, 0.62, 0.92));                 // 연분홍 보랏빛
  vec3 c = L(vec3(1.00, 0.78, 0.48));                 // 호박빛
  return h < 0.4 ? mix(a, b, h/0.4) : mix(b, c, (h - 0.4)/0.6);
}
M mat(vec3 p, vec3 n){
  float best = 1e9; int k = 0; float part = 0.0, tt = 0.0;
  for(int i=0;i<NJ;i++){
    if(length(p - JP[i] + JR[i][1]*JS[i]*1.9) > JS[i]*3.0) continue;
    float pa, t2;
    float d = jelly(p, i, pa, t2);
    if(d < best){ best = d; k = i; part = pa; tt = t2; }
  }
  vec3 tr; vec3 fog = waterFog(p, tr);
  vec3 jc = jellyCol(JH[k]);
  vec3 v = -VRD;
  float fr = 1.0 - abs(dot(n, v));
  // 우물 입구에서 떨어지는 빛줄을 받는다
  float bl = beamD(p)*(0.35 + 0.65*max(dot(n, -LD), 0.0));
  vec3 q = transpose(JR[k])*(p - JP[k]);
  float s = JS[k];
  M m;
  if(part < 0.5){
    // 갓: 투명한 젤리. 테두리는 짙게 빛나고, 위에서 보면 네 잎 모양 생식소가 비친다
    m = mk(jc*0.10, 0.14, 0.0);
    m.sss = 0.5;
    float r = length(q.xz)/s;
    float a = atan(q.z, q.x);
    float gon = smoothstep(0.10, 0.02, abs(r - (0.34 + 0.07*cos(a*4.0 + 3.14159))))*smoothstep(-0.2, 0.3, q.y/s);
    float canal = smoothstep(0.06, 0.0, abs(fract(a*16.0/TAU) - 0.5) - 0.44)*0.25*smoothstep(0.2, 0.9, r);
    vec3 e = jc*(0.10 + 0.65*pow(fr, 2.2) + 0.25*tt);
    e += mix(jc, L(vec3(1.0, 0.55, 0.85)), 0.6)*gon*0.9*(0.7 + 0.3*JC[k]);
    e += jc*canal;
    e += jc*smoothstep(0.75, 1.0, tt)*0.6;                           // 가장자리 띠
    m.emit = e*0.55 + jc*L(SUNC)*bl*0.45;
  } else if(part < 1.5){
    m = mk(jc*0.15, 0.85, 0.0);
    m.emit = jc*(0.55 - 0.40*tt)*0.9 + jc*L(SUNC)*bl*0.4;
  } else {
    vec3 ac = mix(jc, L(vec3(1.0, 0.60, 0.80)), 0.35);
    m = mk(ac*0.18, 0.85, 0.0);
    m.sss = 0.4;
    m.emit = ac*(0.30 + 0.55*pow(fr, 1.5))*(1.0 - 0.5*tt)*0.8 + ac*L(SUNC)*bl*0.4;
  }
  m.alb *= tr;
  m.emit = m.emit*tr + fog;
  return m;
}

// ── 벽돌에 물빛 입히기 ──
vec3 gAlb; float gId; vec3 gEm;
// 엔진의 줄눈 그늘(cav)·구석 그늘(boxAO)을 그대로 다시 재서, 더하는 빛이 벽돌 무늬에 묻히지 않게 나눈다
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
// 바닥 우물 구멍 (x, z)
float pitD(vec2 xz){ vec2 d = abs(xz - vec2(0.0, 1.15)) - vec2(0.20, 0.78); return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.05; }
vec3 wallTint(vec3 p, float id, vec3 a){
  vec3 tr; vec3 fog = waterFog(p, tr);
  gId = id; gEm = fog;
  bool ceil = id > 2.5 && id < 3.5 && p.y > 0.0;
  bool flo = id > 2.5 && id < 3.5 && p.y < 0.0;
  float t = length(p - vec3(0.0, 0.0, -ZC));
  if(ceil){
    float r = length(p.xz - HC);
    if(r < HR){
      // 우물 입구: 물 위에서 쏟아지는 햇빛, 일렁이는 물결
      vec3 rd = normalize(p - vec3(0.0, 0.0, -ZC));
      vec2 sq = rd.xz/max(rd.y, 0.05)*1.4;
      float w = TAU*uT/T;
      float rip = vnoise(sq*5.0 + 0.7*vec2(cos(w), sin(w))) + 0.5*vnoise(sq*11.0 - 0.6*vec2(sin(w*2.0), cos(w*2.0)));
      vec3 sky = L(SUNC)*(1.6 + 1.4*rip)*smoothstep(HR, HR - 0.05, r) + L(vec3(0.3, 0.7, 0.8))*0.4;
      gEm += sky*tr;
      a = vec3(1e-3);
    } else {
      a *= tr*(0.55 + 0.45*smoothstep(HR, HR + 0.10, r));            // 입구 둘레 그늘진 턱
    }
  } else if(flo && pitD(p.xz) < 0.0){
    // 바닥 구멍: 끝없이 깊은 물
    float dd = -pitD(p.xz);
    gEm += FOGB()*0.25*smoothstep(0.0, 0.10, 0.10 - dd)*tr;
    a = vec3(1e-3);
  } else {
    a *= tr;
    if(flo){ float pd = pitD(p.xz); a *= 0.55 + 0.45*smoothstep(0.0, 0.06, pd); }   // 구멍 둘레 모서리
  }
  gAlb = a;
  gEm /= max(gAlb, vec3(1e-4))*max(1.0 - cavAt(p, id, t), 0.3)*max(aoAt(p, id), 0.02);
  return a;
}
vec3 wallLight(vec3 p, vec3 n){
  // 빛기둥이 벽돌에 닿아 일렁이는 물결 빛무늬 + 물 전체에 옅게 번진 빛무늬
  vec2 q = upq(p);
  float m = holeM(q);
  float fade = exp(-(0.93 - p.y)*0.45);
  float cs = caus(q*1.3);
  vec3 c = L(SUNC)*m*(0.25 + 1.6*cs)*fade*(0.25 + 0.75*max(dot(n, -LD), 0.0))*1.1;
  c += L(vec3(0.3, 0.75, 0.8))*caus(vec2(p.x + p.z, p.y*0.45) + 3.0)*0.45*smoothstep(-1.4, 0.9, p.y);
  return c + gEm;
}
