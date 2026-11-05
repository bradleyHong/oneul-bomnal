// X05 눈꽃 결정 — 뒤가 트인 겨울밤 하늘에서 큰 얼음 눈송이들이 빙글 돌며 다가와 틀 밖으로 지나간다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.2,"contrast":1.1,"bloom":0.10}
#define DT 1.6
#define BACK_OPEN 1
#define HAS_OUTSIDE
#define SNOW 8
#define SNOWD 0.18
#define FLOOR_REFL 0.14
#define FRAMEC L(vec3(0.05, 0.06, 0.08))
#define AMB_TOP L(vec3(0.30, 0.42, 0.60))
#define AMB_BOT L(vec3(0.12, 0.14, 0.20))
#define BACKC L(vec3(0.4, 0.7, 1.0))*0.6
#define CYE L(vec3(0.55, 0.90, 1.0))
#define CY1 L(vec3(0.55, 0.85, 1.0))
#define HAS_PREP
#define NF 6
vec3 outside(vec3 rd, vec3 ro){
  float e = rd.y;
  vec3 c = mix(L(vec3(0.10, 0.20, 0.45)), L(vec3(0.01, 0.02, 0.10)), smoothstep(-0.2, 0.5, e));
  // 오로라 띠
  float n = fbm(vec2(rd.x/max(rd.z, 0.1)*1.2 + 0.2*sin(TAU*uT/T), e*3.0));
  c += L(vec3(0.2, 1.0, 0.6))*smoothstep(0.5, 0.8, n)*smoothstep(0.05, 0.35, e)*0.6;
  c += L(vec3(0.9, 0.3, 0.8))*smoothstep(0.6, 0.85, n)*smoothstep(0.25, 0.5, e)*0.4;
  if(e < 0.0) return mix(L(vec3(0.55, 0.65, 0.85)), L(vec3(0.20, 0.28, 0.50)), smoothstep(0.0, -0.3, e));   // 눈 덮인 들판
  vec2 g = rd.xy/max(rd.z, 0.1)*80.0; float r = h21(floor(g));
  c += step(0.93, r)*smoothstep(0.3, 0.0, length(fract(g) - 0.5))*1.5;
  return c;
}
vec3 FP[NF]; mat3 FR[NF]; float FS[NF];
void prep(){
  for(int i=0;i<NF;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/float(NF));
    vec3 a = vec3((h11(fi*3.1) - 0.5)*3.0, (h11(fi*5.3) - 0.5)*1.4, 9.0);
    float ang = fi*2.4;
    vec3 b = vec3(cos(ang)*2.6, sin(ang)*1.7 + 0.4, -2.9);
    FP[i] = mix(a, b, u*u*(1.6 - 0.6*u));
    FS[i] = (0.32 + 0.16*h11(fi*7.7))*smoothstep(0.0, 0.08, u);
    FR[i] = rotA(vec3(0, 0, 1), TAU*uT/T*(mod(fi, 2.0) < 0.5 ? 1.0 : -1.0) + fi)*rotA(vec3(0.3, 1, 0), 0.6*sin(TAU*(uT/T*2.0 + fi*0.2)));
  }
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NF;i++){
    if(FS[i] < 0.01) continue;
    vec3 q = transpose(FR[i])*(p - FP[i]);
    float bd = length(q) - FS[i]*1.1;
    if(bd > 0.3){ d = min(d, bd); continue; }
    d = min(d, sdFlake(q, FS[i], 0.018*FS[i]/0.3));
  }
  return d;
}
M mat(vec3 p, vec3 n){
  M m = mk(vec3(0.70, 0.86, 1.0), 0.04, 0.0);
  m.iri = 0.25; m.glit = 260.0; m.coat = 0.6; m.rough = 0.12;   // 얼음: 반짝이는 결정
  m.emit = XICE*0.35*(0.4 + pow(1.0 - max(dot(n, -VRD), 0.0), 2.0)*2.0);
  return m;
}
