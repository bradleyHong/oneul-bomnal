// X02 선물 폭포 — 뒷벽 투입구에서 선물 상자가 하나씩 굴러 나와 바닥에 튀고, 틀 끝 턱에서 크게 튀어 관객 쪽으로 날아온다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.22,"contrast":1.1,"bloom":0.07}
#define DT 1.8
#define SNOW 6
#define SNOWD 0.12
#define FLOOR_REFL 0.12
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.34, 0.32, 0.44))
#define AMB_BOT L(vec3(0.18, 0.13, 0.18))
#define CYE L(vec3(1.0, 0.78, 0.35))
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_BACKWALL
#define HAS_PREP
#define NG 5
const vec2 HC = vec2(0.0, 0.38); const vec2 HH = vec2(0.42, 0.30);
bool backHole(vec3 q){ return abs(q.x - HC.x) < HH.x && abs(q.y - HC.y) < HH.y; }
vec3 outside(vec3 rd, vec3 ro){ return L(vec3(1.0, 0.55, 0.25))*0.35; }
vec3 backWall(vec3 p){
  vec2 d = abs(p.xy - HC) - HH; float e = max(d.x, d.y);
  return L(vec3(1.0, 0.80, 0.35))*(smoothstep(0.02, 0.0, abs(e - 0.012))*2.4 + exp(-max(e, 0.0)*9.0)*0.25);
}
vec3 GP[NG]; mat3 GR[NG]; vec3 GB[NG];
void prep(){
  float g = 3.4;
  for(int i=0;i<NG;i++){
    float fi = float(i);
    vec3 b = vec3(0.17 + 0.07*h11(fi*3.3), 0.14 + 0.06*h11(fi*5.1), 0.16 + 0.06*h11(fi*7.7));
    if(i == 0) b = vec3(0.26, 0.22, 0.24);
    GB[i] = b;
    float rr = length(b)*0.85;
    float s = mod(uT - fi*3.0, T);
    float fy = -HO.y + b.y;
    float vz = 0.55 + 0.1*h11(fi + 4.0), vx = (h11(fi*2.7 + 1.0) - 0.5)*0.6;
    float z0 = DT - rr - 0.05;
    vec3 ax = normalize(vec3(h11(fi + 1.0) - 0.5, 0.3, h11(fi + 2.0) - 0.5) + vec3(1, 0, 0));
    float spin = 0.0;
    vec3 p;
    float y0 = HC.y - HH.y + b.y + 0.01;
    if(s < 0.6){ p = vec3(HC.x, mix(1.9, y0, (s/0.6)*(s/0.6)), DT + rr + 0.1); }
    else if(s < 1.1){ float k = (s - 0.6)/0.5; p = vec3(HC.x, y0, mix(DT + rr + 0.1, z0, k)); spin = k*0.3; }
    else {
      float t = s - 1.1, te = z0/vz, h0 = y0 - fy;
      spin = 0.3 + t*2.6;
      if(t < te){ vec2 yb = bounceY(h0, t, g, 0.55); p = vec3(HC.x + vx*t, fy + yb.x, z0 - vz*t); }
      else { vec2 e = bounceY(h0, te, g, 0.55); float u = t - te; float side = vx > 0.0 ? 1.0 : -1.0;
        p = vec3(HC.x + vx*te + side*(0.4 + abs(vx))*u, fy + e.x + 2.1*u - 0.5*g*u*u, -1.1*u); spin += u*3.0; }
    }
    GP[i] = p; GR[i] = rotA(ax, spin);
  }
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NG;i++){
    vec3 q = transpose(GR[i])*(p - GP[i]);
    float bd = length(q) - length(GB[i]) - 0.12;
    if(bd > 0.3){ d = min(d, bd); continue; }
    float part; d = min(d, sdGift(q, GB[i], part));
  }
  return d;
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9; float pk = 0.0; vec3 bq;
  for(int i=0;i<NG;i++){ vec3 q = transpose(GR[i])*(p - GP[i]); float part; float d = sdGift(q, GB[i], part); if(d < best){ best = d; k = i; pk = part; bq = q; } }
  vec3 box[5]; box[0] = XRED; box[1] = XGREEN; box[2] = vec3(0.85, 0.85, 0.90); box[3] = vec3(0.05, 0.10, 0.45); box[4] = XGOLD;
  vec3 rib[5]; rib[0] = XGOLD; rib[1] = vec3(0.85, 0.02, 0.05); rib[2] = XRED; rib[3] = XSILVER; rib[4] = XRED;
  if(pk > 0.5){ M m = mk(rib[k], 0.28, (k == 0 || k == 3) ? 1.0 : 0.0); m.bump = 0.12; m.bumpF = 140.0; m.coat = 0.4; return m; }   // 새틴 리본 결
  M m = mk(box[k], 0.45, k == 4 ? 1.0 : 0.0); m.bump = 0.10; m.bumpF = 70.0; m.coat = 0.5; if(k == 4) m.glit = 240.0;   // 포장지 결 + 코팅
  // 포장지 무늬: 작은 점
  vec3 g = fract(bq*14.0) - 0.5; float dot2 = smoothstep(0.22, 0.16, length(g.xy + g.yz*0.0));
  if(k != 4) m.alb = mix(m.alb, vec3(0.95), dot2*0.35);
  return m;
}
