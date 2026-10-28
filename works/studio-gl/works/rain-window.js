/* 비 내리는 창 · Rain on Glass
 *
 * 김 서린 유리창 너머로 밤 도시의 불빛이 흐릿한 원(보케)으로 번진다. 물방울이 미끄러져 내리며
 * 지나간 자리는 맑게 트이고, 물방울 속에는 불빛이 작고 또렷하게 뒤집혀 맺힌다.
 * 화면 평면 위의 계산이라 광선 행진은 쓰지 않는다. 물방울마다 30초에 1~2번 떨어지게 해 루프를 맞춘다.
 */
SGL.add({
  id: "rain-window", title: "비 내리는 창", en: "Rain on Glass", mood: ["calm", "vivid"],
  desc: "김 서린 유리창 너머 밤 도시의 불빛이 흐릿하게 번집니다. 미끄러지는 물방울 속에만 불빛이 또렷하게 맺힙니다.",
  palettes: [
    { name: "밤 도시", colors: ["#ffb35a", "#ff4f7a", "#38d6ff", "#1a1830"] },
    { name: "네온", colors: ["#ff4fd8", "#7a5cff", "#3dffa8", "#120a24"] },
    { name: "가로등", colors: ["#ffd36b", "#ff8a3a", "#fff1d6", "#201410"] },
    { name: "푸른 비", colors: ["#9ad4ff", "#3a7aff", "#c8a0ff", "#0a1424"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.15, contrast: 1.08, vignette: 0.35, grain: 0.016 },
  src: `
#define STEPS 1
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){ ro = vec3(0.0, 0.0, -1.0); ta = vec3(0.0); fov = 1.0; }
vec3 env(vec3 rd){ return vec3(0.0); }
// 도시 불빛 한 겹: 격자마다 하나씩, 흐림(blur)만큼 커지고 어두워지는 원
vec3 bokeh(vec2 q, float sc, float blur, float seed){
  vec2 g = q*sc; vec2 id = floor(g); vec3 c = vec3(0.0);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 cid = id + vec2(float(i), float(j));
    vec3 h = h33(vec3(cid, seed));
    if(h.z < 0.62) continue;
    vec2 ctr = cid + 0.5 + (h.xy - 0.5)*0.8;
    float r = (0.10 + 0.16*h.x)*blur;
    float d = length(g - ctr);
    float disc = smoothstep(r, r*0.86, d);
    float rim = smoothstep(r*0.55, r*0.95, d)*disc;
    float tw = 0.7 + 0.3*sin(TAU*(uT/T*floor(1.0 + h.y*3.0) + h.x*7.0));
    vec3 col = h.y < 0.42 ? uC0 : (h.y < 0.78 ? uC1 : uC2);
    float yf = smoothstep(1.05, 0.25, ctr.y/sc);
    c += col*(disc*0.55 + rim*0.45)*tw*yf*0.16/(0.08 + r*r*3.0);
  }
  return c;
}
// 길 위의 차 불빛: 빨간 꼬리등은 오른쪽, 흰 전조등은 왼쪽으로 (8칸 주기 → 30초에 정확히 8칸)
vec3 cars(vec2 q, float blur){
  vec3 c = vec3(0.0);
  for(int k=0;k<2;k++){
    float dir = k == 0 ? 1.0 : -1.0;
    vec3 col = k == 0 ? vec3(1.0, 0.10, 0.04)*1.4 : vec3(1.0, 0.92, 0.80);
    float y0 = 0.16 + 0.05*float(k);
    float gx = q.x*3.0 - dir*uT/T*8.0;
    float id = floor(gx);
    for(int i=-1;i<=1;i++){
      float cid = id + float(i);
      float h = h11(mod(cid, 8.0)*13.7 + float(k)*5.1);
      if(h < 0.35) continue;
      for(int s=0;s<2;s++){
        vec2 ctr = vec2((cid + 0.3 + 0.4*h + float(s)*0.10)/3.0, y0 + 0.01*h);
        float r = 0.012*blur + 0.002;
        float d = length(q - ctr);
        c += col*smoothstep(r, r*0.7, d)*0.0022/(r*r + 0.00002);
      }
    }
  }
  return c;
}
vec3 city(vec2 q, float blur){
  vec3 c = mix(uC3*0.35, uC3*0.06, smoothstep(0.0, 1.0, q.y)) + uC1*0.05*smoothstep(0.55, 0.0, q.y);
  c += bokeh(q, 4.0, blur, 1.0) + bokeh(q, 7.0, blur, 2.0)*0.7 + bokeh(q, 12.0, blur, 3.0)*0.45;
  c += cars(q, blur);
  return c;
}
// 미끄러지는 물방울 한 겹: xy=굴절 이동, z=물방울, w=지나간 자리(맑은 줄)
vec4 slide(vec2 q, float sc, float seed){
  vec2 cs = vec2(1.0, 3.0);
  vec2 g = q*sc/cs; vec2 id = floor(g); vec2 f = fract(g);
  vec3 h = h33(vec3(id, seed));
  if(h.z < 0.25) return vec4(0.0);
  float ph = fract(uT/T*floor(1.0 + h.y*2.0) + h.x);
  float y = 1.05 - 1.1*ph;
  float x = 0.5 + (h.z - 0.5)*0.45 + 0.05*sin(ph*TAU*3.0 + h.x*6.0);
  vec2 p = (f - vec2(x, y))*cs;
  float r = 0.14 + 0.06*h.y;
  float d = length(p*vec2(1.0, p.y > 0.0 ? 0.7 : 1.05));
  float m = smoothstep(r, r*0.75, d);
  float above = smoothstep(0.0, 0.05, f.y - y);
  float fade = smoothstep(0.9, 0.0, (f.y - y)*cs.y*0.6);
  vec2 tp = vec2(p.x, mod(f.y*cs.y + h.x, 0.24) - 0.12);
  float tm = smoothstep(r*0.38, r*0.22, length(tp))*above*fade*step(0.3, h11(floor(f.y*cs.y/0.24 + h.x) + seed));
  float streak = smoothstep(r*0.9, r*0.5, abs(p.x))*above*fade;
  return vec4(p*m*3.0 + tp*tm*3.0, max(m, tm), streak);
}
// 제자리 물방울: 맺혔다 사라졌다 한다
vec3 still(vec2 q, float sc, float seed){
  vec2 g = q*sc; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
  vec3 h = h33(vec3(id, seed + 9.0));
  float ph = fract(uT/T*floor(1.0 + h.z*2.0) + h.x);
  float life = smoothstep(0.0, 0.08, ph)*smoothstep(1.0, 0.75, ph);
  vec2 p = f - (h.xy - 0.5)*0.6;
  float r = (0.10 + 0.14*h.y)*life;
  float m = smoothstep(r, r*0.7, length(p))*step(0.55, h.z);
  return vec3(p*m*2.5, m);
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec2 q = gl_FragCoord.xy/uRes.y;
  vec4 a = slide(q, 3.2, 1.0), b = slide(q + vec2(0.37, 0.0), 5.5, 2.0);
  vec3 s1 = still(q, 18.0, 3.0), s2 = still(q, 30.0, 4.0);
  vec2 off = a.xy + b.xy*0.8 + s1.xy*0.5 + s2.xy*0.35;
  float m = clamp(a.z + b.z + s1.z + s2.z, 0.0, 1.0);
  float clear = clamp(a.w + b.w*0.8, 0.0, 1.0);
  vec3 fogged = city(q, 2.4)*0.65 + city(q*0.5, 5.0)*0.35 + uC3*0.30 + vec3(0.018);
  vec3 seen = city(q, 0.55);
  vec3 drop = city(q - off*0.25, 1.4)*1.6 + uC3*0.15 + vec3(0.01);
  vec3 c = mix(fogged, seen, clear*0.85);
  float rimD = m*(1.0 - m)*4.0;
  c = mix(c, drop, m);
  c *= 1.0 - 0.30*rimD;
  c += vec3(0.6)*smoothstep(0.08, 0.2, -off.y)*m*0.08;
  return c;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
