// V05 큰 진자 — 높은 벽돌 굴뚝 천장에 매달린 커다란 놋쇠 진자가 깊이 쪽으로 느리고 묵직하게 흔들린다. 앞으로 올 때는 틀을 넘어 관객 코앞까지 커지고, 다시 굴뚝 깊숙이 물러나며 긴 그림자가 벽돌 위를 쓸고 지나간다.
// @post {"exposure":1.0,"sat":1.08,"contrast":1.12,"bloom":0.07}
#define WALLSTYLE 2
#define PBR2
#define DT 2.2
#define HAS_PREP
#define HAS_WALLLIGHT
#define BRICK1 L(vec3(0.46, 0.22, 0.16))
#define BRICK2 L(vec3(0.62, 0.36, 0.25))
#define MORTAR L(vec3(0.52, 0.48, 0.43))
#define BRICK_AGE 0.6
#define BFLOOR 1
#define FLOOR_REFL 0.0
#define LKD vec3(-0.07, 0.40, -0.91)
#define KEYC vec3(3.3, 2.55, 1.70)
#define AMB_TOP L(vec3(0.34, 0.36, 0.44))
#define AMB_BOT L(vec3(0.24, 0.18, 0.15))
#define RIMD vec3(0.45, 0.55, 0.70)
#define RIMC L(vec3(0.70, 0.78, 0.95))*0.45
#define FRAMEC L(vec3(0.09, 0.08, 0.07))
#define ROOM L(vec3(0.20, 0.15, 0.10))

const float PER = 7.5;          // 한 번 오가는 시간: 15초에 정확히 두 번
const float AMP = 1.1;          // 흔들림 각 (라디안)
const float LR = 1.41;          // 축에서 추 중심까지
const float R = 0.21;           // 추 반지름
vec3 PIV;                       // 축
vec3 BOB;                       // 추 중심
float TH;                       // 지금 각
mat3 BR;                        // 추를 돌리는 행렬 (x 축 둘레)

// 굴뚝 위쪽에서 내려오는 은은한 등잔빛: 위 벽돌이 따뜻하게 물들어 놋쇠에 비친다
vec3 wallLight(vec3 p, vec3 n){
  vec3 lp = vec3(0.0, HO.y - 0.02, 0.9);
  vec3 d = lp - p; float r2 = dot(d, d);
  return L(vec3(1.0, 0.70, 0.40))*(0.10 + 0.9*max(dot(n, d*inversesqrt(r2)), 0.0))*0.55/(0.35 + r2*2.2);
}
void prep(){
  PIV = vec3(0.0, HO.y - 0.065, 0.25);
  TH = AMP*sin(TAU*uT/PER);
  vec3 dir = vec3(0.0, -cos(TH), -sin(TH));
  BOB = PIV + dir*LR;
  float c = cos(TH), s = sin(TH);
  BR = mat3(1.0, 0.0, 0.0,  0.0, c, s,  0.0, -s, c);          // 추 좌표 → 세계 (아래가 -y)
}

// 추: 둥근 몸 · 아래 뾰족한 끝 · 위 목깃 · 허리 홈 두 줄
float bobD(vec3 q, out float part){
  float r = length(q.xz);
  float body = length(q) - R;
  // 아래 끝: 몸에 부드럽게 붙는 뾰족한 원뿔
  float cone = max(dot(vec2(r, q.y + R + 0.08), normalize(vec2(1.0, -0.52))), q.y + 0.02);
  float d = smin(body, cone, 0.05);
  d = max(d, -(R + 0.08) - q.y);
  // 허리 홈
  float g = abs(q.y) - 0.006;
  d = max(d, -(max(g, R - 0.006 - length(q))));
  // 위 목깃 (추와 막대를 잇는 원기둥)
  float col = max(r - 0.045, abs(q.y - R - 0.01) - 0.035);
  col = min(col, max(r - 0.060, abs(q.y - R + 0.015) - 0.012) - 0.004);
  part = col < d ? 1.0 : 0.0;
  return min(d, col);
}
float pivD(vec3 p){
  // 천장 받침: 놋쇠 판 · 두 귀 · 가로 축
  vec3 q = p - vec3(0.0, HO.y, PIV.z);
  float plate = sdRBox(q - vec3(0.0, -0.012, 0.0), vec3(0.10, 0.012, 0.09), 0.006);
  vec3 e = q - vec3(0.0, -0.045, 0.0); e.x = abs(e.x) - 0.045;
  float ear = sdRBox(e, vec3(0.012, 0.035, 0.035), 0.008);
  float axle = max(length(q.yz - vec2(-0.065, 0.0)) - 0.016, abs(q.x) - 0.07);
  return min(plate, min(ear, axle));
}
float rodD(vec3 p){
  return sdCap(p, PIV, BOB + (PIV - BOB)*(R/LR), 0.011);
}
float map(vec3 p){
  float d = rodD(p);
  d = min(d, pivD(p));
  vec3 q = transpose(BR)*(p - BOB);
  float bd = length(q) - 0.42;
  if(bd > 0.3) return min(d, bd);
  float part; d = min(d, bobD(q, part));
  return d;
}
M mat(vec3 p, vec3 n){
  vec3 q = transpose(BR)*(p - BOB);
  float part; float db = bobD(q, part);
  float dr = rodD(p), dp = pivD(p);
  M m;
  if(db < dr && db < dp){
    // 잘 닦은 놋쇠: 맑은 반사, 아주 옅은 손 닦은 결
    m = mk(vec3(1.0, 0.76, 0.40), 0.20, 1.0);
    m.bump = 0.006; m.bumpF = 60.0;
    if(part > 0.5){ m.alb = vec3(0.80, 0.60, 0.32); m.rough = 0.22; }
    // 허리 홈 안은 조금 어둡다
    if(abs(q.y) < 0.012 && length(q) > R - 0.02) m.alb *= 0.6;
  } else if(dr < dp){
    m = mk(vec3(0.78, 0.60, 0.36), 0.28, 1.0);                 // 묵은 놋쇠 막대
  } else {
    m = mk(vec3(0.62, 0.46, 0.26), 0.35, 1.0);                 // 어둑한 받침
  }
  return m;
}
