// 08 우주의 문 — 어두운 방 뒷벽에 아치 문이 열려 있고, 문 너머 우주에서 행성들이 방으로 굴러 들어와 틀 밖 관객 쪽으로 지나간다.
// @post {"exposure":1.05,"sat":1.25,"contrast":1.1,"bloom":0.08}
#define DT 1.9
#define WALL L(vec3(0.22, 0.20, 0.42))
#define GRID 0.30
#define GRIDW 0.009
#define GRIDK 0.25
#define GRIDC L(vec3(0.45, 0.85, 1.0))*0.10
#define FRAMEC L(vec3(0.06, 0.06, 0.10))
#define AMB_TOP L(vec3(0.30, 0.30, 0.55))
#define AMB_BOT L(vec3(0.20, 0.14, 0.30))
#define BACKC L(vec3(0.85, 0.45, 1.0))*0.9
#define KEYC vec3(2.2, 2.05, 2.0)
#define LKD vec3(-0.40, 0.75, -0.52)
#define FLOOR_REFL 0.14
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_BACKWALL
#define HAS_PREP
#define MAXD 40.0
#define NPL 3
const float DW = 0.52, DH = 1.05;     // 문 반폭, 기둥 높이

float doorD(vec2 q){                  // 아치 문 모양 거리 (안쪽 음수)
  vec2 b = vec2(q.x, q.y + HO.y);
  float rect = max(abs(b.x) - DW, max(-b.y, b.y - DH));
  float arch = length(b - vec2(0.0, DH)) - DW;
  return min(rect, arch);
}
bool backHole(vec3 q){ return doorD(q.xy) < 0.0; }
vec3 backWall(vec3 p){
  float d = doorD(p.xy);
  return L(vec3(0.83, 1.0, 0.23))*(smoothstep(0.022, 0.0, abs(d - 0.012))*2.2) + BACKC*0.25*exp(-max(d, 0.0)*5.0);
}
vec3 outside(vec3 rd, vec3 ro){
  // 우주: 분홍·보라·하늘빛 성운 + 별
  vec2 uv = rd.xy/max(rd.z, 0.05);
  float n = fbm(uv*1.4 + vec2(2.0, 5.0) + 0.15*vec2(cos(TAU*uT/T), sin(TAU*uT/T)));
  float n2 = fbm(uv*3.0 - 4.0);
  vec3 c = L(vec3(0.02, 0.02, 0.08));
  c += L(vec3(0.95, 0.25, 0.75))*smoothstep(0.45, 0.85, n)*0.9;
  c += L(vec3(0.25, 0.55, 1.0))*smoothstep(0.5, 0.9, n2)*0.7;
  c += L(vec3(0.83, 1.0, 0.23))*pow(smoothstep(0.62, 0.95, n*n2*1.6), 2.0)*0.6;
  vec2 g = uv*90.0; vec2 cell = floor(g); float r = h21(cell);
  vec2 f = fract(g) - 0.5;
  float tw = 0.6 + 0.4*sin(TAU*(uT/T*floor(1.0 + r*4.0) + r*9.0));
  c += step(0.90, r)*exp(-dot(f, f)*25.0)*tw*vec3(1.0, 0.95, 1.2)*2.5;
  return c;
}

vec3 PC[NPL]; float PR[NPL]; mat3 PM[NPL];
void prep(){
  for(int i=0;i<NPL;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/3.0);
    PR[i] = (i == 0 ? 0.34 : (i == 1 ? 0.22 : 0.28))*smoothstep(0.0, 0.06, u);   // 먼 우주에서 서서히 나타난다
    vec3 far = vec3((fi - 1.0)*2.2, 0.9 - fi*0.5, 12.0);
    vec3 door = vec3(0.0, -HO.y + DH*0.75, DT);
    vec3 ex = i == 0 ? vec3(-1.25*A/2.0, 0.55, -1.7) : (i == 1 ? vec3(1.35*A/2.0, 0.65, -1.5) : vec3(0.95*A/2.0, -0.70, -1.6));
    vec3 p;
    if(u < 0.55) p = mix(far, door, pow(u/0.55, 1.4));
    else { float k = (u - 0.55)/0.45; p = mix(door, ex, k*k*(1.6 - 0.6*k)); p.y += 0.25*sin(3.14159*k); }
    PC[i] = p;
    float sp = TAU*uT/T*(i == 1 ? 2.0 : 1.0);
    float c = cos(sp), s = sin(sp);
    mat3 spin = mat3(c,0,-s, 0,1,0, s,0,c);
    float tl = i == 2 ? 1.2 : 0.35;
    mat3 tilt = mat3(1,0,0, 0,cos(tl),sin(tl), 0,-sin(tl),cos(tl));
    PM[i] = tilt*spin;
  }
}
float ringD(vec3 q){ return max(abs(q.y) - 0.006, abs(length(q.xz) - 0.48) - 0.11); }
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NPL;i++){
    vec3 q = p - PC[i];
    d = min(d, length(q) - PR[i]);
    if(i == 2){ vec3 lq = transpose(PM[i])*q/max(PR[i]/0.28, 0.01); d = min(d, ringD(lq)*0.9*max(PR[i]/0.28, 0.01)); }
  }
  return d;
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9;
  for(int i=0;i<NPL;i++){ float d = length(p - PC[i]) - PR[i]; if(d < best){ best = d; k = i; } }
  vec3 lq = transpose(PM[k])*(p - PC[k]);
  if(k == 2 && abs(length(lq.xz) - 0.48) < 0.115 && abs(lq.y) < 0.02 && best > 0.002){
    float rr = length(lq.xz);
    vec3 c = mix(L(vec3(0.95, 0.80, 1.0)), L(vec3(1.0, 0.75, 0.35)), 0.5 + 0.5*sin(rr*90.0));
    M m = mk(c, 0.5, 0.0); m.emit = c*0.25; return m;
  }
  vec3 dir = normalize(lq);
  float lat = dir.y, lon = atan(dir.z, dir.x);
  float b = fbm(vec2(lat*7.0 + 0.35*fbm(vec2(lon*2.0, lat*9.0)), float(k)*3.0));
  vec3 c;
  if(k == 0) c = mix(L(vec3(1.0, 0.30, 0.55)), L(vec3(1.0, 0.72, 0.45)), smoothstep(0.35, 0.65, b));
  else if(k == 1) c = mix(L(vec3(0.10, 0.75, 0.70)), L(vec3(0.83, 1.0, 0.23)), smoothstep(0.35, 0.65, b));
  else c = mix(L(vec3(0.45, 0.35, 1.0)), L(vec3(0.85, 0.80, 1.0)), smoothstep(0.35, 0.65, b));
  M m = mk(c, 0.55, 0.0);
  m.emit = c*0.10 + c*0.5*pow(1.0 - max(dot(n, -VRD), 0.0), 3.0);   // 대기 테두리 빛
  return m;
}
