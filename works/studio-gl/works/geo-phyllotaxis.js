/* 황금각 · Golden Angle
 *
 * 진주 수만 알이 황금각(137.5°)마다 하나씩 놓인 끝없는 들판. 해바라기 씨앗판과 솔방울이 쓰는 배열(보겔 나선)이라
 * 아무것도 그리지 않아도 피보나치 나선(21 · 34 · 55 · 89 가닥)이 저절로 떠올라 가운데의 빛으로 휘감겨 든다.
 * 가장 가까운 알은 구면 피보나치 역사상(Keinert 2015)으로 찾는다: 보겔 원판은 구면 피보나치 점을
 * 람베르트 등면적 투영으로 편 것과 같아서, 들판의 점을 구 위로 되돌려 후보 네 알만 본다.
 * (번호가 수만이라 i·φ 의 소수부는 256 단위로 나눠 계산해 정밀도를 지킨다.)
 * 가운데 위에 빛 덩이가 떠 있고, 그 빛이 놓인 순서를 따라 두 갈래 나선 물결로 바깥으로 번지며
 * 지나는 알마다 속에서부터 은은하게 차오른다. 카메라는 들판 위를 낮게 한 바퀴 미끄러지고, 초점 밖은 크게 흐려진다.
 */
SGL.add({
  id: "geo-phyllotaxis", title: "황금각", en: "Golden Angle", mood: ["geo", "nature", "calm"],
  desc: "황금각마다 하나씩 놓인 진주 수만 알이 끝없는 들판이 되어, 피보나치 나선을 그리며 가운데의 빛으로 휘감겨 듭니다. 빛의 물결이 나선을 따라 번지며 알알이 속에서부터 차오릅니다.",
  palettes: [
    { name: "황금 들판", colors: ["#e6d8c4", "#ffb04a", "#ffd9a0", "#0e0805"] },
    { name: "달빛 진주", colors: ["#d4dbe6", "#7ab8ff", "#c4e2ff", "#03060d"] },
    { name: "흑진주", colors: ["#3a3f46", "#3fe0bc", "#a8fff0", "#020605"] },
    { name: "장밋빛 새벽", colors: ["#f0dcd6", "#ff7f98", "#ffc4b0", "#0d0507"] },
  ],
  post: { exposure: 1.0, bloom: 0.11, sat: 1.12, contrast: 1.10, vignette: 0.40, grain: 0.014 },
  src: `
#define PHI 1.6180339887
#define PI 3.14159265
#define NSF 60000.0
const float W = 18.0;                  // 람베르트 원판 → 세상 크기
const float C256 = 0.21670111997;      // fract(256 φ)
const vec3 ORB = vec3(0.0, 0.85, 0.0); // 가운데 위의 빛 덩이
uniform float uAA;
// i·φ 의 소수부 (i 가 수만이어도 정밀하게)
float fphi(float i){ float a = floor(i/256.0); float b = i - a*256.0; return fract(a*C256 + fract(b*PHI)); }
float hgt(float r){ return 0.9*exp(-r*r/180.0) - 0.9; }            // 아주 완만한 둥근 들판
// 구면 피보나치 역사상: 단위 방향 p 근처 점 번호 후보 넷
vec4 sfCand(vec3 p){
  float n = NSF, m = 1.0 - 1.0/n;
  float phi = min(atan(p.y, p.x), PI), cosT = p.z;
  float k = max(2.0, floor(log(n*PI*sqrt(5.0)*(1.0 - cosT*cosT))/log(PHI*PHI)));
  float Fk = pow(PHI, k)/sqrt(5.0);
  vec2 F = vec2(floor(Fk + 0.5), floor(Fk*PHI + 0.5));
  vec2 ka = 2.0*F/n, kb = 2.0*PI*(fract((F + 1.0)*PHI) - (PHI - 1.0));
  mat2 iB = mat2(ka.y, -ka.x, kb.y, -kb.x)/(ka.y*kb.x - ka.x*kb.y);
  vec2 c = floor(iB*vec2(phi, cosT - m));
  return vec4(dot(F, c), dot(F, c + vec2(1.0, 0.0)), dot(F, c + vec2(0.0, 1.0)), dot(F, c + vec2(1.0, 1.0)));
}
// 번호 → 들판 위 자리 (xz) · 반지름
vec2 seedXZ(float i, out float r){
  float rl = sqrt(2.0*(2.0*i + 1.0)/NSF);
  float a = TAU*fphi(i);
  r = W*rl;
  return r*vec2(cos(a), sin(a));
}
// 빛의 물결: 놓인 순서(반지름)를 따라 두 갈래 나선으로 바깥으로 번진다 (30초에 정수 바퀴)
float waveAt(float r, float ang){
  float s = fract(r/6.5 - 2.0*uT/T - 2.0*ang/TAU);
  return smoothstep(0.0, 0.03, s)*(exp(-s*24.0) + 0.06*exp(-s*4.0))*smoothstep(0.6, 2.6, r);   // 가운데는 빛 덩이 아래 고요하게
}
float gI, gR;
float pearls(vec3 p){
  float r0 = length(p.xz)/W;
  float a0 = atan(p.z, p.x);
  float ct = 1.0 - r0*r0*0.5, st = r0*sqrt(max(1.0 - r0*r0*0.25, 0.0));
  vec4 idx = sfCand(vec3(cos(a0)*st, sin(a0)*st, ct));
  float best = 1e9; gI = -1.0;
  for(int s=0;s<4;s++){
    float i = idx[s];
    if(i < 0.0 || i > NSF*0.5) continue;
    float r; vec2 xz = seedXZ(i, r);
    float w = waveAt(r, atan(xz.y, xz.x));
    float rad = 0.118*(1.0 + 0.20*w)*(0.94 + 0.08*h11(i*1.37));
    float d = length(p - vec3(xz.x, hgt(r) + rad*0.75, xz.y)) - rad;
    if(d < best){ best = d; gI = i; gR = r; }
  }
  return best;
}
float map(vec3 p){
  float r = length(p.xz);
  float g = p.y - hgt(r) - 0.012;
  float top = p.y - hgt(r) - 0.34;
  if(top > 0.0) return min(top + 0.05, g);                         // 알 위 높이면 알을 찾지 않는다
  return min(pearls(p), g)*0.9;
}
vec3 calcN(vec3 p){ vec2 e = vec2(0.0006, -0.0006); return normalize(e.xyy*map(p + e.xyy) + e.yyx*map(p + e.yyx) + e.yxy*map(p + e.yxy) + e.xxx*map(p + e.xxx)); }
float march(vec3 ro, vec3 rd, float tmax){
  // 들판 꼭대기 위에서 시작
  float t = 0.0;
  if(ro.y > 0.4 && rd.y < 0.0) t = max((ro.y - 0.4)/(-rd.y), 0.0);
  else if(ro.y > 0.4) return -1.0;
  for(int i=0;i<170;i++){
    float h = map(ro + rd*t);
    if(h < 0.0004*(1.0 + t*2.0)) return t;
    t += h;
    if(t > tmax) break;
  }
  return -1.0;
}
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  float R = 5.0 + 0.6*sin(a);
  ro = vec3(cos(a)*R, 0.0, sin(a)*R);
  ro.y = hgt(R) + 2.1 + 0.35*sin(2.0*a + 0.7);
  vec3 side = vec3(-sin(a), 0.0, cos(a));
  ta = vec3(0.0, 0.25, 0.0) + side*(0.7*sin(a + 1.3)) - vec3(cos(a), 0.0, sin(a))*0.8;
  fov = 0.80;
}
vec3 haze(vec3 rd){
  vec3 d = normalize(ORB - vec3(0.0));
  float up = smoothstep(-0.1, 0.6, rd.y);
  return mix(uC3*0.35 + uC2*0.0025, uC3*0.10, up);
}
vec3 env(vec3 rd){ return haze(rd) + uC2*0.05*smoothstep(0.2, 1.0, rd.y); }
float softSh(vec3 ro, vec3 rd, float tmax){
  float res = 1.0, t = 0.01;
  for(int i=0;i<36;i++){ float h = map(ro + rd*t); res = min(res, 10.0*h/t); t += clamp(h, 0.006, 0.12); if(res < 0.004 || t > tmax) break; }
  res = clamp(res, 0.0, 1.0); return res*res*(3.0 - 2.0*res);
}
float occl(vec3 p, vec3 n){ float o = 0.0, w = 1.0; for(int i=1;i<=4;i++){ float h = 0.05*float(i); o += (h - map(p + n*h))*w; w *= 0.7; } return clamp(1.0 - 3.0*o, 0.0, 1.0); }
vec3 shadeP(vec3 p, vec3 n, vec3 rd){
  float pd = pearls(p);
  float i = gI, r = gR;
  float isP = step(pd, p.y - hgt(length(p.xz)) - 0.012 + 0.002);
  vec3 L = ORB - p; float dl = length(L); L /= dl;
  float fall = 1.0/(1.0 + dl*dl*0.10);
  vec3 lc = uC1*3.2*fall;                                        // 빛 덩이
  float nl = dot(n, L);
  float sh = nl > 0.0 ? softSh(p + n*0.003, L, min(dl - 0.2, 2.5)) : 0.0;
  float o = occl(p, n);
  float ci = max(dot(n, -rd), 0.0);
  float F = 0.05 + 0.95*pow(1.0 - ci, 5.0);
  if(isP < 0.5){                                                  // 알 사이 바탕: 어둡게
    return uC0*0.02*(lc*max(nl, 0.0)*sh + 0.05)*o;
  }
  float ang = atan(p.z, p.x);
  float w = waveAt(r, ang);
  vec3 body = uC0*(0.55 + 0.25*h11(i*0.37));
  // 진주: 감싸는 빛(속으로 스미는 느낌) + 날카로운 반짝임 + 하늘 반사
  float wrap = max((nl + 0.45)/1.45, 0.0);
  vec3 col = body*0.30*lc*wrap*mix(0.35, 1.0, sh)*o;
  col += body*env(n)*0.6*o;
  col += lc*min(ggx(n, -rd, L, 0.16), 30.0)*mix(0.04, 0.4, F)*sh;
  col += env(reflect(rd, n))*F*o*1.2;
  // 물결이 지날 때 속에서 차오르는 빛 (정면일수록 두껍게 = 밝게)
  // 속이 비치는 진주: 겉빛은 조금 물러나고 속에서 색빛이 차오른다 (정면일수록 두꺼워 진하다)
  col *= 1.0 - 0.45*min(w, 1.0);
  col += uC1*w*(0.22 + 0.95*ci*ci);
  col += mix(uC1, uC2, 0.5)*w*w*pow(1.0 - ci, 3.0)*0.5;          // 가장자리 빛번짐
  return col;
}
// 공기: 깊이 안개 · 빛 덩이 둘레 빛무리 · 물결 앞머리 위에 고이는 빛
vec3 air(vec3 c, vec3 ro, vec3 rd, float t){
  float tt = t > 0.0 ? t : 40.0;
  float tr = exp(-tt*0.04 - max(tt - 5.0, 0.0)*0.12);
  vec3 col = c*tr + haze(rd)*(1.0 - tr);
  float dt = min(tt, 18.0)/14.0, s = dt*rnd();
  vec3 sc = vec3(0.0);
  for(int k=0;k<14;k++){
    vec3 p = ro + rd*s;
    float r = length(p.xz);
    float hh = p.y - hgt(r);
    float dens = exp(-max(hh, 0.0)*3.0);                         // 들판 위 낮은 안개
    float w = waveAt(r, atan(p.z, p.x));
    float lo = 1.0/(1.0 + dot(p - ORB, p - ORB)*0.09);
    sc += (mix(uC1, uC2, 0.4)*w*dens*0.06 + uC1*lo*dens*0.025 + uC2*0.0008)*exp(-s*0.10)*dt;
    s += dt;
  }
  col += sc;
  // 빛 덩이 (가려지지 않았으면)
  vec3 oc = ORB - ro; float tc = max(dot(oc, rd), 0.0);
  float dd = length(oc - rd*tc);
  if(t < 0.0 || t > tc){
    col += mix(uC1, uC2, 0.5)*(smoothstep(0.17, 0.12, dd)*9.0 + 0.35*exp(-dd*5.0) + 0.006/(dd*dd + 0.01))*exp(-tc*0.03);
  } else {
    col += uC1*0.004/(dd*dd + 0.05);
  }
  return col;
}
void main(){
  vec3 acc = vec3(0.0);
  int nA = int(uAA);
  for(int j=0;j<4;j++){ if(j >= nA) break;
    for(int i=0;i<4;i++){ if(i >= nA) break;
      for(int L=0;L<2;L++){                                     // 피사계 심도: 렌즈 위 두 점
        SEED = uint(gl_FragCoord.x)*1973u + uint(gl_FragCoord.y)*9277u + uint(i + j*4 + L*16)*26699u + uint(uT*997.0)*1013u + 1u;
        vec2 off = (vec2(float(i), float(j)) + 0.5)/uAA - 0.5;
        vec2 sp = ((gl_FragCoord.xy + off)/uRes*2.0 - 1.0)*vec2(uRes.x/uRes.y, 1.0);
        vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
        vec3 cw = normalize(ta - ro), cu = normalize(cross(cw, vec3(0, 1, 0))), cv = cross(cu, cw);
        vec3 rd = normalize(sp.x*cu + sp.y*cv + cw/tan(fov*0.5));
        float focus = length(ta - ro)*0.92;
        vec3 fp = ro + rd*focus/dot(rd, cw);
        float la = rnd()*TAU, lr = sqrt(rnd())*0.055;
        ro += (cu*cos(la) + cv*sin(la))*lr;
        rd = normalize(fp - ro);
        float t = march(ro, rd, 40.0);
        vec3 c = t > 0.0 ? shadeP(ro + rd*t, calcN(ro + rd*t), rd) : haze(rd);
        acc += air(c, ro, rd, t);
      }
    }
  }
  vec3 fin = acc/(uAA*uAA*2.0);
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
