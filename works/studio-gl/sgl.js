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

  global.SGL = { T, works, add: (w) => works.push(w), get: (id) => works.find((w) => w.id === id),
    perspective, lookAt, mul, program, RAY, RAY_MAIN, drawRay, hex: (h) => global.BomnalGL.hex(h) };
})(window);
