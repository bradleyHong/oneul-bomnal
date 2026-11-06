// V02 새벽 열기구 — 높은 벽돌 샤프트의 뒤가 동트는 하늘로 열려 있다. 줄무늬 열기구들이 분홍빛 새벽 속으로 천천히 떠오르고, 한 대가 샤프트를 지나 틀 밖 관객 앞까지 다가와 커다랗게 떠오른 뒤 위로 사라진다.
// @post {"exposure":1.02,"sat":1.12,"contrast":1.06,"bloom":0.12}
#define WALLSTYLE 2
#define PBR2
#define DT 1.6
#define BACK_OPEN 1
#define HAS_OUTSIDE
#define HAS_PREP
#define HAS_WALLLIGHT
#define MAXD 26.0
#define LKD vec3(-0.32, 0.36, -0.88)
#define KEYC vec3(2.10, 1.90, 1.80)
#define AMB_TOP L(vec3(0.50, 0.48, 0.60))
#define AMB_BOT L(vec3(0.36, 0.29, 0.28))
#define BACKC L(vec3(1.0, 0.70, 0.55))*0.55
#define FRAMEC L(vec3(0.12, 0.10, 0.10))
#define BRICK1 L(vec3(0.58, 0.32, 0.24))
#define BRICK2 L(vec3(0.74, 0.50, 0.38))
#define MORTAR L(vec3(0.70, 0.64, 0.58))
#define BRICK_AGE 0.40
#define RIMD vec3(0.10, 0.30, 0.95)
#define RIMC L(vec3(1.0, 0.72, 0.52))*1.2
#define NBAL 6

mat3 rotA(vec3 ax, float a){
  ax = normalize(ax); float c = cos(a), s = sin(a), k = 1.0 - c;
  return mat3(c + ax.x*ax.x*k, ax.y*ax.x*k + ax.z*s, ax.z*ax.x*k - ax.y*s,
              ax.x*ax.y*k - ax.z*s, c + ax.y*ax.y*k, ax.z*ax.y*k + ax.x*s,
              ax.x*ax.z*k + ax.y*s, ax.y*ax.z*k - ax.x*s, c + ax.z*ax.z*k);
}
float sdRoundCone(vec3 p, float r1, float r2, float h){
  float b = (r1 - r2)/h, a = sqrt(1.0 - b*b);
  vec2 q = vec2(length(p.xz), p.y);
  float k = dot(q, vec2(-b, a));
  if(k < 0.0) return length(q) - r1;
  if(k > a*h) return length(q - vec2(0.0, h)) - r2;
  return dot(q, vec2(a, b)) - r1;
}

// ── 새벽 하늘 ──
const vec3 SUNC = vec3(1.0, 0.62, 0.36);
vec3 skyCol(vec3 rd){
  float e = rd.y/max(rd.z, 0.05);
  vec3 c = mix(L(vec3(1.00, 0.80, 0.58)), L(vec3(0.98, 0.66, 0.62)), smoothstep(-0.08, 0.04, e));
  c = mix(c, L(vec3(0.74, 0.62, 0.78)), smoothstep(0.02, 0.13, e));
  c = mix(c, L(vec3(0.42, 0.50, 0.76)), smoothstep(0.10, 0.26, e));
  // 해: 산 너머로 막 떠오르는 중
  vec2 sp = vec2(rd.x/rd.z - 0.02, e + 0.065);
  float sd = length(sp);
  c += L(SUNC)*(0.9*exp(-sd*9.0) + 0.5*exp(-sd*28.0));
  c += vec3(1.6, 1.25, 0.95)*smoothstep(0.022, 0.016, sd);
  // 엷은 새털구름
  vec2 cq = vec2(rd.x/rd.z*3.0 + 0.02*sin(TAU*uT/T), e*14.0);
  float cl = fbm(cq*vec2(1.0, 2.6) + 3.0);
  c = mix(c, mix(L(vec3(1.0, 0.78, 0.70)), L(vec3(1.0, 0.92, 0.84)), smoothstep(-0.05, 0.05, e))*1.15, smoothstep(0.55, 0.80, cl)*smoothstep(-0.02, 0.05, e)*0.55);
  return c;
}
vec3 outside(vec3 rd, vec3 ro){
  vec3 c = skyCol(rd);
  float e = rd.y/max(rd.z, 0.05);
  float x = rd.x/max(rd.z, 0.05);
  // 겹겹이 먼 산 (멀수록 하늘빛에 묻힌다)
  for(int i=0;i<3;i++){
    float fi = float(i);
    float hgt = -0.045 - 0.028*fi + 0.020*fbm(vec2(x*(6.0 + fi*4.0) + fi*7.3, fi*3.1));
    float m = smoothstep(0.0015, -0.0015, e - hgt);
    vec3 hc = mix(L(vec3(0.86, 0.62, 0.62)), L(vec3(0.42, 0.34, 0.46)), fi/2.0);
    hc = mix(hc, L(vec3(1.0, 0.78, 0.62)), 0.35*exp(-length(vec2(x - 0.02, 0.0))*8.0)*(1.0 - fi*0.3));
    c = mix(c, hc, m);
  }
  // 골짜기: 어스름한 들판 위로 안개 띠가 깔리고, 굽은 강이 새벽빛을 받는다
  if(e < -0.07){
    float gz = 1.0/max(-e, 0.01);                                   // 땅까지 거리 (멀수록 큼)
    vec2 gp = vec2(x*gz, gz);
    vec3 gc = mix(L(vec3(0.20, 0.16, 0.22)), L(vec3(0.50, 0.38, 0.44)), smoothstep(6.0, 14.0, gz));
    gc *= 0.85 + 0.3*fbm(gp*vec2(1.5, 0.4));
    float rv = abs(gp.x - 0.30*sin(gp.y*0.45) - 0.1) - 0.035;
    gc = mix(gc, L(vec3(0.98, 0.70, 0.52)), smoothstep(0.02, -0.005, rv)*0.55);
    float mist = smoothstep(0.35, 0.75, fbm(vec2(gp.x*0.8 + 0.15*sin(TAU*uT/T), gp.y*0.25)));
    gc = mix(gc, L(vec3(0.92, 0.74, 0.70)), mist*0.40 + 0.40*smoothstep(-0.11, -0.07, e));
    c = mix(c, gc, smoothstep(-0.068, -0.075, e));
  }
  return c;
}
// 뒤가 열린 쪽에서 새벽빛이 벽돌에 번진다
vec3 wallLight(vec3 p, vec3 n){
  float k = clamp(p.z/DT, 0.0, 1.0);
  return L(vec3(1.0, 0.72, 0.56))*(0.85*k*k*k + 0.08*k);
}

// ── 열기구 ──
vec3 BPO[NBAL]; mat3 BRO[NBAL]; float BSZ[NBAL]; float BFL[NBAL];
// 지역 좌표 (풍선 몸통 가운데 = 원점, 크기 1). part: 0 천 · 1 바구니 · 2 밧줄 · 3 버너 · 4 불꽃
float balloon(vec3 q, float rr, out float part){
  part = 0.0;
  vec3 e = vec3(q.x, -q.y, q.z);
  float env = sdRoundCone(e, 1.0, 0.20, 1.05);
  float a = atan(q.z, q.x);
  float g = sin(a*6.0);                                      // 12 폭 천: 이음매 사이가 부푼다
  env -= 0.018*g*g*smoothstep(-1.1, 0.3, q.y)*smoothstep(0.0, 0.25, length(q.xz));
  env = max(env*0.85, -(q.y + 1.12));                        // 아래 입구
  float d = env;
  // 바구니
  vec3 bq = q - vec3(0.0, -1.98, 0.0);
  float bw = 0.17 - 0.02*clamp(-bq.y/0.14, -1.0, 1.0);
  float bk = sdRBox(bq, vec3(bw, 0.14, bw), 0.035);
  bk = min(bk, sdRBox(bq - vec3(0.0, 0.135, 0.0), vec3(0.185, 0.022, 0.185), 0.02));   // 가죽 테
  if(bk < d){ d = bk; part = 1.0; }
  // 밧줄 넷
  float rp = 1e9;
  for(int i=0;i<4;i++){
    float an = TAU*(float(i) + 0.5)/4.0;
    vec2 cs = vec2(cos(an), sin(an));
    rp = min(rp, sdCap(q, vec3(cs.x*0.20, -1.13, cs.y*0.20), vec3(cs.x*0.20, -1.84, cs.y*0.20), rr));
  }
  if(rp < d){ d = rp; part = 2.0; }
  // 버너 틀
  float bu = sdCap(q, vec3(0.0, -1.70, 0.0), vec3(0.0, -1.73, 0.0), 0.07);
  if(bu < d){ d = bu; part = 3.0; }
  float fl = sdCap(q, vec3(0.0, -1.66, 0.0), vec3(0.0, -1.50, 0.0), 0.030 + 0.012*smoothstep(-1.5, -1.66, q.y));
  if(fl < d){ d = fl; part = 4.0; }
  return d;
}

vec3 cr(vec3 a, vec3 b, vec3 c, vec3 d, float t){
  return 0.5*((2.0*b) + (-a + c)*t + (2.0*a - 5.0*b + 4.0*c - d)*t*t + (-a + 3.0*b - 3.0*c + d)*t*t*t);
}
vec3 heroPath(float u){
  vec3 K[8];
  K[0] = vec3(0.10, -7.5, 22.0);
  K[1] = vec3(0.10, -5.6, 16.0);
  K[2] = vec3(0.06, -1.9, 7.0);
  K[3] = vec3(0.00, -0.62, 2.6);
  K[4] = vec3(0.00, -0.30, 0.95);
  K[5] = vec3(0.01, -0.06, -0.72);
  K[6] = vec3(0.04, 0.80, -1.22);
  K[7] = vec3(0.06, 2.60, -1.40);
  float x = u*6.0;
  int i = int(clamp(floor(x), 0.0, 5.0));
  float t = x - float(i);
  vec3 a = K[i], b = K[i+1], c = K[min(i+2, 7)], d = K[min(i+3, 7)];
  if(i == 5){ d = K[7] + (K[7] - K[6]); }
  return cr(a, b, c, d, t);
}

void prep(){
  float tt = uT/T;
  // 0: 주인공. 샤프트 앞쪽에서 오래 머물도록 시간을 휜다
  float u = fract(tt);
  // 매듭마다 도착 시각: 멀리서 다가오는 길은 짧게, 샤프트와 틀 앞은 길게
  float U[7]; U[0] = 0.0; U[1] = 0.07; U[2] = 0.27; U[3] = 0.47; U[4] = 0.72; U[5] = 0.92; U[6] = 1.0;
  int j = 0;
  for(int i=0;i<6;i++) if(u >= U[i]) j = i;
  float h = U[j+1] - U[j];
  float f = (u - U[j])/h;
  float m0 = j == 0 ? 1.0/h : 2.0/(U[j+1] - U[j-1]);
  float m1 = j == 5 ? 1.0/h : 2.0/(U[min(j+2, 6)] - U[j]);
  float f2 = f*f, f3 = f2*f;
  float x = float(j)*(2.0*f3 - 3.0*f2 + 1.0) + m0*h*(f3 - 2.0*f2 + f) + float(j + 1)*(-2.0*f3 + 3.0*f2) + m1*h*(f3 - f2);
  float w = x/6.0;
  float s0 = 0.125;
  BPO[0] = heroPath(w) + vec3(0.0, 0.006*sin(TAU*tt*3.0), 0.0);
  BSZ[0] = s0;
  BRO[0] = rotA(vec3(0, 1, 0), TAU*tt)*rotA(vec3(0, 0, 1), 0.04*sin(TAU*tt*2.0));
  BFL[0] = 0.75 + 0.25*sin(TAU*tt*4.0);
  // 1~5: 열린 뒤편 하늘로 떠오르는 열기구들
  for(int i=1;i<NBAL;i++){
    float fi = float(i);
    float z = DT + 0.7 + 1.35*(fi - 1.0) + 0.4*h11(fi*3.3);
    float D = z + ZC;
    float vy = 0.93*D/(DT + ZC);
    float s = 0.13 + 0.035*fi;
    float ex = 0.25 + 1.2*h11(fi*7.1);
    float ub = fract(tt + h11(fi*5.9));
    float y = mix(-vy - s*1.1 - ex, vy + s*2.3 + ex, ub);
    float vx = 0.33*D/(DT + ZC);
    float x = (h11(fi*2.7) - 0.5)*1.2*vx + 0.05*sin(TAU*(tt + fi*0.3));
    BPO[i] = vec3(x, y, z);
    BSZ[i] = s;
    BRO[i] = rotA(vec3(0, 1, 0), TAU*(tt*(mod(fi, 2.0) < 0.5 ? 1.0 : -1.0) + fi*0.37));
    BFL[i] = 0.7 + 0.3*sin(TAU*(tt*3.0 + fi*0.21));
  }
}

float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NBAL;i++){
    float s = BSZ[i];
    vec3 q = p - BPO[i];
    float bs = length(q - vec3(0.0, -0.55*s, 0.0)) - 1.65*s;
    if(bs > 0.3){ d = min(d, bs); continue; }
    float rr = max(0.010, 0.0009*length(p - vec3(0.0, 0.0, -ZC))/s);
    float part;
    d = min(d, balloon(BRO[i]*q/s, rr, part)*s);
  }
  return d;
}

M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9; float part = 0.0;
  for(int i=0;i<NBAL;i++){
    float s = BSZ[i];
    vec3 q = p - BPO[i];
    if(length(q - vec3(0.0, -0.55*s, 0.0)) > 1.75*s) continue;
    float pt;
    float e = balloon(BRO[i]*q/s, max(0.010, 0.0009*length(p - vec3(0.0, 0.0, -ZC))/s), pt)*s;
    if(e < best){ best = e; k = i; part = pt; }
  }
  vec3 q = BRO[k]*(p - BPO[k])/BSZ[k];
  float dist = length(p - vec3(0.0, 0.0, -ZC));
  float fog = 1.0 - exp(-max(dist - 5.0, 0.0)*0.045);
  M m;
  if(part < 0.5){
    // 줄무늬 천: 열기구마다 다른 색 짝
    float a = atan(q.z, q.x);
    float gi = floor(a/(TAU/12.0) + 6.0);
    float alt = mod(gi, 2.0);
    vec3 c1, c2, c3;
    if(k == 0){ c1 = L(vec3(0.86, 0.18, 0.16)); c2 = L(vec3(0.98, 0.86, 0.62)); c3 = L(vec3(0.12, 0.20, 0.45)); }
    else if(k == 1){ c1 = L(vec3(0.10, 0.48, 0.52)); c2 = L(vec3(0.97, 0.92, 0.80)); c3 = L(vec3(0.95, 0.66, 0.22)); }
    else if(k == 2){ c1 = L(vec3(0.95, 0.70, 0.20)); c2 = L(vec3(0.70, 0.18, 0.28)); c3 = L(vec3(0.97, 0.92, 0.80)); }
    else if(k == 3){ c1 = L(vec3(0.20, 0.30, 0.62)); c2 = L(vec3(0.96, 0.90, 0.78)); c3 = L(vec3(0.85, 0.30, 0.22)); }
    else if(k == 4){ c1 = L(vec3(0.62, 0.48, 0.78)); c2 = L(vec3(0.98, 0.94, 0.88)); c3 = L(vec3(0.30, 0.58, 0.42)); }
    else { c1 = L(vec3(0.92, 0.42, 0.30)); c2 = L(vec3(0.98, 0.84, 0.50)); c3 = L(vec3(0.22, 0.42, 0.58)); }
    vec3 c = mix(c1, c2, alt);
    float band = smoothstep(0.03, 0.0, abs(q.y + 0.42) - 0.09);
    c = mix(c, c3, band);
    c = mix(c, c3, smoothstep(0.86, 0.90, q.y));            // 꼭대기 덮개
    float seam = 1.0 - smoothstep(0.02, 0.06, abs(sin(a*6.0)));
    c *= 1.0 - 0.25*seam;
    float gs = sin(a*6.0);
    c *= 0.88 + 0.12*gs*gs;                                    // 폭 가운데가 부풀어 밝다
    c *= mix(0.72, 1.0, smoothstep(-1.15, 0.1, q.y));          // 아래로 갈수록 천이 그늘진다
    if(q.y < -1.10) c = L(vec3(0.10, 0.07, 0.06));          // 입구 속
    m = mk(c, 0.85, 0.0);
    m.sss = 0.60;
    // 버너 불이 천 아래쪽을 안에서 밝힌다
    m.emit = L(vec3(1.0, 0.55, 0.25))*BFL[k]*0.22*smoothstep(-0.4, -1.12, q.y)*(0.6 + 0.4*c2.r);
  } else if(part < 1.5){
    // 등나무 바구니: 엮은 결
    vec3 bq = q - vec3(0.0, -1.98, 0.0);
    float ww = sin((bq.x + bq.z)*70.0)*sin(bq.y*70.0);
    vec3 c = mix(L(vec3(0.42, 0.28, 0.15)), L(vec3(0.66, 0.48, 0.28)), 0.5 + 0.5*ww);
    if(bq.y > 0.11) c = L(vec3(0.26, 0.14, 0.08));
    m = mk(c, 0.75, 0.0);
    m.bump = 0.4; m.bumpF = 220.0/BSZ[k];
  } else if(part < 2.5){
    m = mk(L(vec3(0.70, 0.62, 0.50)), 0.8, 0.0);
  } else if(part < 3.5){
    m = mk(L(vec3(0.70, 0.70, 0.72)), 0.25, 1.0);
  } else {
    m = mk(vec3(0.0), 1.0, 0.0);
    m.emit = mix(L(vec3(0.45, 0.62, 1.0))*1.6, L(vec3(1.0, 0.62, 0.25))*3.2, smoothstep(-1.66, -1.58, q.y))*BFL[k];
  }
  // 먼 열기구는 새벽 안개에 묻힌다
  m.alb *= 1.0 - fog;
  m.emit = mix(m.emit, L(vec3(0.98, 0.76, 0.68))*1.0, fog);
  return m;
}
