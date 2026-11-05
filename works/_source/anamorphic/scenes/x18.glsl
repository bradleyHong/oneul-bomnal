// X18 MERRY XMAS — 줄무늬 사탕 관으로 만든 글자들이 차례로 빙글 돌며 틀 밖 관객 코앞까지 튀어나왔다 제자리로 돌아간다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.25,"contrast":1.1,"bloom":0.08}
#define DT 1.8
#define SNOW 6
#define SNOWD 0.12
#define FLOOR_REFL 0.16
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.38, 0.36, 0.44))
#define AMB_BOT L(vec3(0.20, 0.15, 0.18))
#define CYE L(vec3(1.0, 0.80, 0.40))
#define HAS_PREP
#define NL 9
vec3 LP[NL]; mat3 LR[NL];
const float LS = 0.32;              // 글자 반높이
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0); return length(pa - ba*h); }
// 글자 획 (단위 상자 -0.5..0.5). 0 M 1 E 2 R 3 Y 4 X 5 A 6 S
float glyph(int g, vec2 p){
  float d = 1e9;
  if(g == 0){ d = min(min(seg(p, vec2(-.4,-.5), vec2(-.4,.5)), seg(p, vec2(-.4,.5), vec2(0,0))), min(seg(p, vec2(0,0), vec2(.4,.5)), seg(p, vec2(.4,.5), vec2(.4,-.5)))); }
  else if(g == 1){ d = min(min(seg(p, vec2(-.32,-.5), vec2(-.32,.5)), seg(p, vec2(-.32,.5), vec2(.32,.5))), min(seg(p, vec2(-.32,0), vec2(.22,0)), seg(p, vec2(-.32,-.5), vec2(.32,-.5)))); }
  else if(g == 2){ d = min(min(seg(p, vec2(-.32,-.5), vec2(-.32,.5)), seg(p, vec2(-.32,.5), vec2(.12,.5))), min(seg(p, vec2(-.32,0), vec2(.12,0)), seg(p, vec2(.0,0), vec2(.34,-.5))));
    d = min(d, abs(length(p - vec2(.12,.25)) - .25) + max(0.0, .12 - p.x)*9.0); }
  else if(g == 3){ d = min(min(seg(p, vec2(-.38,.5), vec2(0,.02)), seg(p, vec2(.38,.5), vec2(0,.02))), seg(p, vec2(0,.02), vec2(0,-.5))); }
  else if(g == 4){ d = min(seg(p, vec2(-.36,.5), vec2(.36,-.5)), seg(p, vec2(.36,.5), vec2(-.36,-.5))); }
  else if(g == 5){ d = min(min(seg(p, vec2(-.38,-.5), vec2(0,.5)), seg(p, vec2(0,.5), vec2(.38,-.5))), seg(p, vec2(-.21,-.06), vec2(.21,-.06))); }
  else {
    // S: 위 반원 + 아래 반원
    vec2 q = p - vec2(0, .25); float up = abs(length(q) - .25); if(q.x > 0.0 && q.y < 0.0) up = 1e9;
    vec2 r = p - vec2(0, -.25); float dn = abs(length(r) - .25); if(r.x < 0.0 && r.y > 0.0) dn = 1e9;
    d = min(min(up, dn), min(length(p - vec2(.25, .25)) + 0.0, 1e9));
    d = min(d, min(length(p - vec2(.24, .24)) - 0.0, length(p - vec2(-.24, -.24)) - 0.0) + 0.0*1.0);
    d = min(min(up, dn), min(length(p - vec2(.2165, .375)), length(p - vec2(-.2165, -.375))));
  }
  return d;
}
int gid(int i){ return i == 0 ? 0 : (i == 1 ? 1 : (i == 2 ? 2 : (i == 3 ? 2 : (i == 4 ? 3 : (i == 5 ? 4 : (i == 6 ? 0 : (i == 7 ? 5 : 6))))))); }
void prep(){
  for(int i=0;i<NL;i++){
    float fi = float(i);
    vec3 home = i < 5 ? vec3((fi - 2.0)*0.74, 0.40, 1.25) : vec3((fi - 6.5)*0.80, -0.42, 1.25);
    float t0 = 0.8 + fi*1.35;
    float k = clamp((uT - t0)/2.4, 0.0, 1.0);
    float pop = sin(3.14159*k); pop = pop*pop*(3.0 - 2.0*pop);
    LP[i] = home + vec3(home.x*0.25, home.y*0.35, -2.05)*pop;
    LR[i] = rotA(vec3(0, 1, 0), TAU*ease(k))*rotA(vec3(1, 0, 0), 0.12*sin(TAU*(uT/T*2.0 + fi*0.2)));
  }
}
float letterD(int i, vec3 p){
  vec3 q = transpose(LR[i])*(p - LP[i]);
  float d2 = glyph(gid(i), q.xy/(2.0*LS))*(2.0*LS);
  return length(vec2(d2, q.z)) - 0.055;
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NL;i++){
    float bd = length(p - LP[i]) - LS*1.5;
    if(bd > 0.3){ d = min(d, bd); continue; }
    d = min(d, letterD(i, p));
  }
  return d;
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9;
  for(int i=0;i<NL;i++){ float d = letterD(i, p); if(d < best){ best = d; k = i; } }
  vec3 q = transpose(LR[k])*(p - LP[k]);
  // 사탕 줄무늬 관: 획을 따라 비스듬한 띠
  float st = step(0.5, fract((q.x + q.y)*5.5 + atan(q.z, 0.05)*0.0));
  vec3 c = k < 5 ? XRED : XGREEN;
  M m = mk(mix(vec3(0.80, 0.78, 0.76), c, st), 0.28, 0.0);
  m.coat = 1.0; m.sss = 0.25;
  if(k == 5){ m = mk(XGOLD, 0.25, 1.0); m.glit = 300.0; }     // X 는 금
  return m;
}
