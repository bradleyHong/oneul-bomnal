/* 잠자리 날개 · Dragonfly Wing
 *
 * 거대한 잠자리 날개 위를 아주 낮게 날아간다. 날개막은 보로노이 칸(자연의 쪽매맞춤)으로 나뉘고,
 * 길게 뻗은 굵은 맥은 주름진 날개의 마루·골을 따라 흐르며, 그 사이를 가는 맥이 칸으로 잇는다.
 * 맥은 빛나는 관, 칸은 얇은 막이라 두께에 따라 무지갯빛(박막 간섭)을 띠고 새벽빛을 비춘다.
 * 날개는 높이장(물결 + 주름)을 광선 행진으로 찾고, 맥은 보로노이 경계 거리(F2−F1 꼴, 칸 사이 이등분선까지의
 * 거리)로 그린다. 초점 밖에서는 관의 굵기를 착란원만큼 넓히고 세기를 낮춰(에너지 보존) 맥이 빛 번짐이 된다.
 * 빛 물결이 맥을 따라 칸에서 칸으로 건너온다. 날개는 x 방향 6 마다 되풀이되고, 카메라가 30초에 정확히 6 을 날아 루프.
 */
SGL.add({
  id: "geo-wing", title: "잠자리 날개", en: "Dragonfly Wing", mood: ["geo", "nature", "calm"],
  desc: "새벽빛 속 거대한 잠자리 날개 위를 낮게 날아갑니다. 자연이 짠 그물 같은 맥을 따라 빛이 물결처럼 건너가고, 얇은 막은 무지갯빛으로 반짝입니다.",
  palettes: [
    { name: "새벽", colors: ["#ffc89a", "#ff8a9a", "#9ab8ff", "#1a1428"] },
    { name: "물총새", colors: ["#a8f0ff", "#3ad0c8", "#7a8cff", "#06141c"] },
    { name: "호박 빛", colors: ["#ffd08a", "#ff9a50", "#9cbce8", "#140e0c"] },
    { name: "자줏빛 저녁", colors: ["#ffb0e0", "#b07aff", "#7ab8ff", "#140a1e"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.10, contrast: 1.08, vignette: 0.34, grain: 0.012 },
  src: `
#define STEPS 1
#define PER 6.0
#define SX 13.0
#define SZ 15.0
#define CS 0.24
#define AP 0.016
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
vec3 SUN(){ return normalize(vec3(1.0, 0.085, -0.30)); }
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(PER*t/T, 0.20 + 0.035*sin(a*2.0 + 0.5), 0.05 + 0.20*sin(a));
  ta = ro + vec3(1.0, -0.17 + 0.03*sin(a + 1.0), 0.16*sin(a + 0.6) + 0.06);
  fov = 0.95;
}
float FOCUS(){ return 1.35; }
vec3 env(vec3 rd){ return vec3(0.0); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz)*p3.zy); }
// 날개 높이: 주름(맥 사이 마루·골) + 느린 물결
float zw(vec2 q){ return q.y + 0.035*sin(TAU*q.x/PER*3.0 + 1.7*q.y/CS); }
float H(vec2 q){
  float a = TAU*uT/T;
  float u = zw(q)/CS;
  float c = cos(3.14159*u);
  float cor = 0.024*c*(1.35 - 0.35*c*c);
  float und = 0.045*sin(TAU*q.x/PER*2.0 - a)*cos(0.7*q.y + 0.4) + 0.018*sin(1.3*q.y + a + TAU*q.x/PER);
  return cor + und;
}
float zEdge(float x){ return 0.95 + 0.06*sin(TAU*x/PER) + 0.03*sin(TAU*x/PER*3.0 + 1.0); }
// 보로노이 경계 거리 (칸 사이 이등분선까지). x 칸 번호는 SX*PER 로 감는다
vec4 vor(vec2 q, out vec2 cid){
  vec2 x = q*vec2(SX, SZ);
  vec2 n = floor(x), f = fract(x);
  vec2 mg, mr; float md = 8.0;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g = vec2(float(i), float(j)); vec2 c = n + g; c.x = mod(c.x, SX*PER);
    vec2 o = 0.5 + 0.42*(h22(c) - 0.5)*2.0;
    vec2 r = g + o - f; float d = dot(r, r);
    if(d < md){ md = d; mr = r; mg = g; cid = c; }
  }
  md = 8.0; vec2 dir = vec2(1.0, 0.0);
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){
    vec2 g = mg + vec2(float(i), float(j)); vec2 c = n + g; c.x = mod(c.x, SX*PER);
    vec2 o = 0.5 + 0.42*(h22(c) - 0.5)*2.0;
    vec2 r = g + o - f;
    if(dot(mr - r, mr - r) > 1e-5){ vec2 nn = normalize(r - mr); float d = dot(0.5*(mr + r), nn); if(d < md){ md = d; dir = nn; } }
  }
  // 칸 좌표 → 세계: 비등방 크기를 되돌린다
  vec2 dw = dir*vec2(SX, SZ);
  return vec4(md/length(dw), normalize(dw), 0.0);
}
float bokeh(vec3 rd, float sc, float th, float rad, out vec3 bc){
  float az = atan(rd.z, rd.x), el = asin(clamp(rd.y, -1.0, 1.0));
  vec2 g = vec2(az, el)*sc; vec2 id = floor(g); float acc = 0.0; bc = vec3(0.0);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 c = id + vec2(float(i), float(j)); vec2 h = h22(c + 17.0); vec2 h2 = h22(c*1.7 + 3.1);
    if(h.x > th) continue;
    float r = rad*(0.5 + 0.8*h2.x);
    float d = length(g - c - 0.5 - (h - 0.5)*0.6);
    float disc = smoothstep(r, r - 0.06, d)*(0.7 + 0.5*smoothstep(r*0.4, r, d));
    float k = disc*(0.3 + 0.7*h2.y);
    acc += k; bc += k*mix(mix(uC0, uC1, h2.y), uC2, step(0.7, h.y));
  }
  return acc;
}
vec3 sky(vec3 rd){
  vec3 s = SUN();
  float el = rd.y, mu = max(dot(rd, s), 0.0);
  float az = 0.5 + 0.5*dot(normalize(rd.xz + 1e-4), normalize(s.xz));             // 해 쪽일수록 1
  vec3 warm = mix(uC1, uC0, 0.35 + 0.65*az);
  warm = warm*warm/max(dot(warm, vec3(0.3, 0.5, 0.2)), 1e-3)*0.8;                 // 채도를 올린 새벽빛
  vec3 blue = uC2*uC2/max(dot(uC2, vec3(0.3, 0.5, 0.2)), 1e-3)*0.8;
  vec3 c;
  if(el >= 0.0){
    // 지평선은 복숭아·장밋빛, 위로 갈수록 맑은 푸른빛
    c = mix(warm*(0.15 + 0.08*az), blue*0.075, smoothstep(0.0, 0.30, el));
    c = mix(c, blue*0.045 + uC3*0.03, smoothstep(0.35, 1.0, el));
  } else {
    // 날개 아래: 지평선빛에서 깊은 푸른 그늘로
    c = mix(warm*(0.10 + 0.05*az), blue*0.030 + uC3*0.04, smoothstep(0.0, 0.22, -el));
  }
  c += warm*0.08*exp(-el*el*300.0)*(0.4 + 0.6*az);                                 // 지평선의 얇은 빛 띠
  c += uC0*(0.12*pow(mu, 14.0) + 0.02*pow(mu, 4.0));
  vec3 b1, b2;
  float band = exp(-el*el*14.0);
  bokeh(rd, 14.0, 0.30, 0.42, b1); bokeh(rd, 7.0, 0.22, 0.40, b2);
  c += (b1*0.010 + b2*0.008)*band;
  return c + mix(uC0, vec3(1.0), 0.45)*(1.6*pow(mu, 5000.0) + 0.10*pow(mu, 300.0));
}
// 관의 단면: 초점 안이면 또렷한 관, 밖이면 부드러운 번짐 (k = 관 굵기/번진 굵기 = 세기)
float prof(float x, float k){ return mix(exp(-x*x*2.2), smoothstep(1.0, 0.6, x), k*k)*k; }
vec3 film(float th, float ci){
  float ct = sqrt(1.0 - (1.0 - ci*ci)/1.7689);
  vec3 ph = 2.0*TAU*1.33*th*ct/vec3(650.0, 532.0, 450.0);
  return 0.5 - 0.5*cos(ph);
}
#define HAS_BG
vec3 bg(vec3 rd){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  vec3 fw = normalize(ta - ro);
  // 날개 높이장 찾기
  float t = -1.0;
  if(rd.y < -0.004){
    float tt = 0.02;
    for(int i=0;i<90;i++){
      vec3 p = ro + rd*tt;
      float d = p.y - H(p.xz);
      if(d < 0.0004*(1.0 + tt)){ t = tt; break; }
      tt += d/(-rd.y + 0.22);
      if(tt > 30.0) break;
    }
    if(t > 0.0){ // 두 번 다듬기
      float a = t - 0.02, b = t;
      for(int k=0;k<5;k++){ float m = 0.5*(a + b); vec3 p = ro + rd*m; if(p.y - H(p.xz) > 0.0) a = m; else b = m; }
      t = b;
      vec3 p = ro + rd*t;
      if(p.z > zEdge(p.x) + 0.01) t = -1.0;
    }
  }
  if(t < 0.0) return sky(rd);
  vec3 p = ro + rd*t;
  vec2 e = vec2(0.002, 0.0);
  vec3 n = normalize(vec3(H(p.xz - e.xy) - H(p.xz + e.xy), 2.0*e.x, H(p.xz - e.yx) - H(p.xz + e.yx)));
  float z = dot(p - ro, fw);
  // 화소 크기 + 착란원 (세계 단위). 비스듬히 보면 앞뒤로 길게 늘어난다
  float tf = tan(fov*0.5);
  float pix = 2.0*z*tf/uRes.y;
  float coc = 2.0*AP*abs(z - FOCUS())*tf;
  float fp0 = sqrt(pix*pix*1.4 + coc*coc);
  float sinT = max(abs(dot(rd, n)), 0.06);
  vec2 vd = normalize(rd.xz);
  vec2 cid; vec4 V = vor(p.xz, cid);
  float hc = h11(cid.x*13.1 + cid.y*7.7);
  // 칸마다 막이 살짝 부풀어 있다: 가장자리에서 가운데로 오르는 기울기
  float bw = 0.0045 + fp0*1.5;
  float bul = exp(-V.x/bw)*0.0045/bw;
  n = normalize(n - vec3(V.y, 0.0, V.z)*bul*0.12);
  // 얇은 막: 맑은 비눗방울 같은 간섭색. 색은 주로 반사(해·하늘이 비치는 곳)에만 산다
  float ci = max(dot(n, -rd), 0.0);
  float F = 0.04 + 0.96*pow(1.0 - ci, 5.0);
  float a = TAU*uT/T;
  float ang = TAU*p.x/PER;                                                            // x 6 주기 잡음 (원통 위에서)
  float th = 300.0 + 60.0*hc + 380.0*fbm3(vec3(cos(ang)*1.53, sin(ang)*1.53, p.z*2.2) + vec3(cos(a), sin(a), 0.0)*0.25);
  vec3 fl = film(th, ci);
  fl = mix(vec3(dot(fl, vec3(0.33))), fl, 0.55)*1.25;                                  // 파스텔
  vec3 rr = reflect(rd, n);
  vec3 s = SUN();
  vec3 col = sky(rr)*mix(vec3(0.7), fl, 0.6)*F*0.85;
  col += sky(rd)*(1.0 - F)*0.80;                                                      // 뒤에서 비쳐 드는 하늘
  col += uC0*0.05*pow(max(dot(rd, s), 0.0), 12.0)*(1.0 - F);                          // 막을 지나오는 해
  col += fl*min(ggx(n, -rd, s, 0.16), 30.0)*0.45*mix(uC0, vec3(1.0), 0.6);            // 해가 비치는 곳의 무지갯빛
  // 빛 물결: 굵은 맥만 따라 카메라 쪽으로 흐르는 부드러운 빛 (x 6 에 두 줄, 30초에 정수 바퀴)
  float u = zw(p.xz)/CS; float em = abs(fract(u + 0.5) - 0.5)*CS;
  float li = floor(u + 0.5);
  float ph = fract(p.x/(PER*0.5) + 3.0*uT/T + 0.37*h11(li*3.7 + 1.0));
  float wave = exp(-(ph - 0.5)*(ph - 0.5)*90.0)*step(0.35, h11(li*5.1 + 2.0));
  // 가는 맥 (보로노이 경계): 어둡고 가는 호박빛 갈비대, 빛을 받는 가장자리만 가늘게 반짝
  float al = dot(V.yz, vd);
  float fpv = fp0*sqrt(1.0 - al*al + al*al/(sinT*sinT));
  float rv = 0.0027;
  float wv = sqrt(rv*rv + fpv*fpv);
  float mv = prof(V.x/wv, rv/wv);
  vec3 amber = mix(vec3(0.62, 0.30, 0.10), uC0*vec3(1.0, 0.7, 0.45), 0.3);
  vec3 back = sky(rd);
  vec3 sp = mix(uC0, vec3(1.0), 0.5)*pow(max(dot(normalize(s - rd), vec3(0.0, 1.0, 0.0)), 0.0), 30.0);
  float rimV = smoothstep(0.25, 0.85, V.x/wv)*(rv/wv);
  vec3 ribC = back*amber*0.22 + sp*0.35*rimV;
  // 굵은 맥 (주름 마루·골)
  float alm = vd.y;
  float fpm = fp0*sqrt(1.0 - alm*alm + alm*alm/(sinT*sinT));
  float rm = 0.0040 + 0.0022*step(0.5, fract(li*0.5));
  float wm = sqrt(rm*rm + fpm*fpm);
  float mm = prof(em/wm, rm/wm);
  // 앞날개 가장자리 맥
  float ee = abs(p.z - zEdge(p.x));
  float re = 0.008; float we = sqrt(re*re + fpm*fpm);
  float me = prof(ee/we, re/we);
  float rimM = smoothstep(0.3, 0.9, em/wm)*(rm/wm);
  vec3 glowC = mix(uC0, uC1, 0.3);
  vec3 mainC = back*amber*0.16 + sp*0.6*rimM + glowC*0.75*wave;
  col = mix(col, ribC, min(mv*0.92, 1.0));
  col = mix(col, mainC, min(max(mm, me)*0.9, 1.0));
  // 굵은 맥을 따라 흐르는 빛의 부드러운 번짐 (가까운 막을 물들인다)
  float gm = rm*rm*25.0 + fpm*fpm;
  col += glowC*0.07*wave*rm*5.0*exp(-em*em/gm)/sqrt(gm);
  // 멀수록 새벽 안개
  col = mix(sky(rd), col, exp(-max(t - 1.2, 0.0)*0.14));
  return col;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
