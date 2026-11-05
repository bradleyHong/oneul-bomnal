/* 자수정 동굴 · Amethyst Geode
 *
 * 성당만큼 큰 정동(晶洞) 속. 천장 높은 곳의 갈라진 틈으로 햇빛이 여러 줄기로 쏟아져 바닥의 큰 결정 무리(빛나는 심장)를 비춘다.
 * 결정은 세 층: 카메라 둘레의 큰 결정 기둥들(손으로 놓음) · 벽의 중간 무리 · 먼 벽의 잔 결정(드루지, 반짝임)이다.
 * 잔 결정과 중간 무리는 방향(구 위의 점)으로 고른 3차원 칸에서 이웃 27칸을 보아 자리를 뽑는다.
 * 결정은 유리처럼: 프레넬 반사(빛줄기 · 심장 · 틈의 하늘), 굴절해 비치는 뒤쪽 빛(두께만큼 색을 먹음), 뿌리는 짙고 끝은 맑은 색띠,
 * 모서리와 끝에 맺히는 날카로운 반짝임. 빛줄기 안 결정은 속까지 빛난다.
 * 카메라는 심장 쪽으로 천천히 다가갔다가 옆으로 돌아 물러나는 타원(30초)을 돌고, 초점은 심장에 맞춰 가까운 결정은 흐리다.
 * 해는 틈 위에서 작은 원을 그려 빛줄기와 반짝임이 천천히 옮겨 간다 → 완전 루프.
 */
SGL.add({
  id: "geo-geode", title: "결정의 심장", en: "Crystal Heart", mood: ["geo", "nature", "cosmos"],
  desc: "어둠 속에 떠 있는 수천 개의 결정 사이로 천천히 다가갑니다. 위에서 내려온 빛줄기가 육각 결정 무리를 비추면 결정이 속에서부터 빛납니다.",
  palettes: [
    { name: "자수정", colors: ["#7a1ec8", "#e8c4ff", "#fff0dc", "#140c22"] },
    { name: "시트린", colors: ["#d8600a", "#ffe4a8", "#fff4e4", "#1a120a"] },
    { name: "아쿠아마린", colors: ["#0a7eb0", "#c4f6ff", "#fff6ea", "#08141c"] },
    { name: "로즈쿼츠", colors: ["#d83c7c", "#ffdcea", "#fff2ec", "#1c1018"] },
  ],
  post: { exposure: 1.0, bloom: 0.11, sat: 1.14, contrast: 1.12, vignette: 0.40, grain: 0.012 },
  src: `
#define STEPS 1
float map(vec3 p){ return 1e9; }
void material(vec3 p, vec3 n, inout vec3 alb, inout float rough, inout float metal, inout vec3 emit){}
vec3 env(vec3 rd){ return vec3(0.0); }
#define RG 13.0
#define HOLE normalize(vec3(0.05, 0.55, 0.83))
#define HCOS 0.990
#define PDIR normalize(vec3(0.1, -0.8, 0.55))
#define POOL (PDIR*RG)
#define HEART (PDIR*(RG - 3.2) + vec3(0.0, 0.6, 0.0))
#define COOL vec3(0.35, 0.50, 1.0)
vec3 SUN(){ float a = TAU*uT/T; return normalize(normalize(HOLE*RG - POOL) + vec3(cos(a), 0.0, sin(a))*0.035); }
void camera(float t, out vec3 ro, out vec3 ta, out float fov){
  float a = TAU*t/T;
  ro = vec3(0.9*sin(a), -4.6 + 0.35*sin(a*2.0 + 0.5), -4.3 - 2.1*cos(a));
  ta = HEART + vec3(0.6*sin(a + 0.8), 0.4 + 0.3*sin(a*2.0), 0.0); fov = 1.08;
}
float hexN(vec2 q){ q = abs(q); return max(q.x*0.8660254 + q.y*0.5, q.y); }
// 결정 정보: x 개체 무늬 · y 기둥 위 위치(0 뿌리 → 1 끝) · z 굵기 · w 1=결정 0=바위
// EDGE: 모서리에 가까운 정도
vec4 INFO; float EDGE;
// 결정 하나 (뿌리 B · 축 A · 길이 L · 굵기 w · 둘레 회전 기준 r)
float crystal(vec3 p, vec3 B, vec3 A, float L, float w, vec3 r, bool want, float id){
  vec3 u = normalize(cross(A, r)), v = cross(A, u);
  vec3 q = p - B;
  vec3 l = vec3(dot(q, u), dot(q, v), dot(q, A));
  vec2 aq = abs(l.xy);
  float e1 = aq.x*0.8660254 + aq.y*0.5, e2 = aq.y;
  float hx = max(e1, e2);
  float side = hx - w, tip = (hx*1.7 + l.z - L)*0.5070926;
  float d = max(max(side, tip), -l.z);
  if(want && d < 0.02){
    float es = min(abs(e1 - e2), aq.y*0.9)/w;
    float et = abs(side - tip)/w;
    EDGE = exp(-min(es, et)*30.0);
    INFO = vec4(id, clamp(l.z/L, 0.0, 1.0), w, 1.0);
  }
  return d;
}
// 카메라 둘레의 큰 결정 기둥들
const vec3 NR[6] = vec3[6](vec3(-0.55, -0.75, 0.0), vec3(0.6, -0.7, 0.1), vec3(-0.45, -0.8, 0.4), vec3(0.5, -0.75, 0.45), vec3(-0.15, -0.95, -0.3), vec3(0.25, -0.9, -0.1));
const vec3 NA[6] = vec3[6](vec3(0.40, 0.90, 0.10), vec3(-0.45, 0.88, 0.0), vec3(0.30, 0.90, -0.15), vec3(-0.35, 0.90, -0.30), vec3(0.10, 0.85, 0.50), vec3(-0.20, 0.80, 0.55));
const vec3 NS[6] = vec3[6](vec3(5.0, 0.80, 0.0), vec3(4.6, 0.72, 1.0), vec3(5.4, 0.95, 2.0), vec3(4.2, 0.65, 3.0), vec3(4.8, 0.70, 4.0), vec3(4.4, 0.62, 5.0));
float heroes(vec3 p, bool want){
  float d = 1e9;
  for(int i=0;i<6;i++){
    vec3 B = normalize(NR[i])*(RG + 0.4);
    vec3 A = normalize(NA[i]);
    vec3 s = NS[i];
    float bs = length(p - B - A*s.x*0.5) - s.x*0.65 - s.y;
    if(bs > d) { d = min(d, bs); continue; }
    float c = crystal(p, B, A, s.x, s.y, normalize(vec3(0.3 + s.z, 1.0, 0.7)), false, 0.0);
    if(c < d){ d = c; if(want) crystal(p, B, A, s.x, s.y, normalize(vec3(0.3 + s.z, 1.0, 0.7)), true, s.z/6.0); }
  }
  // 심장: 빛줄기가 떨어지는 바닥의 큰 결정 무리
  vec3 hc = PDIR*(RG - 2.5);
  if(length(p - hc) < 9.0){
    for(int i=0;i<8;i++){
      float fi = float(i);
      vec3 h = h33(vec3(fi, 3.0, 7.0)) - 0.5;
      vec3 B = normalize(PDIR + h*0.22)*(RG + 0.4);
      vec3 A = normalize(-PDIR*0.55 + vec3(0.0, 0.75, 0.0) + h*vec3(1.1, 0.3, 1.1));
      float L = 3.4 + 2.6*fract(fi*0.618 + 0.2), w = 0.42 + 0.38*fract(fi*0.437 + 0.5);
      float c = crystal(p, B, A, L, w, normalize(h + vec3(0.0, 0.0, 0.3)), false, 0.0);
      if(c < d){ d = c; if(want) crystal(p, B, A, L, w, normalize(h + vec3(0.0, 0.0, 0.3)), true, fract(fi*0.31)); }
    }
  }
  return d;
}
// 벽의 결정 한 층: 방향(구 위의 점)으로 3차원 칸을 잡고 이웃 27칸을 본다
float layer(vec3 p, float len, float cs, float big, bool want){
  vec3 dir = p/len;
  vec3 c = floor(dir*RG/cs);
  float d = 1e9;
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec3 k = c + vec3(float(x), float(y), float(z));
    vec3 h = h33(k + big*31.7);
    vec3 P = (k + 0.15 + 0.7*h)*cs;
    float rp = length(P);
    if(abs(rp - RG) > cs*0.5) continue;
    vec3 h2 = h33(k + 17.31 + big*5.3);
    if(big > 0.5 && h2.z > 0.45) continue;
    vec3 bd = P/rp;
    if(dot(bd, HOLE) > HCOS - 0.03) continue;
    float g = h2.x*h2.x;
    float L = big > 0.5 ? 1.6 + 2.0*g + 0.4*h.y : 0.30 + 0.45*g + 0.2*h.y;
    float w = big > 0.5 ? 0.38 + 0.30*h.z + 0.12*g : 0.20 + 0.11*h.z;
    vec3 A = normalize(-bd + (h2.yzx - 0.5)*((big > 0.5 ? 0.9 : 0.5)/(0.6 + L)));
    vec3 r = p - bd*(RG + 0.25);
    float dc = crystal(p, bd*(RG + 0.25), A, L, w, normalize(h33(k + 3.7) - 0.5 + vec3(0.0, 0.001, 0.0)), false, 0.0);
    if(dc < d){ d = dc; if(want) crystal(p, bd*(RG + 0.25), A, L, w, normalize(h33(k + 3.7) - 0.5 + vec3(0.0, 0.001, 0.0)), true, fract(h.x + big*0.37)); }
  }
  return d;
}
float shell(vec3 p){
  float len = length(p);
  vec3 dir = p/len;
  float ang = acos(clamp(dot(dir, HOLE), -1.0, 1.0));
  float bump = 0.18*vn3(p*1.7) + 0.08*vn3(p*4.3);
  return max(max(RG - len - bump, (acos(HCOS) - ang)*len), len - RG - 1.2);
}
float walls(vec3 p, bool want){
  float len = length(p);
  if(len < RG - 4.1) return RG - 4.0 - len;
  float d = len < RG - 1.0 ? RG - 0.9 - len : layer(p, len, 0.55, 0.0, want);
  float b = layer(p, len, 2.6, 1.0, want);
  return min(d, b);
}
float mapD(vec3 p){ return min(min(shell(p), walls(p, false)), heroes(p, false)); }
float mapM(vec3 p){
  INFO = vec4(0.0); EDGE = 0.0;
  float s = shell(p), w = walls(p, false), h = heroes(p, false);
  if(h <= w && h <= s) heroes(p, true);
  else if(w <= s) walls(p, true);
  return min(min(s, w), h);
}
vec3 nrm(vec3 p){ vec2 e = vec2(0.0015, -0.0015); return normalize(e.xyy*mapD(p + e.xyy) + e.yyx*mapD(p + e.yyx) + e.yxy*mapD(p + e.yxy) + e.xxx*mapD(p + e.xxx)); }
// 틈 가장자리의 바위 그림자: 틈 안 자리(구 위 방향 e)마다 빛이 지나는 정도 → 빛이 여러 줄기로 갈라진다
float holeMask(vec3 e){
  vec3 hu = normalize(cross(HOLE, vec3(0.0, 1.0, 0.0))), hv = cross(hu, HOLE);
  vec2 uv = vec2(dot(e, hu), dot(e, hv))/sqrt(1.0 - HCOS*HCOS);
  uv.x *= 0.7;
  float r = length(uv) + 0.45*(vn3(vec3(uv*2.2, 0.5)) - 0.5);
  float m = smoothstep(1.0, 0.78, r);
  m *= 0.03 + 0.97*smoothstep(0.42, 0.62, vn3(vec3(uv*6.0, 4.0))*0.55 + vn3(vec3(uv*15.0, 9.0))*0.45);
  return m;
}
float inBeam(vec3 p){
  vec3 L = SUN();
  float b = dot(p, L), c = dot(p, p) - RG*RG;
  float s = -b + sqrt(max(b*b - c, 0.0));
  vec3 e = normalize(p + L*s);
  if(dot(e, HOLE) < HCOS - 0.01) return 0.0;
  return holeMask(e);
}
float softSh(vec3 p, vec3 L){
  float res = 1.0, t = 0.03;
  for(int i=0;i<32;i++){ float h = mapD(p + L*t); res = min(res, 10.0*h/t); t += clamp(h, 0.04, 0.6); if(res < 0.01 || t > 8.0) break; }
  return clamp(res, 0.0, 1.0);
}
// 반사·굴절에 비치는 동굴: 차가운 어둠 · 빛나는 심장 · 공기 속 빛줄기 · 틈 쪽 넓은 하늘빛(소프트박스)
vec3 caveEnv(vec3 r, vec3 p){
  vec3 c = uC3*0.05 + COOL*0.012*(0.6 + 0.4*r.y);
  vec3 hv = HOLE*RG - p; float hl = length(hv);
  float k = max(dot(r, hv/hl), 0.0);
  c += (uC2*0.8 + uC1*0.2)*(0.3*pow(k, 6.0) + 2.0*pow(k, 60.0));
  vec3 pv = HEART - p; float pl = length(pv);
  c += (uC1*0.5 + uC2*0.5)*5.0*pow(max(dot(r, pv/pl), 0.0), 10.0)*(80.0/(80.0 + pl*pl));
  vec3 L = SUN(), A = HOLE*RG, D = -L;
  vec3 w0 = p - A; float b = dot(r, D), dd = dot(r, w0), e = dot(D, w0);
  float den = max(1.0 - b*b, 1e-4);
  float sr = (b*e - dd)/den, sa = (e - b*dd)/den;
  if(sr > 0.0 && sa > 0.0 && sa < RG*2.0){
    float dist = length(w0 + r*sr - D*sa);
    c += uC2*1.6*exp(-dist*dist*0.5);
  }
  return c;
}
// 심장에서 되튀는 빛
vec3 heartLight(vec3 p, vec3 n){
  vec3 pv = HEART - p; float pl = length(pv);
  return (uC1*0.55 + uC2*0.45)*(0.04 + 0.96*max(dot(n, pv/pl), 0.0))*4.0/(1.0 + pl*pl*0.22);
}
float dustD(vec3 p){
  float a = TAU*uT/T;
  vec3 L = SUN();
  vec3 q = (p - L*dot(p, L)*0.85)*0.45 + vec3(cos(a), sin(a), 0.0)*0.30;
  return 0.20 + 1.6*smoothstep(0.40, 0.85, fbm3(q + vec3(0.0, 0.0, 3.0)));
}
#define HAS_BG
vec3 bg(vec3 rd0){
  vec3 ro, ta; float fov; camera(uT, ro, ta, fov);
  // 피사계 심도: 초점은 심장, 가까운 결정은 흐리다
  vec3 cw = normalize(ta - ro), cu = normalize(cross(cw, vec3(0, 1, 0))), cv = cross(cu, cw);
  float focus = length(HEART - ro)*0.92;
  vec3 fp = ro + rd0*focus/dot(rd0, cw);
  float la = rnd()*TAU, lr = sqrt(rnd())*0.06;
  ro += (cu*cos(la) + cv*sin(la))*lr;
  vec3 rd = normalize(fp - ro);
  vec3 L = SUN();
  float t = 0.0, hit = -1.0;
  for(int i=0;i<200;i++){
    float d = mapD(ro + rd*t);
    if(d < 0.0008*(1.0 + t)){ hit = t; break; }
    t += d*0.85;
    if(t > 42.0) break;
  }
  vec3 col;
  float tend = hit > 0.0 ? hit : 42.0;
  if(hit > 0.0){
    vec3 p = ro + rd*hit;
    vec3 n = nrm(p);
    mapM(p);
    vec4 inf = INFO; float edge = EDGE;
    float beam = inBeam(p + n*0.02);
    float sh = beam > 0.001 ? softSh(p + n*0.01, L) : 0.0;
    float nl = max(dot(n, L), 0.0);
    float cv2 = max(dot(n, -rd), 1e-3);
    float ao = clamp(mapD(p + n*0.35)/0.35, 0.0, 1.0)*0.7 + 0.3;
    vec3 hl = heartLight(p, n);
    if(inf.w > 0.5){
      // 색띠: 뿌리는 짙고 끝으로 갈수록 맑고 옅다
      float zr = inf.y;
      vec3 deep = uC0*uC0*1.5 + uC0*0.15;
      vec3 pale = mix(uC1, vec3(0.9), 0.12);
      vec3 body = mix(deep, mix(uC0, pale, 0.6), smoothstep(0.35, 0.8, zr));
      body = mix(body, pale, smoothstep(0.82, 1.0, zr));
      body = mix(body, uC0, 0.25*inf.x*(1.0 - zr));
      float F = 0.045 + 0.955*pow(1.0 - cv2, 5.0);
      vec3 rf = refract(rd, n, 0.645);
      float th = clamp(inf.z*2.2/max(cv2, 0.25), 0.3, 3.0);
      vec3 absorb = pow(max(body, vec3(0.002)), vec3(0.5 + th*0.8));
      vec3 trans = caveEnv(rf, p)*absorb*2.2;
      // 속빛: 빛줄기 안 결정은 속까지 빛난다 (속 깃털무늬가 빛을 붙잡는다)
      float inner = inBeam(p - n*0.2);
      float back = pow(max(dot(rd, L), 0.0), 3.0);
      float veil = smoothstep(0.55, 0.9, vn3((p + rf*0.6)*3.0 + inf.x*20.0));
      vec3 glow = body*inner*(1.6 + 3.0*back + 2.5*veil)*(0.4 + 0.6*sh);
      glow += body*length(hl)*(0.25 + 0.6*veil);
      vec3 dif = body*0.12*(uC2*3.0*nl*sh*beam + hl);
      // 반짝임: 빛줄기 해와 심장빛이 매끈한 면·모서리·끝에 맺힌다
      vec3 spec = uC2*min(ggx(n, -rd, L, 0.035), 300.0)*F*sh*beam*3.0;
      vec3 hv = normalize(HEART - p);
      spec += (uC1*0.5 + uC2*0.5)*min(ggx(n, -rd, hv, 0.05), 200.0)*F*length(hl)*0.6;
      // 틈의 하늘이 잔 결정 면마다 작은 별처럼 맺힌다 (카메라가 움직이면 옮겨 다닌다)
      vec3 ho = normalize(HOLE*RG - p);
      spec += uC2*min(ggx(n, -rd, ho, 0.045), 300.0)*F*0.5;
      glow += body*COOL*0.02;
      vec3 sparkle = (uC2*0.7 + uC1*0.3)*edge*(beam*sh*3.0 + length(hl)*0.6 + 0.01)*(0.4 + 0.6*pow(1.0 - cv2, 2.0))*smoothstep(0.08, 0.35, cv2);
      vec3 refl = caveEnv(reflect(rd, n), p)*F*2.0;
      col = (glow + dif + trans*(1.0 - F))*ao + spec + refl*mix(1.0, ao, 0.5) + sparkle;
    } else {
      float band = 0.5 + 0.5*sin(length(p)*9.0 + vn3(p*2.0)*4.0);
      vec3 alb = mix(uC3*1.2 + uC0*0.05, uC1*0.2 + uC3*0.8, band*0.5);
      col = alb*(uC2*2.0*nl*sh*beam + COOL*0.03 + hl*0.8)*ao;
    }
    // 멀수록 차가운 동굴 공기 속으로
    col = mix(col, uC3*0.012 + COOL*0.006 + uC0*0.004, 1.0 - exp(-hit*0.06));
  } else {
    // 틈 너머 하늘: 대부분 바위에 가려 갈라진 틈으로만 빛난다
    float b = dot(ro, rd), c = dot(ro, ro) - RG*RG;
    vec3 e = normalize(ro + rd*(-b + sqrt(max(b*b - c, 0.0))));
    col = mix(uC3*0.03, uC2*10.0, holeMask(e));
  }
  // 빛줄기와 먼지 (따뜻한 빛) + 그늘의 차가운 공기
  float mu = dot(rd, L);
  float phase = 0.35 + 1.2*pow(max(mu, 0.0), 6.0) + 0.25*pow(max(-mu, 0.0), 2.0);
  float tl = min(tend, 32.0);
  float dt = tl/44.0;
  float tt = dt*rnd();
  vec3 scat = vec3(0.0); float trn = 1.0;
  for(int i=0;i<44;i++){
    vec3 q = ro + rd*tt;
    float bm = inBeam(q);
    float dd = dustD(q);
    vec3 hq = HEART - q;
    scat += trn*(uC2*bm*phase*10.0*dd + (uC1*0.5 + uC2*0.5)*0.35/(1.0 + dot(hq, hq)*0.25) + COOL*0.004)*0.030*dt;
    trn *= exp(-0.018*dd*dt);
    tt += dt;
  }
  col = col*trn + scat;
  // 빛 속을 떠도는 먼지 알갱이 (격자 DDA)
  {
    float gs = 0.5;
    vec3 cell = floor(ro/gs);
    vec3 st = sign(rd);
    vec3 tmax = ((cell + max(st, 0.0))*gs - ro)/rd;
    vec3 tdel = abs(gs/rd);
    float a = TAU*uT/T;
    for(int i=0;i<32;i++){
      vec3 h = h33(cell + 91.0);
      vec3 m = (cell + 0.25 + 0.5*h)*gs + 0.08*vec3(cos(a + h.x*6.28), sin(a*2.0 + h.y*6.28)*0.6, sin(a + h.z*6.28));
      float s = dot(m - ro, rd);
      if(s > 0.3 && s < tend && h.y < 0.35){
        float dd = length(ro + rd*s - m);
        float rr = 0.006 + s*0.0012 + abs(s - focus)*0.004;
        float b = inBeam(m);
        float tw = 0.6 + 0.4*sin(a*3.0 + h.z*30.0);
        col += uC2*b*exp(-dd*dd/(rr*rr))*(0.006/rr)*(0.006/rr)*(0.8 + 1.5*pow(max(mu, 0.0), 4.0))*tw*2.0;
      }
      if(tmax.x < tmax.y && tmax.x < tmax.z){ cell.x += st.x; tmax.x += tdel.x; }
      else if(tmax.y < tmax.z){ cell.y += st.y; tmax.y += tdel.y; }
      else { cell.z += st.z; tmax.z += tdel.z; }
      if(min(tmax.x, min(tmax.y, tmax.z)) > min(tend, 16.0)) break;
    }
  }
  return col;
}
`,
  init() { return {}; },
  draw(G, st, t, ctx) { SGL.drawRay(G, this.src, t, ctx); },
});
