/* 빛 내리는 숲 · Forest Light
 *
 * 안개 낀 숲 사이로 햇빛이 기둥처럼 내려온다. 광선을 따라가며 그 점에서 해 쪽을 올려다봤을 때
 * 나뭇잎 사이로 하늘이 보이는지(지붕 구멍 잡음)를 재어 빛을 쌓으면, 빛줄기가 공기 속에 떠오른다.
 * 나무는 6 마다 되풀이되게 심었고 카메라가 30초에 정확히 6 만큼 걸어 들어가 루프가 된다. 잎이 흔들리는 것도 원을 그린다.
 */
SGL.add({
  id: "forest-light", title: "빛 내리는 숲", en: "Forest Light", mood: ["calm", "nature"],
  desc: "안개 낀 숲 사이로 햇빛이 기둥처럼 내려옵니다. 나무 사이를 천천히 걸어 들어갑니다.",
  palettes: [
    { name: "아침 숲", colors: ["#fff1c8", "#5a8a3a", "#9ec8b0", "#3a2a20"] },
    { name: "가을 숲", colors: ["#ffd08a", "#c0602a", "#d8b090", "#3a2418"] },
    { name: "푸른 새벽", colors: ["#d8e8ff", "#3a7a6a", "#7a9ac8", "#1a2028"] },
    { name: "노을 숲", colors: ["#ffb070", "#7a5a2a", "#e0907a", "#2a1a18"] },
  ],
  post: { exposure: 1.0, bloom: 0.08, sat: 1.10, contrast: 1.08, vignette: 0.32, grain: 0.014 },
  src: `
#define STEPS 1
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
vec3 SUN(){ return normalize(vec3(-0.30, 0.78, 0.55)); }
const float CEIL = 7.0;
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(0.25*sin(a), 1.5 + 0.05*sin(a*4.0), t/T*6.0);
  ta = ro + vec3(0.25*sin(a + 0.8), 0.10, 1.0); fov = 1.05;
}
vec3 env(vec3 rd){ return vec3(0.0); }
// 나무: 3x3 칸마다 하나, z 방향 2칸(6) 주기, 가운데 길(x 칸 0)은 비운다
float trees(vec3 p, out float bark){
  vec2 c = vec2(floor((p.x + 1.5)/3.0), floor(p.z/3.0));
  vec2 l = vec2(mod(p.x + 1.5, 3.0) - 1.5, mod(p.z, 3.0) - 1.5);
  vec3 h = h33(vec3(c.x, mod(c.y, 2.0), 7.0));
  float r = 0.18 + 0.22*h.z;
  vec2 off = (h.xy - 0.5)*1.4;
  vec2 d2 = l - off + vec2(0.04*sin(p.y*0.7 + h.x*6.0), 0.0);
  float ang = atan(d2.y, d2.x);
  bark = vn3(vec3(ang*3.0, p.y*1.2, h.x*9.0));
  float d = length(d2) - r - 0.02*bark;
  if(abs(c.x) < 0.5) d = 1.2;
  return d;
}
// z 방향 6 주기 잡음 (원통 위에서 뽑는다)
float pn(vec2 q, float f){ float an = q.y*TAU/6.0; float R = 6.0*f/TAU; return vn3(vec3(q.x*f, cos(an)*R, sin(an)*R)); }
float ground(vec3 p){ return p.y - 0.18*sin(p.x*0.5)*sin(p.z*TAU/6.0) - 0.06*pn(p.xz, 1.5); }
float scene(vec3 p, out float id, out float bark){
  float tr = trees(p, bark), gr = ground(p);
  id = tr < gr ? 1.0 : 0.0;
  return min(tr, gr);
}
// 지붕 구멍: 해 쪽으로 올려다본 곳의 잎 틈
float hole(vec3 p){
  vec3 s = SUN();
  vec2 pc = p.xz + s.xz*(CEIL - p.y)/s.y;
  float a = TAU*uT/T;
  vec2 sway = vec2(cos(a), sin(a))*0.10;
  // z 방향 6 주기: 원통 위 잡음
  float an = pc.y*TAU/6.0; float R = 6.0*0.45/TAU;
  float v = fbm3(vec3(pc.x*0.45 + sway.x, cos(an)*R + sway.y, sin(an)*R));
  return smoothstep(0.56, 0.68, v);
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 s = SUN();
  float id = 0.0, bark = 0.0;
  // 표면 찾기
  float t = 0.0, hit = -1.0;
  for(int i=0;i<140;i++){
    float d = scene(ro + rd*t, id, bark);
    if(d < 0.002*(1.0 + t)){ hit = t; break; }
    t += d*0.8;
    if(t > 40.0) break;
  }
  float tend = hit > 0.0 ? hit : 40.0;
  // 공기 속 빛 (해 쪽 산란이 강하다)
  float mu = dot(rd, s);
  float phase = 0.25 + 1.4*pow(max(mu, 0.0), 8.0) + 0.25*pow(max(mu, 0.0), 2.0);
  float dens = 0.065;
  vec3 col = vec3(0.0); float tr = 1.0;
  float dt = tend/56.0;
  float tt = dt*rnd();
  for(int i=0;i<56;i++){
    vec3 p = ro + rd*tt;
    float L = hole(p);
    vec3 amb = uC2*0.025;
    col += tr*(uC0*L*phase*4.0 + amb)*dens*dt;
    tr *= exp(-dens*dt);
    tt += dt;
  }
  vec3 sc;
  if(hit > 0.0){
    vec3 p = ro + rd*hit;
    vec2 e = vec2(0.003, 0.0); float i1, b1;
    vec3 n = normalize(vec3(scene(p + e.xyy, i1, b1) - scene(p - e.xyy, i1, b1), scene(p + e.yxy, i1, b1) - scene(p - e.yxy, i1, b1), scene(p + e.yyx, i1, b1) - scene(p - e.yyx, i1, b1)));
    float sh = 1.0, st = 0.05;
    for(int k=0;k<20;k++){ float d = scene(p + n*0.01 + s*st, i1, b1); sh = min(sh, 8.0*d/st); st += clamp(d, 0.05, 0.5); if(sh < 0.01 || st > 8.0) break; }
    sh = clamp(sh, 0.0, 1.0);
    float sunL = hole(p)*sh*max(dot(n, s), 0.0);
    vec3 alb = id > 0.5 ? uC3*(0.25 + 0.45*bark) : mix(uC1*0.6, uC3*0.8, smoothstep(0.3, 0.8, pn(p.xz, 2.0)));
    vec3 ambC = mix(uC2*0.10, uC1*0.05, 0.5 - 0.5*n.y)*(0.6 + 0.4*n.y);
    sc = alb*(uC0*3.0*sunL + ambC);
  } else {
    // 위로는 잎 지붕: 어두운 잎 사이로 하늘이 빛난다
    vec2 cp = rd.xz/max(rd.y, 0.05)*(CEIL - ro.y) + ro.xz;
    float an = cp.y*TAU/6.0; float R = 6.0*0.45/TAU; float a2 = TAU*uT/T;
    float lv = fbm3(vec3(cp.x*0.45 + cos(a2)*0.10, cos(an)*R + sin(a2)*0.10, sin(an)*R));
    float gap = smoothstep(0.56, 0.68, lv);
    sc = mix(uC1*0.05 + uC3*0.05, uC0*1.6 + uC2*0.3, gap)*smoothstep(-0.05, 0.25, rd.y) + uC2*0.3*smoothstep(0.25, -0.05, rd.y);
  }
  // 멀리는 안개빛
  vec3 fogc = uC2*0.16 + uC0*0.18*pow(max(mu, 0.0), 3.0);
  return sc*tr + col + fogc*(1.0 - tr)*0.6;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
