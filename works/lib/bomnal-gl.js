/* 봄날 GL — 코드 미디어아트용 WebGL2 화면 틀
 *
 * Canvas2D 로 빛을 그리면 세 군데서 무너진다.
 *   1) 'lighter' 가 255에서 잘린다. 빛이 겹친 곳이 하얗게 납작해지고 색이 날아간다.
 *   2) sRGB 값을 그대로 더한다. 물리적으로 틀린 덧셈이라 겹친 자리가 탁해진다.
 *   3) 8비트라 어두운 그라데이션이 계단이 되고, LED·H.264 에서 더 심해진다.
 *
 * 그래서 이 틀은 이렇게 그린다.
 *   - 장면은 선형 빛(linear light)으로, 반정밀 부동소수(RGBA16F) 판에 더한다. 1을 넘어도 안 잘린다.
 *   - 번짐(bloom)은 여섯 단 내려갔다 올라오는 다층 번짐 (Jimenez, CoD:AW 2014).
 *   - 끝에서 한 번만 톤매핑(AgX / ACES) → 색보정 → 비네트 → 그레인 → 디더 → sRGB.
 *   - 선은 이어진 띠(삼각형)로 그리고 굵기 방향 거리로 가장자리를 계산한다(해석적 AA).
 *     선분마다 따로 긋던 방식의 마디 구슬(겹친 자리 밝은 점)이 없다.
 *   - 오프라인 렌더에서는 한 프레임을 여러 하위 프레임으로 나눠 더한다 = 셔터 모션블러.
 *
 * 결정론: 시간은 밖에서 받은 프레임 번호뿐. 노이즈도 (화소, 프레임) 해시라 같은 프레임은 같은 그림.
 * 외부 의존 없음. <script src="lib/bomnal-gl.js"> 한 줄.
 */
(function (global) {
"use strict";

/* ── 색 ──────────────────────────────────────────────────── */
function srgbToLinear(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
/** '#rrggbb' → 선형 [r,g,b]. 빛을 더하는 곳에는 언제나 이 값을 쓴다. */
function hex(h) {
  const v = parseInt(h.slice(1), 16);
  return [srgbToLinear(((v >> 16) & 255) / 255), srgbToLinear(((v >> 8) & 255) / 255), srgbToLinear((v & 255) / 255)];
}

/* OKLab — 색을 섞거나 그라데이션을 만들 때. RGB 로 섞으면 가운데가 탁해진다. */
function linToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function oklabToLin([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}
function mixOklab(c1, c2, t) {
  const a = linToOklab(c1), b = linToOklab(c2);
  return oklabToLin([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]).map((v) => Math.max(0, v));
}

/* ── 셰이더 ──────────────────────────────────────────────── */
const FS_QUAD = `#version 300 es
in vec2 a; out vec2 uv;
void main(){ uv = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;

/* 띠(리본) — 꼭짓점: 위치(px), 옆(-1..1), 선형색, 세기, 반굵기(px) */
const VS_LINE = `#version 300 es
in vec2 aPos; in float aSide; in vec3 aCol; in float aI; in float aW;
uniform vec2 uRes;
out float vPx; out float vW; out vec3 vCol; out float vI;
uniform float uExt;
void main(){
  vPx = aSide * aW * uExt; vW = aW; vCol = aCol; vI = aI;
  vec2 c = aPos / uRes * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0., 1.);
}`;
const FS_LINE = `#version 300 es
precision highp float;
in float vPx; in float vW; in vec3 vCol; in float vI;
uniform float uHalo;
out vec4 o;
void main(){
  float d = abs(vPx);
  float w = max(vW, 0.5);
  // 심: 굵기 안쪽은 1, 가장자리 1px 에서 부드럽게 0 (해석적 AA)
  float core = clamp(w - d + 0.5, 0.0, 1.0);
  // 1px 보다 가는 선은 밝기를 굵기만큼 줄여 에너지를 맞춘다 (깜박임 방지)
  core *= min(vW * 2.0, 1.0);
  // 심 둘레의 얇은 헤일로 — 넓은 번짐은 bloom 이 맡는다
  float h = d / (w * 2.6);
  float halo = exp(-h * h) * uHalo;
  o = vec4(vCol * vI * (core + halo), 1.0);
}`;

/* 점 — 가우스 낙하. 먼지, 별, 입자. */
const VS_PT = `#version 300 es
in vec2 aPos; in vec3 aCol; in float aI; in float aR;
uniform vec2 uRes;
out vec3 vCol; out float vI; out float vR;
void main(){
  vCol = aCol; vI = aI; vR = aR;
  gl_PointSize = max(aR * 6.0, 2.0);
  vec2 c = aPos / uRes * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0., 1.);
}`;
const FS_PT = `#version 300 es
precision highp float;
in vec3 vCol; in float vI; in float vR;
out vec4 o;
void main(){
  vec2 p = (gl_PointCoord - 0.5) * max(vR * 6.0, 2.0);
  float g = exp(-dot(p, p) / (2.0 * vR * vR));
  // 반지름이 1px 아래로 내려가도 총 에너지는 유지
  float e = min(vR * vR, 1.0);
  o = vec4(vCol * vI * g * e, 1.0);
}`;

/* 번짐: 내려가기 13탭 (Jimenez 2014) — 첫 단은 Karis 평균으로 반딧불 억제 */
const FS_DOWN = `#version 300 es
precision highp float;
in vec2 uv; uniform sampler2D t; uniform vec2 px; uniform int first;
out vec4 o;
float lum(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec3 S(vec2 d){ return texture(t, uv + d*px).rgb; }
void main(){
  vec3 a=S(vec2(-2,2)), b=S(vec2(0,2)), c=S(vec2(2,2));
  vec3 d=S(vec2(-2,0)), e=S(vec2(0,0)), f=S(vec2(2,0));
  vec3 g=S(vec2(-2,-2)), h=S(vec2(0,-2)), i=S(vec2(2,-2));
  vec3 j=S(vec2(-1,1)), k=S(vec2(1,1)), l=S(vec2(-1,-1)), m=S(vec2(1,-1));
  vec3 r;
  if(first==1){
    vec3 g0=(a+b+d+e)*.25, g1=(b+c+e+f)*.25, g2=(d+e+g+h)*.25, g3=(e+f+h+i)*.25, g4=(j+k+l+m)*.25;
    float w0=1./(1.+lum(g0)), w1=1./(1.+lum(g1)), w2=1./(1.+lum(g2)), w3=1./(1.+lum(g3)), w4=1./(1.+lum(g4));
    r = (g0*w0*.125 + g1*w1*.125 + g2*w2*.125 + g3*w3*.125 + g4*w4*.5) / (w0*.125+w1*.125+w2*.125+w3*.125+w4*.5);
  } else {
    r = e*0.125 + (a+c+g+i)*0.03125 + (b+d+f+h)*0.0625 + (j+k+l+m)*0.125;
  }
  o = vec4(max(r, 0.0), 1.0);
}`;
/* 번짐: 올라오기 3×3 텐트, 아래 단에 더한다 */
const FS_UP = `#version 300 es
precision highp float;
in vec2 uv; uniform sampler2D t; uniform vec2 px; uniform float rad;
out vec4 o;
vec3 S(vec2 d){ return texture(t, uv + d*px*rad).rgb; }
void main(){
  vec3 r = S(vec2(0,0))*4.0
         + (S(vec2(-1,0))+S(vec2(1,0))+S(vec2(0,-1))+S(vec2(0,1)))*2.0
         + (S(vec2(-1,-1))+S(vec2(1,-1))+S(vec2(-1,1))+S(vec2(1,1)));
  o = vec4(r/16.0, 1.0);
}`;

/* 마무리: 번짐 합치기 → 노출 → 톤매핑 → 색보정 → 비네트 → 그레인 → 디더 → sRGB */
const FS_FINAL = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D hdr, bloom;
uniform vec2 res; uniform float frame;
uniform float exposure, bloomK, sat, contrast, vig, grain, tone;
uniform vec3 lift, gain;
out vec4 o;

uint hash(uvec3 x){ x = x*1664525u + 1013904223u; x.x += x.y*x.z; x.y += x.z*x.x; x.z += x.x*x.y;
  x ^= x >> 16u; x.x += x.y*x.z; x.y += x.z*x.x; x.z += x.x*x.y; return x.x ^ x.y ^ x.z; }
float rnd(vec2 p, float f, uint s){ return float(hash(uvec3(uvec2(p), uint(f)*7u + s)) & 0xffffffu) / 16777216.0; }

vec3 agxContrast(vec3 x){ vec3 x2=x*x, x4=x2*x2;
  return 15.5*x4*x2 - 40.14*x4*x + 31.96*x4 - 6.868*x2*x + 0.4298*x2 + 0.1191*x - 0.00232; }
vec3 agx(vec3 v){
  const mat3 M = mat3(0.842479062253094,0.0423282422610123,0.0423756549057051,
                      0.0784335999999992,0.878468636469772,0.0784336,
                      0.0792237451477643,0.0791661274605434,0.879142973793104);
  const mat3 Mi = mat3(1.19687900512017,-0.0528968517574562,-0.0529716355144438,
                      -0.0980208811401368,1.15190312990417,-0.0980434501171241,
                      -0.0990297440797205,-0.0989611768448433,1.15107367264116);
  const float lo = -12.47393, hi = 4.026069;
  v = M * v;
  v = clamp(log2(max(v, 1e-10)), lo, hi);
  v = (v - lo) / (hi - lo);
  v = agxContrast(v);
  v = Mi * v;
  return pow(max(v, 0.0), vec3(2.2));       // 다시 선형
}
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
vec3 toSrgb(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }

void main(){
  vec3 c = texture(hdr, uv).rgb + texture(bloom, uv).rgb * bloomK;
  c *= exposure;
  c = tone > 0.5 ? agx(c) : aces(c);
  // 색보정 (선형): 채도는 휘도 기준, 대비는 18% 회색 기준
  float L = dot(c, vec3(0.2126,0.7152,0.0722));
  c = max(mix(vec3(L), c, sat), 0.0);
  c = 0.18 * pow(c / 0.18, vec3(contrast));
  c = c * gain + lift * (1.0 - c);
  // 비네트 — 화면 비율과 무관하게 둥글게
  vec2 q = uv - 0.5; q.x *= res.x / res.y;
  c *= mix(1.0, smoothstep(1.15, 0.25, length(q) / (0.5 * res.x / res.y + 0.25)), vig);
  vec3 s = toSrgb(clamp(c, 0.0, 1.0));
  // 그레인: 중간 밝기에서 가장 보이고 검정·흰색에서는 사라진다 (필름처럼)
  float gn = (rnd(gl_FragCoord.xy, frame, 11u) + rnd(gl_FragCoord.xy, frame, 23u) - 1.0);
  float Ls = dot(s, vec3(0.2126,0.7152,0.0722));
  s += gn * grain * 4.0 * Ls * (1.0 - Ls);
  // 디더: 삼각 분포 ±1/255 — 8비트 출력·H.264 에서 어두운 계단 제거
  vec3 dn = vec3(rnd(gl_FragCoord.xy, frame, 3u) + rnd(gl_FragCoord.xy, frame, 5u) - 1.0);
  s += dn / 255.0;
  o = vec4(s, 1.0);
}`;

const FS_ADD = `#version 300 es
precision highp float;
in vec2 uv; uniform sampler2D t; uniform float k; out vec4 o;
void main(){ o = vec4(texture(t, uv).rgb * k, 1.0); }`;

/* ── 틀 ──────────────────────────────────────────────────── */
function create(canvas, opt = {}) {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error("WebGL2 를 쓸 수 없습니다");
  if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("부동소수 판(EXT_color_buffer_float)을 쓸 수 없습니다");
  gl.getExtension("OES_texture_float_linear");

  const P = Object.assign({
    exposure: 1.0, bloom: 0.08, bloomRadius: 1.0, bloomLevels: 6,
    tone: "agx", sat: 1.0, contrast: 1.0, vignette: 0.35, grain: 0.035,
    lift: [0, 0, 0], gain: [1, 1, 1], halo: 0.35, lineExtent: 3.0,
  }, opt);

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + "\n" + src);
    return s;
  }
  function prog(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    if (vs === FS_QUAD) gl.bindAttribLocation(p, 0, "a");   // 전면 사각형은 0번 자리 고정
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  }
  const P_LINE = prog(VS_LINE, FS_LINE), P_PT = prog(VS_PT, FS_PT);
  const P_DOWN = prog(FS_QUAD, FS_DOWN), P_UP = prog(FS_QUAD, FS_UP);
  const P_FIN = prog(FS_QUAD, FS_FINAL), P_ADD = prog(FS_QUAD, FS_ADD);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const quadVAO = gl.createVertexArray();
  gl.bindVertexArray(quadVAO); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function target(w, h) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t, f, w, h };
  }

  let W = 0, H = 0, hdr, mips = [];
  function resize(w, h) {
    W = canvas.width = w; H = canvas.height = h;
    hdr = target(W, H);
    mips = [];
    let mw = W, mh = H;
    for (let i = 0; i < P.bloomLevels; i++) {
      mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1);
      mips.push(target(mw, mh));
    }
  }
  resize(opt.width || canvas.width || 1920, opt.height || canvas.height || 1080);

  /* 띠 꼭짓점 모음. 한 프레임 동안 쌓았다가 flush 에서 한 번에 그린다. */
  const LSTRIDE = 8;
  let lv = new Float32Array(1 << 20), ln = 0;
  const lineBuf = gl.createBuffer(), lineVAO = gl.createVertexArray();
  gl.bindVertexArray(lineVAO); gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
  [["aPos", 2, 0], ["aSide", 1, 2], ["aCol", 3, 3], ["aI", 1, 6], ["aW", 1, 7]].forEach(([n, s, o]) => {
    const loc = gl.getAttribLocation(P_LINE.p, n);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, s, gl.FLOAT, false, LSTRIDE * 4, o * 4);
  });
  function grow(need) {
    if (ln + need <= lv.length) return;
    const nv = new Float32Array(Math.max(lv.length * 2, ln + need)); nv.set(lv.subarray(0, ln)); lv = nv;
  }
  function pushV(x, y, side, c, I, w) {
    lv[ln++] = x; lv[ln++] = y; lv[ln++] = side; lv[ln++] = c[0]; lv[ln++] = c[1]; lv[ln++] = c[2]; lv[ln++] = I; lv[ln++] = w;
  }

  /** 선 하나를 이어진 띠로 쌓는다.
   *  pts: [x0,y0,x1,y1,...] (px) · col: 선형 [r,g,b] 또는 (u)=>[r,g,b]
   *  inten(u, i): 세기 (1 넘어도 됨 → 번짐) · width(u, i): 반굵기 px */
  function ribbon(pts, col, inten, width) {
    const n = pts.length >> 1; if (n < 2) return;
    const E = P.lineExtent;
    grow((n - 1) * 6 * LSTRIDE);
    let px0, py0, px1, py1, I0, I1, w0, w1, c0, c1;
    const nx = new Float32Array(n), ny = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      let tx = pts[b * 2] - pts[a * 2], ty = pts[b * 2 + 1] - pts[a * 2 + 1];
      const m = Math.hypot(tx, ty) || 1; nx[i] = -ty / m; ny[i] = tx / m;
    }
    for (let i = 0; i < n - 1; i++) {
      const u0 = i / (n - 1), u1 = (i + 1) / (n - 1);
      I0 = inten(u0, i); I1 = inten(u1, i + 1);
      if (I0 <= 1e-4 && I1 <= 1e-4) continue;
      w0 = width(u0, i); w1 = width(u1, i + 1);
      c0 = typeof col === "function" ? col(u0) : col; c1 = typeof col === "function" ? col(u1) : col;
      const e0 = w0 * E + 1.5, e1 = w1 * E + 1.5;           // 띠 반폭 = 헤일로까지 + AA 1.5px
      const ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[i * 2 + 2], by = pts[i * 2 + 3];
      const s0 = e0 / (w0 * E), s1 = e1 / (w1 * E);
      const A1x = ax + nx[i] * e0, A1y = ay + ny[i] * e0, A2x = ax - nx[i] * e0, A2y = ay - ny[i] * e0;
      const B1x = bx + nx[i + 1] * e1, B1y = by + ny[i + 1] * e1, B2x = bx - nx[i + 1] * e1, B2y = by - ny[i + 1] * e1;
      pushV(A1x, A1y, s0, c0, I0, w0); pushV(A2x, A2y, -s0, c0, I0, w0); pushV(B1x, B1y, s1, c1, I1, w1);
      pushV(B1x, B1y, s1, c1, I1, w1); pushV(A2x, A2y, -s0, c0, I0, w0); pushV(B2x, B2y, -s1, c1, I1, w1);
    }
  }

  /* 점 */
  const PSTRIDE = 7;
  let pv = new Float32Array(1 << 18), pn = 0;
  const ptBuf = gl.createBuffer(), ptVAO = gl.createVertexArray();
  gl.bindVertexArray(ptVAO); gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
  [["aPos", 2, 0], ["aCol", 3, 2], ["aI", 1, 5], ["aR", 1, 6]].forEach(([n, s, o]) => {
    const loc = gl.getAttribLocation(P_PT.p, n);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, s, gl.FLOAT, false, PSTRIDE * 4, o * 4);
  });
  /** 가우스 점 하나. r = 표준편차(px) */
  function point(x, y, c, I, r) {
    if (pn + PSTRIDE > pv.length) { const nv = new Float32Array(pv.length * 2); nv.set(pv); pv = nv; }
    pv[pn++] = x; pv[pn++] = y; pv[pn++] = c[0]; pv[pn++] = c[1]; pv[pn++] = c[2]; pv[pn++] = I; pv[pn++] = r;
  }

  /* 사용자 전면 셰이더 (배경 빛, 장 등) — 더하기로 깐다 */
  const userProgs = new Map();
  function fullscreen(src, uniforms = {}) {
    let pr = userProgs.get(src);
    if (!pr) {
      const fs = `#version 300 es\nprecision highp float;\nin vec2 uv;\nuniform vec2 uRes;\nout vec4 o;\n${src}`;
      pr = prog(FS_QUAD, fs);
      for (const k of Object.keys(pr.u)) if (k.endsWith("[0]")) pr.u[k.slice(0, -3)] = pr.u[k];
      userProgs.set(src, pr);
    }
    gl.useProgram(pr.p);
    gl.uniform2f(pr.u.uRes, W, H);
    for (const [k, v] of Object.entries(uniforms)) {
      const loc = pr.u[k]; if (!loc) continue;
      if (typeof v === "number") gl.uniform1f(loc, v);
      else if (v.length === 2) gl.uniform2fv(loc, v);
      else if (v.length === 3) gl.uniform3fv(loc, v);
      else if (v.length === 4) gl.uniform4fv(loc, v);
      else gl.uniform4fv(loc, v);             // vec4 배열
    }
    gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /* 장면에 그리는 동안의 세기 배수 — 하위 프레임 k 개면 1/k */
  let gainK = 1;
  function flush() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdr.f); gl.viewport(0, 0, W, H);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    if (gainK !== 1) { for (let i = 6; i < ln; i += LSTRIDE) lv[i] *= gainK; for (let i = 5; i < pn; i += PSTRIDE) pv[i] *= gainK; }
    if (ln) {
      gl.useProgram(P_LINE.p); gl.uniform2f(P_LINE.u.uRes, W, H);
      gl.uniform1f(P_LINE.u.uHalo, P.halo); gl.uniform1f(P_LINE.u.uExt, P.lineExtent);
      gl.bindVertexArray(lineVAO); gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.bufferData(gl.ARRAY_BUFFER, lv.subarray(0, ln), gl.STREAM_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, ln / LSTRIDE);
    }
    if (pn) {
      gl.useProgram(P_PT.p); gl.uniform2f(P_PT.u.uRes, W, H);
      gl.bindVertexArray(ptVAO); gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
      gl.bufferData(gl.ARRAY_BUFFER, pv.subarray(0, pn), gl.STREAM_DRAW);
      gl.drawArrays(gl.POINTS, 0, pn / PSTRIDE);
    }
    ln = 0; pn = 0;
  }

  /** 프레임 시작: HDR 판을 비운다 (검정 = 빛 없음) */
  function begin() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdr.f); gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    ln = 0; pn = 0; gainK = 1;
  }
  /** 배경(전면 셰이더)을 지금 판에 더한다 */
  function background(src, uniforms) {
    flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdr.f); gl.viewport(0, 0, W, H);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    fullscreen(src, Object.assign({ uGain: gainK }, uniforms));
  }

  /** 하위 프레임 모션블러: draw(sub) 를 k 번, 각각 1/k 세기로 더한다.
   *  sub 는 0..1 (셔터 안에서의 위치). 실시간 미리보기는 k=1. */
  function shutter(k, draw) {
    gainK = 1 / k;
    for (let i = 0; i < k; i++) { draw(k === 1 ? 0.5 : (i + 0.5) / k); flush(); }
    gainK = 1;
  }

  function end(frame = 0) {
    flush();
    gl.disable(gl.BLEND);
    // 번짐 사슬
    let src = hdr;
    gl.useProgram(P_DOWN.p);
    mips.forEach((m, i) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, m.f); gl.viewport(0, 0, m.w, m.h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t);
      gl.uniform1i(P_DOWN.u.t, 0); gl.uniform2f(P_DOWN.u.px, 1 / src.w, 1 / src.h); gl.uniform1i(P_DOWN.u.first, i === 0 ? 1 : 0);
      gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLES, 0, 6);
      src = m;
    });
    gl.useProgram(P_UP.p);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = mips.length - 1; i > 0; i--) {
      const lo = mips[i], hi = mips[i - 1];
      gl.bindFramebuffer(gl.FRAMEBUFFER, hi.f); gl.viewport(0, 0, hi.w, hi.h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, lo.t);
      gl.uniform1i(P_UP.u.t, 0); gl.uniform2f(P_UP.u.px, 1 / lo.w, 1 / lo.h); gl.uniform1f(P_UP.u.rad, P.bloomRadius);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disable(gl.BLEND);
    // 마무리
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.useProgram(P_FIN.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hdr.t); gl.uniform1i(P_FIN.u.hdr, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mips[0].t); gl.uniform1i(P_FIN.u.bloom, 1);
    const u = P_FIN.u;
    gl.uniform2f(u.res, W, H); gl.uniform1f(u.frame, frame);
    gl.uniform1f(u.exposure, P.exposure);
    // 첫 단 번짐은 이미 6단을 더한 값이라 단 수로 나눠 세기를 고정한다
    gl.uniform1f(u.bloomK, P.bloom * 4.0 / mips.length);
    gl.uniform1f(u.sat, P.sat); gl.uniform1f(u.contrast, P.contrast);
    gl.uniform1f(u.vig, P.vignette); gl.uniform1f(u.grain, P.grain);
    gl.uniform1f(u.tone, P.tone === "agx" ? 1 : 0);
    gl.uniform3fv(u.lift, P.lift); gl.uniform3fv(u.gain, P.gain);
    gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return {
    gl, params: P, resize, begin, end, ribbon, point, background, shutter, flush,
    get width() { return W; }, get height() { return H; },
  };
}

global.BomnalGL = { create, hex, srgbToLinear, mixOklab, linToOklab, oklabToLin };
})(typeof window !== "undefined" ? window : globalThis);
