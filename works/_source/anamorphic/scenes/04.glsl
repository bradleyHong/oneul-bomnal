// 04 봄(Spring) — 뒷벽에 붙은 사탕빛 용수철이 움츠렸다가 '보잉' 하고 관객 코앞까지 튀어나온다. 봄 = spring.
// @post {"exposure":1.0,"sat":1.22,"contrast":1.08}
#define DT 2.0
#define WALL L(vec3(0.99, 0.86, 0.80))
#define GRID 0.25
#define GRIDW 0.012
#define GRIDK 0.22
#define FRAMEC L(vec3(0.18, 0.13, 0.15))
#define AMB_TOP L(vec3(0.70, 0.62, 0.66))
#define AMB_BOT L(vec3(0.48, 0.36, 0.36))
#define LKD vec3(-0.50, 0.72, -0.48)
#define FLOOR_REFL 0.06
#define HAS_PREP
#define HAS_BACKWALL
const float N = 7.0, R = 0.40, RW = 0.075;
const vec3 ANCHOR = vec3(0.0, -0.08, DT);
float LC; mat2 SWX, SWY;

// 움츠림 → 튀어나옴 → 잦아듦, 7.5초에 한 번
float springLen(float t){
  float tau = mod(t, 7.5);
  float rest = 1.40, comp = 1.08;
  if(tau < 1.3) return mix(rest, comp, ease(tau/1.3));
  float u = tau - 1.3, w = TAU/1.45, e = exp(-0.95*u);
  return rest - (rest - comp)*cos(w*u)*e + 2.05*sin(w*u)*e;
}
void prep(){
  LC = springLen(uT);
  float sw = TAU*uT/T;
  SWY = rot(0.22*sin(sw) + 0.10*sin(2.0*sw));
  SWX = rot(0.12*sin(sw + 1.3));
}
vec3 springSpace(vec3 p){
  vec3 q = p - ANCHOR;
  q.xz = SWY*q.xz; q.yz = SWX*q.yz;
  return vec3(q.x, q.y, -q.z);              // z = 뒷벽에서 앞으로 잰 길이
}
float coil(vec3 q){
  float pitch = LC/N;
  float a = atan(q.y, q.x)/TAU;
  float zz = q.z - a*pitch;
  float zm = zz - pitch*floor(zz/pitch + 0.5);
  float d = length(vec2(length(q.xy) - R, zm)) - RW;
  return max(d*0.8, max(-q.z, q.z - LC));
}
float map(vec3 p){
  vec3 q = springSpace(p);
  float d = coil(q);
  d = min(d, length(q - vec3(0, 0, LC + 0.30)) - 0.32);                       // 머리 구슬
  d = smin(d, sdCap(q, vec3(0, 0, LC - 0.02), vec3(0, 0, LC + 0.05), R*0.55), 0.12);  // 머리 받침
  d = min(d, max(length(q.xy) - 0.62, abs(q.z - 0.02) - 0.04));                // 뒷벽 받침판
  return d;
}
M mat(vec3 p, vec3 n){
  vec3 q = springSpace(p);
  float head = length(q - vec3(0, 0, LC + 0.30)) - 0.32;
  if(head < 0.01){ M m = mk(L(vec3(0.83, 1.0, 0.23)), 0.12, 0.0); m.iri = 0.3; return m; }
  if(q.z < 0.07 && length(q.xy) > R*0.6){ return mk(L(vec3(0.97, 0.93, 0.92)), 0.18, 0.0); }  // 도자기 받침판
  // 용수철: 뒤 분홍 → 앞 산호, 사탕 코팅
  float k = clamp(q.z/max(LC, 0.01), 0.0, 1.0);
  M m = mk(mix(L(vec3(1.0, 0.16, 0.50)), L(vec3(1.0, 0.48, 0.30)), k), 0.10, 0.0);
  return m;
}
// 받침판 뒤 벽에 은은한 동그라미 무늬
vec3 backWall(vec3 p){
  float r = length(p.xy - ANCHOR.xy);
  return L(vec3(1.0, 0.55, 0.55))*0.06*smoothstep(0.02, 0.0, abs(fract(r*2.2 - uT/T*4.0) - 0.5) - 0.46)*exp(-r*0.6);
}
