/* 스튜디오 GL — ArtWork Studio 대표작을 그리는 공통 틀
 *
 * 화면 틀은 bomnal-gl(HDR · 번짐 · AgX · 그레인 · 디더)을 그대로 쓰고, 여기에는 작품들이
 * 같이 쓰는 것만 둔다.
 *   - 카메라 행렬(원근 · lookAt)
 *   - 셰이더 프로그램 만들기
 *   - 광선 행진 작품의 머리말(RAY): 잡음 · 거리장 도우미 · GGX · 스튜디오 조명(소프트박스 반사)
 *
 * 작품은 works/<id>.js 에서 SGL.add({...}) 로 등록한다.
 *   id · title · en · desc · mood(calm·vivid·nature·geo·cosmos) · palettes[{name, colors[hex]}]
 *   post: bomnal-gl 마무리 값 · init(G, ctx) → 상태 · draw(G, st, t, ctx)
 * 모든 작품은 T(30초) 주기로 완전히 돈다. t 는 0..T 초. 결정론: 같은 t 는 같은 그림.
 *
 * 기법 출처(코드를 옮기지 않고 다시 구현함):
 *   ABC 흐름(Arnold–Beltrami–Childress) · Thomas·Aizawa 끌개 · Inigo Quilez 거리장/잡음 글들 ·
 *   Karis 2013 PBR 노트(GGX) · Jimenez 2014 번짐(bomnal-gl)
 */
(function (global) {
  "use strict";
  const T = 30;
  const works = [];

  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(e, c, u) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
    let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx;
    l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  }
  function mul(a, b) {             // 열 우선 4×4: a·b
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
    }
    return o;
  }
  function program(gl, vs, fs) {
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + "\n" + src.split("\n").map((l, i) => (i + 1) + ": " + l).join("\n").slice(0, 4000)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  }

  /* 광선 행진 작품 머리말. bomnal-gl background() 안에 붙는다 (uv · uRes · o 는 거기서 선언됨) */
  const RAY = `
uniform float uGain, uT, uSeed;
uniform vec3 uC0, uC1, uC2, uC3;
#define TAU 6.2831853
#define T 30.0
float h11(float p){ p = fract(p*0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
vec3 h33(vec3 p){ p = fract(p*vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx)*p.zyx); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float n = dot(i, vec3(1.0, 57.0, 113.0));
  return mix(mix(mix(h11(n), h11(n+1.0), f.x), mix(h11(n+57.0), h11(n+58.0), f.x), f.y),
             mix(mix(h11(n+113.0), h11(n+114.0), f.x), mix(h11(n+170.0), h11(n+171.0), f.x), f.y), f.z); }
float fbm3(vec3 p){ float s = 0.0, a = 0.5; for(int i=0;i<5;i++){ s += a*vn3(p); p = p*2.03 + 1.7; a *= 0.5; } return s; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0)/k; return min(a, b) - h*h*k*0.25; }
vec3 spectral(float x){ vec3 c = clamp(1.0 - abs(4.0*(x - vec3(0.75, 0.5, 0.25))), 0.0, 1.0); return c*c; }
uint SEED;
float rnd(){ SEED = SEED*747796405u + 2891336453u; uint w = ((SEED >> ((SEED >> 28u) + 4u)) ^ SEED)*277803737u; return float((w >> 22u) ^ w)/4294967295.0; }
vec3 rndDir(){ float z = rnd()*2.0 - 1.0, a = rnd()*TAU, r = sqrt(max(1.0 - z*z, 0.0)); return vec3(r*cos(a), r*sin(a), z); }
// 팔레트 네 색 사이를 부드럽게
vec3 pal(float x){ x = fract(x)*4.0; vec3 a = x < 1.0 ? mix(uC0, uC1, x) : (x < 2.0 ? mix(uC1, uC2, x - 1.0) : (x < 3.0 ? mix(uC2, uC3, x - 2.0) : mix(uC3, uC0, x - 3.0))); return a; }
// GGX 하이라이트
float ggx(vec3 n, vec3 v, vec3 l, float rough){
  vec3 h = normalize(v + l); float a = max(rough*rough, 0.002), a2 = a*a;
  float nh = max(dot(n, h), 0.0), nl = max(dot(n, l), 0.0), nv = max(dot(n, v), 1e-3);
  float d = nh*nh*(a2 - 1.0) + 1.0; float D = a2/(3.14159*d*d);
  float k = a*0.5; float G = nv/(nv*(1.0 - k) + k)*nl/(nl*(1.0 - k) + k);
  return D*G/(4.0*nv*max(nl, 1e-3) + 1e-4)*nl;
}
`;

  /* 광선 행진 작품의 몸통. 장면은 RAY 뒤, 이것 앞에 다음을 둔다.
     float map(vec3 p) · void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit)
     vec3 env(vec3 rd)  배경이자 반사에 비치는 세상 · void camera(float t, out vec3 ro, out vec3 ta, out float fov)
     #define LKD 조명 방향 · #define KEYC 조명 세기  (없으면 기본) */
  const RAY_MAIN = `
#ifndef LKD
#define LKD vec3(-0.5, 0.75, -0.45)
#endif
#ifndef KEYC
#define KEYC vec3(2.4, 2.3, 2.2)
#endif
#ifndef STEPS
#define STEPS 180
#endif
#ifndef MAXD
#define MAXD 40.0
#endif
uniform float uAA;
#ifndef HAS_BG
vec3 bg(vec3 rd){ return env(rd); }
#endif
float march(vec3 ro, vec3 rd, int steps){
  float t = 0.0;
  for(int i=0;i<STEPS;i++){ if(i >= steps) break; float h = map(ro + rd*t); if(h < 0.0003*(1.0 + t)) return t; t += h*0.9; if(t > MAXD) break; }
  return -1.0;
}
vec3 calcN(vec3 p){ vec2 e = vec2(0.0006, -0.0006); return normalize(e.xyy*map(p + e.xyy) + e.yyx*map(p + e.yyx) + e.yxy*map(p + e.yxy) + e.xxx*map(p + e.xxx)); }
float shadow(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.02, ph = 1e10;
  for(int i=0;i<56;i++){ float h = map(ro + rd*t); float y = h*h/(2.0*ph), d = sqrt(max(h*h - y*y, 0.0)); res = min(res, 18.0*d/max(1e-4, t - y)); ph = h; t += clamp(h, 0.01, 0.25); if(res < 0.002 || t > 10.0) break; }
  res = clamp(res, 0.0, 1.0); return res*res*(3.0 - 2.0*res);
}
float ao(vec3 p, vec3 n){ float o = 0.0, s = 1.0; for(int i=1;i<=5;i++){ float h = 0.02 + 0.06*float(i); o += (h - map(p + n*h))*s; s *= 0.7; } return clamp(1.0 - 2.0*o, 0.0, 1.0); }
vec3 shadeLite(vec3 p, vec3 n, vec3 rd){
  vec3 alb = vec3(0.5); float rough = 0.5, metal = 0.0; vec3 emit = vec3(0.0);
  material(p, n, alb, rough, metal, emit);
  vec3 L = normalize(LKD);
  return alb*(1.0 - metal)*(KEYC*max(dot(n, L), 0.0) + env(n)*0.6) + alb*metal*env(reflect(rd, n))*0.8 + emit;
}
vec3 shade(vec3 p, vec3 n, vec3 rd){
  vec3 alb = vec3(0.5); float rough = 0.5, metal = 0.0; vec3 emit = vec3(0.0);
  material(p, n, alb, rough, metal, emit);
  vec3 L = normalize(LKD + rndDir()*0.04);
  float nl = max(dot(n, L), 0.0);
  float sh = nl > 0.0 ? shadow(p + n*0.004, L) : 0.0;
  float o = ao(p, n);
  float cv = max(dot(n, -rd), 1e-3);
  vec3 F0 = mix(vec3(0.04), alb, metal);
  vec3 F = F0 + (1.0 - F0)*pow(1.0 - cv, 5.0);
  vec3 col = alb*(1.0 - metal)*(KEYC*nl*sh + env(n)*0.55*o);
  col += KEYC*min(ggx(n, -rd, L, rough), 60.0)*F*sh;
  // 거칠기만큼 흐린 반사 한 번 (물체끼리도 비친다)
  vec3 r = normalize(reflect(rd, n) + rndDir()*rough*rough*1.2);
  if(dot(r, n) < 0.0) r = reflect(r, n);
  float tr = march(p + n*0.004, r, 96);
  vec3 rc = tr > 0.0 ? shadeLite(p + n*0.004 + r*tr, calcN(p + n*0.004 + r*tr), r) : env(r);
  col += rc*F*(1.0 - 0.6*rough)*mix(1.0, o, 0.6);
  return col + emit;
}
void main(){
  vec3 acc = vec3(0.0);
  int n = int(uAA);
  for(int j=0;j<4;j++){ if(j >= n) break;
    for(int i=0;i<4;i++){ if(i >= n) break;
      SEED = uint(gl_FragCoord.x)*1973u + uint(gl_FragCoord.y)*9277u + uint(i + j*4)*26699u + uint(uT*997.0)*1013u + 1u;
      vec2 off = (vec2(float(i), float(j)) + 0.5)/uAA - 0.5;
      vec2 sp = ((gl_FragCoord.xy + off)/uRes*2.0 - 1.0)*vec2(uRes.x/uRes.y, 1.0);
      vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
      vec3 cw = normalize(ta - ro), cu = normalize(cross(cw, vec3(0, 1, 0))), cv = cross(cu, cw);
      vec3 rd = normalize(sp.x*cu + sp.y*cv + cw/tan(fov*0.5));
      float t = march(ro, rd, STEPS);
      vec3 c = t > 0.0 ? shade(ro + rd*t, calcN(ro + rd*t), rd) : bg(rd);
#ifdef FOG
      c = mix(bg(rd), c, exp(-(t > 0.0 ? t : MAXD)*FOG));         // 멀수록 배경빛 안개
#endif
      acc += c;
    }
  }
  vec3 fin = acc/(uAA*uAA);
  if(any(isnan(fin)) || any(isinf(fin))) fin = vec3(0.0);
  o = vec4(min(max(fin, 0.0), vec3(200.0))*uGain, 1.0);
}`;

  /* 광선 행진 작품을 그리는 공통 draw */
  function drawRay(G, src, t, ctx, extra) {
    const u = Object.assign({ uT: t, uAA: ctx.aa, uC0: ctx.colors[0], uC1: ctx.colors[1], uC2: ctx.colors[2], uC3: ctx.colors[3] }, extra || {});
    G.background(RAY + src + RAY_MAIN, u);
  }

  /* 빛의 선 (삶의 선 연작, 2026-11-02)
     선 하나를 이어진 띠로 그린다. 마디마다 앞뒤 점으로 접선을 구해 두 마디가 같은 꼭짓점을 쓰므로
     겹쳐 더해지는 곳(구슬 무늬)이 없다. 굵기는 세계 단위(원근에 따라 가늘어짐)이고, 1.5px 아래는 밝기를 줄여 에너지를 맞춘다.
     초점 거리 밖의 선은 넓고 옅어진다(피사계 심도, 에너지 보존).
     body 는 다음을 정의한다:  vec3 LP(float id, float u, out vec3 col, out float w)
       id 선 번호 · u 선 위 위치 0..1 · col 빛(선형, 1 넘어도 됨) · w 굵기(세계 단위)
     body 앞에는 uT · uN · uC0..3 · TAU · T · h11 · h3 · vn3 · fbm3 · pal · rotA 가 있다. */
  const LINE_HEAD = `#version 300 es
uniform float uT, uGain, uH, uAsp, uF, uK, uN, uFocus, uAp;
uniform mat4 uVP; uniform vec3 uC0, uC1, uC2, uC3; uniform vec4 uP;
out vec3 vCol; out float vS; out float vPx;
#define TAU 6.2831853
#define T 30.0
float h11(float p){ p = fract(p*0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
vec3 h3(float n){ vec3 p = fract(vec3(n)*vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.xxy + p.yzz)*p.zyx); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float n = dot(i, vec3(1.0, 57.0, 113.0));
  return mix(mix(mix(h11(n), h11(n+1.0), f.x), mix(h11(n+57.0), h11(n+58.0), f.x), f.y),
             mix(mix(h11(n+113.0), h11(n+114.0), f.x), mix(h11(n+170.0), h11(n+171.0), f.x), f.y), f.z); }
float fbm3(vec3 p){ float s = 0.0, a = 0.5; for(int i=0;i<3;i++){ s += a*vn3(p); p = p*2.03 + 1.7; a *= 0.5; } return s; }
vec3 pal(float x){ x = fract(x)*4.0; return x < 1.0 ? mix(uC0, uC1, x) : (x < 2.0 ? mix(uC1, uC2, x - 1.0) : (x < 3.0 ? mix(uC2, uC3, x - 2.0) : mix(uC3, uC0, x - 3.0))); }
vec3 rotA(vec3 v, vec3 a, float t){ float c = cos(t), s = sin(t); return v*c + cross(a, v)*s + a*dot(a, v)*(1.0 - c); }
`;
  const LINE_MAIN = `
void main(){
  int K = int(uK);
  int per = (K - 1)*6;
  int line = gl_VertexID/per; int r = gl_VertexID - line*per;
  int seg = r/6; int c = r - seg*6;
  int along = (c == 1 || c == 2 || c == 4) ? 1 : 0;
  float side = (c == 2 || c == 4 || c == 5) ? 1.0 : -1.0;
  float fid = float(line);
  float du = 1.0/float(K - 1);
  float u = float(seg + along)*du;
  vec3 col, cc; float w, ww;
  vec3 p = LP(fid, u, col, w);
  vec3 pa = LP(fid, max(u - du, 0.0), cc, ww);
  vec3 pb = LP(fid, min(u + du, 1.0), cc, ww);
  vec4 c0 = uVP*vec4(p, 1.0), ca = uVP*vec4(pa, 1.0), cb = uVP*vec4(pb, 1.0);
  if(c0.w < 0.05){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vCol = vec3(0.0); vS = 0.0; vPx = 1.0; return; }
  vec2 s0 = c0.xy/c0.w, sa = ca.xy/max(ca.w, 0.05), sb = cb.xy/max(cb.w, 0.05);
  vec2 dir = (sb - sa)*vec2(uAsp, 1.0);
  dir = length(dir) > 1e-7 ? normalize(dir) : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float px = w*uF/c0.w*uH*0.5;
  float coc = uAp*abs(c0.w - uFocus)/c0.w*uH;                     // 초점 밖 번짐(px)
  float tot = sqrt(px*px + coc*coc);
  float I = px/max(tot, 1e-4);
  if(tot < 1.5){ I *= tot/1.5; tot = 1.5; }
  float half_ = tot*0.5 + 1.0;
  vec2 off = nrm*half_*2.0/uH; off.x /= uAsp;
  gl_Position = vec4((s0 + off*side)*c0.w, c0.z, c0.w);
  vS = side*half_/(tot*0.5);
  vPx = tot;
  vCol = col*I*uGain;
}`;
  const LINE_FS = `#version 300 es
precision highp float; in vec3 vCol; in float vS; in float vPx; out vec4 o;
void main(){
  float s = abs(vS);
  float edge = 1.0 + 2.0/vPx;
  float a = (1.0 - smoothstep(1.0 - 1.0/vPx, edge, s))*(0.55 + 0.45*exp(-s*s*5.0));
  o = vec4(vCol*a, 1.0);
}`;
  function lines(gl, body) {
    const prog = program(gl, LINE_HEAD + body + LINE_MAIN, LINE_FS);
    const vao = gl.createVertexArray();
    return {
      prog,
      /* o: { t, VP, fov, N, K, ctx, c(custom 의 c), focus, aperture, P(vec4) } */
      draw(gl, o) {
        const u = prog.u;
        gl.useProgram(prog.p);
        gl.uniform1f(u.uT, o.t); gl.uniform1f(u.uGain, o.c.gain);
        gl.uniform1f(u.uH, o.ctx.H); gl.uniform1f(u.uAsp, o.ctx.W / o.ctx.H);
        gl.uniform1f(u.uF, 1 / Math.tan(o.fov / 2)); gl.uniform1f(u.uK, o.K); gl.uniform1f(u.uN, o.N);
        gl.uniform1f(u.uFocus, o.focus || 5); gl.uniform1f(u.uAp, o.aperture || 0);
        if (u.uP) gl.uniform4fv(u.uP, o.P || [0, 0, 0, 0]);
        gl.uniformMatrix4fv(u.uVP, false, o.VP);
        ["uC0", "uC1", "uC2", "uC3"].forEach((k, i) => u[k] && gl.uniform3fv(u[k], o.ctx.colors[i]));
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, o.N * (o.K - 1) * 6);
      },
    };
  }
  /* 카메라 묶음: 눈·목표·화각 → VP */
  function cam(ctx, eye, ta, fov) {
    return mul(perspective(fov, ctx.W / ctx.H, 0.05, 80), lookAt(eye, ta, [0, 1, 0]));
  }

  /* 선 작품 공통 틀. 작품은 body(LP) · N · K · camera(t, ctx) → {eye, ta, fov, focus, ap} · bg(선택) 를 둔다.
     bg 는 RAY 머리말 + uEye·uTa·uFov 와 RD()(이 화소의 광선 방향) 위에서 main 을 쓴다.
     init/draw 는 SGL.lineInit/lineDraw 를 부른다 (목록 만드는 도구는 SGL.add 만 알면 되게). */
  const BGHEAD = RAY + `
uniform vec3 uEye, uTa; uniform float uFov;
vec3 RD(){
  vec2 sp = (gl_FragCoord.xy/uRes*2.0 - 1.0)*vec2(uRes.x/uRes.y, 1.0);
  vec3 cw = normalize(uTa - uEye), cu = normalize(cross(cw, vec3(0.0, 1.0, 0.0))), cv = cross(cu, cw);
  return normalize(sp.x*cu + sp.y*cv + cw/tan(uFov*0.5));
}
`;
  function lineInit(w, G, ctx) {
    return { L: lines(G.gl, w.body), N: typeof w.N === "function" ? w.N(ctx) : w.N, K: w.K };
  }
  function lineDraw(w, G, st, t, ctx) {
    const c = w.camera(t, ctx);
    const VP = cam(ctx, c.eye, c.ta, c.fov);
    if (w.bg) G.background(BGHEAD + w.bg, { uT: t, uEye: c.eye, uTa: c.ta, uFov: c.fov,
      uC0: ctx.colors[0], uC1: ctx.colors[1], uC2: ctx.colors[2], uC3: ctx.colors[3] });
    if (w.extra) w.extra(G, st, t, ctx, c, VP);
    G.custom((gl, cc) => st.L.draw(gl, { t, VP, fov: c.fov, N: st.N, K: st.K, ctx, c: cc, focus: c.focus, aperture: c.ap }));
  }

  /* 물방울 (방울방울, 나 연작, 2026-11-03)
     물방울 수천 개가 하늘에서 떨어져 수면(y=0)이나 먼저 앉은 방울 위에서 통통 튀다가 자리를 잡고, 모여서 형상을 이룬다.
     물방울은 화면을 향한 사각형 위에서 타원체와 광선을 직접 만나게 해 그린다(가짜 공 아님): 들어갈 때 · 나올 때 두 번 굴절(물 1.333)하고,
     지나온 길이만큼 색을 먹고(비어–람베르트), 겉면은 프레넬 반사 · 날카로운 GGX 반짝임 · 반대편에 모이는 빛(커스틱)을 얹는다.
     물방울 속에 비치는 세상은 매 장면 512×256 등장방형 환경 그림(밉맵)에서 읽는다 → 물방울마다 거꾸로 뒤집힌 작은 풍경이 담긴다.
     수면은 거울: 방울을 한 번 더 뒤집어(거울 눈에서 본 진짜 방울) 그리고, 수면에 닿는 순간마다 동그란 물결(최근 32개)을 그린다.
     방울 자리 · 튀기 · 찌그러짐은 JS 에서 t 의 함수로 계산하고, 매 하위 프레임마다 멀리서 가까이 순서로 정렬해 그린다(가장자리 해석적 AA).
     작품이 두는 것:
       scene (GLSL) — vec3 sky(vec3 rd) 하늘 · 먼 숲(물에 비칠 세상) · vec3 pond(vec3 p, vec3 rd) 물 속 빛깔 · vec3 tint(float k) 방울 색(투과색 0..1)
       build(N, ctx) → [{x,y,z,r,k, land, stay, E, leave:'rise'|'sink', h1?}]  (land 초: 처음 닿는 때, stay: 머무는 시간, E: 사라지는 시간)
       camera(t, ctx) → {eye, ta, fov} · light(t, ctx) → {dir, key}  · N(ctx) · dens(색 진하기) · haze */
  const DCOM = `#version 300 es
precision highp float;
uniform vec2 uRes;
` + RAY + `
uniform vec3 uEye, uL, uKey; uniform vec4 uRip[32]; uniform float uHaze;
`;
  const DWORLD = `
vec2 ripG(vec2 q){
  vec2 g = vec2(0.0);
  for(int i=0;i<32;i++){
    vec4 R = uRip[i]; if(R.w <= 0.0) continue;
    vec2 d = q - R.xy; float r = length(d) + 1e-4;
    float age = R.z, front = 0.06 + 0.55*age, x = r - front;
    float w = 0.05 + 0.10*age;
    float env_ = exp(-x*x/(w*w))*R.w*exp(-age*1.1)/(1.0 + 3.0*r);
    float k = 34.0/(1.0 + 0.8*age);
    float dh = env_*(k*cos(k*x) - 2.0*x/(w*w)*sin(k*x));
    g += dh*d/r;
  }
  return g;
}
#ifndef WATERF
#define WATERF 0.16
#endif
vec3 world(vec3 ro, vec3 rd){
  if(rd.y < -1e-4 && ro.y > 0.0){
    float s = -ro.y/rd.y; vec3 p = ro + rd*s;
    float ph = TAU*uT/T;
    vec2 cs = 0.35*vec2(cos(ph), sin(ph));
    vec2 g = ripG(p.xz)*0.012;
    g += 0.018*(vec2(vn3(vec3(p.xz*vec2(1.2, 5.0) + cs, 1.0)), vn3(vec3(p.xz*vec2(1.2, 5.0) + cs, 7.0))) - 0.5);   // 바람결 잔물결
    vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
    vec3 r = reflect(rd, n); r.y = abs(r.y) + 0.002;
    float F = 0.02 + 0.98*pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
    F = mix(WATERF, 1.0, F);
    vec3 c = mix(pond(p, rd), sky(normalize(r)), F);
    return mix(c, sky(normalize(vec3(rd.x, 0.015, rd.z))), 1.0 - exp(-s*uHaze));
  }
  return sky(rd);
}
`;
  const DFS_VS = `#version 300 es
const vec2 Q[6] = vec2[6](vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0));
out vec2 uv;
void main(){ vec2 p = Q[gl_VertexID]; uv = p*0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const DBG_FS = `
in vec2 uv; out vec4 o;
uniform vec3 uTa; uniform float uFov, uEnvPass;
void main(){
  vec3 rd;
  if(uEnvPass > 0.5){
    float az = (uv.x - 0.5)*TAU, el = (1.0 - uv.y)*3.14159265;          // 등장방형: 위가 v=0
    float se = sin(el); rd = vec3(se*sin(az), -cos(el), -se*cos(az));
    o = vec4(world(vec3(0.0, 0.9, 0.0), rd), 1.0);
  } else {
    vec2 sp = (gl_FragCoord.xy/uRes*2.0 - 1.0)*vec2(uRes.x/uRes.y, 1.0);
    vec3 cw = normalize(uTa - uEye), cu = normalize(cross(cw, vec3(0.0, 1.0, 0.0))), cv = cross(cu, cw);
    rd = normalize(sp.x*cu + sp.y*cv + cw/tan(uFov*0.5));
    o = vec4(world(uEye, rd), 1.0);
  }
}`;
  const DROP_VS = `#version 300 es
layout(location=0) in vec4 aA; layout(location=1) in vec4 aB; layout(location=2) in vec4 aC;
uniform mat4 uVP; uniform vec3 uEye; uniform float uMir, uPx, uFocus, uAp;
out vec3 vW; flat out vec4 vA; flat out vec4 vB; flat out vec4 vC;
const vec2 Q[6] = vec2[6](vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0));
void main(){
  vec3 c = aA.xyz; if(uMir > 0.5) c.y = -c.y;
  vec3 f = normalize(c - uEye), rt = normalize(cross(f, vec3(0.0, 1.0, 0.0))), up = cross(rt, f);
  float dist = length(c - uEye);
  float coc = uAp*abs(dist - uFocus)/dist;                         // 초점 밖 번짐 (화면 높이 비율)
  float R = aA.w*max(aB.x, aB.y)*1.18 + 2.5*uPx*dist + coc*dist*1.2;
  vec2 q = Q[gl_VertexID];
  vW = c + (rt*q.x + up*q.y)*R;
  vA = aA; vB = aB; vC = aC;
  gl_Position = uVP*vec4(vW, 1.0);
}`;
  const DROP_FS = `
in vec3 vW; flat in vec4 vA; flat in vec4 vB; flat in vec4 vC; out vec4 o;
uniform sampler2D uEnv; uniform mat4 uVP; uniform float uMir, uPx, uDens, uFocus, uAp; uniform vec3 uL2, uKey2;
vec3 envS(vec3 d, float lod){ d = normalize(d); vec2 e = vec2(atan(d.x, -d.z)/TAU + 0.5, 1.0 - acos(clamp(-d.y, -1.0, 1.0))/3.14159265); return textureLod(uEnv, e, lod).rgb; }
void main(){
  vec3 ro = uEye, rd0 = normalize(vW - uEye), rd = rd0;
  float wS = 1e9;
  if(uMir > 0.5){ if(rd.y >= -1e-4) discard; wS = -ro.y/rd.y; ro.y = -ro.y; rd.y = -rd.y; }
  vec3 c = vA.xyz; float r = vA.w;
  vec3 Rr = vec3(vB.x, vB.y, vB.x)*r;
  vec3 oc = (ro - c)/Rr, dv = rd/Rr;
  float a = dot(dv, dv), b = dot(oc, dv), cc = dot(oc, oc) - 1.0;
  float sS = -b/a; vec3 wv = oc + dv*sS; float m = length(wv);
  float dist = length(c - ro);
  float rs = r*min(vB.x, vB.y);
  float pxw = uPx*dist/rs;
  float cw = uAp*abs(dist - uFocus)/rs;                               // 번짐 너비(방울 반지름 단위)
  float bl = cw/(cw + 1.0);
  float al = clamp((1.0 + cw*0.9 - m)/(pxw + cw*1.8) + 0.5, 0.0, 1.0)*vB.w/(1.0 + cw*cw*0.8);
  if(al < 0.002) discard;
  if(bl > 0.0){ float mm = min(m/(1.0 + cw*0.9), 0.98); wv = wv/max(m, 1e-4)*mm; m = mm; }   // 흐린 방울은 원판 전체를 고르게
  float h = bl > 0.0 ? 1.0 : b*b - a*cc;
  h = bl > 0.0 ? a*a*(1.0 - m*m)/a : h;
  float t1 = sS - sqrt(max(h, 0.0))/a;
  vec3 p1 = ro + rd*t1;
  vec3 qn = h > 0.0 ? oc + dv*t1 : wv/max(m, 1e-4);
  vec3 n = normalize(qn/Rr);
  vec3 V = -rd, L = normalize(uL);
  float cv = clamp(dot(n, V), 0.0, 1.0);
  float F = 0.02 + 0.98*pow(1.0 - cv, 5.0);
  vec3 refl = envS(reflect(rd, n), 0.6 + 4.0*bl);
  vec3 d1 = refract(rd, n, 1.0/1.333);
  vec3 oc2 = (p1 - c)/Rr, dv2 = d1/Rr;
  float a2 = dot(dv2, dv2), b2 = dot(oc2, dv2), c2 = dot(oc2, oc2) - 1.0;
  float t2 = max((-b2 + sqrt(max(b2*b2 - a2*c2, 0.0)))/a2, 0.0);
  vec3 p2 = p1 + d1*t2;
  vec3 n2 = normalize(((p2 - c)/Rr)/Rr);
  vec3 d2 = refract(d1, -n2, 1.333);
  if(dot(d2, d2) < 1e-4) d2 = reflect(d1, -n2);
  vec3 tc = tint(vB.z);
  vec3 absb = exp(-(1.0 - tc)*(t2/r)*uDens);
  vec3 trans = envS(d2, 1.2 + 4.0*bl)*absb;
  float caus = pow(max(dot(n2, -L), 0.0), 7.0);
  float rg = mix(0.045, 0.35, bl);
  float spec = min(ggx(n, V, L, rg), 60.0) + min(ggx(n, V, normalize(uL2), rg), 60.0)*dot(uKey2, vec3(0.33))/max(dot(uKey, vec3(0.33)), 1e-3);
  vec3 col = trans*(1.0 - F) + refl*F + uKey*tc*absb*caus*0.45 + uKey*spec*(0.04 + F) + tc*uKey*vC.x;
  col = mix(col, envS(vec3(rd0.x, 0.02, rd0.z), 2.0), 1.0 - exp(-dist*uHaze*0.6));
  vec3 pd = p1;
  if(uMir > 0.5){
    pd = uEye + rd0*wS;
    float Fw = mix(WATERF, 1.0, 0.02 + 0.98*pow(1.0 - max(-rd0.y, 0.0), 5.0));
    col *= 0.92; al *= Fw;
  }
  vec4 cl = uVP*vec4(pd, 1.0);
  gl_FragDepth = clamp(cl.z/cl.w*0.5 + 0.5, 0.0, 1.0);
  if(any(isnan(col))) col = vec3(0.0);
  o = vec4(min(col, vec3(80.0))*al, al);
}`;
  const DCOPY_FS = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D uTex; uniform float uGain;
void main(){ o = vec4(texture(uTex, uv).rgb*uGain, 1.0); }`;

  /* 인상파 붓질: 칸마다 짧은 붓 자국 하나. 자국 색은 그 자리 바탕색(BASE)에서 밝기 · 색이 조금 비켜 가고(깨진 색),
     방향은 FLOWA 를 따른다. 두 번에 나눠 칠해 자국끼리 겹친다. 앞에 vec3 BASE(vec2) · float FLOWA(vec2) 를 둔다. */
  const PAINT = `
vec3 dabs(vec2 p, float sc, float seed, vec3 col, float op){
  vec2 g = p*sc, i0 = floor(g);
  for(int ps=0; ps<2; ps++)
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 id = i0 + vec2(float(i), float(j));
    vec3 h = h33(vec3(id, seed));
    if((h.z < 0.5) != (ps == 0)) continue;
    vec2 c = id + 0.5 + (h.xy - 0.5)*0.9;
    vec2 wp = c/sc;
    float a = FLOWA(wp) + (h.x - 0.5)*0.6;
    vec2 d = rot(-a)*(g - c);
    float L = 0.45 + 0.55*h.y, W = 0.22 + 0.14*h.z;
    float sd = length(vec2(max(abs(d.x) - L, 0.0), d.y));
    float m = 1.0 - smoothstep(W*0.55, W, sd);
    m *= 0.78 + 0.22*sin(d.y*55.0 + h.x*30.0);                       // 붓털 결
    m *= smoothstep(L + W, L*0.2, abs(d.x))*0.5 + 0.5;               // 끝으로 갈수록 물감이 마른다
    vec3 dc = BASE(wp)*(0.72 + 0.56*h.y);
    dc = mix(dc, pal(h.x*0.7 + h.y*0.3)*dot(dc, vec3(0.4)), 0.28);
    col = mix(col, dc, clamp(m, 0.0, 1.0)*op);
  }
  return col;
}
`;
  /* 모네풍 하늘 · 먼 숲 · 연못 (방울방울, 나 연작이 같이 쓴다). 방향(방위각·고도)을 화폭 좌표로 삼아 붓질을 얹는다.
     o: tree(숲 높이 배수, 0=숲 없이 안개 띠) · cloud(구름) · bright(밝기) · pads(연잎 문턱, 1 이상=없음) · disc(해 원반) · padR(형상 둘레 비우기 반지름)
     색 역할: uC0 숲·물그늘 · uC1 하늘 · uC2 지평선 따뜻한 빛 · uC3 구름·해빛 */
  function monet(o = {}) {
    const f = (v) => (+v).toFixed(4);
    const tree = f(o.tree ?? 1), cloud = f(o.cloud ?? 0.55), bright = f(o.bright ?? 0.5), pads = f(o.pads ?? 0.62), disc = f(o.disc ?? 0), padR = f(o.padR ?? 2.3);
    return `
float TL(float az){ return ${tree}*(0.055 + 0.08*vn3(vec3(az*2.2, 0.0, 1.0)) + 0.04*sin(az*1.3 + 0.7)); }
vec3 BASE(vec2 p){
  float az = p.x/3.0, el = p.y/3.0;
  float tl = TL(az);
  vec3 c = mix(uC2*0.55 + uC3*0.25, uC1*0.85, smoothstep(0.0, 0.35, el));
  c = mix(c, uC1*uC1*1.15 + uC0*0.08, smoothstep(0.3, 1.1, el));
  float cl = vn3(vec3(az*1.6, el*6.0, 3.0))*0.65 + vn3(vec3(az*4.0, el*14.0, 5.0))*0.35;
  c = mix(c, uC3*0.95, smoothstep(0.5, 0.78, cl)*${cloud}*smoothstep(0.03, 0.2, el));
  if(el < tl){
    float f = vn3(vec3(az*7.0, el*30.0, 9.0));
    vec3 fo = mix(uC0*0.42, uC0*0.9 + uC1*0.12, f);
    fo = mix(fo, uC1*0.55 + uC2*0.15, smoothstep(0.55, 0.85, vn3(vec3(az*3.0, el*9.0, 4.0)))*0.6);
    fo = mix(fo, uC3*0.7 + uC0*0.3, smoothstep(0.62, 0.9, vn3(vec3(az*5.0, el*12.0, 6.0)))*0.5);
    fo = mix(fo, uC1*0.35, smoothstep(0.0, tl, el)*0.4);
    c = mix(fo, c, smoothstep(tl - 0.012, tl, el));
  }
  vec3 L = normalize(uL);
  float sd = abs(az - atan(L.x, -L.z)), se = el - asin(L.y);
  c += uC3*0.35*exp(-sd*sd*8.0 - el*el*40.0);
  c += (uC2*0.6 + uC3*0.4)*${disc}*(0.9*exp(-(sd*sd + se*se)*60.0) + 0.25*exp(-(sd*sd*3.0 + se*se*40.0)));
  return c*${bright};
}
float FLOWA(vec2 p){
  float az = p.x/3.0, el = p.y/3.0;
  return el < TL(az) ? 1.45 + 0.3*sin(az*9.0) : 0.08*sin(az*3.0 + el*8.0);
}
` + PAINT + `
vec3 sky(vec3 rd){
  float az = atan(rd.x, -rd.z), el = asin(clamp(rd.y, -1.0, 1.0));
  vec2 p = vec2(az, max(el, 0.0))*3.0;
  vec3 c = BASE(p);
  c = dabs(p, 7.0, 1.0, c, 0.85);
  c = dabs(p, 15.0, 2.0, c, 0.6);
  vec3 L = normalize(uL);
  float s = max(dot(rd, L), 0.0);
  return c + uKey*(0.05*pow(s, 40.0) + ${disc}*1.6*smoothstep(0.99985, 0.99993, s));
}
vec3 pond(vec3 p, vec3 rd){
  float w = vn3(vec3(p.xz*0.5, 2.0));
  vec3 c = mix(uC0*0.16, uC1*0.09 + uC0*0.05, w);
  c = mix(c, uC2*0.07 + uC1*0.05, smoothstep(0.6, 0.85, vn3(vec3(p.xz*vec2(0.4, 1.4), 8.0)))*0.6);
  vec2 q = p.xz*0.75, id = floor(q);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 cid = id + vec2(float(i), float(j));
    vec3 h = h33(vec3(cid, 11.0));
    if(h.z < ${pads}) continue;
    vec2 ctr = cid + 0.2 + 0.6*h.xy;
    if(length(ctr/0.75) < ${padR}) continue;
    vec2 d = q - ctr; float r = 0.10 + 0.20*(h.z - 0.62);
    float ang = atan(d.y, d.x);
    float notch = smoothstep(0.05, 0.25, abs(mod(ang - h.x*6.28 + 3.14159, 6.28318) - 3.14159));
    float m = (1.0 - smoothstep(r*0.85, r, length(d*vec2(1.0, 1.6))))*notch;
    vec3 pad = mix(uC0*0.30, uC0*0.75 + uC3*0.12, vn3(vec3(d*22.0, h.y*9.0)));
    pad = mix(pad, uC1*0.4, smoothstep(0.5, 0.9, vn3(vec3(d*9.0, h.x*7.0)))*0.4);
    pad = mix(pad, uC2*0.9, step(0.8, h.y)*(1.0 - smoothstep(0.0, 0.06, length(d - vec2(0.03, 0.0)))));
    c = mix(c, pad*0.7, m);
  }
  return c;
}
`;
  }
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  /* 형상(거리장 sdf(x,y,z): 안이 음수) 겉껍질을 물방울로 채운다. 겹친 방울은 몇 번 밀어 낸다. 수면 아래로는 못 간다. */
  function dropFill(o) {
    const R = rng(o.seed || 7), out = [], [x0, y0, z0, x1, y1, z1] = o.box, sh = o.shell || 2.2;
    for (let tries = 0; out.length < o.N && tries < o.N * 3000; tries++) {
      const x = x0 + (x1 - x0) * R(), y = y0 + (y1 - y0) * R(), z = z0 + (z1 - z0) * R();
      const r = o.r[0] + (o.r[1] - o.r[0]) * Math.pow(R(), o.rPow || 1.6);
      const d = o.sdf(x, y, z);
      if (o.surface != null ? Math.abs(d) > (o.band || 0.08) : (d > 0.15 * r || d < -sh * r)) continue;
      if (o.weight && R() > o.weight(x, y, z)) continue;
      out.push({ x, y: Math.max(y, r * 0.9), z, r, u: R() });
    }
    // 겉면에 앉히기: 방울 중심을 거리장 = r·surface 인 면으로 옮긴다 (보이지 않는 형상 위에 맺힌 이슬)
    const sit = () => { if (o.surface == null) return; for (const d of out) for (let k = 0; k < 3; k++) {
      const e = 1e-3, f = o.sdf(d.x, d.y, d.z), gx = o.sdf(d.x + e, d.y, d.z) - f, gy = o.sdf(d.x, d.y + e, d.z) - f, gz = o.sdf(d.x, d.y, d.z + e) - f;
      const gl_ = Math.hypot(gx, gy, gz) + 1e-9, m = (f - d.r * o.surface) / (gl_ / e);
      d.x -= gx / gl_ * m; d.y -= gy / gl_ * m; d.z -= gz / gl_ * m; } };
    sit();
    const cs = o.r[1] * 2.2 * Math.max(1, o.overlap || 0.88), key = (i, j, k) => i * 73856093 ^ j * 19349663 ^ k * 83492791;
    for (let it = 0; it < (o.relax ?? 8); it++) {
      const grid = new Map();
      out.forEach((d, n) => { const k = key(Math.floor(d.x / cs), Math.floor(d.y / cs), Math.floor(d.z / cs)); (grid.get(k) || grid.set(k, []).get(k)).push(n); });
      for (const d of out) {
        const gi = Math.floor(d.x / cs), gj = Math.floor(d.y / cs), gk = Math.floor(d.z / cs);
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
          for (const n of grid.get(key(gi + i, gj + j, gk + k)) || []) {
            const e = out[n]; if (e === d) continue;
            const dx = d.x - e.x, dy = d.y - e.y, dz = d.z - e.z, l = Math.hypot(dx, dy, dz) + 1e-6, want = (d.r + e.r) * (o.overlap || 0.88);
            if (l < want) { const p = (want - l) * 0.5 / l; d.x += dx * p; d.y += dy * p; d.z += dz * p; e.x -= dx * p; e.y -= dy * p; e.z -= dz * p; }
          }
        }
      }
      sit();
      for (const d of out) d.y = Math.max(d.y, d.r * 0.9);
    }
    return out;
  }
  /* 매개 곡면 f(u,v) → [x,y,z] 위에 이슬을 고르게 앉힌다 (넓이 비례로 뽑고 몇 번 밀어 낸다). 방울에 su·sv 를 남긴다. */
  function dropSurf(o) {
    const R = rng(o.seed || 9), out = [];
    for (let tries = 0; out.length < o.N && tries < o.N * 400; tries++) {
      const u = R(), v = R(), e = 1e-3, p = o.f(u, v), pu = o.f(u + e, v), pv = o.f(u, v + e);
      const ax = pu[0] - p[0], ay = pu[1] - p[1], az = pu[2] - p[2], bx = pv[0] - p[0], by = pv[1] - p[1], bz = pv[2] - p[2];
      const area = Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / (e * e);
      if (R() * (o.amax || 8) > area * (o.weight ? o.weight(u, v) : 1)) continue;
      const r = o.r[0] + (o.r[1] - o.r[0]) * Math.pow(R(), o.rPow || 2.5);
      out.push({ x: p[0], y: Math.max(p[1], r * 0.9), z: p[2], r, u: R(), su: u, sv: v });
    }
    for (let it = 0; it < (o.relax ?? 4); it++) for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
      const d = out[i], e = out[j], dx = d.x - e.x, dy = d.y - e.y, dz = d.z - e.z;
      const want = (d.r + e.r) * (o.overlap || 1.2); if (Math.abs(dx) > want || Math.abs(dy) > want) continue;
      const l = Math.hypot(dx, dy, dz) + 1e-6; if (l < want) { const q = (want - l) * 0.5 / l; d.x += dx * q; d.y += dy * q; d.z += dz * q; e.x -= dx * q; e.y -= dy * q; e.z -= dz * q; }
    }
    return out;
  }
  const G9 = 9.8;
  /* 방울 하나의 t 때 모습 → [x,y,z,r,sx,sy,k,a, emit] 또는 null. impacts 에 수면 물결을 보탠다. */
  function dropAt(d, t, imp) {
    const Hf = d.Hf || 7, F = Math.sqrt(2 * Hf / G9);
    const u = (((t - d.land + F) % 30) + 30) % 30;
    const yb = d.y - d.r;                                   // 앉을 바닥
    const ground = yb < 0.02, rest = ground ? 0.9 : 0.95;
    let x = d.x, z = d.z, y, sx = 1, sy = 1, a = 1, em = 0, r = d.r;
    if (u < F) {                                            // 떨어지는 중
      y = d.y + Hf - 0.5 * G9 * u * u; sy = 1.1; sx = 0.95;
      a = Math.min(1, u / 0.25);
    } else {
      const tau = u - F;
      if (tau > d.stay + d.E) return null;
      // 통통통: 튈 때마다 높이 e², 시간 e 배
      const e = d.e || 0.52, h1 = d.h1 ?? (0.16 + 1.4 * d.r);
      let Tn = 2 * Math.sqrt(2 * h1 / G9), acc = 0, yo = 0, since = tau, n = 0, sq = 0.42;
      for (; n < 7; n++) {
        if (tau < acc + Tn) { const s = tau - acc, v = G9 * Tn / 2; yo = v * s - 0.5 * G9 * s * s; since = s; break; }
        acc += Tn; Tn *= e;
        if (ground && imp) imp.push([d.x, d.z, ((t - (d.land + acc)) % 30 + 30) % 30, 0.7 * Math.pow(e, n + 1) * d.r * 10]);
      }
      if (n === 7) since = tau - acc;
      if (ground && imp) imp.push([d.x, d.z, ((t - d.land) % 30 + 30) % 30, d.r * 10]);
      const amp = sq * Math.pow(e, n), wob = 1 - amp * Math.exp(-since * 11) * Math.cos(since * 36);
      sy = rest * (yo > 0.002 ? 1 : wob) * (1 + 0.008 * Math.sin(2 * Math.PI * t / 10 + d.u * 9));
      if (yo > 0.002) sy = 1 + 0.05 * Math.min(1, yo * 10);
      sx = 1 / Math.sqrt(sy);
      y = yb + d.r * sy + yo;
      const q = tau - d.stay;
      if (q > 0) {                                          // 사라짐
        const p = q / d.E;
        if (d.leave === "sink") { r *= Math.pow(1 - p, 0.7); y = yb + r * sy * (1 - p); sy *= 1 - 0.4 * p; }
        else if (d.leave === "drop") {                       // 놓여 떨어져 수면에 톡 → 녹아든다
          const y0 = y, tf = Math.sqrt(2 * Math.max(y0 - d.r * 0.9, 0) / G9);
          if (q < tf) { y = y0 - 0.5 * G9 * q * q; sy = 1.08; sx = 0.96; }
          else { const m = Math.min(1, (q - tf) / Math.max(d.E - tf, 0.05)); y = d.r * 0.9 * (1 - m); r *= Math.pow(1 - m, 0.6); sy = 0.9 * (1 - 0.3 * m);
            if (imp) imp.push([x, z, q - tf, d.r * 10]); }
        }
        else if (d.leave === "blow") {                       // 바람에 실려 간다
          const s = p * p; x += (d.wx ?? 2.2) * s; z += (d.wz ?? -0.6) * s; y += 0.5 * s + 0.12 * Math.sin(p * 5 + d.u * 6) * p;
          r *= 1 - 0.5 * p; a = 1 - Math.pow(p, 2.5); em = 0.12 * Math.sin(Math.PI * p);
        }
        else { const s = p * p * (3 - 2 * p); r *= Math.pow(1 - s, 0.55); y += 0.9 * s * s + 0.15 * Math.sin(p * 3 + d.u * 6) * s; em = 0.2 * Math.sin(Math.PI * Math.min(1, p * 1.3)); a = 1 - Math.pow(p, 3); }
      }
    }
    if (d.sway) { const o = d.sway(t, y); x += o[0]; y += o[2] || 0; z += o[1]; }
    return [x, y, z, r, sx, sy, d.k, a, em];
  }
  function dropInit(w, G, ctx) {
    const gl = G.gl;
    const N = typeof w.N === "function" ? w.N(ctx) : w.N;
    const D = w.build(N, ctx);
    const pre = DCOM + w.scene + DWORLD;
    const bg = program(gl, DFS_VS, pre + DBG_FS);
    const dp = program(gl, DROP_VS, pre + DROP_FS);
    const cp = program(gl, DFS_VS, DCOPY_FS);
    const tex = (w_, h_, mip) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, mip ? Math.floor(Math.log2(Math.max(w_, h_))) + 1 : 1, gl.RGBA16F, w_, h_);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, mip ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    const envT = tex(512, 256, true), envF = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, envF); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, envT, 0);
    const colT = tex(ctx.W, ctx.H, false), colF = gl.createFramebuffer(), dep = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, dep); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, ctx.W, ctx.H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, colF); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colT, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dep);
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 48, i * 16); gl.vertexAttribDivisor(i, 1); }
    gl.bindVertexArray(null);
    return { D, bg, dp, cp, envT, envF, colT, colF, vao, buf, inst: new Float32Array(D.length * 12), fsVao: gl.createVertexArray() };
  }
  function dropDraw(w, G, st, t, ctx) {
    const gl = G.gl, cam_ = w.camera(t, ctx), li = w.light(t, ctx);
    const VP = cam(ctx, cam_.eye, cam_.ta, cam_.fov), eye = cam_.eye;
    const fw = [cam_.ta[0] - eye[0], cam_.ta[1] - eye[1], cam_.ta[2] - eye[2]];
    const imp = [], live = [];
    for (const d of st.D) { const s = dropAt(d, t, imp); if (s && s[3] > 1e-4 && s[7] > 0.003) live.push(s); }
    imp.sort((p, q) => (q[3] * Math.exp(-q[2])) - (p[3] * Math.exp(-p[2])));
    const rip = new Float32Array(128);
    for (let i = 0; i < Math.min(32, imp.length); i++) if (imp[i][2] < 4) rip.set([imp[i][0], imp[i][1], imp[i][2], imp[i][3]], i * 4);
    live.forEach((s) => (s.k_ = (s[0] - eye[0]) * fw[0] + (s[1] - eye[1]) * fw[1] + (s[2] - eye[2]) * fw[2]));
    live.sort((p, q) => q.k_ - p.k_);
    const inst = st.inst;
    live.forEach((s, i) => { inst.set([s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], 0, 0, 0], i * 12); });
    const px = 2 * Math.tan(cam_.fov / 2) / ctx.H;
    const uni = (p) => { const u = p.u;
      gl.uniform2f(u.uRes, ctx.W, ctx.H); gl.uniform1f(u.uT, t);
      ["uC0", "uC1", "uC2", "uC3"].forEach((k, i) => u[k] && gl.uniform3fv(u[k], ctx.colors[i]));
      u.uEye && gl.uniform3fv(u.uEye, eye); u.uL && gl.uniform3fv(u.uL, li.dir); u.uKey && gl.uniform3fv(u.uKey, li.key);
      u.uRip && gl.uniform4fv(u.uRip, rip); u.uHaze && gl.uniform1f(u.uHaze, w.haze ?? 0.03); };
    G.custom((g, c) => {
      const hdrF = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      gl.disable(gl.BLEND);
      // 1) 환경 그림 (물방울 속에 비칠 세상)
      gl.bindFramebuffer(gl.FRAMEBUFFER, st.envF); gl.viewport(0, 0, 512, 256);
      gl.useProgram(st.bg.p); uni(st.bg); gl.uniform1f(st.bg.u.uEnvPass, 1);
      gl.bindVertexArray(st.fsVao); gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindTexture(gl.TEXTURE_2D, st.envT); gl.generateMipmap(gl.TEXTURE_2D);
      // 2) 배경 (수면 · 하늘)
      gl.bindFramebuffer(gl.FRAMEBUFFER, st.colF); gl.viewport(0, 0, ctx.W, ctx.H);
      gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(st.bg.u.uEnvPass, 0); gl.uniform3fv(st.bg.u.uTa, cam_.ta); gl.uniform1f(st.bg.u.uFov, cam_.fov);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      // 3) 물에 비친 방울 → 4) 방울
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
      gl.useProgram(st.dp.p); uni(st.dp);
      gl.uniformMatrix4fv(st.dp.u.uVP, false, VP); gl.uniform1f(st.dp.u.uPx, px); gl.uniform1f(st.dp.u.uDens, w.dens ?? 1.2);
      gl.uniform1f(st.dp.u.uFocus, cam_.focus || 6); gl.uniform1f(st.dp.u.uAp, cam_.ap || 0);
      gl.uniform3fv(st.dp.u.uL2, li.dir2 || [0.3, 0.8, 0.5]); gl.uniform3fv(st.dp.u.uKey2, li.key2 || [0, 0, 0]);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, st.envT); gl.uniform1i(st.dp.u.uEnv, 0);
      gl.bindVertexArray(st.vao); gl.bindBuffer(gl.ARRAY_BUFFER, st.buf);
      gl.bufferData(gl.ARRAY_BUFFER, inst.subarray(0, live.length * 12), gl.STREAM_DRAW);
      for (const mir of [1, 0]) { gl.uniform1f(st.dp.u.uMir, mir); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, live.length); }
      gl.disable(gl.DEPTH_TEST);
      // 5) HDR 판에 더한다 (하위 프레임 세기)
      gl.bindFramebuffer(gl.FRAMEBUFFER, hdrF); gl.viewport(0, 0, c.W, c.H);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(st.cp.p); gl.bindTexture(gl.TEXTURE_2D, st.colT); gl.uniform1i(st.cp.u.uTex, 0); gl.uniform1f(st.cp.u.uGain, c.gain);
      gl.bindVertexArray(st.fsVao); gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    });
  }

  global.SGL = { T, works, add: (w) => works.push(w), get: (id) => works.find((w) => w.id === id),
    perspective, lookAt, mul, program, RAY, RAY_MAIN, drawRay, lines, cam, lineInit, lineDraw,
    PAINT, monet, rng, dropFill, dropSurf, dropAt, dropInit, dropDraw, hex: (h) => global.BomnalGL.hex(h) };
})(window);
