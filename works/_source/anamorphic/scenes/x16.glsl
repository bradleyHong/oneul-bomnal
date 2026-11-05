// X16 눈보라 터널 — 트인 상자 너머 멀리 빛나는 트리가 서 있고, 큰 눈송이들이 소용돌이치며 관객 쪽으로 쏟아져 틀 밖을 스친다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.2,"contrast":1.1,"bloom":0.10}
#define DT 1.5
#define BACK_OPEN 1
#define HAS_OUTSIDE
#define SNOW 9
#define SNOWD 0.22
#define FLOOR_REFL 0.14
#define FRAMEC L(vec3(0.05, 0.06, 0.08))
#define AMB_TOP L(vec3(0.34, 0.40, 0.52))
#define AMB_BOT L(vec3(0.14, 0.14, 0.18))
#define BACKC L(vec3(0.5, 0.7, 1.0))*0.6
#define CYE L(vec3(0.55, 0.90, 1.0))
#define HAS_PREP
#define MAXD 40.0
#define NF 14
vec3 outside(vec3 rd, vec3 ro){
  float e = rd.y;
  vec3 c = mix(L(vec3(0.22, 0.30, 0.52)), L(vec3(0.02, 0.04, 0.14)), smoothstep(-0.1, 0.5, e));
  if(e < 0.0) c = mix(L(vec3(0.42, 0.48, 0.66)), L(vec3(0.14, 0.18, 0.32)), smoothstep(0.0, -0.3, e));
  return c;
}
vec3 FP[NF]; mat3 FR[NF]; float FS[NF];
void prep(){
  for(int i=0;i<NF;i++){
    float fi = float(i);
    float u = fract(uT/T*2.0 + fi/float(NF));                   // 7.5초에 한 바퀴씩
    float a = fi*2.39996 + u*3.0;                               // 소용돌이
    float r = 0.25 + 1.6*u*u + 0.4*h11(fi*3.3);
    FP[i] = vec3(cos(a)*r*1.2, sin(a)*r*0.8 + 0.1, mix(12.0, -3.0, u));
    FS[i] = (0.10 + 0.08*h11(fi*5.1))*smoothstep(0.0, 0.1, u);
    FR[i] = rotA(vec3(0, 0, 1), u*6.0 + fi)*rotA(vec3(1, 0.4, 0), u*4.0);
  }
}
float treeD(vec3 p){ vec3 q = (p - vec3(0.0, -1.0, 9.0))/1.6; return sdTree(q, 1.5)*1.6; }
float map(vec3 p){
  float d = treeD(p);
  for(int i=0;i<NF;i++){
    if(FS[i] < 0.01) continue;
    vec3 q = transpose(FR[i])*(p - FP[i]);
    float bd = length(q) - FS[i]*1.1;
    if(bd > 0.3){ d = min(d, bd); continue; }
    d = min(d, sdFlake(q, FS[i], 0.016*FS[i]/0.2));
  }
  return d;
}
M mat(vec3 p, vec3 n){
  if(treeD(p) < 0.02){
    vec3 q = (p - vec3(0.0, -1.0, 9.0))/1.6;
    M m = mk(vec3(0.01, 0.25, 0.10), 0.75, 0.0); m.bump = 0.9; m.bumpF = 30.0;
    m.emit = twinkle(q, 0.10, 5.0)*1.2 + vec3(0.02, 0.10, 0.05);
    if(q.y > 1.30) m.emit += XGOLD*3.0;
    return m;
  }
  M m = mk(vec3(0.75, 0.88, 1.0), 0.05, 0.0);
  m.iri = 0.2; m.glit = 260.0; m.coat = 0.6;
  m.emit = XICE*0.30*(0.4 + 2.0*pow(1.0 - max(dot(n, -VRD), 0.0), 2.0));
  return m;
}
