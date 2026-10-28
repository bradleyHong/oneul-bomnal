/* 빛의 등고선 · Contour Light
 *
 * 어둠 속 산의 지형을 빛나는 등고선만으로 그린다. 선은 같은 높이마다 가늘게 빛나고 천천히 위로 올라가며,
 * 가끔 중심에서 퍼지는 빛의 물결이 선들을 밝힌다. 선 굵기는 기울기와 거리로 나눠 어디서나 같은 굵기로 보이게 했다.
 * 카메라는 섬을 한 바퀴 돈다(30초 루프).
 */
SGL.add({
  id: "contour", title: "빛의 등고선", en: "Contour Light", mood: ["geo", "nature"],
  desc: "어둠 속 산을 빛나는 등고선만으로 그립니다. 선이 천천히 위로 흐르고, 빛의 물결이 퍼져 나갑니다.",
  palettes: [
    { name: "네온", colors: ["#38d6ff", "#ff4fd8", "#d4ff3a", "#04060c"] },
    { name: "황금선", colors: ["#ffd36b", "#ff8a3a", "#fff1d6", "#0a0604"] },
    { name: "에메랄드", colors: ["#3dffa8", "#1fd1c1", "#9ad4ff", "#040a08"] },
    { name: "단색", colors: ["#ffffff", "#c8d8ff", "#9ab8ff", "#040406"] },
  ],
  post: { exposure: 1.0, bloom: 0.12, sat: 1.15, contrast: 1.10, vignette: 0.35, grain: 0.012 },
  src: `
#define LKD vec3(0.4, 0.7, -0.3)
#define KEYC vec3(0.05)
#define STEPS 200
#define MAXD 45.0
#define FOG 0.035
float ridge(vec3 p){ float s = 0.0, a = 0.5; for(int i=0;i<5;i++){ s += a*(1.0 - abs(vn3(p)*2.0 - 1.0)); p = p*2.03 + 1.7; a *= 0.5; } return s; }
float H(vec2 p){
  float r = length(p);
  float h = 2.6*exp(-r*r*0.045);
  h += 1.5*(ridge(vec3(p*0.22, 1.3)) - 0.55)*smoothstep(13.0, 4.0, r);
  return h - 0.6;
}
float map(vec3 p){ return (p.y - H(p.xz))*0.55; }
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(sin(a)*10.5, 5.2 + 0.4*sin(a*2.0), cos(a)*10.5); ta = vec3(0.0, 0.4, 0.0); fov = 0.8;
}
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  float dist = length(p - ro);
  float sp = 0.14;
  float v = p.y/sp - uT/T*4.0;                       // 30초에 4칸 올라간다
  float dl = (0.5 - abs(fract(v) - 0.5))*sp;         // 가장 가까운 선까지 높이 차
  float slope = sqrt(max(1.0 - n.y*n.y, 0.0))/max(n.y, 0.08);
  float sd = dl/max(slope, 0.06);                    // 표면 위 거리
  float w = 0.0016*dist;
  float major = mod(floor(v + 0.5), 5.0) < 0.5 ? 1.0 : 0.0;
  float line = (smoothstep(w*(1.0 + major), 0.0, sd) + 0.18*exp(-sd/(w*7.0)))*mix(0.35, 1.0, smoothstep(-0.55, 0.2, p.y))*smoothstep(17.0, 10.0, length(p.xz));
  float r = length(p.xz);
  float wave = fract(uT/T*2.0);
  float rr = (r - wave*16.0)*0.9;
  float ring = exp(-rr*rr)*(1.0 - wave);
  vec3 col = mix(uC0, uC1, smoothstep(-0.4, 2.4, p.y));
  col = mix(col, uC2, ring*0.7);
  alb = vec3(0.012); rough = 0.3; metal = 0.0;
  emit = col*line*(1.4 + 1.6*major + 5.0*ring) + col*ring*0.05;
}
vec3 env(vec3 rd){ return uC3 + uC0*0.03*exp(-abs(rd.y)*10.0); }
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
