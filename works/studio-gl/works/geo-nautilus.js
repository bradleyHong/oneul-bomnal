/* 앵무조개 · Nautilus
 *
 * 반으로 가른 앵무조개 껍데기. 바깥벽은 반 바퀴마다 황금비 φ 만큼 커지는 로그 나선이고,
 * 방마다 휘어진 칸막이(격벽)가 있다. 거리장은 로그 극좌표에서
 * 만든다: 점의 반지름과 각도로 몇 번째 감김인지 구하고, 그 감김의 크기로 나눈 '표준 단면'에서 벽과 칸막이를 잰다.
 * 로그 나선은 자기 닮음이라 반 바퀴 돌리며 φ 배 키우면 처음 모양과 똑같다. 그래서 30초 동안 세상을
 * 반 바퀴 돌리며 φ 배 키우면(= 카메라가 나선을 따라 안쪽으로 파고들면) 끝없는 줌이 정확히 이어진다.
 * 겉은 진주층(박막 간섭 무지갯빛), 위로는 물속 햇살 기둥과 일렁이는 빛 그물(커스틱), 나선의 심장에는 진주 하나가 빛난다.
 */
SGL.add({
  id: "geo-nautilus", title: "앵무조개", en: "Nautilus", mood: ["geo", "nature", "calm"],
  desc: "반으로 가른 앵무조개의 방들이 황금 나선을 그리며 끝없이 이어집니다. 깊은 바닷속 햇살 아래, 진주빛 방들을 따라 나선의 한가운데로 천천히 빨려 들어갑니다.",
  palettes: [
    { name: "진주 바다", colors: ["#f4ece2", "#8fe3ff", "#ffb8d8", "#05304e"] },
    { name: "황혼 심해", colors: ["#f8dcc4", "#ffb06a", "#c890ff", "#22103a"] },
    { name: "에메랄드 라군", colors: ["#e6f6ea", "#5effc8", "#ffe08a", "#03332e"] },
    { name: "달빛 심연", colors: ["#dfe6f4", "#7aa0ff", "#a8fff0", "#040a1c"] },
  ],
  post: { exposure: 1.0, bloom: 0.09, sat: 1.22, contrast: 1.16, vignette: 0.38, grain: 0.012 },
  src: `
#define PHI 1.6180339887
#define PI 3.14159265
#define STEPS 200
#define MAXD 40.0
const float BG = 0.1531741;            // ln(φ)/π : 반 바퀴에 φ 배
const float KG = 2.6180340;            // 한 바퀴에 φ² 배
const float NS = 12.0;                 // 한 바퀴의 방 수 (짝수: 반 바퀴 자기 닮음)
const float RC = 0.26;                 // 나선 심장 (세상 크기 그대로)
vec3 LD(){ return normalize(vec3(0.30, 1.0, -0.45)); }
float sdE2(vec2 p, vec2 r){ float k0 = length(p/r), k1 = length(p/(r*r)); return k0*(k0 - 1.0)/max(k1, 1e-6); }
// 감김 하나의 표준 단면 (바깥 반지름 s): 지름 방향 0.30s..s, 높이 ±0.30s 인 타원
float whorl(float rho, float y, float s){ return s*sdE2(vec2(rho/s - 0.65, y/s), vec2(0.35, 0.30)); }
float gId;
float shell(vec3 q){
  float rho = max(length(q.xz), 1e-5), th = atan(q.z, q.x), y = q.y;
  float u = log(rho)/BG - th;
  float n0 = ceil(u/TAU);
  float d = 1e9; gId = 0.0;
  for(int k=-1;k<=1;k++){
    float s = exp(BG*(th + TAU*(n0 + float(k))));
    float e1 = whorl(rho, y, s), e0 = whorl(rho, y, s/KG);
    float wall = max(abs(e1) - 0.016*s, -e0);              // 바깥벽 (앞 감김 속은 비움)
    vec2 cc = vec2(rho/s - 0.65, y/s)/vec2(0.35, 0.30);
    float bul = 0.11*s*max(1.0 - dot(cc, cc), 0.0);         // 칸막이는 가운데가 뒤로 휜다
    float dw = mod(th + bul/rho + PI/NS, TAU/NS) - PI/NS;    // 휜 만큼 각도를 먼저 옮겨 감는다 (감는 경계에서 접히지 않게)
    float sep = max(abs(rho*dw) - 0.007*s, max(e1, -e0));
    if(wall < d){ d = wall; gId = 0.0; }
    if(sep < d){ d = sep; gId = 1.0; }
  }
  return max(d, y);                                        // 반으로 가른 면 (y = 0)
}
// 세상 → 껍데기 좌표: 30초에 반 바퀴 돌며 φ 배 커진다
vec3 toShell(vec3 p, out float Z){
  Z = pow(PHI, uT/T);
  vec3 q = p/Z; q.xz = rot(-PI*uT/T)*q.xz; return q;
}
float coreD(vec3 p){ return length(p - vec3(0.0, -0.03, 0.0)) - RC*0.58; }
float map(vec3 p){
  float Z; vec3 q = toShell(p, Z);
  float d = Z*shell(q)*0.5;
  d = max(d, RC - length(p));                              // 심장 둘레는 동그랗게 비운다
  return min(d, coreD(p));
}
float caus(vec3 p){
  vec3 L = LD();
  vec2 x = (p.xz - L.xz/L.y*p.y)*1.6;
  float a = TAU*uT/T;
  vec2 c1 = vec2(cos(a), sin(a));
  float n1 = vn3(vec3(x + c1*0.55, 0.3)), n2 = vn3(vec3(x*1.7 - c1.yx*0.45, 4.1));
  float r1 = 1.0 - abs(2.0*n1 - 1.0), r2 = 1.0 - abs(2.0*n2 - 1.0);
  return 0.45 + 2.2*pow(r1, 7.0) + 1.3*pow(r2, 9.0);
}
vec3 env(vec3 rd){
  vec3 L = LD(); float m = max(dot(rd, L), 0.0);
  vec3 c = mix(uC3*0.12, uC3*1.1 + uC1*0.02, smoothstep(-0.4, 1.0, rd.y));
  c += uC0*(0.10*pow(m, 4.0) + 1.4*pow(m, 40.0));
  c += uC1*0.12*smoothstep(0.75, 0.98, rd.y);               // 물낯빛
  return c;
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 L = LD(); float m = max(dot(rd, L), 0.0);
  return mix(uC3*0.05, uC3*0.55 + uC1*0.012, smoothstep(-0.5, 0.9, rd.y)) + mix(uC1, uC0, 0.4)*0.03*pow(m, 4.0);
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(0.35 + 0.12*sin(a), 2.25 + 0.08*cos(a), 3.45 + 0.10*sin(a*2.0));
  ta = vec3(0.30 + 0.06*cos(a), 0.05, 0.05);
  fov = 0.95;
}
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  if(coreD(p) < 0.004){                                    // 나선 심장의 진주
    alb = uC0*0.9; rough = 0.12; metal = 0.3; emit = uC2*1.6 + uC0*0.4; return;
  }
  float Z; vec3 q = toShell(p, Z);
  shell(q);
  float id = gId;
  float rho = length(q.xz), th = atan(q.z, q.x);
  float u = log(rho)/BG - th;
  float s = exp(BG*(th + TAU*ceil(u/TAU)));
  vec2 cs = vec2(rho/s, q.y/s);                            // 표준 단면 좌표 (자기 닮음)
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  float ci = max(dot(n, normalize(ro - p)), 0.0);
  // 진주층: 두께가 흐르는 박막 간섭. 무늬는 반 바퀴 주기 (cos 2θ, sin 2θ) 위에서 뽑아 자기 닮음을 지킨다
  // 매끈한 물결무늬 (값 잡음의 칸 자국이 박막 색에서 도드라지지 않게 삼각함수로 만든다; θ 는 짝수 배만 → 반 바퀴 주기)
  float nz = 0.5 + 0.30*sin(6.0*th + 8.0*cs.x + 1.8*sin(4.0*th + 6.0*cs.y + 3.0*cs.x))
                 + 0.20*sin(10.0*th - 5.0*cs.y + 1.2*sin(2.0*th + 9.0*cs.x));
  float thick = 1.0 + 2.6*nz + 1.2*(1.0 - ci) + 0.6*cs.x;
  vec3 film = 0.5 + 0.5*cos(TAU*(thick + vec3(0.0, 0.33, 0.67)));
  vec3 irid = uC1*film.x + uC2*film.y + uC0*film.z*0.6;
  alb = mix(uC0*0.40, irid, 0.72);
  rough = 0.10; metal = 0.38;                             // 매끈한 진주층 (반사 흔들림이 작아 깨끗하다)
  float cut = smoothstep(0.92, 0.99, n.y)*smoothstep(-0.004*Z*s, 0.0, p.y);
  if(cut > 0.0){                                           // 자른 면: 매끈한 단면, 가장자리가 빛을 잡는다
    alb = mix(alb, uC0*0.8, 0.6*cut); rough = mix(rough, 0.12, cut);
    emit = mix(uC1, uC0, 0.5)*0.10*cut;
  }
  float dd = length(p);                                    // 심장의 진주가 둘레 방들을 비춘다
  emit += alb*uC2*0.9/(1.0 + 30.0*dd*dd);
}
// 직접 쓴 음영: 반사는 행진하지 않고 환경빛 × 가려짐(AO)으로만 받는다. 오목한 방 속에서 반사 광선이
// 수렴하지 못해 생기던 톱니 · 얼룩이 없고, 그림자도 흔들림 없이 부드럽다.
float softSh(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.015;
  for(int i=0;i<64;i++){ float h = map(ro + rd*t); res = min(res, 9.0*h/t); t += clamp(h, 0.008, 0.2); if(res < 0.003 || t > 8.0) break; }
  res = clamp(res, 0.0, 1.0); return res*res*(3.0 - 2.0*res);
}
float occl(vec3 p, vec3 n){ float o = 0.0, w = 1.0; for(int i=1;i<=6;i++){ float h = 0.03*float(i)*float(i)*0.5 + 0.01; o += (h - map(p + n*h)*2.0)*w; w *= 0.72; } return clamp(1.0 - 1.6*o, 0.0, 1.0); }
vec3 shadeN(vec3 p, vec3 n, vec3 rd){
  vec3 alb = vec3(0.5); float rough = 0.5, metal = 0.0; vec3 emit = vec3(0.0);
  material(p, n, alb, rough, metal, emit);
  vec3 L = LD(); vec3 key = uC0*0.95*caus(p);
  float nl = max(dot(n, L), 0.0);
  float sh = nl > 0.0 ? softSh(p + n*0.004, L) : 0.0;
  float o = occl(p, n);
  float cv = max(dot(n, -rd), 1e-3);
  vec3 F0 = mix(vec3(0.04), alb, metal);
  vec3 F = F0 + (1.0 - F0)*pow(1.0 - cv, 5.0);
  vec3 col = alb*(1.0 - metal)*(key*nl*sh + env(n)*0.55*o);
  col += key*min(ggx(n, -rd, L, rough), 40.0)*F*sh;
  col += env(reflect(rd, n))*F*o*o*(1.0 - 0.5*rough);
  // 진주층 광택: 비스듬히 볼수록 박막 색이 은은하게 떠오른다
  col += alb*metal*(1.0 - cv)*(1.0 - cv)*(uC1*0.10 + key*0.10*sh)*o;
  return col + emit;
}
// 물속: 햇살 기둥(부피 산란) + 깊이 안개 + 심장의 빛무리
vec3 post(vec3 c, vec3 ro, vec3 rd, float t){
  float tend = t > 0.0 ? min(t, 26.0) : 26.0;
  vec3 L = LD(); float a = TAU*uT/T; vec2 c1 = vec2(cos(a), sin(a));
  float mu = max(dot(rd, L), 0.0);
  float ph = 0.35 + 1.6*pow(mu, 6.0);
  float sig = 0.10;
  vec3 sc = vec3(0.0);
  float dt = tend/40.0, tt = dt*rnd();
  for(int i=0;i<40;i++){
    vec3 p = ro + rd*tt;
    vec2 x = (p.xz - L.xz/L.y*p.y)*0.32;
    float sh = smoothstep(0.60, 0.74, vn3(vec3(x + c1*0.35, 2.0))*0.8 + vn3(vec3(x*2.3 - c1*0.25, 7.0))*0.2);
    sh *= smoothstep(0.1, 0.9, p.y);                          // 물기둥 (껍데기 위)
    sc += exp(-sig*tt)*(mix(uC1, uC0, 0.35)*sh*ph*0.20 + uC3*0.02)*dt;
    tt += dt;
  }
  float tr = exp(-sig*(t > 0.0 ? t : 60.0));
  vec3 col = c*tr + bg(rd)*(1.0 - tr) + sc;
  // 심장의 빛무리 (가려지지 않을 때만)
  float tc = max(dot(-ro, rd), 0.0);
  if(t < 0.0 || t > tc - RC){
    float dd = length(ro + rd*tc);
    col += uC2*(0.10*exp(-dd*5.0) + 0.012/(dd*dd*8.0 + 0.04))*exp(-sig*tc);
  }
  return col;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) {
    st.fs = st.fs || SGL.RAY + this.src + SGL.RAY_MAIN.replace("acc += c;", "acc += post(c, ro, rd, t);").replace("? shade(ro + rd*t", "? shadeN(ro + rd*t");
    G.background(st.fs, { uT: t, uAA: ctx.aa, uC0: ctx.colors[0], uC1: ctx.colors[1], uC2: ctx.colors[2], uC3: ctx.colors[3] });
  },
});
