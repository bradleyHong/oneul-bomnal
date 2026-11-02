/* 겨울 · 얼음꽃 결정 · Winter Crystal
 *
 * 눈보라가 몰아치는 밤, 커다란 육각 얼음 결정이 돌며 가지를 뻗었다 거둔다. 결정 둘레를 작은 결정 여섯이
 * 빠르게 돌고, 눈발은 화면 밖에서 안으로 빗금을 그으며 쏟아진다.
 *
 * 결정: 평면을 60도 조각으로 접어(거울 포함) 큰 가지 하나와 곁가지 다섯을 그리면 육각 대칭 눈꽃이 된다.
 * 두께는 가지 가운데가 두껍고 가장자리로 얇아지는 능선 → 면마다 빛을 다르게 받아 반짝인다.
 * 얼음 속은 굴절된 세상(파장마다 굴절률을 조금씩 달리해 무지개 테)을 보여 준다.
 * 가지 길이·회전·눈발 모두 30초 주기의 정수배.
 */
SGL.add({
  id: "winter-crystal", title: "겨울 · 얼음꽃 결정", en: "Winter Crystal", mood: ["calm", "nature", "geo"],
  desc: "눈보라 치는 밤, 커다란 육각 얼음 결정이 돌며 가지를 뻗었다 거둡니다. 얼음 속으로 빛이 갈라져 무지개 테가 어립니다.",
  palettes: [
    { name: "눈보라", colors: ["#bfe8ff", "#3a7aff", "#e8f6ff", "#060c1a"] },
    { name: "극야", colors: ["#9effe0", "#7a5cff", "#e0fff4", "#08061a"] },
    { name: "새벽 서리", colors: ["#ffd8e8", "#7a8aff", "#fff4f8", "#120c1a"] },
    { name: "은빛", colors: ["#e8eef8", "#8aa0c8", "#ffffff", "#0a0c10"] },
  ],
  post: { exposure: 1.0, bloom: 0.09, sat: 1.10, contrast: 1.10, vignette: 0.36, grain: 0.012 },
  src: `
#define LKD vec3(-0.4, 0.7, 0.6)
#define KEYC vec3(2.0, 2.2, 2.6)
#define STEPS 160
#define MAXD 14.0
float BU(){ float s = 0.5 + 0.5*sin(TAU*uT/T*2.0 - 0.6); return s*s*s; }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0); return length(pa - ba*h); }
// 육각 눈꽃 평면 거리. g: 자람(0..1)
float flake2(vec2 p, float g){
  float r = length(p), a = atan(p.y, p.x);
  a = mod(a + 3.14159/6.0, 3.14159/3.0) - 3.14159/6.0; a = abs(a);
  vec2 q = r*vec2(cos(a), sin(a));
  float L = 0.35 + 0.65*g;
  float d = sdSeg(q, vec2(0.0), vec2(L, 0.0)) - 0.045*(1.0 - 0.7*clamp(q.x/L, 0.0, 1.0));
  vec2 dir = vec2(0.5, 0.8660254);
  for(int k=1;k<=5;k++){
    float fk = float(k);
    float x = L*(0.12 + 0.165*fk);
    float l = L*(0.46 - 0.075*fk)*smoothstep(fk*0.13 - 0.1, fk*0.13 + 0.25, g);
    d = min(d, sdSeg(q, vec2(x, 0.0), vec2(x, 0.0) + dir*l) - 0.022*(1.0 - 0.1*fk));
  }
  // 가운데 육각판
  vec2 hp = abs(p); float hx = max(hp.x*0.8660254 + hp.y*0.5, hp.y) - 0.16*(0.6 + 0.4*g);
  return min(d, hx);
}
float flake3(vec3 p, float g){
  float d2 = flake2(p.xy, g);
  float th = 0.008 + 0.55*max(-d2, 0.0);                            // 가운데 능선이 두꺼운 얼음
  return max(d2, (abs(p.z) - th)*0.75);
}
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
float GROW(){ float ph = TAU*uT/T; return 0.62 + 0.38*sin(ph - 1.2) + 0.0*BU(); }
mat3 HERO(){ float ph = TAU*uT/T; return rotZ(ph + 0.35*sin(ph*2.0))*rotY(0.75*sin(ph))*rotX(0.30*sin(ph*2.0 + 0.5)); }
float map(vec3 p){
  float ph = TAU*uT/T, bu = BU();
  vec3 q = HERO()*p;
  float d = flake3(q/1.25, GROW())*1.25;
  // 둘레를 도는 작은 결정 여섯
  for(int j=0;j<6;j++){
    float fj = float(j);
    float an = fj/6.0*TAU + ph*2.0;
    float rr = 1.85 + 0.25*sin(ph*3.0 + fj) + 0.35*bu;
    vec3 c = vec3(cos(an)*rr, 0.45*sin(an*1.0 + ph*2.0 + fj), sin(an)*rr*0.55);
    vec3 lp = p - c;
    if(length(lp) > 0.45){ d = min(d, length(lp) - 0.35); continue; }
    mat3 R = rotX(ph*3.0 + fj)*rotY(ph*4.0 + fj*1.3);
    float s = 0.30;
    d = min(d, flake3(R*lp/s, 0.55 + 0.45*sin(ph*2.0 + fj))*s);
  }
  return d;
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float ph = TAU*t/T;
  ro = vec3(0.45*sin(ph), 0.25*sin(ph*2.0), 3.6 + 0.25*cos(ph));
  ta = vec3(0.0); fov = 0.95;
}
vec3 sky(vec3 rd){
  vec3 c = mix(uC3*0.5, uC3*0.12 + uC1*0.008, smoothstep(-0.4, 0.8, rd.y));
  float ph = TAU*uT/T;
  // 먼 오로라 띠
  float bd = (rd.y - 0.42 - 0.06*sin(rd.x*3.0 + ph))*9.0; float band = exp(-bd*bd);
  // 결정 뒤의 빛무리: 얼음을 뒤에서 비춰 윤곽과 속을 살린다
  if(rd.z < 0.0){
    float rr = length(rd.xy);
    c += uC1*0.06*exp(-rr*4.0) + (uC1*0.25 + uC0*0.35)*exp(-rr*rr*30.0) + uC2*2.2*exp(-rr*rr*260.0)*(0.6 + 0.8*BU());
    // 뒤쪽 빛 알갱이(얼음 속에서 굴절돼 반짝인다)
    vec2 g = rd.xy*26.0; vec2 ce = floor(g); float hh = h21(ce);
    c += uC0*step(0.93, hh)*smoothstep(0.32, 0.0, length(fract(g) - 0.5))*0.9*exp(-rr*2.0);
  }
  return c;
}
vec3 env(vec3 rd){
  vec3 c = sky(rd);
  // 결정에 비치는 차가운 조명 셋: 위 소프트박스 · 왼쪽 세로 띠 · 뒤 테두리 빛
  c += vec3(3.2, 3.5, 4.0)*smoothstep(0.80, 0.86, rd.y);
  // 카메라 뒤 큰 소프트박스(정면 반사) — 위쪽 반만
  c += vec3(0.9, 1.0, 1.2)*smoothstep(0.75, 0.9, rd.z)*smoothstep(-0.05, 0.25, rd.y);
  c += vec3(2.5, 2.8, 3.4)*smoothstep(0.10, 0.06, abs(rd.x + 0.75))*smoothstep(-0.4, -0.1, rd.y)*smoothstep(0.7, 0.4, rd.y);
  c += uC0*3.0*smoothstep(0.10, 0.06, abs(rd.x - 0.7))*smoothstep(-0.2, 0.0, rd.y)*smoothstep(0.6, 0.3, rd.y)*step(rd.z, 0.0);
  return c;
}
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 v = normalize(ro - p);
  float cv = max(dot(n, v), 0.0);
  float F = 0.02 + 0.98*pow(1.0 - cv, 5.0);
  alb = uC0*0.04; rough = 0.04; metal = 0.0;
  // 얼음 속: 파장마다 조금씩 다른 굴절 → 무지개 테
  vec3 rr = refract(-v, n, 1.0/1.31), rg = refract(-v, n, 1.0/1.32), rb = refract(-v, n, 1.0/1.335);
  vec3 tr = vec3(env(rr).r, env(rg).g, env(rb).b);
  float r = length(p);
  vec3 core = mix(uC2, uC0, smoothstep(0.0, 1.2, r))*(0.15 + 1.4*BU())*exp(-r*2.4);   // 가운데부터 차오르는 속빛
  emit = tr*mix(uC0, vec3(1.0), 0.5)*(1.0 - F)*1.1 + core*0.6 + uC0*pow(1.0 - cv, 3.0)*0.25;
  // 결정 속 무늬: 가지 가운데 능선이 빛나고, 서리 알갱이가 반짝인다 (큰 결정 기준 좌표)
  vec3 lq = HERO()*p/1.25;
  float rr2 = length(lq.xy), aa = atan(lq.y, lq.x);
  aa = abs(mod(aa + 3.14159/6.0, 3.14159/3.0) - 3.14159/6.0);
  float ridge = exp(-abs(rr2*sin(aa))*90.0)*smoothstep(1.05, 0.2, rr2);
  float ph = TAU*uT/T;
  vec3 gc = floor(lq*90.0);
  float gl = h21(gc.xy + gc.z*7.1);
  float tw = pow(0.5 + 0.5*sin(ph*float(3 + int(gl*5.0)) + gl*40.0), 12.0);
  float frost = vn3(lq*14.0);
  emit += uC0*ridge*(0.5 + 1.2*BU()) + vec3(1.0)*step(0.94, gl)*tw*2.5 + uC0*0.12*smoothstep(0.55, 0.8, frost);
}
#define HAS_BG
vec3 bg(vec3 rd){ return sky(rd); }
`,
  init(G, ctx) {
    const gl = G.gl;
    // 눈발: 카메라 앞에서 뒤로 지나가는 빗금. 카메라 좌표에서 바로 계산한다
    const N = ctx.cap ? 2600 : 1800;
    const VS = `#version 300 es
uniform float uT, uGain, uAsp, uPx; uniform vec3 uC0, uC2;
out vec3 vCol;
#define TAU 6.2831853
vec3 h3(float n){ vec3 p = fract(vec3(n)*vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.xxy + p.yzz)*p.zyx); }
vec3 pos(vec3 r, vec3 r2, float t){
  float ph = TAU*t/30.0;
  float k = 2.0 + floor(r.z*4.0);                  // 30초에 지나가는 횟수 (정수)
  float z = -0.3 - fract(r.x - t/30.0*k)*9.0;       // 멀리서 다가온다
  float a = r.y*TAU + ph*2.0 + z*0.25;              // 소용돌이
  float rad = 0.3 + 3.2*r2.x;
  return vec3(cos(a)*rad*1.4 - 0.8*(z + 4.5)*0.15, sin(a)*rad*0.8 - 0.4, z);
}
void main(){
  float fi = float(gl_VertexID);
  vec3 r = h3(fi*1.37 + 0.5), r2 = h3(fi*5.71 + 3.0);
  float bu = pow(0.5 + 0.5*sin(TAU*uT/30.0*2.0 - 0.6), 3.0);
  vec3 p = pos(r, r2, uT);
  float f = 1.0/tan(0.95*0.5);
  gl_Position = vec4(p.x*f/uAsp, p.y*f, 0.0, -p.z);
  // 가까운 눈송이는 크고 흐린 빛망울, 먼 것은 작은 점
  float sz = uPx*(0.8 + 2.2*r2.y)/max(-p.z, 0.3);
  gl_PointSize = clamp(sz, 1.5, 26.0);
  float near = smoothstep(-9.3, -6.0, p.z)*smoothstep(-0.3, -1.0, p.z);
  vCol = mix(vec3(1.0), uC0, 0.4*r2.z)*near*(0.3 + 0.7*r2.x)*(0.7 + 0.6*bu)*uGain*1.6/max(gl_PointSize*gl_PointSize*0.08, 1.0);
}`;
    const FS = `#version 300 es
precision highp float; in vec3 vCol; out vec4 o;
void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); o = vec4(vCol*smoothstep(0.25, 0.12, d)*(0.6 + 0.4*exp(-d*12.0)), 1.0); }`;
    return { prog: SGL.program(gl, VS, FS), N, vao: gl.createVertexArray() };
  },
  draw(G, st, t, ctx) {
    SGL.drawRay(G, this.src, t, ctx);
    G.custom((gl, c) => {
      gl.useProgram(st.prog.p); const u = st.prog.u;
      gl.uniform1f(u.uT, t); gl.uniform1f(u.uGain, c.gain); gl.uniform1f(u.uAsp, ctx.W / ctx.H); gl.uniform1f(u.uPx, 6 * ctx.H / 1080);
      gl.uniform3fv(u.uC0, ctx.colors[0]); gl.uniform3fv(u.uC2, ctx.colors[2]);
      gl.bindVertexArray(st.vao);
      gl.drawArrays(gl.POINTS, 0, st.N);
    });
  },
});
