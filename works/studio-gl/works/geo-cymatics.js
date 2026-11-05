/* 소리의 무늬 · Cymatics
 *
 * 소리가 그리는 기하학(클라드니 도형). 어두운 판이 떨리면 고운 모래알 수십만 개가 흔들리지 않는 곳,
 * 정상파의 마디선으로 모여 무늬가 된다. 판의 떨림꼴은 사각판 클라드니 식
 *   f = cos(nπX)cos(mπY) − cos(mπX)cos(nπY)
 * 이고 (1,2) → (3,5) → (2,7) → (4,6) → 다시 (1,2) 로 30초에 한 바퀴 바뀐다.
 * 모래알마다 씨앗 자리(정수 해시)에서 뉴턴 걸음 몇 번으로 그 떨림꼴의 마디선(f=0)을 찾아 '집'으로 삼고,
 * 떨림꼴이 바뀌는 동안 알마다 조금씩 엇갈려 튀어 오르며 새 집으로 옮겨 간다. 자리는 오직 t 의 함수.
 * 판은 물처럼 젖은 거울: 정상파가 판 위에 잔물결을 만들고 위쪽 소프트박스가 그 위에 비친다.
 * 알은 피사계 심도로 초점 밖에서 원판처럼 번지고, 면이 빛을 받는 알만 반짝인다.
 */
(function () {
  const MODES = [[3, 5, 1], [4, 6, 1], [5, 8, -1], [5, 7, 1]];   // (n, m, 부호)
  const SEG = 7.5, HOLD = 3.6;
  const AP = 0.030;                           // 조리개 (착란원 = AP·|z−초점|/z·화면 높이)                // 떨림꼴 하나 7.5초: 3.6초 머물고 3.9초 옮겨 간다
  function state(t) {
    const tt = ((t % 30) + 30) % 30;
    const k = Math.floor(tt / SEG) % 4, u = tt - k * SEG;
    const s = Math.min(1, Math.max(0, (u - HOLD) / (SEG - HOLD)));
    const A = MODES[k], B = MODES[(k + 1) % 4];
    return { mode: [A[0], A[1], B[0], B[1]], sg: [A[2], B[2]], s };
  }
  function cam(t) {
    const a = 2 * Math.PI * t / 30;
    const az = 0.70 + 0.32 * Math.sin(a);
    const r = 1.75 + 0.10 * Math.cos(a), h = 0.62 + 0.06 * Math.sin(a + 1.2);
    const eye = [Math.sin(az) * r, h, Math.cos(az) * r];
    const ta = [0.05 * Math.sin(a), -0.06, 0.05 * Math.cos(a)];
    return { eye, ta, fov: 0.80, focus: Math.hypot(eye[0] - ta[0], eye[1] - ta[1], eye[2] - ta[2]) - 0.25 };
  }

  const CHLADNI = `
#define PI 3.14159265
// 판 좌표 x,z ∈ [-1,1] → X,Y ∈ [0,1]
// nm.z = ±1: 두 정상파를 빼거나(−) 더한(+) 꼴
float chl(vec2 p, vec3 nm){ vec2 q = (p + 1.0)*0.5*PI;
  return cos(nm.x*q.x)*cos(nm.y*q.y) + nm.z*cos(nm.y*q.x)*cos(nm.x*q.y); }
vec2 chlG(vec2 p, vec3 nm){ vec2 q = (p + 1.0)*0.5*PI; float n = nm.x, m = nm.y, s = nm.z;
  return 0.5*PI*vec2(-n*sin(n*q.x)*cos(m*q.y) - s*m*sin(m*q.x)*cos(n*q.y),
                     -m*cos(n*q.x)*sin(m*q.y) - s*n*cos(m*q.x)*sin(n*q.y)); }
`;

  SGL.add({
    id: "geo-cymatics", title: "소리의 무늬", en: "Cymatics", mood: ["geo", "calm"],
    desc: "소리가 판을 떨게 하면 고운 모래알이 흔들리지 않는 자리로 모여 무늬를 그립니다. 소리가 바뀔 때마다 수십만 알의 빛 모래가 춤추듯 새 무늬로 옮겨 갑니다.",
    palettes: [
      { name: "금빛 모래", colors: ["#ffcf8a", "#ff8a4a", "#fff2d8", "#0a1018"] },
      { name: "달빛 물", colors: ["#a8dcff", "#7a6cff", "#f0f8ff", "#060a16"] },
      { name: "자개", colors: ["#ffb0d8", "#7ae0ff", "#fff0c8", "#0e0a16"] },
      { name: "청록 숨", colors: ["#7affd0", "#3a9cff", "#f0ffe8", "#04100e"] },
    ],
    post: { exposure: 1.0, bloom: 0.10, sat: 1.12, contrast: 1.10, vignette: 0.36, grain: 0.012 },
    src: CHLADNI + `
#define STEPS 1
uniform vec3 uEye, uTa; uniform float uFov, uS, uFocus, uAp; uniform vec4 uMode; uniform vec2 uSg;
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){ ro = uEye; ta = uTa; fov = uFov; }
float box(vec3 rd, vec3 c, vec2 hs){
  vec3 d = normalize(c); vec3 u = normalize(cross(d, vec3(0.0, 1.0, 0.0))); vec3 v = cross(u, d);
  float k = dot(rd, d); if(k <= 0.0) return 0.0;
  vec2 q = vec2(dot(rd, u), dot(rd, v))/k;
  return smoothstep(hs.x, hs.x*0.55, abs(q.x))*smoothstep(hs.y, hs.y*0.55, abs(q.y));
}
vec3 env(vec3 rd){
  vec3 c = uC3*0.05*(0.5 + 0.5*clamp(rd.y + 0.3, 0.0, 1.0));
  // 판을 둘러싼 띠 조명 두 줄 (판에 비치면 물결 따라 일렁인다)
  float az = atan(rd.x, rd.z);
  float seg = smoothstep(0.15, 0.6, 0.5 + 0.5*cos(az*3.0 + 0.6));
  c += mix(uC1, uC2, 0.45)*0.30*smoothstep(0.035, 0.0, abs(rd.y - 0.30))*seg;
  c += mix(uC1, uC0, 0.3)*0.14*smoothstep(0.06, 0.0, abs(rd.y - 0.17))*(1.0 - 0.6*seg);
  c += mix(uC2, uC1, 0.5)*0.10*smoothstep(0.6, 1.0, rd.y);                          // 위쪽 큰 빛
  return c;
}
// 위에서 내리는 빛기둥 속 안개 (세로 결이 있는 빛살)
vec3 haze(vec3 ro, vec3 rd, float tend){
  vec3 col = vec3(0.0);
  float dt = min(tend, 7.0)/24.0, t = dt*rnd();
  for(int i=0;i<24;i++){
    vec3 p = ro + rd*t;
    vec2 q = p.xz - vec2(0.0, -0.15) + p.xz*p.y*0.10;
    float r = length(q);
    float beam = exp(-r*r*1.6)*smoothstep(-0.02, 0.5, p.y)*smoothstep(4.5, 1.2, p.y);
    float n = vn3(vec3(q*5.0, p.y*0.25 - 0.3*sin(TAU*uT/T)));
    col += (mix(uC1, uC2, 0.6)*beam*(0.25 + 1.4*n*n) + uC3*0.12)*dt;
    t += dt;
  }
  return col*0.016;
}
vec3 wave(vec2 p, out float glow){
  vec3 A = vec3(uMode.xy, uSg.x), B = vec3(uMode.zw, uSg.y);
  float fa = chl(p, A), fb = chl(p, B);
  vec2 ga = chlG(p, A), gb = chlG(p, B);
  float da = abs(fa)/(length(ga) + 0.6), db = abs(fb)/(length(gb) + 0.6);
  float s = uS*uS*(3.0 - 2.0*uS);
  glow = mix(0.6*exp(-da*da*500.0) + 0.22*exp(-fa*fa*30.0), 0.6*exp(-db*db*500.0) + 0.22*exp(-fb*fb*30.0), s);
  float vib = cos(TAU*uT/T*15.0);
  return vec3(mix(fa, fb, s), 0.0, 0.0) + vec3(0.0, mix(ga, gb, s))*vib;
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 ro = uEye;
  vec3 col = env(rd);
  float tend = 9.0;
  // 판: x,z ∈ [-1,1], 윗면 y=0, 두께 0.06
  vec3 bmin = vec3(-1.0, -0.06, -1.0), bmax = vec3(1.0, 0.0, 1.0);
  vec3 ird = 1.0/rd, t0 = (bmin - ro)*ird, t1 = (bmax - ro)*ird;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float ta = max(max(tn.x, tn.y), tn.z), tb = min(min(tf.x, tf.y), tf.z);
  if(ta < tb && ta > 0.0){
    tend = ta;
    vec3 p = ro + rd*ta;
    if(p.y > -0.0005){
      // 초점 밖이면 판도 번진다: 착란원 반지름(세계 단위) 안의 다섯 점을 평균
      float z = dot(p - ro, normalize(uTa - uEye));
      float rb = uAp*abs(z - uFocus)*tan(uFov*0.5);
      float a0 = rnd()*TAU;
      vec3 acc = vec3(0.0);
      for(int k=0;k<5;k++){
        vec2 o = k == 0 ? vec2(0.0) : rb*0.75*vec2(cos(a0 + float(k)*1.5708), sin(a0 + float(k)*1.5708));
        vec2 q = p.xz + o;
        float glow; vec3 w = wave(q, glow);
        vec3 n = normalize(vec3(-w.y*0.0045, 1.0, -w.z*0.0045));
        float cv = max(dot(n, -rd), 0.0);
        float F = 0.03 + 0.97*pow(1.0 - cv, 5.0);
        vec3 c = env(reflect(rd, n))*F*1.3 + uC3*0.035;
        // 모래 빛이 젖은 판에 번진 웅덩이
        float edge = smoothstep(1.0, 0.94, max(abs(q.x), abs(q.y)));
        c += mix(uC0, uC1, 0.45)*glow*0.022*edge;
        acc += c;
      }
      col = acc/5.0;
      // 가장자리 금속 띠
      float rim = smoothstep(0.985, 0.998, max(abs(p.x), abs(p.z)));
      col = mix(col, env(normalize(vec3(sign(p.x)*step(abs(p.z), abs(p.x)), 0.6, sign(p.z)*step(abs(p.x), abs(p.z)))))*1.4 + uC2*0.08, rim);
    } else {
      // 옆면: 어두운 금속
      vec3 n = abs(p.x) > 0.999 ? vec3(sign(p.x), 0.0, 0.0) : vec3(0.0, 0.0, sign(p.z));
      col = env(reflect(rd, n))*0.35 + uC3*0.02;
    }
  }
  col += haze(ro, rd, tend);
  return col;
}
`,
    init(G, ctx) {
      const gl = G.gl;
      const NG = ctx.cap ? 420000 : 240000, NM = 4000;
      const VS = `#version 300 es
uniform float uT, uGain, uE, uH, uFocus, uAp, uMir, uS, uNG, uPx, uMaxPx;
uniform vec4 uMode; uniform vec2 uSg; uniform mat4 uVP; uniform vec3 uEye, uC0, uC1, uC2, uC3;
out vec3 vCol; out float vSz;
#define TAU 6.2831853
#define T 30.0
${CHLADNI}
uint pcg(uint v){ uint s = v*747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s)*277803737u; return (w >> 22u) ^ w; }
float U(inout uint s){ s = pcg(s); return float(s)/4294967295.0; }
vec2 home(vec2 p, vec3 nm, int steps){
  for(int i=0;i<8;i++){ if(i >= steps) break;
    float f = chl(p, nm); vec2 g = chlG(p, nm);
    vec2 d = f*g/(dot(g, g) + 0.02);
    float l = length(d); if(l > 0.10) d *= 0.10/l;
    p -= d;
  }
  return clamp(p, -0.992, 0.992);
}
void main(){
  int id = gl_VertexID;
  uint sd = uint(id)*2654435761u + 12345u;
  float r0 = U(sd), r1 = U(sd), r2 = U(sd), r3 = U(sd), r4 = U(sd), r5 = U(sd), r6 = U(sd), r7 = U(sd);
  float ph = TAU*uT/T;
  vec3 pos; vec3 col; float bright;
  float facet = 0.0;
  if(float(id) < uNG){
    vec2 seed = vec2(r0, r1)*2.0 - 1.0;
    int steps = r2 < 0.78 ? 8 : (r2 < 0.96 ? 2 : 0);
    vec2 hA = home(seed, vec3(uMode.xy, uSg.x), steps), hB = home(seed, vec3(uMode.zw, uSg.y), steps);
    // 모래 띠 두께: 가는 떨림
    vec2 jit = (vec2(r3 + r4 + r7, r5 + r6 + r0) - 1.5)*0.011;
    float e = clamp((uS - 0.38*r7)/0.62, 0.0, 1.0); e = e*e*(3.0 - 2.0*e);
    float fly = sin(3.14159*e);
    vec2 xz = mix(hA, hB, e) + jit + (vec2(r4, r3) - 0.5)*0.16*fly;
    float nb = 2.0 + floor(r6*3.0);
    float hop = fly*abs(sin(3.14159*e*nb))*(0.03 + 0.09*r5*r5);
    // 머무는 동안에도 판이 떨려 알이 아주 조금 춤춘다 (30초에 정수 번)
    xz += 0.0022*vec2(sin(ph*41.0 + r0*TAU), cos(ph*37.0 + r1*TAU));
    xz = clamp(xz, -0.995, 0.995);
    pos = vec3(xz.x, 0.0035 + hop, xz.y);
    // 색: 판 가운데는 주조색, 바깥으로 갈수록 둘째 색, 드문드문 밝은 알
    float rr = length(xz);
    vec3 base = mix(uC0, uC1, smoothstep(0.2, 1.25, rr + 0.35*(r3 - 0.5)));
    base = r6 > 0.92 ? uC2*1.6 : base;
    bright = (steps == 8 ? 1.0 : (steps == 2 ? 0.6 : 0.35))*(0.45 + 1.1*r4*r4);
    col = base*bright*(1.0 + 0.6*fly);
    // 반짝임: 알의 면 하나가 빛을 반사하는 순간. 면은 천천히 돈다(정수 바퀴)
    float fa = r5*TAU + ph*(1.0 + floor(r6*2.0)) + e*TAU*2.0;
    float ct = r4, stt = sqrt(1.0 - ct*ct);
    vec3 nrm = vec3(cos(fa)*stt, ct, sin(fa)*stt);
    vec3 L = normalize(vec3(0.08, 1.0, -0.35));
    vec3 V = normalize(uEye - pos);
    float g = pow(max(dot(nrm, normalize(L + V)), 0.0), 500.0)*step(0.45, r7);
    col += mix(uC2, vec3(1.0), 0.4)*g*40.0;
  } else {
    // 공기 속 먼지: 판 위를 천천히 떠돈다
    vec3 b = vec3(r0*7.0 - 3.5, 0.06 + r1*r1*1.8, r2*6.0 - 4.4);
    b += vec3(0.08*sin(ph + r3*TAU), 0.05*sin(ph*2.0 + r4*TAU), 0.08*cos(ph + r5*TAU));
    pos = b;
    col = mix(mix(uC0, uC1, r3), uC2, r6*r6)*(0.02 + 0.16*r7*r7*r7);
    bright = 1.0;
  }
  if(uMir > 0.5){
    if(pos.y < 0.012){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vCol = vec3(0.0); vSz = 1.0; gl_PointSize = 1.0; return; }
    pos.y = -pos.y; col *= 0.22;
  }
  vec4 c0 = uVP*vec4(pos, 1.0);
  if(c0.w < 0.05){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vCol = vec3(0.0); vSz = 1.0; gl_PointSize = 1.0; return; }
  float coc = uAp*abs(c0.w - uFocus)/c0.w*uH;
  float sz = sqrt(uPx*uPx + coc*coc);
  sz = min(sz, uMaxPx);
  float I = uPx*uPx/(sz*sz);
  gl_Position = c0;
  gl_PointSize = sz + 1.0;
  vSz = sz;
  vCol = col*I*uE*uGain;
}`;
      const FS = `#version 300 es
precision highp float; in vec3 vCol; in float vSz; out vec4 o;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float k = (vSz + 1.0)/vSz;
  float r = length(c)*2.0*k;
  float gs = exp(-r*r*2.2);
  float disc = smoothstep(1.0, 1.0 - 2.5/vSz, r)*(0.75 + 0.35*r*r)*0.42;
  float a = mix(gs, disc, smoothstep(2.5, 6.0, vSz));
  o = vec4(vCol*a, 1.0);
}`;
      return { prog: SGL.program(gl, VS, FS), NG, N: NG + NM, vao: gl.createVertexArray() };
    },
    draw(G, st, t, ctx) {
      const S = state(t), C = cam(t);
      SGL.drawRay(G, this.src, t, ctx, { uEye: C.eye, uTa: C.ta, uFov: C.fov, uS: S.s, uMode: S.mode, uSg: S.sg, uFocus: C.focus, uAp: AP });
      const VP = SGL.mul(SGL.perspective(C.fov, ctx.W / ctx.H, 0.05, 50), SGL.lookAt(C.eye, C.ta, [0, 1, 0]));
      G.custom((gl, c) => {
        const u = st.prog.u;
        gl.useProgram(st.prog.p);
        const px = Math.max(1.2, 1.6 * ctx.H / 1080);
        gl.uniform1f(u.uT, t); gl.uniform1f(u.uGain, c.gain); gl.uniform1f(u.uS, S.s);
        gl.uniform4fv(u.uMode, S.mode); gl.uniform2fv(u.uSg, S.sg);
        gl.uniform1f(u.uH, ctx.H); gl.uniform1f(u.uPx, px); gl.uniform1f(u.uMaxPx, 26 * ctx.H / 1080);
        gl.uniform1f(u.uFocus, C.focus); gl.uniform1f(u.uAp, AP);
        gl.uniform1f(u.uNG, st.NG);
        // 알 하나의 빛 에너지: 해상도·알 수가 달라도 같은 밝기
        gl.uniform1f(u.uE, 0.16 * (420000 / st.NG) * (ctx.H / 1080) * (ctx.H / 1080) / (px * px / 2.56));
        gl.uniformMatrix4fv(u.uVP, false, VP);
        gl.uniform3fv(u.uEye, C.eye);
        ["uC0", "uC1", "uC2", "uC3"].forEach((k, i) => u[k] && gl.uniform3fv(u[k], ctx.colors[i]));
        gl.bindVertexArray(st.vao);
        gl.uniform1f(u.uMir, 1); gl.drawArrays(gl.POINTS, 0, st.N);
        gl.uniform1f(u.uMir, 0); gl.drawArrays(gl.POINTS, 0, st.N);
      });
    },
  });
})();
