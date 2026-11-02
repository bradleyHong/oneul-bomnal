/* 사계 · 네 계절의 구슬 · Four Seasons
 *
 * 구슬 하나가 30초 동안 봄·여름·가을·겨울을 지난다. 7.5초마다 모양과 재질이 바뀐다.
 *   봄  나선 결이 감기며 움트는 비취 유리
 *   여름  물결이 번지는 맑은 물방울
 *   가을  잘게 접힌 금박 덩어리
 *   겨울  육각 기둥이 솟은 얼음 결정
 * 계절이 넘어갈 때마다 구슬이 크게 휘돌고 속빛이 번쩍인다. 거울 같은 검은 바닥에 비친다.
 * 모양은 네 거리장을 무게로 섞고, 재질 값(색·거칠기·금속성·속빛)도 같은 무게로 섞는다.
 * 무게·회전·물결 모두 30초 주기 → 완전 루프.
 */
SGL.add({
  id: "four-seasons", title: "사계 · 네 계절의 구슬", en: "Four Seasons", mood: ["vivid", "geo"],
  desc: "구슬 하나가 30초 동안 봄·여름·가을·겨울을 지납니다. 비취 유리, 맑은 물방울, 금박, 얼음 결정으로 모양과 재질이 바뀌며 크게 휘돕니다.",
  palettes: [
    { name: "사계", colors: ["#7dff6a", "#2ad4ff", "#ffaa30", "#d8ecff"] },
    { name: "보석", colors: ["#3dffa8", "#3a6cff", "#ff6a3d", "#e0f0ff"] },
    { name: "파스텔", colors: ["#c8ffb0", "#a8e8ff", "#ffd0a0", "#f0f4ff"] },
    { name: "노을", colors: ["#ffb0d0", "#5ae0ff", "#ff7a3a", "#c8d0ff"] },
  ],
  post: { exposure: 1.0, bloom: 0.08, sat: 1.12, contrast: 1.10, vignette: 0.38, grain: 0.012 },
  src: `
#define LKD vec3(-0.5, 0.8, 0.35)
#define KEYC vec3(2.3, 2.2, 2.1)
#define STEPS 180
#define MAXD 20.0
float SS(){ return uT/T*4.0; }
// 계절 k 의 무게: 0.75 동안 머물고 0.25 동안 다음 계절로 넘어간다
float W(float k){ float d = mod(SS() - k + 0.25, 4.0) - 0.25; return smoothstep(-0.25, 0.0, d)*(1.0 - smoothstep(0.75, 1.0, d)); }
// 넘어가는 순간의 기운 (가운데서 1)
float TR(){ float f = fract(SS()); return sin(3.14159*clamp((f - 0.75)/0.25, 0.0, 1.0)); }
mat3 ORB(){
  float ph = TAU*uT/T;
  float a = ph + 0.55*sin(TAU*(SS() - 0.875));                     // 넘어갈 때 크게 휘돈다
  float b = 0.35*sin(ph*2.0) + 0.25*sin(TAU*(SS() - 0.875));
  float c = cos(a), s = sin(a), cb = cos(b), sb = sin(b);
  return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c)*mat3(1.0, 0.0, 0.0, 0.0, cb, sb, 0.0, -sb, cb);
}
float dSpring(vec3 p){
  float ph = TAU*uT/T;
  vec3 q = p; q.y *= 0.88;
  float r = length(q);
  float az = atan(q.z, q.x);
  float groove = sin(az*5.0 + q.y*7.0 - ph*4.0);
  return (r - 1.0 - 0.10*q.y*smoothstep(0.0, 1.0, q.y) + 0.08*groove*smoothstep(1.2, 0.2, abs(q.y)))*0.7;
}
float dSummer(vec3 p){
  float ph = TAU*uT/T;
  float r = length(p);
  vec3 n = p/max(r, 1e-3);
  float rip = sin(acos(clamp(n.y, -1.0, 1.0))*14.0 - ph*8.0)*0.035 + sin(n.x*9.0 + ph*3.0)*sin(n.z*7.0 - ph*5.0)*0.03;
  return (r - 1.0 - rip)*0.85;
}
float dAutumn(vec3 p){
  // 접힌 금박: 여러 방향의 평면으로 깎은 덩어리 + 잔 주름
  float d = length(p) - 1.05;
  for(int i=0;i<22;i++){
    vec3 nn = normalize(h33(vec3(float(i), 3.3, 9.1)) - 0.5);
    d = max(d, dot(p, nn) - 0.93 - 0.05*h11(float(i)*7.0));
  }
  return d - 0.008*vn3(p*14.0);
}
float hexPrism(vec3 p, vec2 h){ vec3 k = vec3(-0.8660254, 0.5, 0.57735); p = abs(p); p.xz -= 2.0*min(dot(k.xy, p.xz), 0.0)*k.xy;
  vec2 d = vec2(length(p.xz - vec2(clamp(p.x, -k.z*h.x, k.z*h.x), h.x))*sign(p.z - h.x), p.y - h.y); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float crystal(vec3 p, float r, float h){
  float d = hexPrism(p, vec2(r, h));
  // 뾰족한 끝
  float cap = (abs(p.y) - h - r*1.1) + length(p.xz)*0.9;
  return max(min(d, hexPrism(p, vec2(r, h + r*1.1))), cap*0.7);
}
float dWinter(vec3 p){
  float d = crystal(p, 0.42, 0.75);
  for(int i=0;i<5;i++){
    float fi = float(i);
    float a = fi/5.0*TAU;
    vec3 ax = normalize(vec3(cos(a), 0.55 + 0.25*sin(fi*2.0), sin(a)));
    // ax 를 y 축으로 돌려 놓은 자리에서 기둥을 잰다
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 xx = normalize(cross(up, ax)), zz = cross(xx, ax);
    vec3 lp = vec3(dot(p, xx), dot(p, ax), dot(p, zz)) - vec3(0.0, 0.55, 0.0);
    d = min(d, crystal(lp, 0.20 + 0.04*fi*0.5, 0.35 + 0.08*fi));
  }
  return d;
}
float orb(vec3 p){
  vec3 q = ORB()*(p - vec3(0.0, 0.15, 0.0));
  q /= 1.0 + 0.10*TR();
  float d = 0.0;
  float w0 = W(0.0), w1 = W(1.0), w2 = W(2.0), w3 = W(3.0);
  if(w0 > 0.001) d += w0*dSpring(q);
  if(w1 > 0.001) d += w1*dSummer(q);
  if(w2 > 0.001) d += w2*dAutumn(q);
  if(w3 > 0.001) d += w3*dWinter(q);
  return d*(1.0 + 0.10*TR());
}
float map(vec3 p){
  float fl = p.y + 1.25;
  if(length(p - vec3(0.0, 0.15, 0.0)) > 2.2) return min(fl, length(p - vec3(0.0, 0.15, 0.0)) - 2.0);
  return min(fl, orb(p));
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float ph = TAU*t/T;
  ro = vec3(3.7*sin(0.5*sin(ph)), 0.55 + 0.25*sin(ph*2.0), 3.7*cos(0.5*sin(ph)));
  ta = vec3(0.0, 0.05, 0.0); fov = 0.78;
}
vec3 SC(){ return uC0*W(0.0) + uC1*W(1.0) + uC2*W(2.0) + uC3*W(3.0); }       // 지금 계절 색
vec3 env(vec3 rd){
  vec3 sc = SC();
  vec3 c = mix(vec3(0.004), sc*0.02, smoothstep(-0.2, 0.8, rd.y));
  float az = atan(rd.x, rd.z);
  c += vec3(3.0)*smoothstep(0.84, 0.9, rd.y);
  c += vec3(4.0)*smoothstep(0.10, 0.06, abs(az - 1.6))*smoothstep(0.1, 0.25, rd.y)*smoothstep(0.85, 0.6, rd.y);
  c += sc*5.0*smoothstep(0.08, 0.05, abs(az + 1.4))*smoothstep(0.1, 0.25, rd.y)*smoothstep(0.85, 0.6, rd.y);
  c += sc*2.5*smoothstep(0.15, 0.1, abs(abs(az) - 3.0))*smoothstep(0.15, 0.3, rd.y)*smoothstep(0.7, 0.5, rd.y);
  return c;
}
// 비쳐 보이는 세상: 구슬 뒤에 옅은 빛판이 있어 유리·물·얼음 속이 살아난다 (반사에는 넣지 않는다)
vec3 envT(vec3 rd){
  vec3 c = env(rd);
  if(rd.z < 0.0){ vec2 b = rd.xy/max(-rd.z, 0.2); float r = length(b*vec2(0.9, 1.1));
    c += (vec3(0.9) + SC()*1.4)*(0.5*smoothstep(0.7, 0.3, r) + 1.2*smoothstep(0.08, 0.0, abs(r - 0.42))); }
  return c;
}
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  if(p.y < -1.2 && orb(p) > 0.01){
    alb = vec3(0.02); rough = 0.05; metal = 0.9;
    // 바닥에 비친 계절빛 고리
    float r = length(p.xz);
    emit = SC()*0.05*exp(-r*1.2);
    return;
  }
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 v = normalize(ro - p);
  float cv = max(dot(n, v), 0.0), fr = pow(1.0 - cv, 3.0);
  float w0 = W(0.0), w1 = W(1.0), w2 = W(2.0), w3 = W(3.0), tr = TR();
  vec3 q = ORB()*(p - vec3(0.0, 0.15, 0.0));
  // 봄: 비취 유리 — 테두리로 빛이 비친다
  vec3 a0 = uC0*0.06; vec3 rs = refract(-v, n, 1.0/1.45);
  vec3 e0 = envT(rs)*uC0*0.35*(1.0 - fr) + mix(uC0*0.02, uC0*0.6, fr*fr) + uC0*1.2*pow(0.5 + 0.5*sin(q.y*6.0 - TAU*uT/T*12.0), 80.0);
  // 여름: 맑은 물 — 굴절된 세상과 속 푸른빛
  vec3 rr = refract(-v, n, 1.0/1.33);
  vec3 a1 = uC1*0.03; vec3 e1 = envT(rr)*mix(uC1, vec3(1.0), 0.35)*(1.0 - fr) + uC1*0.15*fr;
  // 가을: 금박
  vec3 a2 = uC2*(0.8 + 0.2*vn3(q*30.0)); vec3 e2 = vec3(0.0);
  // 겨울: 얼음 — 파장별 굴절
  vec3 r1 = refract(-v, n, 1.0/1.31), r2 = refract(-v, n, 1.0/1.33);
  vec3 r3 = refract(-v, n, 1.0/1.35);
  vec3 a3 = uC3*0.02; vec3 e3 = vec3(envT(r1).r, envT(r2).g, envT(r3).b)*mix(uC3, vec3(1.0), 0.5)*0.75*(1.0 - fr) + uC3*0.25*fr;
  alb = a0*w0 + a1*w1 + a2*w2 + a3*w3;
  rough = 0.06*w0 + 0.02*w1 + 0.16*w2 + 0.03*w3;
  metal = w2;
  emit = e0*w0 + e1*w1 + e2*w2 + e3*w3;
  // 넘어갈 때 속에서 번쩍
  emit += SC()*tr*tr*2.2*exp(-length(q)*1.5);
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 sc = SC();
  return mix(vec3(0.003), sc*0.01, smoothstep(-0.1, 0.6, rd.y)) + sc*0.025*exp(-abs(rd.y - 0.05)*6.0);
}
#define FOG 0.04
`,
  init(G, ctx) {
    const gl = G.gl;
    // 구슬을 감아 도는 빛 알갱이 띠: 계절이 넘어갈 때 크게 퍼졌다 모인다
    const N = ctx.cap ? 5000 : 3000;
    const VS = `#version 300 es
uniform float uT, uGain, uPx; uniform mat4 uVP; uniform vec3 uC0, uC1, uC2, uC3;
out vec3 vCol;
#define TAU 6.2831853
vec3 h3(float n){ vec3 p = fract(vec3(n)*vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yzx + 33.33); return fract((p.xxy + p.yzz)*p.zyx); }
float W(float k, float s){ float d = mod(s - k + 0.25, 4.0) - 0.25; return smoothstep(-0.25, 0.0, d)*(1.0 - smoothstep(0.75, 1.0, d)); }
void main(){
  float i = float(gl_VertexID);
  vec3 r = h3(i*1.37 + 0.5), r2 = h3(i*5.71 + 3.0);
  float s = uT/30.0*4.0, ph = TAU*uT/30.0;
  float tr = sin(3.14159*clamp((fract(s) - 0.75)/0.25, 0.0, 1.0));
  float a = r.x*TAU + ph*(3.0 + floor(r.y*4.0));
  float R = 1.55 + 0.35*(r.z - 0.5) + 1.4*tr*r2.x;
  vec3 p = vec3(cos(a)*R, 0.12*(r2.y - 0.5) + 0.6*tr*(r2.z - 0.5), sin(a)*R);
  // 띠를 기울인다
  float tl = 0.45 + 0.15*sin(ph*2.0);
  p = vec3(p.x, p.y*cos(tl) - p.z*sin(tl), p.y*sin(tl) + p.z*cos(tl)) + vec3(0.0, 0.15, 0.0);
  vec3 sc = uC0*W(0.0, s) + uC1*W(1.0, s) + uC2*W(2.0, s) + uC3*W(3.0, s);
  float tw = 0.3 + 0.7*pow(0.5 + 0.5*sin(ph*float(4 + int(r2.x*6.0)) + i), 3.0);
  vCol = mix(sc, vec3(1.0), 0.3)*tw*(1.2 + 3.0*tr)*uGain*(0.3 + 0.7*r2.y);
  gl_Position = uVP*vec4(p, 1.0);
  gl_PointSize = uPx*(0.6 + 1.2*r2.z*r2.z);
}`;
    const FS = `#version 300 es
precision highp float; in vec3 vCol; out vec4 o;
void main(){ vec2 c = gl_PointCoord - 0.5; o = vec4(vCol*exp(-dot(c, c)*16.0), 1.0); }`;
    return { prog: SGL.program(gl, VS, FS), N, vao: gl.createVertexArray() };
  },
  draw(G, st, t, ctx) {
    SGL.drawRay(G, this.src, t, ctx);
    const ph = 2 * Math.PI * t / SGL.T, sw = 0.5 * Math.sin(ph);
    const eye = [3.7 * Math.sin(sw), 0.55 + 0.25 * Math.sin(ph * 2), 3.7 * Math.cos(sw)];
    const VP = SGL.mul(SGL.perspective(0.78, ctx.W / ctx.H, 0.05, 50), SGL.lookAt(eye, [0, 0.05, 0], [0, 1, 0]));
    G.custom((gl, c) => {
      gl.useProgram(st.prog.p); const u = st.prog.u;
      gl.uniform1f(u.uT, t); gl.uniform1f(u.uGain, c.gain); gl.uniform1f(u.uPx, Math.max(2, 3.5 * ctx.H / 1080));
      gl.uniformMatrix4fv(u.uVP, false, VP);
      ["uC0", "uC1", "uC2", "uC3"].forEach((k, i) => gl.uniform3fv(u[k], ctx.colors[i]));
      gl.bindVertexArray(st.vao);
      gl.drawArrays(gl.POINTS, 0, st.N);
    });
  },
});
