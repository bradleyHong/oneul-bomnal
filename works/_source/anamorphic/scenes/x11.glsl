// X11 리스 터널 — 겨울밤 하늘에서 솔잎 리스가 하나씩 날아와 점점 커지고, 관객이 그 고리 속을 지나가는 듯 틀 밖으로 빠져나간다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.25,"contrast":1.1,"bloom":0.08}
#define DT 1.5
#define BACK_OPEN 1
#define HAS_OUTSIDE
#define SNOW 6
#define SNOWD 0.13
#define FLOOR_REFL 0.14
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.34, 0.36, 0.46))
#define AMB_BOT L(vec3(0.14, 0.14, 0.16))
#define BACKC L(vec3(0.5, 0.7, 1.0))*0.4
#define CYE L(vec3(0.35, 1.0, 0.55))
#define HAS_PREP
#define NW 4
vec3 outside(vec3 rd, vec3 ro){
  float e = rd.y;
  vec3 c = mix(L(vec3(0.12, 0.18, 0.40)), L(vec3(0.01, 0.02, 0.08)), smoothstep(-0.1, 0.5, e));
  if(e < 0.0) c = mix(L(vec3(0.50, 0.58, 0.78)), L(vec3(0.15, 0.20, 0.38)), smoothstep(0.0, -0.3, e));
  vec2 g = rd.xy/max(rd.z, 0.1)*70.0; float r = h21(floor(g));
  c += step(0.93, r)*smoothstep(0.3, 0.0, length(fract(g) - 0.5))*1.6*step(0.0, e);
  return c;
}
vec3 WP[NW]; mat3 WR[NW]; float WS[NW];
void prep(){
  for(int i=0;i<NW;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/float(NW));
    float z = mix(11.0, -3.3, u*u*(1.4 - 0.4*u));
    WP[i] = vec3(0.25*sin(fi*2.1 + TAU*u), 0.05 + 0.15*cos(fi*1.3 + TAU*u), z);
    WS[i] = smoothstep(0.0, 0.06, u);
    WR[i] = rotA(vec3(0, 0, 1), TAU*uT/T*(mod(fi, 2.0) < 0.5 ? 0.5 : -0.5) + fi)*rotA(vec3(1, 0, 0), 0.25*sin(TAU*u + fi));
  }
}
float wreathAt(int i, vec3 p, out float part){
  vec3 q = transpose(WR[i])*(p - WP[i]);
  float R = 0.58*WS[i], r = 0.13*WS[i];
  if(WS[i] < 0.01){ part = 0.0; return 1e9; }
  float w = sdWreath(q, R, r);
  // 아래쪽 금빛 리본 나비
  vec3 bq = q - vec3(0, -R, -r*0.9);
  float bow = min(sdTorus((bq - vec3(-0.10*WS[i], 0, 0)).yxz*vec3(1, 1, 1.8), vec2(0.09*WS[i], 0.03*WS[i])), sdTorus((bq - vec3(0.10*WS[i], 0, 0)).yxz*vec3(1, 1, 1.8), vec2(0.09*WS[i], 0.03*WS[i])))/1.8;
  bow = min(bow, length(bq) - 0.04*WS[i]);
  // 빨간 열매 몇 송이
  float be = 1e9;
  for(int j=0;j<6;j++){ float a = float(j)*1.047 + 0.5; vec3 bp = vec3(cos(a)*R, sin(a)*R, -r*0.85); be = min(be, length(q - bp) - 0.04*WS[i]); }
  float d = min(w, min(bow, be));
  part = d == w ? 0.0 : (d == bow ? 1.0 : 2.0);
  return d;
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NW;i++){ float part; d = min(d, wreathAt(i, p, part)); }
  return d;
}
M mat(vec3 p, vec3 n){
  float best = 1e9, pk = 0.0; int k = 0;
  for(int i=0;i<NW;i++){ float part; float d = wreathAt(i, p, part); if(d < best){ best = d; pk = part; k = i; } }
  if(pk > 1.5){ M m = mk(XRED, 0.25, 0.0); m.coat = 1.0; return m; }
  if(pk > 0.5){ M m = mk(XGOLD, 0.28, 1.0); m.glit = 300.0; return m; }
  vec3 q = transpose(WR[k])*(p - WP[k]);
  M m = mk(mix(vec3(0.0, 0.16, 0.05), vec3(0.04, 0.32, 0.10), vnoise3(q*30.0)), 0.7, 0.0);
  m.bump = 1.0; m.bumpF = 48.0;   // 솔잎 결
  m.emit = twinkle(q, 0.09, float(k)*3.0)*0.8;
  return m;
}
