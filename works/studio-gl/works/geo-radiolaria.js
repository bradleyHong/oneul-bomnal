/* 방산충 · Radiolaria
 *
 * 헤켈의 그림 속 방산충처럼, 유리로 된 아주 작은 뼈대. 겉 껍질과 속 껍질 두 겹이 육각 그물로 뚫려 있고
 * (구멍은 구면 피보나치 점마다 하나: 거의 다 육각으로 맞물린다), 가운데에서 가시가 사방으로 뻗고 가시마다 작은 구슬이 맺힌다.
 * 유리는 굴절 대신 '여러 겹 투과'로 그린다: 광선이 겉면을 만날 때마다 프레넬 반사 · 가장자리 빛을 더하고
 * 조금씩 흐려지며 계속 들어가, 뒤쪽 그물까지 겹쳐 보인다. 표면 가까이를 지날 때 고이는 빛(산란)이 암시야 현미경의 빛 테를 만든다.
 * 배경은 검은 암시야, 플랑크톤 티끌이 깊이마다 흐릿하게 떠 있다. 뼈대는 30초에 한 바퀴 돌고 가시는 숨 쉬듯 늘었다 줄어든다.
 */
SGL.add({
  id: "geo-radiolaria", title: "방산충", en: "Radiolaria", mood: ["geo", "nature", "cosmos"],
  desc: "바다 속 아주 작은 생물이 남긴 유리 뼈대가 어둠 속에 떠 있습니다. 육각 그물 두 겹과 빛나는 가시가 천천히 돌며 숨을 쉽니다.",
  palettes: [
    { name: "암시야", colors: ["#e8f4ff", "#5ad0ff", "#ffcf7a", "#02040a"] },
    { name: "심해 청록", colors: ["#d8fff4", "#2affc0", "#7a8cff", "#010806"] },
    { name: "호박 유리", colors: ["#fff0d8", "#ffa040", "#ff5a7a", "#080402"] },
    { name: "자수정", colors: ["#f4e8ff", "#b07aff", "#5ad8ff", "#05020c"] },
  ],
  post: { exposure: 1.0, bloom: 0.11, sat: 1.12, contrast: 1.10, vignette: 0.34, grain: 0.014 },
  src: `
#define PHI 1.6180339887
#define PI 3.14159265
uniform float uAA;
vec3 sfPt(float i, float n){
  float ph = 2.0*PI*fract(i*PHI), ct = 1.0 - (2.0*i + 1.0)/n;
  float st = sqrt(max(1.0 - ct*ct, 0.0)); return vec3(cos(ph)*st, sin(ph)*st, ct);
}
// 구면 피보나치 역사상 (Keinert 외 2015): 단위 방향 p 에 가장 가까운 점 (번호, 방향 거리)
vec2 sfNear(vec3 p, float n, out vec3 best){
  float m = 1.0 - 1.0/n;
  float phi = min(atan(p.y, p.x), PI), cosT = p.z;
  float k = max(2.0, floor(log(n*PI*sqrt(5.0)*(1.0 - cosT*cosT))/log(PHI*PHI)));
  float Fk = pow(PHI, k)/sqrt(5.0);
  vec2 F = vec2(floor(Fk + 0.5), floor(Fk*PHI + 0.5));
  vec2 ka = 2.0*F/n, kb = 2.0*PI*(fract((F + 1.0)*PHI) - (PHI - 1.0));
  mat2 iB = mat2(ka.y, -ka.x, kb.y, -kb.x)/(ka.y*kb.x - ka.x*kb.y);
  vec2 c = floor(iB*vec2(phi, cosT - m));
  float d = 8.0, j = 0.0; best = vec3(0.0, 0.0, 1.0);
  for(int s=0;s<4;s++){
    float i = dot(F, vec2(float(s%2), float(s/2)) + c);
    if(i < 0.0 || i >= n) continue;
    vec3 q = sfPt(i, n);
    float dd = dot(q - p, q - p);
    if(dd < d){ d = dd; j = i; best = q; }
  }
  return vec2(j, sqrt(d));
}
// 30초에 한 바퀴 (기울어진 축)
vec3 spin(vec3 p){
  float a = TAU*uT/T;
  p.xz = rot(a)*p.xz;
  p.yz = rot(0.42)*p.yz;
  return p;
}
const float R1 = 1.0, R2 = 0.58;
float lattice(vec3 p, float R, float n, float th, float hole, float seed){
  float r = length(p); vec3 d = p/max(r, 1e-5);
  vec3 c; vec2 nn = seed > 0.5 ? sfNear(d.zxy, n, c) : sfNear(d.yzx, n, c);
  float sp = sqrt(4.0*PI/n);                           // 점 사이 각
  float shell = abs(r - R) - th;
  float h = nn.y*R - hole*sp*R;                         // 구멍(원기둥) 밖까지 거리
  return -smin(-shell, h, 0.012);                       // 둥글게 다듬은 유리 살
}
float spikes(vec3 p, out float bead){
  float r = length(p); vec3 d = p/max(r, 1e-5);
  vec3 c; vec2 nn = sfNear(d, 26.0, c);
  float i = nn.x;
  float breath = 0.5 + 0.5*sin(TAU*uT/T*2.0 + i*2.399);
  float L = 1.62 + 0.10*h11(i*3.1) + 0.16*breath;       // 가시 끝
  // 가시 축까지의 거리 (축 = 원점에서 c 방향)
  float t = clamp(dot(p, c), R2*0.9, L);
  float w = mix(0.026, 0.009, smoothstep(R2, L, t));
  float sd = length(p - c*t) - w;
  // 구슬: 가시를 따라 세 알, 끝에 한 알
  float b1 = length(p - c*mix(R1, L, 0.38)) - 0.022;
  float b2 = length(p - c*mix(R1, L, 0.72)) - 0.016;
  float b3 = length(p - c*(L + 0.012)) - 0.020;
  bead = min(min(b1, b2), b3);
  return min(sd, bead);
}
float gBead;
float map(vec3 p0){
  vec3 p = spin(p0);
  float a = lattice(p, R1, 200.0, 0.016, 0.50, 0.0);
  float b = lattice(p, R2, 80.0, 0.014, 0.47, 1.0);
  float bd; float s = spikes(p, bd); gBead = bd;
  return min(min(a, b), s);
}
vec3 calcN(vec3 p){ vec2 e = vec2(0.0007, -0.0007); return normalize(e.xyy*map(p + e.xyy) + e.yyx*map(p + e.yyx) + e.yxy*map(p + e.yxy) + e.xxx*map(p + e.xxx)); }
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(0.30*sin(a), 0.18*sin(a*2.0) + 0.12, 4.1); ta = vec3(0.0, 0.0, 0.0); fov = 0.72;
}
// 암시야 조명: 사방 비스듬히 들어오는 고리 빛 (유리 면에 비치는 세상)
vec3 env(vec3 rd){
  float ring = smoothstep(0.30, 0.0, abs(rd.z + 0.35))*0.9;          // 뒤쪽 고리
  vec3 c = uC1*ring*0.9 + uC0*pow(max(dot(rd, normalize(vec3(-0.6, 0.7, 0.3))), 0.0), 24.0)*6.0;
  c += uC2*pow(max(dot(rd, normalize(vec3(0.8, -0.3, -0.2))), 0.0), 16.0)*2.2;
  return c + uC3*0.4;
}
// 플랑크톤 티끌: 깊이 세 층, 초점 밖은 크고 옅게
vec3 motes(vec2 sp){
  vec3 c = vec3(0.0); float a = TAU*uT/T;
  for(int L=0;L<3;L++){
    float fl = float(L);
    float sc = 7.0 + fl*5.0;
    vec2 drift = vec2(cos(a + fl*2.0), sin(a + fl*1.3))*(0.10 + 0.05*fl) + vec2(0.0, 0.0);
    vec2 g = (sp + drift)*sc; vec2 id = floor(g), f = fract(g);
    vec3 h = h33(vec3(id, fl*17.0));
    if(h.z > (L == 1 ? 0.10 : 0.06)) continue;
    vec2 pos = 0.2 + 0.6*h.xy;
    float d = length(f - pos);
    float size = (L == 1) ? 0.03 : (L == 0 ? 0.12 : 0.05);
    float k = exp(-d*d/(size*size));
    float tw = 0.7 + 0.3*sin(a*float(1 + L) + h.x*TAU);
    vec3 col = mix(uC1, uC0, h.y)*(L == 0 ? 0.03 : (L == 1 ? 0.25 : 0.08));
    c += col*k*tw;
  }
  return c;
}
void main(){
  vec3 acc = vec3(0.0);
  int nA = int(uAA);
  for(int j=0;j<4;j++){ if(j >= nA) break;
    for(int i=0;i<4;i++){ if(i >= nA) break;
      SEED = uint(gl_FragCoord.x)*1973u + uint(gl_FragCoord.y)*9277u + uint(i + j*4)*26699u + uint(uT*997.0)*1013u + 1u;
      vec2 off = (vec2(float(i), float(j)) + 0.5)/uAA - 0.5;
      vec2 sp = ((gl_FragCoord.xy + off)/uRes*2.0 - 1.0)*vec2(uRes.x/uRes.y, 1.0);
      vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
      vec3 cw = normalize(ta - ro), cu = normalize(cross(cw, vec3(0, 1, 0))), cv = cross(cu, cw);
      vec3 rd = normalize(sp.x*cu + sp.y*cv + cw/tan(fov*0.5));
      vec3 col = uC3*0.25 + uC1*0.006*exp(-dot(sp, sp)*1.5);
      col += motes(sp);
      // 경계 구 (반지름 1.9) 안에서만 행진
      float b = dot(ro, rd), cc = dot(ro, ro) - 1.9*1.9, D = b*b - cc;
      if(D > 0.0){
        float t = max(-b - sqrt(D), 0.0), tE = -b + sqrt(D);
        float trans = 1.0; vec3 lit = vec3(0.0); float glow = 0.0, cap = 0.0;
        vec3 L1 = normalize(vec3(-0.6, 0.7, 0.3)), L2 = normalize(vec3(0.8, -0.3, -0.2));
        int hits = 0;
        t += 0.004*rnd();
        for(int k=0;k<190;k++){
          vec3 p = ro + rd*t;
          float d = map(p);
          float ad = abs(d);
          glow += exp(-ad*90.0)*min(ad, 0.02)*trans;             // 표면 가까이 고이는 빛
          float pr = dot(p, p);
          cap += exp(-pr*9.0)*max(ad, 0.002)*trans;               // 가운데 세포질 덩이의 은은한 빛
          if(ad < 0.0024){
            vec3 n = calcN(p);
            if(dot(n, rd) > 0.0) n = -n;
            float ci = max(dot(-rd, n), 0.0);
            float F = 0.04 + 0.96*pow(1.0 - ci, 5.0);
            vec3 r = reflect(rd, n);
            float rim = pow(1.0 - ci, 3.0);
            float isBead = smoothstep(0.004, 0.0, gBead);
            vec3 sp1 = uC0*pow(max(dot(r, L1), 0.0), 160.0)*14.0 + uC2*pow(max(dot(r, L2), 0.0), 90.0)*7.0;
            float depth = clamp(1.0 - length(p)/1.9, 0.0, 1.0);
            vec3 inner = mix(uC1, uC0, 0.3)*0.012 + uC2*0.12*depth*depth*depth;
            vec3 c = env(r)*F + sp1*(0.4 + F) + mix(uC1, uC0, rim)*rim*0.36 + inner + uC0*isBead*0.6;
            lit += trans*c;
            trans *= 0.86 - 0.20*isBead;
            hits++;
            if(trans < 0.05 || hits > 9) break;
            t += 0.008;                                            // 면을 지나 계속 (얇은 유리)
          } else {
            t += max(ad*0.8, 0.0015);
          }
          if(t > tE) break;
        }
        col = col*trans + lit + mix(uC1, uC0, 0.25)*glow*0.9 + mix(uC2, uC0, 0.3)*cap*0.9;
      }
      acc += col;
    }
  }
  vec3 fin = acc/(uAA*uAA);
  if(any(isnan(fin)) || any(isinf(fin))) fin = vec3(0.0);
  o = vec4(min(max(fin, 0.0), vec3(200.0))*uGain, 1.0);
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) {
    st.fs = st.fs || SGL.RAY + this.src;
    G.background(st.fs, { uT: t, uAA: ctx.aa, uC0: ctx.colors[0], uC1: ctx.colors[1], uC2: ctx.colors[2], uC3: ctx.colors[3] });
  },
});
