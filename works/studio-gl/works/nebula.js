/* 성운 · Nebula
 *
 * 빛나는 가스 구름 속을 천천히 돈다. 부피 광선 행진으로 가스가 스스로 내는 빛을 쌓고,
 * 어두운 먼지 띠가 그 빛을 가린다. 가스는 정의역을 비튼 fbm, 색은 밀도와 위치로 팔레트를 고른다.
 * 카메라가 원을 한 바퀴 돌아 30초 루프.
 */
SGL.add({
  id: "nebula", title: "성운", en: "Nebula", mood: ["cosmos", "vivid"],
  desc: "별이 태어나는 가스 구름 속을 천천히 지나갑니다. 빛나는 가스 사이로 어두운 먼지 띠가 흐릅니다.",
  palettes: [
    { name: "창조의 기둥", colors: ["#ff6a8a", "#ffb35a", "#3ad6ff", "#1a0a2a"] },
    { name: "오리온", colors: ["#ff4fd8", "#7a5cff", "#38d6ff", "#0a0a2a"] },
    { name: "에메랄드", colors: ["#3dffa8", "#1fd1c1", "#d4ff3a", "#06141a"] },
    { name: "불꽃", colors: ["#ffd36b", "#ff5a2a", "#a03aff", "#140806"] },
  ],
  post: { exposure: 1.0, bloom: 0.12, sat: 1.25, contrast: 1.15, vignette: 0.30, grain: 0.012 },
  src: `
#define STEPS 1
float gas(vec3 p){
  vec3 q = p*0.6;
  vec3 w = vec3(fbm3(q + 2.1), fbm3(q - 5.3), fbm3(q + 7.7));
  return fbm3(q*1.3 + w*2.2);
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(sin(a)*3.6, 0.5*sin(a*2.0), cos(a)*3.6); ta = vec3(0.4*cos(a), 0.0, -0.4*sin(a)); fov = 1.0;
}
vec3 env(vec3 rd){ return vec3(0.0); }
vec3 starField(vec3 rd, float sc, float th){
  vec3 g = rd*sc; vec3 h = h33(floor(g));
  float s = step(th, h.x)*smoothstep(0.45, 0.0, length(fract(g) - 0.5 - (h.yzx - 0.5)*0.4));
  return s*mix(vec3(1.0, 0.85, 0.7), vec3(0.7, 0.85, 1.0), h.y)*(1.0 + 4.0*h.z*h.z);
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 col = vec3(0.0); float tr = 1.0;
  float stepL = 0.07;
  float t = 0.5 + rnd()*stepL;
  for(int i=0;i<84;i++){
    vec3 p = ro + rd*t;
    float shell = 1.0 - smoothstep(1.4, 3.0, length(p*vec3(1.0, 1.4, 1.0)));
    if(shell > 0.0){
      float g = gas(p);
      float body = smoothstep(0.50, 0.82, g)*shell;
      float fil = pow(1.0 - abs(g*2.0 - 1.0), 12.0)*shell;
      float hue = fbm3(p*0.35 + 20.0);
      vec3 c = mix(mix(uC0, uC1, smoothstep(0.32, 0.48, hue)), uC2, smoothstep(0.56, 0.72, hue));
      float core = exp(-dot(p, p)*1.2);
      vec3 em = c*(body*body*0.55 + fil*0.7) + mix(c, vec3(1.0), 0.6)*core*body*1.8;
      float dust = smoothstep(0.50, 0.60, fbm3(p*1.1 + vec3(11.0, 3.0, 7.0)))*shell;
      col += tr*em*stepL*1.2;
      tr *= exp(-(dust*16.0 + body*0.8)*stepL);
    }
    t += stepL;
    if(tr < 0.02) break;
  }
  col += tr*(starField(rd, 220.0, 0.995)*1.5 + starField(rd, 60.0, 0.998)*4.0 + uC3*0.25);
  return col;
}
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
