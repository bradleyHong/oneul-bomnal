/* 구름 바다 · Cloud Sea
 *
 * 해 뜨는 하늘 아래 끝없는 구름 바다 위를 천천히 돈다. 구름은 부피 광선 행진(밀도 fbm)으로,
 * 해 쪽으로 한 번 더 짚어 그늘을 만들고 해를 등진 쪽은 금빛으로 테두리가 빛나게(앞쪽 산란) 했다.
 * 카메라는 큰 원을 한 바퀴 돌아 30초 뒤 같은 자리로 온다.
 */
SGL.add({
  id: "cloud-sea", title: "구름 바다", en: "Cloud Sea", mood: ["calm", "nature"],
  desc: "해 뜨는 하늘 아래 끝없는 구름 바다 위를 천천히 날아갑니다. 구름 끝이 금빛으로 물듭니다.",
  palettes: [
    { name: "새벽", colors: ["#ffcf8a", "#ff8a6a", "#6a7aff", "#f4ecf0"] },
    { name: "한낮", colors: ["#ffffff", "#9ad4ff", "#2a6cff", "#f4f8ff"] },
    { name: "분홍 노을", colors: ["#ffb0a0", "#ff6aa8", "#7a5cff", "#ffe4ec"] },
    { name: "달밤", colors: ["#c8d8ff", "#5a7aff", "#0a1440", "#9aa8c8"] },
  ],
  post: { exposure: 1.0, bloom: 0.08, sat: 1.15, contrast: 1.10, vignette: 0.25, grain: 0.012 },
  src: `
#define STEPS 1
vec3 SUN(){ return normalize(vec3(0.15, 0.07, 1.0)); }
float hgt(vec2 x){
  return -0.30 + 0.55*(fbm3(vec3(x*0.20, 1.7)) - 0.5)*2.0 + 0.22*(fbm3(vec3(x*0.65, 4.0)) - 0.5);
}
float densLo(vec3 p){ return clamp((hgt(p.xz) - p.y)*2.2, 0.0, 1.0)*smoothstep(-2.4, -1.5, p.y); }
float dens(vec3 p){
  float det = fbm3(p*vec3(1.4, 2.0, 1.4) + vec3(0.0, 0.0, 3.0));
  return clamp((hgt(p.xz) - p.y)*2.2 + (det - 0.5)*1.4, 0.0, 1.0)*smoothstep(-2.4, -1.5, p.y);
}
vec3 sky(vec3 rd){
  vec3 s = SUN(); float d = max(dot(rd, s), 0.0);
  float h = max(rd.y, 0.0);
  vec3 c = mix(uC0*1.1 + uC1*0.3, uC2*0.9, pow(smoothstep(0.0, 0.55, h), 0.7));
  c = mix(c, uC1*0.8, exp(-h*14.0)*0.5);
  c += uC0*(0.8*pow(d, 10.0) + 1.5*pow(d, 120.0)) + vec3(12.0, 9.0, 6.0)*smoothstep(0.9993, 0.9996, d);
  return c;
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(sin(a)*9.0, 0.75 + 0.10*sin(a*2.0), cos(a)*9.0 - 9.0);
  vec3 fw = normalize(vec3(0.15, 0.0, 1.0) + 0.35*vec3(cos(a), 0.0, -sin(a)));
  ta = ro + fw + vec3(0.0, -0.10, 0.0); fov = 1.0;
}
vec3 env(vec3 rd){ return sky(rd); }
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 col = vec3(0.0); float tr = 1.0;
  vec3 s = SUN();
  vec3 hz = sky(normalize(vec3(rd.x, 0.015, rd.z)));
  float tHit = 1e9;
  if(rd.y < 0.02){
    float t = max((0.45 - ro.y)/min(rd.y, -1e-3), 0.0) + rnd()*0.05;
    float fwd = pow(max(dot(rd, s), 0.0), 6.0);
    for(int i=0;i<80;i++){
      vec3 p = ro + rd*t;
      if(p.y < -2.4 || t > 70.0) break;
      float stepL = 0.035 + t*0.018;
      float d = dens(p);
      if(d > 0.005){
        if(tHit > 1e8) tHit = t;
        float sh = densLo(p + s*0.20) + densLo(p + s*0.55) + densLo(p + s*1.3)*0.8;
        float sun = exp(-sh*2.6)*(0.8 + 2.6*fwd);
        vec3 amb = mix(uC2*0.10 + uC1*0.05, uC2*0.15 + uC3*0.30, smoothstep(-1.2, 0.3, p.y));
        vec3 lit = uC3*(uC0*2.2*sun + amb);
        float a = 1.0 - exp(-d*stepL*10.0);
        col += tr*a*lit; tr *= 1.0 - a;
        if(tr < 0.02) break;
      }
      t += stepL;
    }
    float fog = 1.0 - exp(-min(tHit, 70.0)*0.028);
    col = mix(col, hz*(1.0 - tr), fog);
  }
  return col + tr*sky(rd);
}
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
