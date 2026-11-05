/* 비스무트 결정 · Bismuth Crystal
 *
 * 비스무트 호퍼 결정: 정육면체의 여섯 면이 계단처럼 안으로 꺼져 들어간 모양(가장자리가 먼저 자라서 생긴다).
 * 면마다 계단 상자 네 단을 빼서 만들고, 큰 결정의 위쪽 모서리마다 작은 결정이, 그 모서리마다 더 작은 결정이 돋는다(3단 자기닮음).
 * 겉은 거의 거울인 금속 위에 얇은 산화막 무지개: 막 두께(위치에 따라 천천히 변함)와 보는 각도로 간섭색을 구하고 팔레트 색과 섞는다.
 * 어두운 반사 바닥 위에서 카메라가 30초에 한 바퀴 돈다. 천장 소프트박스와 옆 띠 조명이 금속 면에 길게 비친다.
 */
SGL.add({
  id: "geo-bismuth", title: "비스무트 결정", en: "Bismuth Crystal", mood: ["geo", "vivid"],
  desc: "계단처럼 안으로 꺼져 들어간 비스무트 결정 탑을 천천히 한 바퀴 돕니다. 금속 면 위에 얇은 산화막이 무지갯빛으로 물듭니다.",
  palettes: [
    { name: "무지개 산화", colors: ["#ffc23a", "#ff3a9a", "#3a5cff", "#2ee8c0"] },
    { name: "금과 청", colors: ["#ffd36a", "#ff8a2a", "#2a4cff", "#5ac8ff"] },
    { name: "보랏빛", colors: ["#ff7ad0", "#9a4aff", "#4a6aff", "#ffc8ec"] },
    { name: "은빛 서리", colors: ["#e8eef8", "#a8c4ff", "#ffd2c4", "#c4c8d4"] },
  ],
  post: { exposure: 1.0, bloom: 0.07, sat: 1.12, contrast: 1.10, vignette: 0.34, grain: 0.010 },
  src: `
#define LKD vec3(sin(TAU*uT/T + 0.9)*0.55, 0.85, cos(TAU*uT/T + 0.9)*0.55)
#define KEYC vec3(2.2, 2.15, 2.1)
#define STEPS 200
#define MAXD 30.0
#define FOG 0.03
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(sin(a)*5.9, 1.15 + 0.30*sin(a*2.0 + 0.5), cos(a)*5.9);
  ta = vec3(0.0, 2.05 + 0.12*sin(a*2.0), 0.0); fov = 0.86;
}
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
// 호퍼 결정: 정육면체에서 면마다 계단 상자 네 단을 뺀다
float hopper(vec3 p, float s){
  float d = sdBox(p, vec3(s));
  if(d > s*0.3) return d;
  vec3 q = abs(p);
  float hl = 1e9;
  for(int k=0;k<4;k++){
    float fk = float(k);
    float a = s*(0.84 - 0.19*fk), D = s*(0.13 + 0.16*fk);
    hl = min(hl, sdBox(q - vec3(s, 0.0, 0.0), vec3(D, a, a)));
    hl = min(hl, sdBox(q - vec3(0.0, s, 0.0), vec3(a, D, a)));
    hl = min(hl, sdBox(q - vec3(0.0, 0.0, s), vec3(a, a, D)));
  }
  return max(d, -hl);
}
float LV;  // 0 큰 결정 · 1 작은 · 2 더 작은
float HID; // 결정 번호
// 큰 결정 하나와 모서리마다 돋은 작은 결정들
float cluster(vec3 q, float s, float id){
  float d = hopper(q, s);
  float lv = 0.0;
  // 위쪽 모서리 넷에 작은 결정
  vec3 q1 = q; q1.xz = abs(q1.xz);
  q1 -= vec3(s*0.86, s*0.98, s*0.86);
  float s1 = s*0.36;
  float bnd = length(q1) - s1*2.3;
  if(bnd > d){ d = min(d, bnd); } else {
    float d1 = hopper(q1, s1);
    if(d1 < d){ d = d1; lv = 1.0; }
    if(s > 0.5){
    vec3 q2 = q1; q2.xz = abs(q2.xz);
    q2 -= vec3(s1*0.84, s1*0.98, s1*0.84);
    float d2 = hopper(q2, s1*0.40);
    if(d2 < d){ d = d2; lv = 2.0; }
    }
  }
  if(d < 0.01*s) { LV = lv; HID = id; }
  return d;
}
vec3 tq(vec3 p, vec3 c, float ay, float ax){ vec3 q = p - c; q.xz = rot(ay)*q.xz; q.yz = rot(ax)*q.yz; return q; }
float crystal(vec3 p){
  float d = 1e9;
  // 가운데 탑: 위로 갈수록 작아지며 돌아간다
  d = min(d, cluster(tq(p, vec3(0.0, 0.80, 0.0), 0.30, 0.0), 0.80, 0.0));
  d = min(d, cluster(tq(p, vec3(0.42, 2.00, 0.30), 0.38, 0.04), 0.55, 1.0));
  d = min(d, cluster(tq(p, vec3(0.05, 2.95, 0.55), 0.46, -0.03), 0.40, 2.0));
  d = min(d, cluster(tq(p, vec3(-0.30, 3.65, 0.25), 0.54, 0.05), 0.29, 3.0));
  d = min(d, cluster(tq(p, vec3(-0.28, 4.16, -0.05), 0.62, 0.0), 0.20, 4.0));
  // 둘레의 작은 탑들
  d = min(d, cluster(tq(p, vec3(-1.42, 0.50, 0.62), 0.25, 0.0), 0.50, 5.0));
  d = min(d, cluster(tq(p, vec3(-1.30, 1.25, 0.45), 0.32, 0.06), 0.27, 6.0));
  d = min(d, cluster(tq(p, vec3(1.45, 0.42, 0.92), 0.36, 0.0), 0.42, 7.0));
  d = min(d, cluster(tq(p, vec3(0.85, 0.30, -1.42), 0.20, 0.0), 0.30, 8.0));
  return d;
}
float map(vec3 p){ return min(crystal(p), p.y); }
// 얇은 막 간섭색: 막 두께 th(마이크로미터) · 보는 각 cosI
vec3 film(float th, float cosI){
  float n = 2.2;
  float ct = sqrt(max(1.0 - (1.0 - cosI*cosI)/(n*n), 0.0));
  float opd = 2.0*n*th*ct;
  vec3 lam = vec3(0.65, 0.53, 0.45);
  vec3 c = 0.5 - 0.5*cos(TAU*opd/lam);
  float ph = opd/0.55;
  vec3 pc = pal(ph*0.5);
  return mix(c*c, pc*pc*1.3, 0.6);
}
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  if(p.y < crystal(p)){
    alb = vec3(0.0015 + 0.012*exp(-dot(p.xz, p.xz)*0.12)); metal = 0.0;
    rough = 0.07 + 0.05*smoothstep(0.4, 0.8, vn3(vec3(p.xz*1.2, 0.0)));
    return;
  }
  crystal(p);
  vec3 v = normalize(p - vec3(0.0, 1.8, 0.0));
  // 막 두께: 결정마다 · 높이 · 천천히 흐르는 잡음
  float a = TAU*uT/T;
  float th = 0.16 + 0.045*HID + 0.06*LV + 0.05*p.y + 0.06*dot(p, vec3(0.7, 0.3, -0.6)) + 0.14*fbm3(p*1.6 + vec3(cos(a), 0.0, sin(a))*0.25);
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  float ci = abs(dot(n, normalize(ro - p)));
  vec3 f = film(th, ci);
  alb = mix(vec3(0.78, 0.74, 0.78), f, 0.92);
  metal = 0.82;
  rough = 0.10 + 0.04*LV;
}
vec3 env(vec3 rd){
  // 회전대 촬영처럼 조명은 카메라를 따라 돈다: 카메라 양옆 뒤 큰 소프트박스 · 천장 소프트박스 · 결정 뒤 높은 띠(윤곽빛)
  // 결정 너머 낮은 쪽은 어둡게 두어 바닥 거울에는 결정만 비친다
  float az = atan(rd.x, rd.z) - TAU*uT/T;
  az = mod(az + 3.14159, 6.28318) - 3.14159;
  float up = smoothstep(-0.05, 0.12, rd.y);
  vec3 c = vec3(0.05, 0.05, 0.055)*(0.3 + 0.7*smoothstep(-0.1, 0.8, rd.y))*(0.5 + 0.5*cos(az));
  c += vec3(6.0)*smoothstep(0.62, 0.70, rd.y)*smoothstep(0.80, 0.60, abs(rd.x));
  float band = smoothstep(-0.05, 0.10, rd.y)*smoothstep(0.80, 0.65, rd.y);
  c += vec3(3.2)*smoothstep(0.42, 0.30, abs(az - 0.85))*band;
  c += vec3(2.0)*smoothstep(0.30, 0.20, abs(az + 0.75))*band;
  c += vec3(2.4)*smoothstep(0.10, 0.05, abs(abs(az) - 2.3))*smoothstep(0.30, 0.42, rd.y)*smoothstep(0.85, 0.7, rd.y);
  return c*up;
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 c = mix(vec3(0.0015, 0.0015, 0.002), vec3(0.004, 0.004, 0.005), smoothstep(-0.2, 0.6, rd.y));
  c += vec3(0.010, 0.010, 0.012)*exp(-rd.y*rd.y*20.0);
  return c;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
