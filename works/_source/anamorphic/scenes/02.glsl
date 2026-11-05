// 02 무지개 구슬 — 뒷벽 구멍에서 구슬이 하나씩 굴러 나와 바닥에 튀고, 틀 끝에서 관객 앞으로 떨어진다.
// @post {"exposure":1.0,"sat":1.22,"contrast":1.08}
#define DT 1.7
#define WALL L(vec3(0.95, 0.86, 0.96))
#define GRID 0.22
#define GRIDW 0.012
#define GRIDK 0.35
#define FRAMEC L(vec3(0.16, 0.15, 0.20))
#define AMB_TOP L(vec3(0.62, 0.52, 0.78))
#define AMB_BOT L(vec3(0.42, 0.30, 0.42))
#define FLOOR_REFL 0.08
#define HAS_HOLE
#define HAS_OUTSIDE
#define HAS_PREP
#define HAS_BACKWALL
#define NB 5

const vec2 HOLE = vec2(0.0, 0.42);
const float HR = 0.30;
bool backHole(vec3 q){ return length(q.xy - HOLE) < HR; }
// 구멍 안: 어두운 관, 깊은 곳은 라임 빛
vec3 outside(vec3 rd, vec3 ro){ return L(vec3(0.83, 1.0, 0.23))*0.25; }
vec3 backWall(vec3 p){
  float d = length(p.xy - HOLE) - HR;
  return L(vec3(0.83, 1.0, 0.23))*(smoothstep(0.03, 0.0, abs(d - 0.012))*2.5 + 0.35*exp(-max(d, 0.0)*10.0));
}

vec3 BP[NB]; float BR[NB];
const float G = 3.4, E = 0.64;

// 바닥 높이 h0 에서 떨어뜨린 공의 s초 뒤 높이·속도 (반발 E)
vec2 bounce(float h0, float s){
  float t1 = sqrt(2.0*h0/G);
  if(s < t1) return vec2(h0 - 0.5*G*s*s, -G*s);
  s -= t1; float v = G*t1*E;
  for(int k=0;k<10;k++){
    float d = 2.0*v/G;
    if(s < d) return vec2(v*s - 0.5*G*s*s, v - G*s);
    s -= d; v *= E;
  }
  return vec2(0.0);
}

void prep(){
  for(int i=0;i<NB;i++){
    float fi = float(i);
    float r = 0.15 + 0.11*h11(fi*7.3 + 1.0);
    if(i == 0) r = 0.30;
    BR[i] = r;
    float s = mod(uT - fi*3.0, T);            // 3초마다 하나
    float floorY = -HO.y + r;
    float vz = 0.50 + 0.12*h11(fi + 3.0);
    float vx = (h11(fi*3.1 + 9.0) - 0.5)*0.55;
    float z0 = DT - r - 0.02;
    vec3 p;
    float yb0 = HOLE.y - HR + r + 0.02, zb = DT + r + 0.12;
    if(s < 0.55){                               // 벽 뒤 세로 관으로 떨어져
      float k = s/0.55;
      p = vec3(HOLE.x, mix(1.9, yb0, k*k), zb);
    } else if(s < 1.0){                         // 구멍에서 굴러 나온다
      float k = (s - 0.55)/0.45;
      p = vec3(HOLE.x, yb0, mix(zb, DT - r - 0.02, k*(2.0 - k)*0.5 + k*0.5));
    } else {
      float t = s - 1.0;
      float h0 = HOLE.y - HR + r + 0.02 - floorY;
      float te = z0/vz;                         // 틀 끝(z=0)에 닿는 때
      if(t < te){
        vec2 yb = bounce(h0, t);
        p = vec3(HOLE.x + vx*t, floorY + yb.x, z0 - vz*t);
      } else {
        // 틀 끝 턱에 마지막으로 크게 튀어 관객 쪽으로 날아온다
        vec2 e = bounce(h0, te); float u = t - te;
        float vl = 2.05 + 0.25*h11(fi + 5.0);
        float side = vx > 0.0 ? 1.0 : -1.0;
        p = vec3(HOLE.x + vx*te + side*(0.35 + abs(vx))*u, floorY + e.x + vl*u - 0.5*G*u*u, -1.05*u);
      }
    }
    BP[i] = p;
  }
}

float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NB;i++) d = min(d, length(p - BP[i]) - BR[i]);
  return d;
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9;
  for(int i=0;i<NB;i++){ float d = length(p - BP[i]) - BR[i]; if(d < best){ best = d; k = i; } }
  M m = mk(vec3(1), 0.2, 0.0);
  vec3 lp = p - BP[k];
  if(k == 0){ m = mk(L(vec3(0.78, 0.80, 0.90)), 0.06, 0.0); m.iri = 0.15; }       // 진주 무지개
  else if(k == 1){ m = mk(L(vec3(1.0, 0.18, 0.52)), 0.18, 0.0); }                 // 사탕 분홍
  else if(k == 2){ m = mk(L(vec3(0.83, 1.0, 0.23)), 0.25, 0.0); }                 // 라임
  else if(k == 3){ m = mk(L(vec3(0.95, 0.93, 1.0)), 0.04, 1.0); }                 // 거울 구슬
  else { m = mk(L(vec3(0.16, 0.30, 1.0)), 0.15, 0.0);                            // 코발트에 흰 띠
    float band = smoothstep(0.02, 0.0, abs(normalize(lp).y) - 0.10);
    m.alb = mix(m.alb, L(vec3(0.98)), band); }
  return m;
}
