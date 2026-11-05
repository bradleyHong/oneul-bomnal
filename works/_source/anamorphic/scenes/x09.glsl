// X09 별똥별 — 뒤가 트인 겨울밤에서 금빛 별들이 빙글빙글 날아와 틀을 넘어 관객 곁으로 스친다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.25,"contrast":1.1,"bloom":0.11}
#define DT 1.6
#define BACK_OPEN 1
#define HAS_OUTSIDE
#define SNOW 5
#define SNOWD 0.10
#define FLOOR_REFL 0.16
#define FRAMEC L(vec3(0.05, 0.05, 0.08))
#define AMB_TOP L(vec3(0.30, 0.30, 0.48))
#define AMB_BOT L(vec3(0.14, 0.12, 0.18))
#define BACKC L(vec3(0.6, 0.5, 1.0))*0.5
#define CYE L(vec3(1.0, 0.80, 0.40))
#define HAS_PREP
#define NS 7
vec3 outside(vec3 rd, vec3 ro){
  float e = rd.y;
  vec3 c = mix(L(vec3(0.20, 0.10, 0.40)), L(vec3(0.01, 0.01, 0.08)), smoothstep(-0.1, 0.5, e));
  if(e < 0.0) c = mix(L(vec3(0.16, 0.10, 0.30)), L(vec3(0.02, 0.02, 0.06)), smoothstep(0.0, -0.25, e));   // 어두운 언덕
  vec2 g = rd.xy/max(rd.z, 0.1)*70.0; float r = h21(floor(g));
  float tw = 0.6 + 0.4*sin(TAU*(uT/T*floor(1.0 + r*4.0) + r*9.0));
  c += step(0.92, r)*smoothstep(0.3, 0.0, length(fract(g) - 0.5))*2.0*tw*step(0.0, e);
  return c;
}
vec3 SP[NS]; mat3 SR[NS]; float SS[NS];
void prep(){
  for(int i=0;i<NS;i++){
    float fi = float(i);
    float u = fract(uT/T + fi/float(NS));
    vec3 a = vec3((h11(fi*3.1) - 0.5)*4.0, 0.2 + (h11(fi*5.3) - 0.5)*1.6, 10.0);
    float ang = fi*2.2 + 0.4;
    vec3 b = vec3(cos(ang)*2.8, sin(ang)*1.8 + 0.3, -3.0);
    vec3 m = vec3((a.x + b.x)*0.3, 0.4 + 0.3*sin(fi), 2.0);
    float k = u*u*(1.5 - 0.5*u);
    SP[i] = mix(mix(a, m, k), mix(m, b, k), k);
    SS[i] = (0.20 + 0.12*h11(fi*7.7))*smoothstep(0.0, 0.08, u);
    SR[i] = rotA(vec3(0, 1, 0), TAU*uT/T*2.0 + fi)*rotA(vec3(0, 0, 1), TAU*uT/T*(mod(fi, 2.0) < 0.5 ? 1.0 : -1.0));
  }
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NS;i++){
    if(SS[i] < 0.01) continue;
    vec3 q = transpose(SR[i])*(p - SP[i]);
    float bd = length(q) - SS[i]*1.05;
    if(bd > 0.3){ d = min(d, bd); continue; }
    d = min(d, sdStar3(q, SS[i], SS[i]*0.32));
  }
  return d;
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9;
  for(int i=0;i<NS;i++){ float d = length(p - SP[i]); if(d < best){ best = d; k = i; } }
  M m = mk(k == 3 ? XSILVER : XGOLD, 0.20, 1.0); m.glit = 300.0;
  m.emit = (k == 3 ? vec3(0.6, 0.8, 1.0) : XGOLD)*(0.35 + 1.2*pow(1.0 - max(dot(n, -VRD), 0.0), 3.0));
  return m;
}
