/* 결의 흐름 · Kinetic Flow
 *
 * 빛줄 1만 개가 3차원 ABC 흐름(Arnold–Beltrami–Childress)을 따라 흐른다. ABC 흐름은
 * 사인 셋으로 된 단순한 식인데, 흐름선이 매듭처럼 얽히고 풀리는 혼돈 구간과 질서 있는 관이
 * 섞여 있어 비단 연기처럼 보인다. 세 계수 A·B·C 를 30초 주기로 아주 조금씩 바꿔 숨을 쉬게 한다.
 *
 * 입자 상태를 저장하지 않는다. 입자마다 태어난 자리에서 '지금 나이만큼' 정점 셰이더 안에서
 * 적분한다 → 같은 t 는 언제나 같은 그림, 30초 완전 루프.
 * 각 입자는 짧은 선분(지금 자리 → 조금 전 자리)으로 그린다. 하위 프레임 모션블러와 겹쳐 실처럼 보인다.
 */
SGL.add({
  id: "kinetic-flow", title: "결의 흐름", en: "Kinetic Flow", mood: ["calm", "vivid"],
  desc: "빛줄 1만 개가 보이지 않는 바람결을 따라 비단처럼 얽혔다 풀립니다. 로비 미디어월에 가장 잘 어울립니다.",
  palettes: [
    { name: "봄밤", colors: ["#ff4f9a", "#7a5cff", "#38d6ff", "#d4ff3a"] },
    { name: "금빛", colors: ["#ffb347", "#ff6a3d", "#ffe7a8", "#c9762c"] },
    { name: "심해", colors: ["#1fd1c1", "#2a6cff", "#9ef0ff", "#5a2dff"] },
    { name: "백자", colors: ["#f4efe6", "#c9d6e8", "#ffd9c2", "#e8f0ff"] },
  ],
  post: { exposure: 1.0, bloom: 0.09, sat: 1.18, contrast: 1.08, vignette: 0.30, grain: 0.012 },
  init(G, ctx) {
    const gl = G.gl;
    // 다발(cluster) 48개 × 다발마다 빛줄 N 개 × 줄마다 꼬리 마디 K 개. 줄 하나는 장노출처럼 지나온 길을 남긴다.
    const CL = 64, PER = ctx.cap ? 200 : 110, K = 30;
    const N = CL * PER;
    const VS = `#version 300 es
uniform float uT, uGain, uScale; uniform mat4 uVP; uniform vec3 uC0, uC1, uC2, uC3;
out vec3 vCol;
#define TAU 6.2831853
#define PER ${PER}
#define K ${K}
vec3 h3(float n){ vec3 p = fract(vec3(n)*vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.xxy + p.yzz)*p.zyx); }
vec3 pal(float x){ x = fract(x)*4.0; return x < 1.0 ? mix(uC0, uC1, x) : (x < 2.0 ? mix(uC1, uC2, x - 1.0) : (x < 3.0 ? mix(uC2, uC3, x - 2.0) : mix(uC3, uC0, x - 3.0))); }
vec3 abc(vec3 p, float ph){
  float A = 1.0 + 0.22*sin(ph), B = 0.78 + 0.18*sin(ph*2.0 + 1.3), C = 0.62 + 0.16*cos(ph*3.0 + 0.4);
  return vec3(A*sin(p.z) + C*cos(p.y), B*sin(p.x) + A*cos(p.z), C*sin(p.y) + B*cos(p.x));
}
// 연기 고리 흐름: 원환 둘레를 도는 흐름(토로이달) + 단면을 도는 흐름(폴로이달) → 흐름선이 원환을 나선으로 감는다.
// 여기에 ABC 혼돈을 조금 섞어 매듭이 풀렸다 감긴다. 단면 밖으로 나가면 살짝 되돌린다.
vec3 flow(vec3 p, float ph){
  const float R0 = 1.55;
  float rho = max(length(p.xz), 1e-3);
  vec3 er = vec3(p.x, 0.0, p.z)/rho, et = vec3(-p.z, 0.0, p.x)/rho, ey = vec3(0.0, 1.0, 0.0);
  vec2 q = vec2(rho - R0, p.y);
  float qr = length(q);
  float wt = 1.25 + 0.35*sin(ph + qr*2.0), wp = 1.9*(1.0 + 0.25*sin(ph*2.0 - qr*3.0));
  vec3 v = et*wt + (er*(-q.y) + ey*q.x)*wp;
  v += 0.32*abc(p*1.35, ph);
  vec3 eq = (er*q.x + ey*q.y)/max(qr, 1e-3);
  v -= eq*max(qr - 0.85, 0.0)*3.0;
  return v;
}
void main(){
  // 선분 하나 = 꼬리 마디 하나. 정점 둘(마디 앞·뒤)
  int seg = gl_VertexID >> 1; int e = gl_VertexID & 1;
  int line = seg / (K - 1); int j = seg - line*(K - 1) + e;      // 이 정점의 꼬리 마디 번호 0..K-1
  int cl = line / PER;
  float fl = float(line), fc = float(cl);
  vec3 rc = h3(fc*3.17 + 1.0), r = h3(fl*1.618 + 0.5);
  float ph = TAU*uT/30.0;
  // 다발 씨앗: 원환 단면 안 여러 반지름에 고르게 → 겹겹이 감긴 리본
  float a = fc/64.0*TAU;
  float qr0 = 0.15 + 0.65*fract(fc*0.618);
  float qa = fc*2.39996;
  vec3 seed = vec3(cos(a)*(1.55 + cos(qa)*qr0), sin(qa)*qr0, sin(a)*(1.55 + cos(qa)*qr0));
  vec3 p = seed + (r - 0.5)*0.12;
  float L = 10.0;
  float age = fract(uT/L + rc.x + r.x*0.08);
  float back = float(j)*0.016;                                    // 꼬리: 조금 전의 나이
  float ag = max(age - back, 0.0);
  int n = int(ag*110.0);
  float dt = 0.05;
  vec3 v = vec3(0.0);
  for(int i=0;i<110;i++){
    if(i >= n) break;
    vec3 k1 = flow(p, ph);
    v = flow(p + k1*dt*0.5, ph);
    p += v*dt;
  }
  float sp = length(v);
  float life = sin(3.14159*age); life *= life;
  float tailFade = 1.0 - float(j)/float(K - 1);
  vCol = pal(fc/64.0*0.9 + 0.15*sp) * life * tailFade * tailFade * (0.35 + 0.9*smoothstep(0.5, 2.0, sp)) * uGain * uScale;
  gl_Position = uVP*vec4(p*0.46, 1.0);
}`;
    const FS = `#version 300 es
precision highp float; in vec3 vCol; out vec4 o; void main(){ o = vec4(vCol, 1.0); }`;
    return { prog: SGL.program(gl, VS, FS), N, K, vao: gl.createVertexArray() };
  },
  draw(G, st, t, ctx) {
    const ph = 2 * Math.PI * t / SGL.T;
    const a = ph, r = 2.25;
    const eye = [Math.sin(a) * r, 0.85 + 0.30 * Math.sin(a * 2), Math.cos(a) * r];
    const VP = SGL.mul(SGL.perspective(0.72, ctx.W / ctx.H, 0.05, 50), SGL.lookAt(eye, [0, 0, 0], [0, 1, 0]));
    G.custom((gl, c) => {
      gl.useProgram(st.prog.p);
      const u = st.prog.u;
      gl.uniform1f(u.uT, t); gl.uniform1f(u.uGain, c.gain);
      // 화소가 많을수록 선이 가늘어져 어두워진다 → 높이에 맞춰 세기를 맞춘다
      gl.uniform1f(u.uScale, 0.20 * (7040 / st.N) * (ctx.H / 1080));
      gl.uniformMatrix4fv(u.uVP, false, VP);
      ["uC0", "uC1", "uC2", "uC3"].forEach((k, i) => gl.uniform3fv(u[k], ctx.colors[i]));
      gl.bindVertexArray(st.vao);
      gl.drawArrays(gl.LINES, 0, st.N * (st.K - 1) * 2);
    });
  },
});
