/* 끌개의 숨 · Attractor Bloom
 *
 * Aizawa 끌개를 점 120만 개로 그린다. 사과 모양 몸통을 실 같은 궤적이 감싸고
 * 가운데 관을 따라 빛이 빠져나간다. 점 위치는 처음에 한 번 계산해
 * 두고, 매 프레임에는 카메라가 한 바퀴 돌고 궤적을 따라 빛 펄스가 흐르게 한다.
 * 펄스는 궤적 순서(번호)를 따라 흐르므로 빛이 끌개의 길을 그대로 따라 달린다.
 */
SGL.add({
  id: "attractor", title: "끌개의 숨", en: "Attractor Bloom", mood: ["cosmos", "geo"],
  desc: "점 120만 개가 하나의 수식이 그리는 길을 따라 모여 매듭 같은 빛의 조각이 됩니다. 길을 따라 빛이 숨 쉬듯 흐릅니다.",
  palettes: [
    { name: "성운", colors: ["#7a5cff", "#ff4f9a", "#ffd36b", "#38d6ff"] },
    { name: "얼음", colors: ["#9ef0ff", "#2a6cff", "#e8f6ff", "#5ac8ff"] },
    { name: "불씨", colors: ["#ff6a3d", "#ffb347", "#fff1c9", "#ff2d55"] },
    { name: "숲", colors: ["#3dffa8", "#d4ff3a", "#1fd1c1", "#f4efe6"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.15, contrast: 1.08, vignette: 0.32, grain: 0.012 },
  init(G, ctx) {
    const gl = G.gl;
    const N = ctx.cap ? 1200000 : 600000;
    // 궤적 여러 가닥: 초기값마다 과도 구간을 버리고 이어서 적분
    const pos = new Float32Array(N * 4);
    // Aizawa 끌개: 사과 모양 몸통 + 가운데를 꿰뚫는 관
    const A = 0.95, B = 0.7, C = 0.6, D = 3.5, E = 0.25, F = 0.1, dt = 0.006;
    const f = (x, y, z) => [(z - B) * x - D * y, D * x + (z - B) * y, C + A * z - z * z * z / 3 - (x * x + y * y) * (1 + E * z) + F * z * x * x * x];
    const STR = 32, per = Math.floor(N / STR);
    let k = 0;
    for (let s = 0; s < STR; s++) {
      let x = 0.1 + 0.01 * s, y = 0, z = 0.02 * s;
      for (let i = 0; i < 3000; i++) { const v = f(x, y, z); x += v[0] * dt; y += v[1] * dt; z += v[2] * dt; }
      for (let i = 0; i < per && k < N; i++, k++) {
        const v = f(x, y, z);
        const m = f(x + v[0] * dt * 0.5, y + v[1] * dt * 0.5, z + v[2] * dt * 0.5);
        x += m[0] * dt; y += m[1] * dt; z += m[2] * dt;
        // 화면 위쪽이 끌개의 z 축이 되게
        pos[k * 4] = x; pos[k * 4 + 1] = z - 0.75; pos[k * 4 + 2] = y; pos[k * 4 + 3] = Math.hypot(v[0], v[1], v[2]) / 3.0;
      }
    }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    const VS = `#version 300 es
layout(location=0) in vec4 aP;
uniform float uT, uGain, uScale, uN, uPx; uniform mat4 uVP; uniform vec3 uC0, uC1, uC2, uC3;
out vec3 vCol;
#define TAU 6.2831853
vec3 pal(float x){ x = fract(x)*4.0; return x < 1.0 ? mix(uC0, uC1, x) : (x < 2.0 ? mix(uC1, uC2, x - 1.0) : (x < 3.0 ? mix(uC2, uC3, x - 2.0) : mix(uC3, uC0, x - 3.0))); }
void main(){
  float i = float(gl_VertexID)/uN;
  // 궤적을 따라 흐르는 빛 펄스 셋 (30초에 정수 바퀴)
  float s = fract(i*32.0);
  float pulse = 0.0;
  for(int k=0;k<3;k++){ float c = fract(uT/30.0*float(2 + k) + float(k)*0.37); float d = abs(s - c); d = min(d, 1.0 - d); pulse += exp(-d*d*60000.0); }
  float sp = aP.w;
  // 색은 높이(끌개의 축)를 따라 갈라지고, 빠른 곳이 더 밝다
  vCol = pal(0.30 + aP.y*0.42 + 0.10*sp + 0.08*sin(TAU*uT/30.0)) * (0.45 + 0.9*smoothstep(0.3, 1.2, sp) + 3.0*pulse) * uGain * uScale;
  gl_Position = uVP*vec4(aP.xyz*0.62, 1.0);
  gl_PointSize = uPx;
}`;
    const FS = `#version 300 es
precision highp float; in vec3 vCol; out vec4 o;
void main(){ vec2 c = gl_PointCoord - 0.5; float g = exp(-dot(c, c)*9.0); o = vec4(vCol*g, 1.0); }`;
    return { prog: SGL.program(gl, VS, FS), N: k, vao };
  },
  draw(G, st, t, ctx) {
    const ph = 2 * Math.PI * t / SGL.T, r = 3.0;
    const eye = [Math.sin(ph) * r, 0.9 * Math.sin(ph * 2 + 0.5), Math.cos(ph) * r];
    const VP = SGL.mul(SGL.perspective(0.7, ctx.W / ctx.H, 0.05, 50), SGL.lookAt(eye, [0, 0, 0], [0, 1, 0]));
    G.custom((gl, c) => {
      gl.useProgram(st.prog.p); const u = st.prog.u;
      gl.uniform1f(u.uT, t); gl.uniform1f(u.uGain, c.gain); gl.uniform1f(u.uN, st.N);
      const px = Math.max(1.5, 2.0 * ctx.H / 1080);
      gl.uniform1f(u.uPx, px);
      gl.uniform1f(u.uScale, 0.10 * (600000 / st.N) * (ctx.H / 1080) * (ctx.H / 1080) / (px * px / 4));
      gl.uniformMatrix4fv(u.uVP, false, VP);
      ["uC0", "uC1", "uC2", "uC3"].forEach((k, i) => gl.uniform3fv(u[k], ctx.colors[i]));
      gl.bindVertexArray(st.vao);
      gl.drawArrays(gl.POINTS, 0, st.N);
    });
  },
});
