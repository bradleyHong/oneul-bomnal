// 03 빛기둥의 숲 — 뒷벽 전체가 핀 아트. 네모 기둥 수백 개가 물결치며 밀려 나오고, 가운데가 부풀어 틀 밖 관객 코앞까지 솟는다.
// @post {"exposure":1.0,"sat":1.25,"contrast":1.1,"bloom":0.07}
#define DT 2.2
#define WALL L(vec3(0.20, 0.17, 0.32))
#define GRID 0.30
#define GRIDW 0.010
#define GRIDK 0.0
#define GRIDC L(vec3(0.83, 1.0, 0.23))*0.07
#define LKD vec3(-0.85, 0.42, -0.32)
#define KEYC vec3(3.0, 2.8, 2.6)
#define FRAMEC L(vec3(0.10, 0.09, 0.14))
#define AMB_TOP L(vec3(0.40, 0.38, 0.62))
#define AMB_BOT L(vec3(0.20, 0.14, 0.26))
#define FLOOR_REFL 0.0
#define STEPS 200
const float C = 0.155;      // 기둥 간격
const float RW = 0.056;     // 기둥 반폭

// 기둥 길이 (뒷벽에서 앞으로). 모든 움직임은 15초 주기의 정수배
float rodLen(vec2 id){
  vec2 c = (id + 0.5)*C;
  float r = length(c*vec2(0.85, 1.0));
  float ph = TAU*uT/T;
  float ring = 0.5 + 0.5*sin(5.5*r - ph*3.0);                                  // 가운데서 퍼지는 고리
  float swell = 0.5 + 0.5*sin(dot(c, vec2(1.3, 0.8)) + ph*2.0);                  // 비스듬히 지나는 큰 너울
  float pulse = pow(0.5 - 0.5*cos(ph), 3.0);                                     // 한 번 크게 부푸는 때 (7.5초)
  float dome = exp(-r*r*0.55)*pulse;
  return 0.12 + 0.30*ring*(1.0 - 0.6*pulse) + 0.25*swell + 2.55*dome;
}
float rod(vec3 p, vec2 id){
  if(abs((id.x + 0.5)*C) > HO.x - C*0.5 || abs((id.y + 0.5)*C) > HO.y - C*0.5) return 1e9;
  float len = rodLen(id);
  vec3 c = vec3((id + 0.5)*C, DT - len*0.5);
  return sdRBox(p - c, vec3(RW, RW, len*0.5), 0.012);
}
float map(vec3 p){
  if(p.z > DT + 0.01) return p.z - DT;
  vec2 id = floor(p.xy/C);
  float d = rod(p, id);
  d = min(d, rod(p, id + vec2(1, 0)));
  d = min(d, rod(p, id - vec2(1, 0)));
  d = min(d, rod(p, id + vec2(0, 1)));
  d = min(d, rod(p, id - vec2(0, 1)));
  // 이웃 칸 경계를 넘지 않게 걸음을 묶는다
  vec2 f = fract(p.xy/C)*C;
  float cell = min(min(f.x, C - f.x), min(f.y, C - f.y)) + RW*0.3;
  return min(d, max(cell, 0.02));
}
M mat(vec3 p, vec3 n){
  vec2 id = floor(p.xy/C);
  float len = rodLen(id);
  float tipZ = DT - len;
  M m = mk(L(vec3(0.92, 0.90, 0.96)), 0.22, 0.0);
  float k = clamp(len/2.6, 0.0, 1.0);
  // 길이에 따라 끝 색: 분홍 → 산호 → 라임 → 하늘
  vec3 a = L(vec3(1.0, 0.22, 0.58)), b = L(vec3(1.0, 0.55, 0.30)), c = L(vec3(0.83, 1.0, 0.23)), d = L(vec3(0.30, 0.85, 1.0));
  vec3 tc = k < 0.33 ? mix(a, b, k/0.33) : (k < 0.66 ? mix(b, c, (k - 0.33)/0.33) : mix(c, d, (k - 0.66)/0.34));
  if(n.z < -0.6 && p.z < tipZ + 0.02){
    m.alb = tc; m.rough = 0.15; m.emit = tc*(0.08 + 0.9*k*k);
  } else {
    // 옆면은 하얀 도자기, 끝 쪽으로 빛이 번져 물든다
    float glow = exp(-(p.z - tipZ)*6.0);
    m.alb = mix(m.alb, tc, 0.35*glow);
    m.emit = tc*glow*0.10*k;
  }
  return m;
}
