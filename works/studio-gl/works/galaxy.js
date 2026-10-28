/* 은하의 숨 · Galaxy
 *
 * 별 50만 개가 나선팔을 따라 돈다. 안쪽 별은 빨리, 바깥 별은 느리게(차등 회전)라 팔이 감기는데,
 * 각 별의 공전 수가 30초 동안 정수 바퀴가 되게 반지름별로 맞춰 완전 루프를 만든다.
 * 가운데 팽대부는 따뜻한 빛, 팔에는 푸른 젊은 별과 분홍 성운 덩어리.
 */
SGL.add({
  id: "galaxy", title: "은하의 숨", en: "Galaxy", mood: ["cosmos", "vivid"],
  desc: "별 50만 개가 나선팔을 따라 천천히 돌며 은하 하나가 숨 쉽니다. 어두운 공간을 깊게 만듭니다.",
  palettes: [
    { name: "은하수", colors: ["#ffd9a0", "#6ab0ff", "#ff6ab0", "#ffffff"] },
    { name: "보라 성운", colors: ["#ffb0e0", "#7a5cff", "#38d6ff", "#ffffff"] },
    { name: "금빛", colors: ["#ffcf6b", "#ff8a3d", "#fff1c9", "#ffffff"] },
    { name: "청록", colors: ["#c8fff0", "#1fd1c1", "#3a6bff", "#ffffff"] },
  ],
  post: { exposure: 1.0, bloom: 0.11, sat: 1.15, contrast: 1.08, vignette: 0.30, grain: 0.012 },
  init(G, ctx) {
    const gl = G.gl, N = ctx.cap ? 600000 : 300000;
    const VS = `#version 300 es
uniform float uT, uGain, uScale, uPx; uniform mat4 uVP; uniform vec3 uC0, uC1, uC2, uC3;
out vec3 vCol;
#define TAU 6.2831853
vec4 h4(float n){ vec4 p = fract(vec4(n)*vec4(0.1031, 0.1030, 0.0973, 0.1099)); p += dot(p, p.wzxy + 33.33); return fract((p.xxyz + p.yzzw)*p.zywx); }
void main(){
  float id = float(gl_VertexID);
  vec4 r = h4(id*1.618 + 0.3), r2 = h4(id*0.577 + 7.1);
  float rad = pow(r.x, 1.6)*2.2 + 0.03;
  int arms = 2;
  float arm = floor(r.y*float(arms));
  // 공전: 반지름이 클수록 느리게. 30초 동안 정수 바퀴(1~6)
  // 나선 무늬 전체가 30초에 한 바퀴 돌고(무늬 속도), 별마다 작은 주전원으로 일렁인다 → 팔이 끊기지 않는다
  float spread = (r.z - 0.5)*(0.55 + rad*0.35) + (r2.w - 0.5)*0.35;
  float ang = arm*TAU/float(arms) + log(rad + 0.2)*2.6 + spread + TAU*uT/30.0;
  ang += 0.05*sin(TAU*(uT/30.0*floor(2.0 + r2.y*3.0) + r.w*6.0));
  float thick = 0.05*exp(-rad*0.8) + 0.02;
  vec3 p = vec3(cos(ang)*rad, (r.w - 0.5)*thick*2.0, sin(ang)*rad);
  float bulge = exp(-rad*2.2);
  vec3 c = mix(uC1, uC0, bulge);
  if(r2.x > 0.985) c = uC2*2.0;                          // 성운 덩어리
  float tw = 0.7 + 0.3*sin(TAU*(uT/30.0*floor(1.0 + r2.y*4.0) + r2.z*9.0));
  vCol = c*(0.35 + 2.5*bulge + 0.8*step(0.995, r2.w))*tw*uGain*uScale;
  gl_Position = uVP*vec4(p, 1.0);
  gl_PointSize = uPx*(r2.x > 0.985 ? 3.0 : 1.0);
}`;
    const FS = `#version 300 es
precision highp float; in vec3 vCol; out vec4 o;
void main(){ vec2 c = gl_PointCoord - 0.5; o = vec4(vCol*exp(-dot(c, c)*10.0), 1.0); }`;
    return { prog: SGL.program(gl, VS, FS), N, vao: gl.createVertexArray() };
  },
  draw(G, st, t, ctx) {
    const ph = 2 * Math.PI * t / SGL.T;
    const eye = [Math.sin(ph * 0.0 + 0.6) * 2.9, 1.3 + 0.2 * Math.sin(ph), Math.cos(0.6) * 2.9];
    const VP = SGL.mul(SGL.perspective(0.75, ctx.W / ctx.H, 0.05, 50), SGL.lookAt(eye, [0, -0.1, 0], [0, 1, 0]));
    G.custom((gl, c) => {
      gl.useProgram(st.prog.p); const u = st.prog.u;
      gl.uniform1f(u.uT, t); gl.uniform1f(u.uGain, c.gain);
      const px = Math.max(1.5, 2.2 * ctx.H / 1080);
      gl.uniform1f(u.uPx, px);
      gl.uniform1f(u.uScale, 0.16 * (300000 / st.N) * (ctx.H / 1080) * (ctx.H / 1080) / (px * px / 4.8));
      gl.uniformMatrix4fv(u.uVP, false, VP);
      ["uC0", "uC1", "uC2", "uC3"].forEach((k, i) => gl.uniform3fv(u[k], ctx.colors[i]));
      gl.bindVertexArray(st.vao);
      gl.drawArrays(gl.POINTS, 0, st.N);
    });
  },
});
