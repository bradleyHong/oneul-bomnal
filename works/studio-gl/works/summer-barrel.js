/* 여름 · 파도의 굴 · Summer Barrel
 *
 * 부서지기 직전의 큰 파도가 말아 만든 물의 굴 속을 빠르게 달린다. 머리 위로 넘어가는 물벽이
 * 햇빛을 받아 옥빛으로 비치고, 물은 굴 둘레를 따라 세차게 돈다. 오른쪽으로 트인 틈 너머엔 한여름 하늘과 바다.
 *
 * 그림: 굴은 z 를 따라 휘는 원통. 광선과 원통의 교점을 식으로 구하고(중심선 휨은 세 번 고쳐 맞춤),
 * 물결 높이는 '원환면 위에서 뽑은 잡음'(둘레 각 · z 둘 다 주기)과 정수 진동수 사인으로 만든다.
 * 굴은 z 로 P 마다 되풀이되고 카메라가 30초에 정확히 3P 를 달려 완전 루프.
 */
SGL.add({
  id: "summer-barrel", title: "여름 · 파도의 굴", en: "Summer Barrel", mood: ["vivid", "nature"],
  desc: "말려 들어오는 큰 파도 속, 옥빛 물의 굴을 빠르게 달립니다. 머리 위 물벽이 햇빛에 비치고 틈 너머로 한여름 바다가 보입니다.",
  palettes: [
    { name: "옥빛 바다", colors: ["#3dffd8", "#0a4a5a", "#fff2c8", "#eafcff"] },
    { name: "남국", colors: ["#38d6ff", "#0a2a6a", "#ffe7a8", "#f0f8ff"] },
    { name: "노을 파도", colors: ["#ffb06a", "#3a1a4a", "#ffd8a0", "#fff0e0"] },
    { name: "에메랄드", colors: ["#7affa8", "#08402a", "#f4ffc8", "#f0fff4"] },
  ],
  post: { exposure: 1.0, bloom: 0.09, sat: 1.12, contrast: 1.10, vignette: 0.34, grain: 0.012 },
  src: `
#define STEPS 1
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
const float P = 12.0;
const float R0 = 1.75;
vec3 SUN(){ return normalize(vec3(0.85, 0.42, 0.32)); }
vec2 ctr(float z){ float w = z*TAU/P; return vec2(0.35*sin(w), 0.22*sin(2.0*w + 1.0)); }
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float z = t/T*P*3.0;
  float w = z*TAU/P;
  ro = vec3(ctr(z) + vec2(-0.15 + 0.12*sin(w*2.0), -0.62 + 0.08*sin(w)), z);
  vec2 c2 = ctr(z + 3.0);
  ta = vec3(c2 + vec2(0.22, 0.05), z + 3.0);
  fov = 1.30;
}
// 트인 틈: 각 a 가 이 사이면 물이 없다 (z 와 시간에 따라 숨 쉰다)
void gap(float z, out float a0, out float a1){
  float w = z*TAU/P, ph = TAU*uT/T;
  a0 = -0.72 + 0.10*sin(w*2.0 + ph*3.0);
  a1 =  0.55 + 0.22*sin(w + ph*2.0) + 0.08*sin(w*3.0 - ph*5.0);
}
// 원환면 위 잡음: 둘레 각 a 와 z 둘 다 주기. 시간은 각을 따라 흘려 물이 굴을 감아 돈다
float tor(float a, float w, float f){
  float ph = TAU*uT/T;
  a -= ph*2.0; w += ph;
  float Rm = 2.2, rm = 1.4;
  vec3 q = vec3((Rm + rm*cos(w))*cos(a), (Rm + rm*cos(w))*sin(a), rm*sin(w));
  return fbm3(q*f + 3.7);
}
float hgt(float a, float z){
  float w = z*TAU/P, ph = TAU*uT/T;
  float h = 0.9*tor(a, w*2.0, 0.9);
  float wa = a + 0.3*h;
  h += 0.22*sin(9.0*wa + 2.0*w - 13.0*ph) + 0.12*sin(17.0*wa - 3.0*w - 22.0*ph + 1.3) + 0.06*sin(31.0*wa + 5.0*w - 37.0*ph);
  return h;
}
vec3 sky(vec3 rd){
  vec3 s = SUN();
  float mu = max(dot(rd, s), 0.0);
  vec3 c = mix(vec3(0.40, 0.66, 0.95)*0.5 + uC2*0.06, vec3(0.03, 0.14, 0.50) + uC0*0.03, smoothstep(0.0, 0.5, rd.y));
  c += uC2*(8.0*pow(mu, 600.0) + 0.9*pow(mu, 40.0) + 0.10*pow(mu, 3.0));
  if(rd.y < 0.0){
    // 바다: 수평선 쪽 반짝임
    float ph = TAU*uT/T;
    float d = 1.0/max(-rd.y, 0.02);
    float sp = vn3(vec3(rd.x*d*2.0, rd.z*d*0.5 - ph*3.0, ph));
    c = mix(uC1*0.35, uC0*0.22 + vec3(0.05, 0.12, 0.25), smoothstep(-0.3, 0.0, rd.y)) + uC2*pow(mu, 12.0)*smoothstep(0.6, 0.9, sp)*4.0*smoothstep(-0.02, -0.12, rd.y);
  }
  return c;
}
vec3 env(vec3 rd){ return sky(rd); }
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 s = SUN();
  // 원통과 만나는 점: 중심선 휨은 세 번 고쳐 맞춘다
  float tt = 30.0;
  float zc = ro.z + rd.z*3.0;
  float R = R0;
  for(int k=0;k<4;k++){
    vec2 o = ro.xy - ctr(zc);
    vec2 d = rd.xy;
    float A = dot(d, d), B = dot(o, d), C = dot(o, o) - R*R;
    float disc = max(B*B - A*C, 0.0);
    tt = (-B + sqrt(disc))/max(A, 1e-4);
    tt = min(tt, 60.0);
    zc = ro.z + rd.z*tt;
  }
  vec3 p = ro + rd*tt;
  vec2 q = p.xy - ctr(p.z);
  float a = atan(q.y, q.x);
  float a0, a1; gap(p.z, a0, a1);
  // 물벽까지의 깊이에 따른 안개(굴 끝은 빛이 차 있다)
  float fogT = 1.0 - exp(-tt*0.03);
  // 굴 끝은 빛이 고인다: 정면일수록 밝은 옥빛, 옆은 어두운 물빛
  float ahead = pow(max(dot(rd, normalize(ta - ro)), 0.0), 18.0);
  vec3 fogC = uC1*0.5 + uC0*0.9*ahead + uC2*0.5*ahead*ahead;
  if(a > a0 && a < a1){
    // 틈 너머 하늘·바다 + 틈 가장자리 물보라 빛
    vec3 c = sky(rd);
    float edge = min(a - a0, a1 - a);
    c = mix(uC3*1.6 + uC0*0.6, c, smoothstep(0.0, 0.035, edge));
    return mix(c, fogC, fogT*0.4);
  }
  // 물벽
  float h = hgt(a, p.z);
  float e = 0.004;
  float ha = (hgt(a + e, p.z) - h)/e, hz = (hgt(a, p.z + e*4.0) - h)/(e*4.0);
  vec3 N0 = -vec3(normalize(q), 0.0);
  vec3 Ta = vec3(-sin(a), cos(a), 0.0), Tz = vec3(0.0, 0.0, 1.0);
  vec3 n = normalize(N0 - 0.10*(ha/R0*Ta + hz*Tz));
  vec3 v = -rd;
  float cv = max(dot(n, v), 0.0);
  float F = 0.02 + 0.98*pow(1.0 - cv, 5.0);
  // 틈(입술)까지 각 거리: 가까울수록 물이 얇아 햇빛이 비친다
  float dlip = min(abs(a - a1), abs(a0 - a));
  float thin = exp(-dlip*1.6);
  float over = smoothstep(0.2, 1.6, a);                         // 머리 위로 넘어가는 물벽
  float sunT = (0.35 + 0.65*thin)*(0.4 + 0.6*over);
  vec3 trans = mix(uC1*0.6, uC0*2.2, thin*thin)*sunT*(0.75 + 0.45*h);
  // 깊은 쪽(바닥 물)은 어둡게
  trans *= mix(0.35, 1.0, smoothstep(-2.4, -0.6, a < 0.0 ? a : a - TAU));
  // 반사: 위로는 틈 밖 하늘, 아니면 굴 안 빛
  vec3 rr = reflect(rd, n);
  vec3 refl = mix(uC1*0.3 + uC0*0.15, sky(rr), smoothstep(0.1, 0.6, dot(rr, normalize(vec3(1.0, 0.1, 0.4)))));
  vec3 col = trans*(1.0 - F) + refl*F;
  // 거품 줄: 물이 빠르게 감기는 결
  // 결은 물이 감기는 방향(둘레)으로 길게: z 쪽 진동수를 높인다
  float fo = tor(a + 0.4, p.z*TAU/P*6.0, 2.2);
  float lace = tor(a*1.0 - 0.7, p.z*TAU/P*10.0, 5.0);
  float foam = smoothstep(0.66, 0.80, fo + 0.18*h)*smoothstep(0.35, 0.6, lace)*(0.15 + 0.85*thin);
  col = mix(col, uC3*(0.5 + 1.2*thin), foam*0.8);
  // 햇빛 반짝임
  col += uC2*min(pow(max(dot(rr, s), 0.0), 300.0)*30.0, 25.0)*(0.3 + thin);
  return mix(col, fogC, fogT);
}
`,
  init(G, ctx) {
    const gl = G.gl;
    // 물보라: 틈 가장자리(입술)에서 튀어 굴 안으로 날리는 물방울
    const N = ctx.cap ? 9000 : 5000;
    const VS = `#version 300 es
uniform float uT, uGain, uScale, uPx; uniform mat4 uVP; uniform vec3 uC0, uC3;
out vec3 vCol;
#define TAU 6.2831853
vec3 h3(float n){ vec3 p = fract(vec3(n)*vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.xxy + p.yzz)*p.zyx); }
vec2 ctr(float z){ float w = z*TAU/12.0; return vec2(0.35*sin(w), 0.22*sin(2.0*w + 1.0)); }
void main(){
  float i = float(gl_VertexID);
  vec3 r = h3(i*1.37 + 0.5), r2 = h3(i*5.71 + 3.0);
  float camZ = uT/30.0*36.0;
  // 물방울마다 수명 1.5초, 굴 안 카메라 앞 0..14 에 생긴다 (z 는 36 주기로 감는다)
  float L = 1.5;
  float k = floor(r.x*20.0) + 1.0;
  float age = fract(uT/30.0*20.0 + r.y);
  float cyc = floor(uT/30.0*20.0 + r.y);
  vec3 rr = h3(i*3.1 + mod(cyc, 20.0)*17.0);
  float z0 = camZ + 1.0 + rr.x*14.0;
  float ph = TAU*uT/30.0;
  float a1 = 0.55 + 0.22*sin(z0*TAU/12.0 + ph*2.0);
  float a = a1 + 0.05*(rr.y - 0.5);
  vec2 c = ctr(z0);
  vec3 p0 = vec3(c + vec2(cos(a), sin(a))*1.7, z0);
  // 굴 안쪽 아래로 날린다 + 물살 방향
  vec3 vel = vec3(-1.6 - 1.5*rr.z, -0.6 - 1.0*rr.y, -1.2*rr.x);
  vec3 p = p0 + vel*age*L + vec3(0.0, -4.9, 0.0)*age*age*L*L*0.5;
  float life = smoothstep(0.0, 0.1, age)*smoothstep(1.0, 0.5, age);
  vCol = mix(uC3, uC0, 0.3*r2.x)*life*uGain*uScale*(0.4 + r2.y);
  gl_Position = uVP*vec4(p, 1.0);
  gl_PointSize = uPx*(0.5 + 1.5*r2.z*r2.z);
}`;
    const FS = `#version 300 es
precision highp float; in vec3 vCol; out vec4 o;
void main(){ vec2 c = gl_PointCoord - 0.5; o = vec4(vCol*exp(-dot(c, c)*14.0), 1.0); }`;
    return { prog: SGL.program(gl, VS, FS), N, vao: gl.createVertexArray() };
  },
  draw(G, st, t, ctx) {
    SGL.drawRay(G, this.src, t, ctx);
    // 셰이더 카메라와 같은 카메라
    const TAU = 2 * Math.PI, P = 12;
    const ctr = (z) => { const w = z * TAU / P; return [0.35 * Math.sin(w), 0.22 * Math.sin(2 * w + 1)]; };
    const z = t / SGL.T * P * 3, w = z * TAU / P, c = ctr(z), c2 = ctr(z + 3);
    const eye = [c[0] - 0.15 + 0.12 * Math.sin(w * 2), c[1] - 0.62 + 0.08 * Math.sin(w), z];
    const VP = SGL.mul(SGL.perspective(1.30, ctx.W / ctx.H, 0.05, 80), SGL.lookAt(eye, [c2[0] + 0.22, c2[1] + 0.05, z + 3], [0, 1, 0]));
    G.custom((gl, cc) => {
      gl.useProgram(st.prog.p); const u = st.prog.u;
      gl.uniform1f(u.uT, t); gl.uniform1f(u.uGain, cc.gain);
      gl.uniform1f(u.uPx, Math.max(2, 4 * ctx.H / 1080)); gl.uniform1f(u.uScale, 1.2);
      gl.uniformMatrix4fv(u.uVP, false, VP);
      gl.uniform3fv(u.uC0, ctx.colors[0]); gl.uniform3fv(u.uC3, ctx.colors[3]);
      gl.bindVertexArray(st.vao);
      gl.drawArrays(gl.POINTS, 0, st.N);
    });
  },
});
