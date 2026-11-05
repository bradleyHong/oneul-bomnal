// 01 봄날의 창 II — 바다에서 하얀 나무 창틀이 떠올라 상자를 지나 틀 밖으로 나온다. 창 안에는 다른 날의 하늘.
// @post {"exposure":1.0,"sat":1.28,"contrast":1.08,"bloom":0.06}
#define DT 1.45
#define BACK_OPEN 1
#define HAS_OUTSIDE
#define HAS_PREP
#define WALL L(vec3(0.94, 0.90, 0.96))
#define GRID 0.30
#define GRIDW 0.010
#define GRIDK 0.18
#define FRAMEC L(vec3(0.12, 0.11, 0.15))
#define AMB_TOP L(vec3(0.62, 0.48, 0.72))
#define AMB_BOT L(vec3(0.40, 0.30, 0.42))
#define BACKC L(vec3(1.0, 0.62, 0.62))*0.6
#define MAXD 40.0
#define NW 4
const float HS = 1.25;

// ── 하늘 다섯 날: 0 봄날 꿈 · 1 라임 아침 · 2 봄밤 · 3 물빛 한낮 · 4 호박빛 저녁
void palette(float id, out vec3 zen, out vec3 mid, out vec3 hor, out vec3 sea, out vec3 sun, out vec3 sd){
  if(id < 0.5){ zen=L(vec3(0.16,0.10,0.86)); mid=L(vec3(1.00,0.24,0.62)); hor=L(vec3(1.00,0.62,0.40)); sea=L(vec3(0.00,0.72,0.86)); sun=vec3(9.0,6.4,4.6); sd=normalize(vec3(0.42,0.06,1.0)); }
  else if(id < 1.5){ zen=L(vec3(0.02,0.42,1.00)); mid=L(vec3(0.35,0.85,1.00)); hor=L(vec3(0.83,1.00,0.23)); sea=L(vec3(0.00,0.78,0.52)); sun=vec3(7.5,9.0,4.0); sd=normalize(vec3(-0.30,0.09,1.0)); }
  else if(id < 2.5){ zen=L(vec3(0.02,0.03,0.16)); mid=L(vec3(0.10,0.10,0.42)); hor=L(vec3(0.42,0.28,0.70)); sea=L(vec3(0.02,0.10,0.30)); sun=vec3(3.2,3.4,4.2); sd=normalize(vec3(0.15,0.20,1.0)); }
  else if(id < 3.5){ zen=L(vec3(0.00,0.38,1.00)); mid=L(vec3(0.10,0.80,1.00)); hor=L(vec3(0.70,0.98,1.00)); sea=L(vec3(0.00,0.86,0.78)); sun=vec3(9.0,9.0,8.4); sd=normalize(vec3(0.05,0.50,1.0)); }
  else { zen=L(vec3(0.34,0.03,0.46)); mid=L(vec3(1.00,0.22,0.16)); hor=L(vec3(1.00,0.66,0.12)); sea=L(vec3(0.14,0.20,0.52)); sun=vec3(9.0,5.2,2.2); sd=normalize(vec3(-0.10,0.03,1.0)); }
}
vec3 sky(vec3 rd, float id){
  vec3 zen, mid, hor, sea, sun, sd; palette(id, zen, mid, hor, sea, sun, sd);
  float e = rd.y;
  vec3 c = mix(hor, mid, smoothstep(0.0, 0.16, e));
  c = mix(c, zen, smoothstep(0.12, 0.75, e));
  float d = max(dot(rd, sd), 0.0);
  c += sun*(0.03*pow(d, 10.0) + 0.08*pow(d, 120.0)) + sun*smoothstep(0.99986, 0.99993, d)*3.5;
  if(e > 0.0){
    float ph = TAU*uT/T;
    vec2 cu = rd.xz/(e + 0.08)*0.55 + vec2(3.1, 1.7) + 0.22*vec2(cos(ph), sin(ph));
    float n = fbm(cu + 0.35*vec2(fbm(cu*1.7 + 4.0), fbm(cu*1.7 - 2.0)));
    float cov = smoothstep(0.50, 0.78, n)*smoothstep(0.01, 0.10, e)*(1.0 - smoothstep(0.45, 0.9, e));
    vec3 cld = mix(hor, vec3(1.0), 0.6);
    c = mix(c, mix(mix(cld, zen, 0.5)*0.55, cld*(0.8 + 0.8*pow(d, 3.0)), smoothstep(0.5, 0.85, n)), cov*0.85);
  }
  if(id > 1.5 && id < 2.5 && e > 0.0){
    vec2 g = vec2(atan(rd.x, rd.z), e)*vec2(130.0, 160.0);
    vec2 cell = floor(g); float r = h21(cell);
    vec2 f = fract(g) - 0.5;
    c += step(0.93, r)*exp(-dot(f, f)*60.0)*vec3(0.9, 0.95, 1.4)*2.0*smoothstep(0.02, 0.2, e);
  }
  return c;
}
vec3 seaN(vec2 p, float dist){
  vec2 g = vec2(0.0); float fade = 1.0/(1.0 + dist*0.05);
  for(int i=0;i<7;i++){
    float fi = float(i), an = fi*2.399 + 0.6; vec2 dir = vec2(cos(an), sin(an));
    float k = 1.4*pow(1.62, fi), a = 0.10/pow(1.75, fi)*(i > 3 ? fade : 1.0);
    float w = TAU*(1.0 + floor(fi*1.4))/T*2.0;
    g += dir*a*k*cos(dot(dir, p)*k - w*uT + fi*1.3);
  }
  return normalize(vec3(-g.x, 1.0, -g.y));
}
// 이 점에서 이 방향으로 본 바깥 세상 (하늘 번호 id)
vec3 world(vec3 ro, vec3 rd, float id){
  if(rd.y < 0.0){
    float t = (-HS - ro.y)/rd.y; vec3 p = ro + rd*t;
    vec3 zen, mid, hor, sea, sun, sd; palette(id, zen, mid, hor, sea, sun, sd);
    float dist = length(p - vec3(0, 0, -ZC));
    vec3 n = seaN(p.xz, dist);
    vec3 r = reflect(rd, n); r.y = abs(r.y);
    float F = min(0.02 + 0.98*pow(1.0 - max(dot(n, -rd), 0.0), 5.0), 0.6);
    vec3 body = sea*(0.35 + 0.65*max(dot(n, normalize(vec3(sd.x, 1.0, sd.z))), 0.0))*0.9;
    vec3 c = mix(body, sky(r, id), F) + sun*pow(max(dot(r, sd), 0.0), 600.0)*1.6;
    return mix(c, hor*1.05, 1.0 - exp(-max(dist - 6.0, 0.0)*0.010));
  }
  return sky(rd, id);
}
vec3 outside(vec3 rd, vec3 ro){ return world(ro, rd, 0.0); }

// ── 창들: 바다에서 떠올라 → 다가와 → 상자를 지나 → 틀 밖에 머물다 → 관객 옆으로
vec3 WC[NW]; mat3 WR[NW]; vec2 WS[NW]; float WP[NW];
vec3 cat(vec3 a, vec3 b, vec3 c, vec3 d, float t){ return 0.5*((2.0*b) + (-a + c)*t + (2.0*a - 5.0*b + 4.0*c - d)*t*t + (-a + 3.0*b - 3.0*c + d)*t*t*t); }
mat3 euler(vec3 e){
  float cy = cos(e.x), sy = sin(e.x), cp = cos(e.y), sp = sin(e.y), cr = cos(e.z), sr = sin(e.z);
  mat3 Ry = mat3(cy,0,-sy, 0,1,0, sy,0,cy), Rx = mat3(1,0,0, 0,cp,sp, 0,-sp,cp), Rz = mat3(cr,sr,0, -sr,cr,0, 0,0,1);
  return Ry*Rx*Rz;
}
void prep(){
  for(int i=0;i<NW;i++){
    float fi = float(i);
    vec4 cfg = i == 0 ? vec4(0.55, 13.0, -1.0, -0.55) : (i == 1 ? vec4(-0.9, 11.0, 1.05, 0.62) : (i == 2 ? vec4(1.3, 12.0, 1.10, -0.35) : vec4(-1.4, 10.0, -1.05, 0.55)));
    float off = i == 0 ? 0.0 : (i == 1 ? 0.27 : (i == 2 ? 0.52 : 0.76));
    WS[i] = i == 0 ? vec2(0.50, 0.68) : (i == 1 ? vec2(0.34, 0.34) : (i == 2 ? vec2(0.44, 0.30) : vec2(0.28, 0.40)));
    WP[i] = i == 0 ? 1.0 : (i == 1 ? 2.0 : (i == 2 ? 3.0 : 4.0));
    float u = fract(uT/T + off);
    float sx = cfg.x, zf = cfg.y, ex = cfg.z*A/1.78, ey = cfg.w;
    vec3 K[8];
    K[0] = vec3(sx, -HS - 1.1, zf); K[1] = vec3(sx, -HS - 0.05, zf - 0.2); K[2] = vec3(sx*0.92, -0.25, zf - 0.9);
    K[3] = vec3(sx*0.35, 0.02, zf*0.42); K[4] = vec3(ex*0.08, ey*0.05, 0.9); K[5] = vec3(ex*0.62, ey*0.50, -0.45);
    K[6] = vec3(ex*0.86, ey*0.70, -0.82); K[7] = vec3(ex*3.4, ey*2.6, -2.3);
    float U[8]; U[0] = 0.0; U[1] = 0.10; U[2] = 0.20; U[3] = 0.46; U[4] = 0.62; U[5] = 0.73; U[6] = 0.86; U[7] = 1.0;
    int k = 0; for(int j=0;j<6;j++) if(u > U[j+1]) k = j + 1;
    float t = clamp((u - U[k])/(U[k+1] - U[k]), 0.0, 1.0);
    vec3 a = K[max(k-1, 0)], b = K[k], c = K[k+1], d = K[min(k+2, 7)];
    WC[i] = cat(a, b, c, d, t);
    float yaw = 0.5*sin(TAU*u*0.9 + fi) + 0.25*u, pitch = 0.22*sin(TAU*(u*0.7 + 0.2 + fi*0.3)), roll = 0.12*sin(TAU*(u + 0.1*fi));
    WR[i] = euler(vec3(yaw, pitch, roll));
    if(u < 0.005 || u > 0.995) WC[i].y -= 50.0;
  }
}
float windowSDF(vec3 q, vec2 s, out float glass){
  float dep = 0.055, fw = 0.075, mw = 0.03;
  float outer = sdRBox(q, vec3(s, dep), 0.012);
  float hole = sdBox(q, vec3(s - fw, dep + 0.05));
  float frame = max(outer, -hole);
  float mull = min(sdBox(q, vec3(mw, s.y - fw, dep*0.7)), sdBox(q, vec3(s.x - fw, mw, dep*0.7)));
  glass = sdBox(q, vec3(s - fw, 0.006));
  return min(min(frame, mull), glass);
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NW;i++){
    vec3 q = transpose(WR[i])*(p - WC[i]);
    if(length(q) > length(WS[i]) + 0.3){ d = min(d, length(q) - length(WS[i]) - 0.1); continue; }
    float g; d = min(d, windowSDF(q, WS[i], g));
  }
  return max(d, -(p.y + HS));        // 물 아래는 지운다
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9, g = 0.0;
  for(int i=0;i<NW;i++){
    vec3 q = transpose(WR[i])*(p - WC[i]); float gg;
    float d = windowSDF(q, WS[i], gg);
    if(d < best){ best = d; k = i; g = gg; }
  }
  vec3 q = transpose(WR[k])*(p - WC[k]);
  float gg; windowSDF(q, WS[k], gg);
  if(gg < 0.004 && abs(dot(n, WR[k][2])) > 0.9){
    // 유리: 그 너머는 다른 날의 바다와 하늘
    M m = mk(vec3(0.0), 0.0, 0.0);
    m.emit = world(p, VRD, WP[k])*0.92;
    return m;
  }
  return mk(L(vec3(0.97, 0.95, 0.93)), 0.38, 0.0);   // 흰 칠 나무
}
