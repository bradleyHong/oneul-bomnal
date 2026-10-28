/* 물속의 잉크 · Ink Bloom
 *
 * 맑은 물속에 색 잉크가 번지듯 구름 덩어리가 피어오르고 감긴다. 부피 광선 행진(volume ray marching):
 * 광선을 따라 밀도(정의역을 비튼 fbm)를 쌓으며 빛을 흡수·산란시킨다.
 * 비트는 오프셋을 원 위에서 돌려 30초 뒤 같은 모양으로 돌아온다.
 */
SGL.add({
  id: "ink", title: "물속의 잉크", en: "Ink Bloom", mood: ["calm", "vivid"],
  desc: "맑은 물속에 색 잉크가 피어올라 구름처럼 감기고 풀립니다. 부드럽고 몽환적인 배경으로 좋습니다.",
  palettes: [
    { name: "봄 잉크", colors: ["#ff4f9a", "#7a5cff", "#38d6ff", "#f6f2ff"] },
    { name: "먹", colors: ["#1a1a24", "#4a4a60", "#9aa0b8", "#f4f2ee"] },
    { name: "노을", colors: ["#ff7a3d", "#ff2d6b", "#ffd36b", "#fff4e8"] },
    { name: "숲속", colors: ["#1fd1a0", "#2a6cff", "#d4ff3a", "#f0fff6"] },
  ],
  post: { exposure: 1.0, bloom: 0.05, sat: 1.15, contrast: 1.06, vignette: 0.22, grain: 0.012 },
  src: `
#define STEPS 1
float dens(vec3 p){
  float ph = TAU*uT/T;
  vec3 o = vec3(cos(ph), sin(ph), cos(ph)*0.5)*0.55;
  vec3 q = p*0.9 + o;
  vec3 w = vec3(fbm3(q + 1.7), fbm3(q + 9.2), fbm3(q - 4.1));
  float f = fbm3(q*1.3 + w*2.2 + vec3(0.0, -ph*0.0, 0.0));
  float shape = 1.0 - length(p*vec3(0.55, 0.75, 0.75));          // 화면 가운데 덩어리
  return clamp((f - 0.42)*3.2 + shape*0.9 - 0.25, 0.0, 1.0);
}
vec3 inkCol(vec3 p){ return pal(fbm3(p*0.6 + 3.0)*1.4 + p.y*0.15); }
vec3 env(vec3 rd){ return uC3; }
#define HAS_BG
vec3 bg(vec3 rd){
  // 뒤판: 밝은 물빛 (위가 조금 더 밝다)
  vec3 back = uC3*mix(0.18, 0.42, smoothstep(-0.6, 0.6, rd.y));
  vec3 ro = vec3(0.0, 0.0, -3.4);
  vec3 col = vec3(0.0); float tr = 1.0;
  float t = 1.6 + rnd()*0.05;
  vec3 L = normalize(vec3(-0.3, 0.8, -0.4));
  for(int i=0;i<72;i++){
    vec3 p = ro + rd*t;
    float d = dens(p);
    if(d > 0.01){
      float sh = dens(p + L*0.18);                               // 빛 쪽 한 번 짚어 그늘
      vec3 c = inkCol(p);
      vec3 lit = c*(0.25 + 1.1*exp(-sh*3.0)) + uC3*0.04;
      float a = 1.0 - exp(-d*0.11*13.0);
      col += tr*a*lit;
      tr *= 1.0 - a;
      if(tr < 0.02) break;
    }
    t += 0.05;
    if(t > 5.2) break;
  }
  return col + tr*back;
}
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){ ro = vec3(0.0, 0.0, -3.4); ta = vec3(0.0); fov = 0.9; }
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
