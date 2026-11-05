// X12 빛 나선 트리 — 전구 구슬이 나선으로 감겨 트리 모양을 이루며 돌다가, 한 번 크게 풀려 빛의 강이 되어 관객 쪽으로 흘러나왔다 다시 감긴다.
// @lib _xmas
// @post {"exposure":1.0,"sat":1.25,"contrast":1.1,"bloom":0.12}
#define DT 1.9
#define SNOW 5
#define SNOWD 0.10
#define FLOOR_REFL 0.18
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.20, 0.22, 0.30))
#define AMB_BOT L(vec3(0.10, 0.08, 0.10))
#define CYK 0.55
#define CYE L(vec3(1.0, 0.80, 0.40))
#define HAS_PREP
#define NP 46
vec3 PP[NP]; float PR[NP];
void prep(){
  float ph = TAU*uT/T;
  float w = smoothstep(4.0, 7.0, uT)*(1.0 - smoothstep(10.0, 13.5, uT));     // 풀림 정도
  for(int i=0;i<NP;i++){
    float s = float(i)/float(NP - 1);
    float H = 1.70;
    float y = -HO.y + 0.10 + s*H;
    float r = 0.62*(1.0 - s) + 0.04;
    float a = s*TAU*5.0 + ph*2.0;
    vec3 hel = vec3(cos(a)*r, y, 1.05 + sin(a)*r);
    // 풀린 빛의 강: 꼭대기부터 차례로 관객 쪽으로 흘러나와 크게 휘돈다
    float k = clamp(w*1.6 - (1.0 - s)*0.6, 0.0, 1.0);
    float st = 1.0 - s;
    vec3 river = vec3(sin(st*5.0 + ph*2.0)*1.1*(0.4 + st), 0.55*cos(st*3.0 + ph) + 0.1, 1.2 - st*3.6);
    PP[i] = mix(hel, river, ease(k));
    PR[i] = 0.045 + 0.02*(1.0 - s) + 0.03*k;
  }
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NP;i++) d = min(d, length(p - PP[i]) - PR[i]);
  // 꼭대기 별 (풀리면 사라졌다 돌아온다)
  float w = smoothstep(4.0, 6.0, uT)*(1.0 - smoothstep(12.0, 13.5, uT));
  vec3 sq = p - vec3(0, -HO.y + 1.95, 1.05); sq.xz = rot(TAU*uT/T*2.0)*sq.xz;
  if(w < 0.99) d = min(d, sdStar3(sq, 0.17*(1.0 - w), 0.055*(1.0 - w) + 0.001));
  return d;
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9;
  for(int i=0;i<NP;i++){ float d = length(p - PP[i]) - PR[i]; if(d < best){ best = d; k = i; } }
  if(best > 0.02){ M m = mk(XGOLD, 0.15, 1.0); m.emit = XGOLD*2.0; return m; }
  int c = k - 4*(k/4);
  vec3 col = c == 0 ? vec3(1.0, 0.15, 0.12) : (c == 1 ? vec3(1.0, 0.75, 0.25) : (c == 2 ? vec3(0.2, 1.0, 0.45) : vec3(0.9, 0.95, 1.0)));
  float fl = 0.7 + 0.3*sin(TAU*(uT/T*3.0 - float(k)*0.08));
  M m = mk(col*0.3, 0.06, 0.0); m.coat = 1.0;
  m.emit = col*(1.4 + 1.8*pow(max(dot(n, -VRD), 0.0), 2.0))*fl;
  return m;
}
