// 09 TV 탑 — 사탕빛 옛 TV들이 상자 안에 쌓여 저마다 다른 하늘을 튼다. 한 대씩 앞으로 미끄러져 나와 몸을 돌리며 틀 밖까지 나왔다가 돌아간다.
// @post {"exposure":1.0,"sat":1.25,"contrast":1.08,"bloom":0.07}
#define DT 1.75
#define WALL L(vec3(0.98, 0.80, 0.62))
#define GRID 0.25
#define GRIDW 0.011
#define GRIDK 0.22
#define FRAMEC L(vec3(0.16, 0.10, 0.10))
#define AMB_TOP L(vec3(0.70, 0.58, 0.58))
#define AMB_BOT L(vec3(0.45, 0.32, 0.30))
#define LKD vec3(-0.48, 0.70, -0.52)
#define FLOOR_REFL 0.06
#define HAS_PREP
#define NT 6
vec3 TC[NT]; mat3 TM[NT]; vec3 TS[NT];

mat3 ry(float a){ float c = cos(a), s = sin(a); return mat3(c,0,-s, 0,1,0, s,0,c); }
void prep(){
  float fy = -HO.y;
  // 바닥에 셋, 그 위에 둘, 맨 위 하나 (반크기 x,y,z)
  TS[0] = vec3(0.42, 0.32, 0.30); TS[1] = vec3(0.36, 0.28, 0.28); TS[2] = vec3(0.40, 0.30, 0.30);
  TS[3] = vec3(0.34, 0.26, 0.26); TS[4] = vec3(0.38, 0.29, 0.27); TS[5] = vec3(0.30, 0.23, 0.24);
  vec3 home[NT];
  home[0] = vec3(-0.95, fy + TS[0].y, DT - 0.55); home[1] = vec3(0.0, fy + TS[1].y, DT - 0.45); home[2] = vec3(0.95, fy + TS[2].y, DT - 0.55);
  home[3] = vec3(-0.50, fy + 2.0*TS[0].y + TS[3].y, DT - 0.55); home[4] = vec3(0.50, fy + 2.0*TS[2].y + TS[4].y, DT - 0.55);
  home[5] = vec3(0.05, fy + 2.0*TS[0].y + 2.0*TS[3].y + TS[5].y - 0.02, DT - 0.55);
  float tilt[NT]; tilt[0] = 0.18; tilt[1] = -0.05; tilt[2] = -0.20; tilt[3] = 0.12; tilt[4] = -0.10; tilt[5] = 0.06;
  for(int i=0;i<NT;i++){ TC[i] = home[i]; TM[i] = ry(tilt[i]); }
  // 2.5초마다 한 대씩, 여섯 대가 한 번씩 나온다 (0,5,4,3,2,1 순서)
  float slot = floor(uT/2.5), k = fract(uT/2.5);
  int who = int(mod(slot*5.0, 6.0));
  float po = sin(3.14159*ease(k));
  float turn = sin(TAU*ease(k))*0.55;
  for(int i=0;i<NT;i++){
    if(i != who) continue;
    vec3 front = vec3(home[i].x*0.55, max(home[i].y, fy + 0.70), -0.95);
    TC[i] = mix(home[i], front, po);
    TM[i] = ry(tilt[i]*(1.0 - po) + turn)*mat3(1,0,0, 0,cos(0.15*po),sin(0.15*po), 0,-sin(0.15*po),cos(0.15*po));
  }
}
float tv(vec3 q, vec3 s){
  float body = sdRBox(q, s, 0.07);
  vec3 sq = q - vec3(-s.x*0.12, 0.0, -s.z);
  float scr = sdRBox(sq, vec3(s.x*0.70, s.y*0.74, 0.06), 0.06);
  body = max(body, -scr);                                       // 화면 자리를 판다
  vec3 er = vec3(s.x*0.72, s.y*0.76, 0.10);                    // 볼록 유리 (타원체 거리 근사)
  float k0 = length(sq/er), k1 = length(sq/(er*er));
  float glass = max(k0*(k0 - 1.0)/k1, sq.z);
  float knob = length(q - vec3(s.x*0.78, s.y*0.35, -s.z)) - 0.045;
  float knob2 = length(q - vec3(s.x*0.78, 0.0, -s.z)) - 0.045;
  float ant = min(sdCap(q, vec3(0, s.y, 0), vec3(-0.22, s.y + 0.32, 0.02), 0.01), sdCap(q, vec3(0, s.y, 0), vec3(0.18, s.y + 0.36, -0.02), 0.01));
  return min(min(min(body, glass), min(knob, knob2)), ant);
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NT;i++){
    vec3 q = transpose(TM[i])*(p - TC[i]);
    if(length(q) > length(TS[i]) + 0.75){ d = min(d, length(q) - length(TS[i]) - 0.45); continue; }
    d = min(d, tv(q, TS[i]));
  }
  return d;
}
vec3 screenImg(int i, vec2 u){
  // 화면마다 다른 하늘 + 굵은 주사선 + 천천히 지나가는 밝은 띠
  float y = u.y;
  vec3 a, b;
  if(i == 0){ a = L(vec3(1.0, 0.45, 0.70)); b = L(vec3(0.25, 0.30, 1.0)); }
  else if(i == 1){ a = L(vec3(0.83, 1.0, 0.23)); b = L(vec3(0.10, 0.60, 1.0)); }
  else if(i == 2){ a = L(vec3(1.0, 0.60, 0.20)); b = L(vec3(0.70, 0.10, 0.55)); }
  else if(i == 3){ a = L(vec3(0.60, 0.95, 1.0)); b = L(vec3(0.00, 0.35, 0.85)); }
  else if(i == 4){ a = L(vec3(1.0, 0.30, 0.45)); b = L(vec3(0.20, 0.05, 0.35)); }
  else { a = L(vec3(0.95, 0.90, 1.0)); b = L(vec3(0.45, 0.30, 1.0)); }
  vec3 c = mix(a, b, smoothstep(-0.8, 0.9, y));
  float sun = smoothstep(0.32, 0.28, length(u - vec2(0.25*sin(TAU*uT/T + float(i)), -0.15)));
  c = mix(c, vec3(1.0, 0.95, 0.85)*1.5, sun);
  if(y < -0.35 + 0.12*sin(u.x*4.0 + float(i)*2.0)) c = mix(b, a, 0.3)*0.6;
  float bar = smoothstep(0.15, 0.0, abs(fract(y*0.5 - uT/T*3.0) - 0.5) - 0.32);
  c *= 0.85 + 0.25*bar;
  c *= 0.88 + 0.12*sin(y*60.0);                                // 주사선 (LED 몇 화소 굵기)
  return c*1.6;
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9; vec3 bq;
  for(int i=0;i<NT;i++){ vec3 q = transpose(TM[i])*(p - TC[i]); float d = tv(q, TS[i]); if(d < best){ best = d; k = i; bq = q; } }
  vec3 s = TS[k];
  vec3 sq = bq - vec3(-s.x*0.12, 0.0, -s.z);
  if(bq.z < -s.z + 0.12 && abs(sq.x) < s.x*0.74 && abs(sq.y) < s.y*0.78){
    M m = mk(vec3(0.02), 0.03, 0.0);                             // 볼록 유리 화면
    m.emit = screenImg(k, sq.xy/vec2(s.x*0.70, s.y*0.74));
    return m;
  }
  if(length(bq - vec3(s.x*0.78, s.y*0.35, -s.z)) < 0.06 || length(bq - vec3(s.x*0.78, 0.0, -s.z)) < 0.06) return mk(L(vec3(0.95, 0.95, 0.98)), 0.15, 1.0);
  if(bq.y > s.y + 0.01) return mk(L(vec3(0.9, 0.9, 0.95)), 0.2, 1.0);   // 안테나
  vec3 col[6];
  col[0] = L(vec3(0.55, 0.92, 0.80)); col[1] = L(vec3(1.0, 0.45, 0.62)); col[2] = L(vec3(0.98, 0.90, 0.70));
  col[3] = L(vec3(0.83, 1.0, 0.23)); col[4] = L(vec3(0.60, 0.70, 1.0)); col[5] = L(vec3(1.0, 0.62, 0.35));
  return mk(col[k], 0.28, 0.0);                                 // 사탕빛 플라스틱 몸
}
