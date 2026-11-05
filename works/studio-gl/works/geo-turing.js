/* 튜링 무늬 · Turing Pattern
 *
 * 뇌산호와 얼룩말 줄무늬를 만드는 반응확산(튜링) 무늬를 거대한 구의 겉에 조각했다.
 * 무늬는 같은 파장의 평면파 여러 개를 더한 뒤 부드러운 부호 함수로 날카롭게 해서 만든다(파장이 고른 미로가 된다).
 * 파동마다 위상이 30초에 정수 바퀴(−1 · 0 · +1)만 돌아서, 미로가 천천히 흐르며 다시 짜이다가 처음으로 돌아온다.
 * 골에는 팔레트 빛이 고이고(속빛), 등성이는 매끈해 조명이 날카롭게 맺힌다. 카메라는 한 점을 둘러 원을 그린다.
 */
SGL.add({
  id: "geo-turing", title: "튜링 무늬", en: "Turing Pattern", mood: ["geo", "nature", "cosmos"],
  desc: "뇌산호와 얼룩말 줄무늬를 만드는 튜링 무늬가 거대한 구를 덮고 있습니다. 미로 같은 골마다 빛이 고이고, 무늬는 천천히 흐르며 다시 짜입니다.",
  palettes: [
    { name: "심해 산호", colors: ["#fff0e0", "#ff6a4a", "#18b8ff", "#e8cbb4"] },
    { name: "우주 청금", colors: ["#dfe8ff", "#38d6ff", "#7a3aff", "#9aa0b8"] },
    { name: "황금 뇌산호", colors: ["#ffe6b0", "#ffa02a", "#4a2a8a", "#d0a878"] },
    { name: "옥빛 심연", colors: ["#e8fff4", "#2dffb0", "#0a6a8a", "#88b0a0"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.12, contrast: 1.12, vignette: 0.34, grain: 0.012 },
  src: `
#define LKD vec3(0.0, -1.0, 0.0)
#define KEYC vec3(0.0)
#define STEPS 200
#define MAXD 40.0
#define FOG 0.016
const float R = 2.0;
const float KW = 30.0;          // 파수 (구 둘레에 골이 서른 줄 남짓)
const float AMP = 0.032;
// 조명은 재질 안에서 직접 준다: 왼쪽 위 주광 · 뒤쪽 테두리광 (구 전체의 낮밤 경계는 해석적으로)
const vec3 KL = vec3(-0.80, 0.50, 0.30);
const vec3 RL = vec3(-0.55, 0.45, -0.70);
// 반사 광선은 칠하는 점 둘레(0.4)만 무늬를 그리고 그 밖은 매끈한 껍질로 (빠르게)
bool CHEAP = false; vec3 P0;
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  CHEAP = false;
  float a = TAU*t/T;
  float th = 0.55 + 0.32*sin(a);
  float ph = 0.28 + 0.16*cos(a);
  float dist = 4.1 + 0.15*cos(a);
  ro = dist*vec3(sin(th)*cos(ph), sin(ph), cos(th)*cos(ph));
  vec3 side = normalize(cross(ro, vec3(0.0, 1.0, 0.0)));
  ta = ro*0.35 + side*0.9 + vec3(0.0, 0.45, 0.0);
  fov = 0.95;
}
// 튜링 무늬 장: 같은 파수의 평면파 40개. 자리마다 '결 방향' e 를 정하고 그 방향에 가까운 파동만 크게 더하면
// 줄이 길게 나란히 흐르다가 결이 바뀌는 곳에서 갈라지고 이어진다 (뇌산호 · 얼룩말 줄무늬처럼).
vec3 grainDir(vec3 p, vec3 nn){
  float a = TAU*uT/T;
  vec3 A = vec3(sin(1.7*p.y + 0.5 + 0.3*sin(a)), sin(1.5*p.z + 2.0 + 0.3*cos(a)), sin(1.9*p.x + 4.0))
         + 0.7*vec3(sin(3.1*p.z + 1.0), sin(2.9*p.x + 3.0 + 0.3*sin(a)), sin(3.3*p.y + 5.0));
  return cross(nn, A);
}
// 파동 방향(반구 위 피보나치 점) · 처음 위상 · 30초 동안 도는 바퀴 수
const vec4 WD[40] = vec4[40](
  vec4(0.99992, 0.01250, 0.00000, 0.00000),
  vec4(-0.73685, 0.03750, 0.67502, 4.74255),
  vec4(0.08725, 0.06250, -0.99422, 0.81977),
  vec4(0.60611, 0.08750, 0.79055, 4.62365),
  vec4(-0.97846, 0.11250, -0.17306, 6.12047),
  vec4(0.83573, 0.13750, -0.53164, 0.63271),
  vec4(-0.25614, 0.16250, 0.95288, 3.51827),
  vec4(-0.45275, 0.18750, -0.87170, 4.85789),
  vec4(0.91788, 0.21250, 0.33518, 6.10010),
  vec4(-0.89789, 0.23750, 0.37067, 5.73367),
  vec4(0.40895, 0.26250, -0.87399, 4.06792),
  vec4(0.28668, 0.28750, 0.91387, 3.20036),
  vec4(-0.82190, 0.31250, -0.47626, 1.60126),
  vec4(0.91936, 0.33750, -0.20216, 0.71163),
  vec4(-0.53598, 0.36250, 0.76245, 0.05222),
  vec4(-0.11851, 0.38750, -0.91422, 0.43317),
  vec4(0.69659, 0.41250, 0.58703, 6.01658),
  vec4(-0.89845, 0.43750, 0.03720, 5.75250),
  vec4(0.62843, 0.46250, -0.62544, 5.38952),
  vec4(-0.04028, 0.48750, 0.87219, 3.83561),
  vec4(-0.55021, 0.51250, -0.65925, 4.39644),
  vec4(0.83574, 0.53750, 0.11239, 1.65053),
  vec4(-0.67865, 0.56250, 0.47226, 0.62055),
  vec4(0.17755, 0.58750, -0.78951, 5.34319),
  vec4(0.39306, 0.61250, 0.68582, 0.44963),
  vec4(-0.73402, 0.63750, -0.23411, 5.51521),
  vec4(0.67997, 0.66250, -0.31423, 5.51667),
  vec4(-0.28029, 0.68750, 0.66991, 0.95247),
  vec4(-0.23754, 0.71250, -0.66024, 2.66185),
  vec4(0.59784, 0.73750, 0.31414, 4.69821),
  vec4(-0.62560, 0.76250, 0.16497, 5.93554),
  vec4(0.33327, 0.78750, -0.51843, 1.46662),
  vec4(0.09880, 0.81250, 0.57453, 2.66802),
  vec4(-0.43206, 0.83750, -0.33454, 5.74012),
  vec4(0.50432, 0.86250, -0.04184, 5.18366),
  vec4(-0.31289, 0.88750, 0.33830, 1.54253),
  vec4(0.00195, 0.91250, -0.40907, 3.40503),
  vec4(0.23384, 0.93750, 0.25771, 1.70914),
  vec4(-0.27013, 0.96250, -0.02500, 4.14527),
  vec4(0.12554, 0.98750, -0.09531, 2.10026));
const float WM[40] = float[40](1.0, 0.0, 0.0, -1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0, -1.0, 1.0, -1.0, 0.0, 1.0, 0.0, -1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, -1.0, -1.0, -1.0, 0.0);
float fld(vec3 p){
  float s = 0.0, w2 = 0.0;
  float ph = TAU*uT/T;
  vec3 nn = normalize(p);
  vec3 e = grainDir(p, nn);
  float es = length(e); e /= max(es, 1e-4);
  float kap = 3.5*smoothstep(0.1, 0.9, es);                  // 결이 흐린 곳은 고른 미로로
  for(int i=0;i<40;i++){
    vec3 d = WD[i].xyz;
    float dn = dot(d, nn), de = dot(d, e);
    float wt = (1.0 - dn*dn)*exp(-kap*(1.0 - de*de)) - 0.06;      // 결과 먼 파동은 0 으로 (이어지게 뺀다)
    if(wt <= 0.0) continue;
    s += wt*cos(KW*dot(d, p) + WD[i].w + ph*WM[i]);                // 위상은 30초에 −1 · 0 · +1 바퀴
    w2 += wt*wt;
  }
  return s*inversesqrt(w2*0.5 + 0.02);
}
float sgn(float v){ return v/sqrt(v*v + 0.3); }
float coral(vec3 p, float rad){
  float d0 = length(p) - rad;
  if(d0 > 0.12) return d0 - AMP*(rad/R)*1.05;
  float h = sgn(fld(p*(R/rad)));
  return (d0 - AMP*(rad/R)*h)*0.5;
}
const vec3 MOON = vec3(-19.0, 4.2, -2.5);
const float MR = 2.0;
float map(vec3 p){
  if(CHEAP && length(p - P0) > 0.4) return min(length(p) - R - AMP, length(p - MOON) - MR - 2.0*AMP);
  float d = coral(p, R);
  float dm = length(p - MOON) - MR;
  if(dm < d){ vec3 q = p - MOON; d = min(d, (length(q) - MR - AMP*2.0*sgn(fld(q*0.5)))*0.5); }
  return d;
}
float lightSpec(vec3 n, vec3 V, vec3 L, float rough){
  float cv = max(dot(n, V), 1e-3);
  float F = 0.04 + 0.96*pow(1.0 - cv, 5.0);
  return min(ggx(n, V, L, rough), 60.0)*F;
}
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  bool moon = length(p - MOON) < MR + 0.5;
  CHEAP = true; P0 = p;
  vec3 c = moon ? MOON : vec3(0.0);
  vec3 q = moon ? (p - MOON)*0.5 : p;
  float v = fld(q);
  float h = sgn(v);                       // −1 골 … +1 등성이
  float ridge = smoothstep(-0.3, 0.8, h);
  float g = vn3(q*20.0);
  float g2 = fbm3(q*3.0);
  alb = mix(uC3*0.06, uC3*0.75, ridge)*(0.8 + 0.25*g + 0.3*g2);
  rough = mix(0.55, 0.20, ridge);
  metal = 0.0;
  vec3 ro, ta; float fv; camera(uT, ro, ta, fv);
  vec3 V = normalize(ro - p);
  vec3 nn = normalize(p - c);
  vec3 kl = normalize(KL), rl = normalize(RL);
  float term = smoothstep(-0.35, 0.55, dot(nn, kl));                 // 구의 낮밤
  float cav = mix(0.18, 1.0, smoothstep(-0.95, 0.5, h));              // 골 바닥은 그늘
  float nl = dot(n, kl);
  float wrap = max((nl + 0.35)/1.35, 0.0);
  vec3 key = uC0*2.6;
  emit = alb*key*wrap*term*cav;
  emit += key*lightSpec(n, V, kl, rough)*term*cav*0.9;
  // 테두리광: 등성이 윗선에 가는 빛
  float rterm = smoothstep(-0.1, 0.5, dot(nn, rl));
  emit += uC0*1.6*lightSpec(n, V, rl, rough*0.8)*rterm*cav;
  // 골에 고인 빛 (속빛) — 가장 깊은 줄기에서 가장 밝다
  float hue = fbm3(q*0.5 + 3.0);
  vec3 gc = mix(uC1, uC2, smoothstep(0.35, 0.65, hue));
  float deep = smoothstep(-0.55, -1.7, v);
  float pulse = 0.8 + 0.2*sin(TAU*uT/T + dot(q, vec3(0.9, 0.4, -0.3))*1.5);
  float tex = 0.65 + 0.7*vn3(q*9.0 + 4.0);
  emit += gc*(deep*deep*2.2 + deep*0.25)*pulse*tex*(moon ? 0.5 : 1.0);
  // 산호 살을 지나온 빛: 그늘진 등성이 옆구리에 팔레트 색이 비친다
  float sss = (1.0 - max(nl, 0.0))*smoothstep(0.6, -0.2, h)*smoothstep(-1.0, -0.2, h);
  emit += gc*sss*0.10;
}
vec3 env(vec3 rd){
  // 스튜디오 빛: 위 소프트박스 + 뒤쪽 테두리 띠 (반사에만 비친다)
  float top = smoothstep(0.6, 0.95, rd.y);
  float rz = dot(rd, normalize(RL)) - 0.8;
  float rim = exp(-rz*rz*30.0);
  return uC2*0.012 + uC0*(top*0.9 + rim*0.8) + uC1*0.02*smoothstep(0.0, -1.0, rd.y);
}
float motes(vec3 rd, float sc, float th){
  vec3 g = rd*sc; vec3 h = h33(floor(g));
  float tw = 0.6 + 0.4*sin(TAU*uT/T + h.y*TAU);
  return step(th, h.x)*smoothstep(0.42, 0.0, length(fract(g) - 0.5 - (h.yzx - 0.5)*0.4))*tw;
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  // 구 둘레의 대기빛: 광선이 구에 가장 가까이 가는 거리. 해 쪽이 더 밝다
  float b = dot(-ro, rd);
  vec3 cp = ro + rd*max(b, 0.0);
  float dd = max(length(cp) - R, 0.0);
  float lit = 0.35 + 0.65*smoothstep(-0.4, 0.6, dot(normalize(cp), normalize(KL)));
  float halo = (exp(-dd*3.0)*0.3 + exp(-dd*16.0)*0.9)*lit;
  vec3 col = uC2*0.006 + uC2*0.018*smoothstep(-0.4, 0.9, rd.y);
  col += mix(uC2, uC1, 0.3)*halo*0.25;
  // 먼 성운 (아주 옅게)
  float nb = fbm3(rd*2.2 + vec3(3.0, 1.0, 0.0));
  float nb2 = fbm3(rd*4.5 - 2.0);
  col += mix(uC2, uC1, smoothstep(0.4, 0.7, nb2))*smoothstep(0.45, 0.8, nb)*0.035;
  // 위에서 비스듬히 내려오는 빛줄기
  float az = atan(rd.x, rd.z);
  float sh = vn3(vec3(cos(az)*6.0, sin(az)*6.0, 0.6*sin(TAU*uT/T)));
  col += uC0*sh*sh*sh*smoothstep(0.1, 0.9, rd.y)*0.08;
  col += uC0*(motes(rd, 140.0, 0.988)*0.25 + motes(rd, 50.0, 0.995)*0.45);
  return col;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
