/* 사건의 지평선 · Event Horizon
 *
 * 빛까지 휘게 하는 블랙홀. 광선을 한 걸음씩 따라가며 중심 쪽으로 휘게 하면(중력 렌즈),
 * 뒤쪽 강착원반이 블랙홀 위아래로 휘어 올라와 고리처럼 보인다. 원반은 안쪽이 희고 뜨겁고 바깥이 붉으며,
 * 다가오는 쪽이 더 밝다(도플러 빔). 원반 무늬의 회전은 두 시점을 섞는 방식으로 30초 루프를 맞춘다.
 */
SGL.add({
  id: "black-hole", title: "사건의 지평선", en: "Event Horizon", mood: ["cosmos", "vivid"],
  desc: "빛까지 휘게 하는 블랙홀 둘레로 뜨거운 원반이 돌고, 뒤편 원반이 휘어 올라와 빛의 고리가 됩니다.",
  palettes: [
    { name: "항성 불꽃", colors: ["#fff4e0", "#ffb35a", "#ff5a2a", "#7a1a0a"] },
    { name: "푸른 별", colors: ["#e8f4ff", "#7ab8ff", "#3a5aff", "#1a0a5a"] },
    { name: "자줏빛", colors: ["#fff0ff", "#ff7ad0", "#a03aff", "#3a0a5a"] },
    { name: "금빛", colors: ["#fffbe0", "#ffd36b", "#ff9a2a", "#5a2a0a"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.15, contrast: 1.10, vignette: 0.30, grain: 0.012 },
  src: `
#define STEPS 1
float noise2(vec2 p){ return vn3(vec3(p, 0.0)); }
float streak(float r, float a, float sh){
  // 각도 방향으로 주기적인 잡음 (원 위에서 뽑는다) → 원반 둘레가 이어진다
  vec2 c = vec2(cos(a + sh), sin(a + sh));
  return fbm3(vec3(c*2.2, log(r)*7.0)) ;
}
vec3 diskCol(vec3 q, vec3 rd){
  float r = length(q.xz), a = atan(q.z, q.x);
  float w = pow(r, -1.5)*6.0;                                 // 안쪽이 빨리 돈다
  float k = uT/T;
  float s = mix(streak(r, a, -w*TAU*k), streak(r, a, -w*TAU*(k - 1.0)), k);   // 두 시점을 섞어 루프
  float temp = pow(2.2/r, 0.9);
  vec3 c = mix(uC2, uC1, smoothstep(0.25, 0.65, temp));
  c = mix(c, uC0, smoothstep(0.65, 1.0, temp));
  vec3 tang = normalize(vec3(-q.z, 0.0, q.x));
  float beam = pow(clamp(1.0 + 0.75*dot(tang, -rd), 0.2, 2.0), 3.0);
  float inten = (0.35 + 1.4*s*s)*temp*temp*3.2*beam;
  float edge = smoothstep(2.2, 2.7, r)*(1.0 - smoothstep(6.0, 9.0, r));
  return c*inten*edge;
}
vec3 stars(vec3 rd){
  vec3 g = rd*180.0; vec3 i = floor(g); vec3 h = h33(i);
  float s = step(0.996, h.x)*smoothstep(0.5, 0.0, length(fract(g) - 0.5))*2.5;
  vec3 neb = uC3*0.08*fbm3(rd*3.0);
  return vec3(s) + neb;
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = 0.45*sin(TAU*t/T) + 0.6;
  float el = 0.10 + 0.04*sin(TAU*t/T*2.0);
  ro = vec3(sin(a)*cos(el), sin(el), cos(a)*cos(el))*15.0; ta = vec3(0.0); fov = 0.85;
}
vec3 env(vec3 rd){ return vec3(0.0); }
#define HAS_BG
vec3 bg(vec3 rd0){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 p = ro, rd = rd0;
  vec3 col = vec3(0.0); float tr = 1.0;
  float minR = 1e9;
  for(int i=0;i<340;i++){
    float r = length(p);
    minR = min(minR, r);
    if(r < 1.0){ tr = 0.0; break; }
    float dt = clamp(0.045*r, 0.015, 0.8);
    vec3 pp = p;
    rd = normalize(rd - normalize(p)*1.5/(r*r)*dt);
    p += rd*dt;
    if(pp.y*p.y < 0.0){
      vec3 q = mix(pp, p, pp.y/(pp.y - p.y));
      float rr = length(q.xz);
      if(rr > 2.2 && rr < 9.0){
        float al = 0.97*smoothstep(2.2, 2.6, rr)*(1.0 - smoothstep(7.0, 9.0, rr));
        col += tr*diskCol(q, rd)*al;
        tr *= 1.0 - al;
      }
    }
    if(r > 40.0 || tr < 0.01) break;
  }
  col += tr*stars(rd);
  // 광자 고리: 광선이 지평선 가까이 스쳐 간 만큼
  col += uC1*0.6*exp(-pow(max(minR - 1.0, 0.0)*6.0, 1.0))*tr;
  return col;
}
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
