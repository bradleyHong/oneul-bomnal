// V06 종이학 — 높은 벽돌 굴뚝 아래 아치 너머에서 종이학 떼가 날아 들어와 날개를 살랑이며 나선을 그리며 오른다. 위에 다다른 학은 하나씩 무리를 벗어나 틀을 넘어 관객 쪽으로 커다랗게 날아오고, 머리 위로 날아오른다. 위에서 부드러운 낮빛이 내린다.
// @post {"exposure":1.0,"sat":1.10,"contrast":1.06,"bloom":0.06}
#define WALLSTYLE 2
#define PBR2
#define DT 2.2
#define HAS_PREP
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_BACKWALL
#define BRICK1 L(vec3(0.74, 0.56, 0.45))
#define BRICK2 L(vec3(0.86, 0.72, 0.60))
#define MORTAR L(vec3(0.88, 0.85, 0.79))
#define BRICK_AGE 0.25
#define BFLOOR 1
#define LKD vec3(-0.06, 0.78, -0.62)
#define KEYC vec3(2.55, 2.55, 2.45)
#define AMB_TOP L(vec3(0.62, 0.66, 0.72))
#define AMB_BOT L(vec3(0.40, 0.36, 0.32))
#define BACKC L(vec3(0.95, 0.95, 0.90))*0.35
#define RIMD vec3(0.20, 0.85, 0.50)
#define RIMC L(vec3(1.0, 0.98, 0.94))*0.35
#define FRAMEC L(vec3(0.16, 0.15, 0.14))
#define ROOM L(vec3(0.42, 0.40, 0.37))
#define MAXD 14.0
#define NC 10

// ── 뒷벽 아래 아치: 학이 들어오는 문 ──
const float AWD = 0.22, ATOP = -0.36;
float archD(vec2 q){
  float side = abs(q.x) - AWD;
  float top = length(vec2(q.x, max(q.y - (ATOP - AWD), 0.0))) - AWD;
  return q.y < ATOP - AWD ? side : top;
}
bool backHole(vec3 q){ return archD(q.xy) < 0.0; }
vec3 backWall(vec3 p){
  float e = archD(p.xy);
  return L(vec3(1.0, 0.96, 0.86))*0.12*exp(-max(e, 0.0)*7.0);
}
// 아치 너머: 아지랑이 낀 밝은 봄 낮 (풀밭 · 흐린 하늘)
vec3 outside(vec3 rd, vec3 ro){
  float e = rd.y + 0.20;
  vec3 sky = mix(L(vec3(0.97, 0.95, 0.90)), L(vec3(0.70, 0.80, 0.93)), smoothstep(0.0, 0.5, e));
  vec3 grd = mix(L(vec3(0.72, 0.78, 0.60)), L(vec3(0.50, 0.60, 0.40)), smoothstep(0.0, -0.4, e));
  vec3 c = e > 0.0 ? sky : grd;
  c = mix(c, L(vec3(0.95, 0.94, 0.88)), exp(-abs(e)*14.0)*0.7);                  // 지평선 아지랑이
  return c*0.95;
}

// ── 종이학 하나 (자기 좌표: x 오른쪽 · y 위 · z 앞, 날개 끝 ±0.86) ──
float dot2(vec3 v){ return dot(v, v); }
float udTri(vec3 p, vec3 a, vec3 b, vec3 c){
  vec3 ba = b - a, pa = p - a, cb = c - b, pb = p - b, ac = a - c, pc = p - c;
  vec3 nor = cross(ba, ac);
  return sqrt((sign(dot(cross(ba, nor), pa)) + sign(dot(cross(cb, nor), pb)) + sign(dot(cross(ac, nor), pc)) < 2.0)
    ? min(min(dot2(ba*clamp(dot(ba, pa)/dot2(ba), 0.0, 1.0) - pa), dot2(cb*clamp(dot(cb, pb)/dot2(cb), 0.0, 1.0) - pb)), dot2(ac*clamp(dot(ac, pc)/dot2(ac), 0.0, 1.0) - pc))
    : dot(nor, pa)*dot(nor, pa)/dot2(nor));
}
const float TH = 0.022;          // 종이 두께 (반)
vec2 rot2(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }
// part: 0 몸 · 1 목·꼬리·머리 · 2 날개 안쪽 면 · 3 날개 바깥 면
float crane(vec3 q, float fl, out float part){
  vec3 m = vec3(abs(q.x), q.yz);
  // 몸: 앞뒤로 뾰족한 용골 (양옆 면)
  float body = udTri(m, vec3(0.0, 0.02, 0.30), vec3(0.0, 0.02, -0.30), vec3(0.085, -0.20, 0.0));
  // 목 · 꼬리: 아래가 벌어진 접힌 띠, 위로 뾰족
  float neck = udTri(m, vec3(0.028, -0.15, 0.07), vec3(0.0, 0.0, 0.25), vec3(0.0, 0.43, 0.60));
  float tail = udTri(m, vec3(0.028, -0.15, -0.07), vec3(0.0, 0.0, -0.25), vec3(0.0, 0.41, -0.66));
  // 머리: 목 끝에서 앞으로 꺾인 작은 삼각
  float head = udTri(m, vec3(0.0, 0.43, 0.60), vec3(0.018, 0.36, 0.57), vec3(0.0, 0.33, 0.77));
  // 날개: 몸 등줄에서 끝까지, 가운데 접힌 금으로 두 면
  vec3 r1 = vec3(0.0, 0.02, 0.24), r2 = vec3(0.0, 0.02, -0.25);
  vec3 wc = vec3(0.10, 0.07, -0.02); wc.xy = rot2(wc.xy, fl);
  vec3 wt = vec3(0.84, 0.10, -0.30); wt.xy = rot2(wt.xy, fl);
  float w1 = udTri(m, r1, wc, wt);
  float w2 = udTri(m, wc, r2, wt);
  float d = min(min(body, min(neck, tail)), min(head, min(w1, w2))) - TH;
  part = 0.0;
  float dn = min(min(neck, tail), head);
  if(dn < body) part = 1.0;
  if(min(w1, w2) < min(body, dn)) part = w1 < w2 ? 2.0 : 3.0;
  return d;
}

// ── 날아가는 길: 아치 너머 → 나선 두 바퀴 → 틀 밖 관객 쪽 → 머리 위로 ──
const float ZCN = 1.15, RX = 0.13, RZ = 0.55, Y0 = -0.62, Y1 = 0.50;
const float U1 = 0.18, U2 = 0.76, U3 = 0.89;
vec3 herm(vec3 p0, vec3 m0, vec3 p1, vec3 m1, float t){
  float t2 = t*t, t3 = t2*t;
  return (2.0*t3 - 3.0*t2 + 1.0)*p0 + (t3 - 2.0*t2 + t)*m0 + (-2.0*t3 + 3.0*t2)*p1 + (t3 - t2)*m1;
}
vec3 spiral(float s){
  float th = 1.5707963 + TAU*2.0*s;
  return vec3(RX*sin(th), mix(Y0, Y1, s), ZCN + RZ*cos(th));
}
vec3 pathAt(float u){
  vec3 sv = vec3(0.0, Y1 - Y0, -RZ*TAU*2.0)/(U2 - U1);           // 나선 속도 (u 당), 시작·끝에서 같다
  if(u < U1){
    float t = u/U1;
    return herm(vec3(0.0, -0.55, 6.5), vec3(0.0, 0.0, -3.0), spiral(0.0), sv*U1, t);
  }
  if(u < U2) return spiral((u - U1)/(U2 - U1));
  vec3 pm = vec3(0.03, 0.42, -0.85), mm = vec3(0.0, 0.35, -1.4);
  if(u < U3) return herm(spiral(1.0), sv*(U3 - U2), pm, mm, (u - U2)/(U3 - U2));
  return herm(pm, mm*(1.0 - U3)/(U3 - U2), vec3(1.5, 2.6, -1.3), vec3(1.6, 2.2, 0.0), (u - U3)/(1.0 - U3));
}

vec3 CP[NC]; mat3 CB[NC]; float CS[NC]; float CF[NC];
void prep(){
  for(int i=0;i<NC;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/float(NC));
    vec3 p = pathAt(u);
    vec3 tg = pathAt(min(u + 0.003, 0.9999)) - pathAt(max(u - 0.003, 0.0));
    vec3 f = normalize(tg + vec3(0.0, 0.0, -1e-4));
    // 나선 도는 동안 안쪽으로 기운다
    float sw = smoothstep(U1 - 0.05, U1 + 0.04, u)*(1.0 - smoothstep(U2 - 0.02, U2 + 0.08, u));
    vec3 inw = vec3(-p.x, 0.0, ZCN - p.z);
    vec3 up = normalize(vec3(0.0, 1.0, 0.0) + inw*1.6*sw);
    vec3 r = normalize(cross(up, f));
    up = cross(f, r);
    CB[i] = mat3(r, up, f);
    CP[i] = p;
    CS[i] = (0.165 + 0.02*h11(fi*3.7))*smoothstep(0.0, 0.05, u);
    CF[i] = 0.38 + 0.34*sin(TAU*(uT/T*8.0 + fi*0.37));
  }
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NC;i++){
    if(CS[i] < 0.004) continue;
    vec3 w = p - CP[i];
    float bd = length(w) - CS[i]*0.95;
    if(bd > 0.3){ d = min(d, bd); continue; }
    float part;
    d = min(d, crane(transpose(CB[i])*w/CS[i], CF[i], part)*CS[i]);
  }
  return d;
}
M mat(vec3 p, vec3 n){
  float best = 1e9, bp = 0.0, bi = 0.0; vec3 bup = vec3(0, 1, 0);
  for(int i=0;i<NC;i++){
    if(CS[i] < 0.004) continue;
    vec3 w = p - CP[i];
    if(length(w) - CS[i]*0.95 > 0.05) continue;
    float part; float d = crane(transpose(CB[i])*w/CS[i], CF[i], part)*CS[i];
    if(d < best){ best = d; bp = part; bi = float(i); bup = CB[i][1]; }
  }
  // 종이 색: 대부분 흰 종이, 몇 마리는 연분홍 · 하늘 · 연노랑 · 연두 (뒷면은 흰색)
  float h = h11(bi*7.13 + 2.0);
  vec3 col = L(vec3(0.95, 0.94, 0.91));
  if(h > 0.50) col = L(vec3(0.96, 0.74, 0.76));
  if(h > 0.64) col = L(vec3(0.70, 0.82, 0.95));
  if(h > 0.78) col = L(vec3(0.97, 0.88, 0.62));
  if(h > 0.90) col = L(vec3(0.72, 0.88, 0.74));
  if(bp > 1.5 && dot(n, bup) < -0.2) col = L(vec3(0.95, 0.94, 0.91));
  M m = mk(col, 0.62, 0.0);
  m.sss = 0.35; m.wrap = 0.25;                                   // 빛이 종이에 스민다
  m.bump = 0.02; m.bumpF = 220.0;                                 // 종이 결
  return m;
}
