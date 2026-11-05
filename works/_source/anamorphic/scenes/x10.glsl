// X10 전구 줄 — 상자 양 벽 사이에 걸린 큰 옛날 전구 줄 셋이 출렁이고, 맨 앞 줄은 관객 쪽으로 크게 그네 타듯 넘어온다.
// @lib _xmas
// @post {"exposure":1.0,"sat":1.25,"contrast":1.1,"bloom":0.11}
#define DT 1.8
#define SNOW 5
#define SNOWD 0.10
#define FLOOR_REFL 0.16
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.24, 0.24, 0.32))
#define AMB_BOT L(vec3(0.12, 0.10, 0.12))
#define CYK 0.6
#define CYE L(vec3(0.9, 0.5, 1.0))
#define HAS_PREP
#define NL 3
#define NBL 7
vec3 CA[NL]; vec3 CB2[NL]; float SAG[NL]; float SW[NL];
vec3 cablePt(int i, float s){
  vec3 p = mix(CA[i], CB2[i], s);
  float sg = SAG[i]*4.0*s*(1.0 - s);
  vec3 dn = vec3(0.0, -cos(SW[i]), -sin(SW[i]));               // 늘어진 쪽이 관객 쪽으로 돈다
  return p + dn*sg;
}
void prep(){
  for(int i=0;i<NL;i++){
    float fi = float(i);
    float z = i == 0 ? 0.25 : (i == 1 ? 0.9 : 1.5);
    float y = i == 0 ? 0.80 : (i == 1 ? 0.55 : 0.70);
    CA[i] = vec3(-HO.x, y, z); CB2[i] = vec3(HO.x, y - 0.05*fi, z + 0.1);
    SAG[i] = i == 0 ? 1.05 : 0.65;
    SW[i] = (i == 0 ? 0.95 : 0.30)*(0.5 + 0.5*sin(TAU*(uT/T*2.0 + fi*0.3) - 1.57));
  }
}
float bulbAt(int i, int j, vec3 p, out float part){
  float s = (float(j) + 1.0)/float(NBL + 1);
  vec3 c = cablePt(i, s);
  vec3 dn = vec3(0.0, -cos(SW[i]), -sin(SW[i]));
  vec3 q = p - (c + dn*0.10);
  // 전구 아래(-y)가 늘어진 쪽을 보게
  vec3 yy = -dn, xx = vec3(1, 0, 0), zz = cross(xx, yy);
  q = vec3(dot(q, xx), dot(q, yy), dot(q, zz));
  return sdBulb(q, 0.10, part);
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NL;i++){
    vec3 prev = cablePt(i, 0.0);
    for(int k=1;k<=10;k++){ vec3 nx = cablePt(i, float(k)/10.0); d = min(d, sdCap(p, prev, nx, 0.012)); prev = nx; }
    for(int j=0;j<NBL;j++){ float part; d = min(d, bulbAt(i, j, p, part)); }
  }
  return d;
}
M mat(vec3 p, vec3 n){
  float best = 1e9, pk = 0.0; int bi = 0, bj = 0;
  for(int i=0;i<NL;i++) for(int j=0;j<NBL;j++){ float part; float d = bulbAt(i, j, p, part); if(d < best){ best = d; pk = part; bi = i; bj = j; } }
  if(best > 0.01) return mk(vec3(0.02, 0.15, 0.05), 0.4, 0.0);       // 초록 전선
  if(pk > 0.5) return mk(XSILVER*0.8, 0.3, 1.0);
  int c = (bj + bi*2) - 5*((bj + bi*2)/5);
  vec3 col = c == 0 ? vec3(1.0, 0.12, 0.10) : (c == 1 ? vec3(0.15, 1.0, 0.35) : (c == 2 ? vec3(1.0, 0.70, 0.15) : (c == 3 ? vec3(0.20, 0.45, 1.0) : vec3(1.0, 0.30, 0.75))));
  float fl = 0.75 + 0.25*sin(TAU*(uT/T*floor(2.0 + float(c)) + float(bj)*0.37));
  M m = mk(col*0.3, 0.05, 0.0); m.coat = 1.0;   // 유리 전구
  m.emit = col*(1.6 + 2.2*pow(max(dot(n, -VRD), 0.0), 2.0))*fl;
  return m;
}
