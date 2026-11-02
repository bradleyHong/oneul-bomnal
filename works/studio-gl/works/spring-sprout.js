/* 봄 · 움트는 결 · Spring Surge
 *
 * 비취 유리 같은 새순 일곱 줄기가 검은 물 위에서 나선으로 감기며 솟구친다. 줄기 속을 따라
 * 빛의 맥이 위로 달리고, 끝눈은 숨 쉬듯 빛난다. 30초에 두 번 세찬 기운이 올라와 줄기가 휘몰아친다.
 * 줄기는 높이 y 마다 중심선이 도는 나선관(거리장)이고, 휘는 정도·도는 각·빛 맥 모두 30초 주기의 정수배.
 * 금빛 꽃가루 알갱이가 줄기를 감고 오른다(입자, 같은 카메라).
 */
SGL.add({
  id: "spring-sprout", title: "봄 · 움트는 결", en: "Spring Surge", mood: ["vivid", "nature"],
  desc: "비취 유리 같은 새순이 검은 물 위에서 나선으로 감기며 솟구칩니다. 줄기 속으로 빛의 맥이 달리고, 두 번 세찬 봄기운이 몰아칩니다.",
  palettes: [
    { name: "새순", colors: ["#b8ff5a", "#2fae7a", "#fff0a8", "#14241c"] },
    { name: "봄비", colors: ["#9ef0ff", "#3a7ac8", "#e8fff4", "#101a26"] },
    { name: "아지랑이", colors: ["#ffb8d8", "#c86aa0", "#fff2c8", "#24141c"] },
    { name: "비취", colors: ["#7affd0", "#138a78", "#d4ff9a", "#0c1a18"] },
  ],
  post: { exposure: 1.05, bloom: 0.09, sat: 1.12, contrast: 1.10, vignette: 0.36, grain: 0.012 },
  src: `
#define LKD vec3(-0.45, 0.85, 0.30)
#define KEYC vec3(2.2, 2.15, 2.0)
#define STEPS 200
#define MAXD 24.0
float BU(){ float s = 0.5 + 0.5*sin(TAU*uT/T*2.0 - 1.2); return s*s*s*s; }   // 30초에 두 번 몰아치는 기운
// 줄기 하나: 중심선이 높이마다 도는 나선. 반환: 거리, s(줄기 위 위치 0..1)
float stem(vec3 p, float fi, out float s){
  vec3 h = h33(vec3(fi, 3.1, 7.7));
  float ph = TAU*uT/T, bu = BU();
  float a0 = fi/9.0*TAU + 0.4*h.x;
  float r0 = 0.7 + 1.7*h.y;
  float H = 2.3 + 1.3*h.z + 0.25*sin(ph*2.0 + fi*1.3) + 0.35*bu;
  float y = clamp(p.y, 0.0, H);
  s = y/H;
  float whip = (0.35 + 0.55*bu)*sin(ph*(1.0 + mod(fi, 3.0)) + s*4.5 + fi)*s*s;
  float th = a0 + s*(2.4 + 1.6*h.x) + whip + ph;
  float R = r0*(1.0 - 0.55*s) + (0.75 + 0.3*h.y)*s*s*s;
  vec2 c = vec2(cos(th), sin(th))*R;
  float rad = mix(0.20, 0.04, pow(s, 0.75)) + 0.012*sin(s*60.0);
  vec3 q = vec3(p.x - c.x, p.y - y, p.z - c.y);
  // 끝눈: 줄기 끝의 작은 방울
  vec3 tip = vec3(cos(a0 + 2.4 + 1.6*h.x + ph + (0.35 + 0.55*bu)*sin(ph*(1.0 + mod(fi, 3.0)) + 4.5 + fi)),
                  0.0, sin(a0 + 2.4 + 1.6*h.x + ph + (0.35 + 0.55*bu)*sin(ph*(1.0 + mod(fi, 3.0)) + 4.5 + fi)))*(r0*0.45 + 0.75 + 0.3*h.y);
  tip.y = H;
  float bud = length(p - tip) - 0.075 - 0.02*bu;
  return min((length(q) - rad)*0.55, bud);
}
float water(vec3 p){
  float ph = TAU*uT/T, r = length(p.xz);
  return p.y + 0.012*sin(r*9.0 - ph*6.0)*exp(-r*0.35) + 0.004*sin(p.x*13.0 + ph*3.0)*sin(p.z*11.0 - ph*4.0);
}
float map(vec3 p){
  float d = water(p), s;
  if(length(p.xz) > 4.6 && p.y > 0.3) return min(d, length(p.xz) - 4.4);
  for(int i=0;i<9;i++) d = smin(d, stem(p, float(i), s), 0.16);
  return d;
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = 0.6 + 0.7*sin(TAU*t/T);
  ro = vec3(sin(a)*6.4, 1.0 + 0.3*sin(TAU*t/T), cos(a)*6.4);
  ta = vec3(0.0, 1.85, 0.0); fov = 0.80;
}
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  float best = 1e9, bs = 0.0, bi = 0.0, s;
  for(int i=0;i<9;i++){ float d = stem(p, float(i), s); if(d < best){ best = d; bs = s; bi = float(i); } }
  float ph = TAU*uT/T, bu = BU();
  if(water(p) < best - 0.01){
    alb = uC3*0.25; rough = 0.16; metal = 0.5;
    return;
  }
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 v = normalize(ro - p);
  float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  float grain = vn3(p*vec3(9.0, 40.0, 9.0) + bi*3.0);
  alb = mix(uC1*0.16, uC0*0.22, smoothstep(0.0, 0.9, bs))*(0.85 + 0.3*grain);
  rough = 0.035 + 0.05*grain; metal = 0.0;
  // 줄기 속 빛 맥: 가는 빛이 아래에서 위로 달린다 (30초에 정수 번)
  float pulse = pow(0.5 + 0.5*sin(bs*11.0 - ph*9.0 + bi*1.7), 40.0);
  // 속빛: 가운데는 깊은 비취, 테두리로 갈수록 빛이 비친다 (유리 속 산란)
  float core = 1.0 - fr;
  emit = mix(uC1*0.10, uC0*0.9, fr)*(0.5 + 0.9*bs)
       + uC0*0.08*core*(0.6 + 0.6*grain)
       + uC2*pulse*(2.2 + 4.0*bu)*smoothstep(0.02, 0.2, bs)*(0.4 + 0.6*fr)
       + uC2*smoothstep(0.93, 1.0, bs)*(3.0 + 5.0*bu);
}
vec3 env(vec3 rd){
  vec3 c = mix(uC3*0.04, uC3*0.18 + uC1*0.03, smoothstep(-0.3, 0.7, rd.y));
  float az = atan(rd.x, rd.z);
  c += vec3(2.6)*smoothstep(0.86, 0.9, rd.y);                                            // 위 소프트박스
  // 세로로 긴 소프트박스 셋: 유리 줄기를 따라 길게 비치는 반사
  c += vec3(4.5)*smoothstep(0.10, 0.06, abs(az - 1.7))*smoothstep(0.38, 0.5, rd.y)*smoothstep(0.92, 0.7, rd.y);
  c += mix(vec3(3.5), uC2*4.0, 0.5)*smoothstep(0.08, 0.05, abs(az + 1.5))*smoothstep(0.38, 0.5, rd.y)*smoothstep(0.92, 0.7, rd.y);
  c += uC0*3.0*smoothstep(0.12, 0.08, abs(abs(az) - 3.0))*smoothstep(0.2, 0.35, rd.y)*smoothstep(0.7, 0.45, rd.y);
  return c;
}
#define HAS_BG
vec3 bg(vec3 rd){
  // 뒤쪽 안개빛: 지평선 위로 옅게
  float hz = exp(-abs(rd.y - 0.05)*3.5);
  return uC3*0.05 + uC1*0.05*hz + uC0*0.015*smoothstep(0.2, 0.9, rd.y);
}
#define FOG 0.035
`,
  init(G, ctx) {
    const gl = G.gl;
    // 꽃가루 알갱이: 줄기 둘레를 나선으로 오르는 빛 점
    const N = ctx.cap ? 2600 : 1600;
    const VS = `#version 300 es
uniform float uT, uGain, uScale, uPx; uniform mat4 uVP; uniform vec3 uC0, uC2;
out vec3 vCol;
#define TAU 6.2831853
vec3 h3(float n){ vec3 p = fract(vec3(n)*vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.xxy + p.yzz)*p.zyx); }
void main(){
  float i = float(gl_VertexID);
  vec3 r = h3(i*1.37 + 0.5), r2 = h3(i*7.13 + 2.0);
  float ph = TAU*uT/30.0;
  float bu = pow(0.5 + 0.5*sin(ph*2.0 - 1.2), 4.0);
  float m = 1.0 + floor(r.y*3.0);
  float y = fract(r.x + uT/30.0*m);
  float R = 0.5 + 3.2*r.z*(0.4 + y) + 0.8*bu*r.z;
  float a = r2.x*TAU + ph*(2.0 + floor(r2.y*4.0)) + y*6.0;
  vec3 p = vec3(cos(a)*R, y*5.0 - 0.1, sin(a)*R);
  p += 0.12*vec3(sin(ph*3.0 + i), sin(ph*2.0 + i*1.7), cos(ph*3.0 + i*0.3));
  float life = smoothstep(0.0, 0.1, y)*smoothstep(1.0, 0.75, y);
  float tw = 0.4 + 0.6*pow(0.5 + 0.5*sin(ph*float(3 + int(r2.z*6.0)) + i), 4.0);
  vCol = mix(uC2, uC0, r2.z*0.6)*life*tw*(1.0 + 2.0*bu)*uGain*uScale;
  gl_Position = uVP*vec4(p, 1.0);
  gl_PointSize = uPx*(0.5 + 1.6*r2.y*r2.y);
}`;
    const FS = `#version 300 es
precision highp float; in vec3 vCol; out vec4 o;
void main(){ vec2 c = gl_PointCoord - 0.5; o = vec4(vCol*exp(-dot(c, c)*14.0), 1.0); }`;
    return { prog: SGL.program(gl, VS, FS), N, vao: gl.createVertexArray() };
  },
  draw(G, st, t, ctx) {
    SGL.drawRay(G, this.src, t, ctx);
    const a = 0.6 + 0.7 * Math.sin(2 * Math.PI * t / SGL.T);
    const eye = [Math.sin(a) * 6.4, 1.0 + 0.3 * Math.sin(2 * Math.PI * t / SGL.T), Math.cos(a) * 6.4];
    const VP = SGL.mul(SGL.perspective(0.80, ctx.W / ctx.H, 0.05, 50), SGL.lookAt(eye, [0, 1.85, 0], [0, 1, 0]));
    G.custom((gl, c) => {
      gl.useProgram(st.prog.p); const u = st.prog.u;
      gl.uniform1f(u.uT, t); gl.uniform1f(u.uGain, c.gain);
      const px = Math.max(2, 5.0 * ctx.H / 1080);
      gl.uniform1f(u.uPx, px); gl.uniform1f(u.uScale, 0.9);
      gl.uniformMatrix4fv(u.uVP, false, VP);
      gl.uniform3fv(u.uC0, ctx.colors[0]); gl.uniform3fv(u.uC2, ctx.colors[2]);
      gl.bindVertexArray(st.vao);
      gl.drawArrays(gl.POINTS, 0, st.N);
    });
  },
});
