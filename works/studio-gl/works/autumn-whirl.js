/* 가을 · 잎의 회오리 · Autumn Whirl
 *
 * 저녁 해를 등진 큰 회오리 속에서 잎 수만 장이 뒤집히며 솟는다. 해를 등진 잎은 속으로 빛이 비쳐
 * 호박색으로 타오르고, 해를 향한 잎은 결이 반짝인다. 30초에 두 번 돌풍이 불어 회오리가 부풀었다 조인다.
 *
 * 잎은 정점 셰이더에서 자리를 바로 계산한다(높이는 30초에 정수 번 오르고, 도는 각·뒤집힘도 정수배) → 완전 루프.
 * 잎은 깊이 버퍼를 따로 붙여 서로 가리게 그린다(빛 더하기 판 위에서도 잎이 단단한 물체로 보인다).
 * 잎맥·톱니 가장자리·주름은 조각 셰이더에서 그린다.
 */
SGL.add({
  id: "autumn-whirl", title: "가을 · 잎의 회오리", en: "Autumn Whirl", mood: ["vivid", "nature"],
  desc: "저녁 해를 등진 회오리 속에서 잎 수만 장이 뒤집히며 솟구칩니다. 햇빛이 비친 잎은 호박빛으로 타오르고, 두 번 돌풍이 몰아칩니다.",
  palettes: [
    { name: "단풍", colors: ["#ff4a1c", "#ffa020", "#ffd27a", "#2a1408"] },
    { name: "은행", colors: ["#ffc81a", "#ffe46a", "#fff2c0", "#2a2008"] },
    { name: "늦가을", colors: ["#c8401c", "#8a4a20", "#ffb070", "#1a100a"] },
    { name: "진홍", colors: ["#ff1c4a", "#ff6a3a", "#ffc0a0", "#200810"] },
  ],
  post: { exposure: 1.0, bloom: 0.065, sat: 1.25, contrast: 1.10, vignette: 0.38, grain: 0.013 },
  bg: `
uniform float uGain, uT; uniform vec3 uC0, uC2, uC3; uniform vec2 uSun;
#define TAU 6.2831853
void main(){
  float asp = uRes.x/uRes.y, ph = TAU*uT/30.0;
  vec2 d = (uv - uSun)*vec2(asp, 1.0);
  float r = length(d), an = atan(d.y, d.x);
  vec3 c = mix(uC3*0.30, uC3*0.06, smoothstep(0.0, 1.0, uv.y));
  c += uC0*0.05*exp(-abs(uv.y - uSun.y)*6.0);                     // 지평선 쪽 노을
  c += uC2*(0.30*exp(-r*7.0) + 0.07*exp(-r*1.8));
  c += vec3(1.0, 0.85, 0.6)*3.0*exp(-r*r*2500.0);                 // 해
  // 빛살: 해에서 뻗는 결 (정수 진동수라 끊김 없이 돈다)
  float rays = 0.5 + 0.5*sin(an*11.0 + 2.0*sin(an*4.0 + ph) + ph*2.0);
  rays *= 0.5 + 0.5*sin(an*23.0 - ph*3.0 + 1.0);
  c += uC2*0.015*rays*exp(-r*2.5)*smoothstep(0.02, 0.15, r);
  o = vec4(c*uGain, 1.0);
}`,
  init(G, ctx) {
    const gl = G.gl;
    const N = ctx.cap ? 11000 : 7000;
    const VS = `#version 300 es
uniform float uT; uniform mat4 uVP;
out vec2 vUV; out vec3 vN; out vec3 vP; out vec3 vTint;
#define TAU 6.2831853
vec3 h3(float n){ vec3 p = fract(vec3(n)*vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.xxy + p.yzz)*p.zyx); }
mat3 rotAxis(vec3 a, float t){ float c = cos(t), s = sin(t), C = 1.0 - c;
  return mat3(c + a.x*a.x*C, a.y*a.x*C + a.z*s, a.z*a.x*C - a.y*s,
              a.x*a.y*C - a.z*s, c + a.y*a.y*C, a.z*a.y*C + a.x*s,
              a.x*a.z*C + a.y*s, a.y*a.z*C - a.x*s, c + a.z*a.z*C); }
const vec2 CO[6] = vec2[6](vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, 1.0));
void main(){
  int leaf = gl_VertexID/6; int k = gl_VertexID - leaf*6;
  float fl = float(leaf);
  vec3 r = h3(fl*1.37 + 0.5), r2 = h3(fl*5.71 + 3.0), r3 = h3(fl*9.13 + 1.0);
  float ph = TAU*uT/30.0;
  float gust = pow(0.5 + 0.5*sin(ph*2.0 - 0.8), 5.0);               // 30초에 두 번 돌풍
  float m = 1.0 + floor(r.y*2.0);
  float yy = fract(r.x + uT/30.0*m);
  float Y = mix(-2.0, 2.8, yy);
  float funnel = 0.30 + 1.55*pow(yy, 1.25);
  float rad = funnel*(0.35 + 0.85*r.z)*(1.0 + 0.7*gust*r.z);
  float spin = 2.0 + floor((1.0 - r.z)*4.0);                      // 안쪽이 더 빨리 돈다
  float ang = r2.x*TAU + ph*spin + yy*5.0;
  vec3 c = vec3(cos(ang)*rad, Y, sin(ang)*rad);
  // 회오리 기둥이 S 자로 휘청인다
  c.xz += vec2(0.55*sin(Y*1.1 + ph) + 0.25*sin(Y*2.3 - ph*2.0), 0.35*cos(Y*0.9 + ph));
  c += (0.14 + 0.25*gust)*vec3(sin(ph*3.0 + fl), 0.6*sin(ph*2.0 + fl*1.7), cos(ph*4.0 + fl*0.3));
  vec3 ax = normalize(r3 - 0.5 + 1e-3);
  float tum = ph*(3.0 + floor(r3.x*9.0)) + r2.y*TAU;
  mat3 R = rotAxis(ax, tum);
  float life = smoothstep(0.0, 0.07, yy)*smoothstep(1.0, 0.88, yy);
  float sz = 0.085*(0.55 + 0.9*r2.z*r2.z)*life;
  vec2 co = CO[k];
  vec3 lp = vec3(co.x*sz, co.y*sz*0.62, 0.22*sz*co.y*co.y);         // 가운데 맥을 따라 살짝 접힌 잎
  vec3 wp = c + R*lp;
  vN = R*vec3(0.0, 0.0, 1.0);
  vUV = co; vP = wp; vTint = r2;
  gl_Position = uVP*vec4(wp, 1.0);
}`;
    const FS = `#version 300 es
precision highp float;
in vec2 vUV; in vec3 vN; in vec3 vP; in vec3 vTint;
uniform float uGain; uniform vec3 uC0, uC1, uC2, uC3, uL, uEye;
out vec4 o;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec2 uv = vUV;
  // 잎 모양: 끝이 뾰족한 타원 + 잔 톱니
  float x = uv.x*0.5 + 0.5;
  float w = pow(max(sin(3.14159*pow(x, 0.8)), 0.0), 0.9)*(0.93 + 0.07*sin(x*48.0));
  if(abs(uv.y) > w || x < 0.02) discard;
  float edge = abs(uv.y)/max(w, 1e-3);
  float mid = 1.0 - smoothstep(0.0, 0.045, abs(uv.y));
  float g = fract((x - abs(uv.y)*0.55)*4.5);
  float side = (1.0 - smoothstep(0.0, 0.05, min(g, 1.0 - g)))*smoothstep(0.05, 0.2, x);
  float vein = max(mid, side*0.7);
  vec3 n = normalize(vN);
  vec3 V = normalize(uEye - vP);
  if(dot(n, V) < 0.0) n = -n;
  // 주름
  vec2 q = uv*vec2(5.0, 3.0) + vTint.xy*17.0;
  n = normalize(n + 0.30*(vec3(vn(q), vn(q + 3.7), vn(q - 5.1)) - 0.5));
  vec3 L = normalize(uL);
  float ndl = dot(n, L);
  // 잎 색: 잎마다 다르고, 가장자리·얼룩은 마른 빛
  vec3 col = mix(uC0, uC1, vTint.x);
  col = mix(col, uC2, vTint.y*vTint.y*0.5);
  col *= 0.45 + 0.75*vTint.z;                                       // 짙은 잎 · 밝은 잎
  col = mix(col, uC3*3.0, step(0.86, fract(vTint.x*7.3))*0.7);       // 군데군데 마른 갈색 잎
  float spot = smoothstep(0.55, 0.85, vn(uv*3.0 + vTint.zx*31.0));
  col = mix(col, uC3*2.0 + uC0*0.2, spot*0.45 + smoothstep(0.75, 1.0, edge)*0.35);
  col *= 1.0 - 0.35*vein;
  vec3 key = vec3(1.15, 0.95, 0.70);
  float diff = max(ndl, 0.0);
  // 해를 등진 잎: 속으로 빛이 비친다 (보는 쪽이 해를 향할수록 세다)
  float back = max(-ndl, 0.0);
  float trans = back*(0.15 + 1.4*pow(max(dot(-V, L), 0.0), 6.0))*(0.15 + 2.2*vTint.y*vTint.y*vTint.y);   // 잎마다 두께가 달라 비치는 정도가 다르다
  vec3 transC = col*col*(1.0 - 0.6*vein);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(n, H), 0.0), 60.0)*0.8;
  vec3 c = col*0.025 + col*key*diff*0.35 + transC*key*trans + mix(col, key, 0.4)*spec*0.25*(0.4 + 0.6*(1.0 - spot));
  o = vec4(c*uGain, 1.0);
}`;
    return { prog: SGL.program(gl, VS, FS), N, vao: gl.createVertexArray(), depth: null };
  },
  cam(t, ctx) {
    const ph = 2 * Math.PI * t / SGL.T;
    const a = 0.55 * Math.sin(ph), r = 8.4;
    const eye = [Math.sin(a) * r, 0.25 + 0.35 * Math.sin(ph * 2), Math.cos(a) * r];
    const VP = SGL.mul(SGL.perspective(0.78, ctx.W / ctx.H, 0.05, 60), SGL.lookAt(eye, [0, 0.4, 0], [0, 1, 0]));
    return { eye, VP };
  },
  draw(G, st, t, ctx) {
    const { eye, VP } = this.cam(t, ctx);
    const L = [-0.35, 0.22, -1.0], ln = Math.hypot(...L), Ln = L.map((v) => v / ln);
    // 해의 화면 자리
    const sp = [eye[0] + Ln[0] * 1000, eye[1] + Ln[1] * 1000, eye[2] + Ln[2] * 1000, 1];
    const cl = [0, 1, 2, 3].map((r) => VP[r] * sp[0] + VP[4 + r] * sp[1] + VP[8 + r] * sp[2] + VP[12 + r] * sp[3]);
    const sun = [cl[0] / cl[3] * 0.5 + 0.5, cl[1] / cl[3] * 0.5 + 0.5];
    G.background(this.bg, { uT: t, uC0: ctx.colors[0], uC2: ctx.colors[2], uC3: ctx.colors[3], uSun: sun });
    G.custom((gl, c) => {
      // 잎끼리 가리도록 깊이 버퍼를 HDR 판에 붙인다 (처음 한 번)
      if (!st.depth) {
        st.depth = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, st.depth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, c.W, c.H);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, st.depth);
      }
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LESS);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(st.prog.p); const u = st.prog.u;
      gl.uniform1f(u.uT, t); gl.uniform1f(u.uGain, c.gain);
      gl.uniformMatrix4fv(u.uVP, false, VP);
      gl.uniform3fv(u.uL, Ln); gl.uniform3fv(u.uEye, eye);
      ["uC0", "uC1", "uC2", "uC3"].forEach((k, i) => gl.uniform3fv(u[k], ctx.colors[i]));
      gl.bindVertexArray(st.vao);
      gl.drawArrays(gl.TRIANGLES, 0, st.N * 6);
      gl.disable(gl.DEPTH_TEST);
    });
  },
});
