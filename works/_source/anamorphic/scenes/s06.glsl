// s06 단풍 회오리 — 낮은 가을 햇살이 비스듬히 드는 벽돌 방. 바닥에 쌓인 낙엽 더미에서 빨강·주황·노랑 단풍잎이 회오리를 그리며 솟아올라, 빙글빙글 돌다가 틀을 넘어 관객 쪽으로 날아간다.
// @lib _autumn
// @post {"exposure":1.02,"sat":1.18,"contrast":1.1,"bloom":0.08}
#define DT 1.9
#define LKD vec3(-0.48, 0.42, -0.77)
#define KEYC vec3(3.1, 2.3, 1.35)
#define AMB_TOP L(vec3(0.52, 0.44, 0.40))
#define AMB_BOT L(vec3(0.34, 0.22, 0.14))
#define BRICK1 L(vec3(0.50, 0.23, 0.15))
#define BRICK2 L(vec3(0.66, 0.37, 0.23))
#define MORTAR L(vec3(0.58, 0.52, 0.44))
#define BRICK_AGE 0.55
#define MOSS 0.10
#define MOSSC L(vec3(0.38, 0.34, 0.12))
#define RIMD vec3(0.45, 0.75, 0.55)
#define RIMC (L(vec3(1.0, 0.72, 0.40))*1.1)
#define HAS_PREP
#define NL 20
#define NF 19
#define NT (NL + NF)
#define STEPS 128
const vec3 MC = vec3(0.12, -0.93, 1.12);        // 낙엽 더미 가운데 (바닥 위)
const vec3 MRAD = vec3(0.66, 0.15, 0.38);
vec3 LP[NT]; mat3 LR[NT]; float LS[NT]; float LH[NT]; float LCU[NT];

vec3 spiralP(float u, float fi, float h){
  float a = u/0.62;
  float rr = 0.10 + 0.95*pow(clamp(a, 0.0, 1.4), 0.75);
  float y = -0.86 + 1.45*a - 0.30*a*a;
  float ph = h*TAU + TAU*2.3*a;
  return vec3(MC.x + rr*cos(ph), y, MC.z - 0.25*a + rr*0.48*sin(ph));
}
void prep(){
  for(int i=0;i<NL;i++){
    float fi = float(i);
    float h = h11(fi*3.71 + 0.3), h2 = h11(fi*7.13 + 1.1), h3 = h11(fi*1.91 + 5.0);
    float u = fract(uT/T + (fi + 0.55*h2)/float(NL));
    // 빠져나갈 곳: 대부분 오른쪽 위, 몇 장은 왼쪽 높이. 끝점의 그림자가 틀 구멍 밖에 떨어지도록
    vec3 E;
    if(h3 < 0.72){ float ps = mix(0.05, 1.30, h3/0.72); E = vec3(0.5 + 2.4*cos(ps), 0.7 + 1.4*sin(ps), -1.75); }
    else E = vec3(-0.4 - 1.6*h2, 2.8, -1.75);
    vec3 C = vec3(mix(-1.0, 1.3, h), mix(-0.15, 0.50, h2), 0.0);          // 틀을 넘는 곳
    vec3 S = spiralP(0.5, fi, h);
    vec3 Cc = 2.0*C - 0.5*(S + E);
    float v = clamp((u - 0.5)/0.5, 0.0, 1.0);
    vec3 bz = (1.0 - v)*(1.0 - v)*S + 2.0*v*(1.0 - v)*Cc + v*v*E;
    LP[i] = mix(spiralP(u, fi, h), bz, smoothstep(0.5, 0.66, u));
    LS[i] = (0.26 + 0.08*h2)*smoothstep(0.0, 0.05, u);
    LH[i] = fract(h*5.3 + h2);
    LCU[i] = 0.45 + 0.45*h3;
    LR[i] = rotA(vec3(h - 0.5, 1.0, h2 - 0.5), TAU*(1.5 + h)*u + h*6.0)*rotA(vec3(1.0, 0.2, 0.0), 1.2*sin(TAU*u*(3.0 + h3)) + 1.5*h3);
  }
  // 낙엽 더미: 둥근 더미 표면에 잎을 겹쳐 얹고, 몇 장은 바닥에 흩어 둔다 (가만히)
  for(int j=0;j<NF;j++){
    int i = NL + j; float fj = float(j);
    float a = fj*2.39996 + 0.7, rf = sqrt((fj + 0.5)/15.0);
    vec3 base, nn;
    if(j < 15){
      vec2 xz = vec2(cos(a), sin(a))*rf*0.95;
      float hy = MRAD.y*sqrt(max(1.0 - dot(xz, xz), 0.0));
      base = MC + vec3(xz.x*MRAD.x, hy + 0.012, xz.y*MRAD.z);
      nn = normalize(vec3(xz.x/MRAD.x, max(hy, 0.02)/(MRAD.y*MRAD.y)*0.12, xz.y/MRAD.z));
      nn = normalize(mix(vec3(0, 1, 0), nn, 0.55));
    } else {
      float b = fj*1.9;
      base = vec3(MC.x + cos(b)*1.25, -0.93 + 0.010, MC.z + sin(b)*0.70 - 0.20);
      if(j == 18) base = vec3(-1.30, -0.93 + 0.010, 0.38);
      nn = vec3(0, 1, 0);
    }
    LP[i] = base; LS[i] = 0.25 + 0.06*h11(fj*2.0); LH[i] = h11(fj*9.1); LCU[i] = 0.30;
    // 잎 판(지역 z)이 nn 을 보도록
    vec3 zax = nn, xax = normalize(cross(vec3(sin(fj*1.7), 0.0, cos(fj*1.7)), zax)); vec3 yax = cross(zax, xax);
    LR[i] = mat3(xax, yax, zax);
  }
}
float moundD(vec3 p){
  vec3 q = p - MC;
  float d = sdEll(q, MRAD);
  if(d > 0.3) return d - 0.03;
  return min(d + 0.03*(vnoise3(p*9.0) - 0.5), 0.3)*0.9 - 0.003;
}
float map(vec3 p){
  float d = moundD(p);
  for(int i=0;i<NT;i++){
    if(LS[i] < 0.01) continue;
    vec3 r = p - LP[i];
    float bd = length(r) - LS[i]*1.05;
    if(bd > 0.3){ d = min(d, bd); continue; }
    d = min(d, min(sdLeaf(transpose(LR[i])*r, LS[i], LCU[i]), 0.3));   // 경계에서 거리값이 튀지 않게 (그림자 줄무늬 방지)
  }
  return d;
}
vec3 leafCol(float hc){
  vec3 c = mix(L(vec3(0.70, 0.06, 0.03)), L(vec3(0.92, 0.32, 0.03)), smoothstep(0.0, 0.45, hc));
  return mix(c, L(vec3(0.95, 0.66, 0.08)), smoothstep(0.55, 1.0, hc));
}
M mat(vec3 p, vec3 n){
  float best = moundD(p); int k = -1;
  for(int i=0;i<NT;i++){
    if(LS[i] < 0.01) continue;
    vec3 r = p - LP[i];
    if(length(r) > LS[i]*1.1) continue;
    float d = sdLeaf(transpose(LR[i])*r, LS[i], LCU[i]);
    if(d < best){ best = d; k = i; }
  }
  if(k < 0){
    // 더미 속: 잎 사이 그늘진 마른 잎 부스러기
    vec2 uv = p.xz*vec2(16.0, 18.0);
    float id = vorId(uv);
    vec3 c = mix(L(vec3(0.30, 0.12, 0.04)), L(vec3(0.55, 0.26, 0.06)), id)*(0.7 + 0.5*vnoise(uv*3.0));
    M m = mk(c, 0.7, 0.0);
    return m;
  }
  vec3 q = transpose(LR[k])*(p - LP[k]);
  vec3 b = leafBend(q, LS[k], LCU[k]);
  vec2 lp = b.xy;
  float r = length(lp);
  vec3 c = leafCol(LH[k]);
  c = mix(c*vec3(1.05, 1.2, 0.6), c, smoothstep(0.05, 0.55, r));            // 가운데는 노란 기
  c = mix(c, c*vec3(0.55, 0.30, 0.25), smoothstep(0.65, 1.0, r)*0.6);      // 끝은 짙게 물듦
  float vn = mapleVein(lp);
  c = mix(c, c*vec3(1.4, 1.25, 0.7) + 0.02, (1.0 - smoothstep(0.008, 0.024, vn))*0.75);   // 잎맥
  c *= 0.9 + 0.2*vnoise(lp*18.0);
  c = mix(c, c*0.45, smoothstep(0.84, 0.90, vnoise(lp*5.0 + LH[k]*13.0))*0.6); // 군데군데 갈색 점
  M m = mk(c, 0.42, 0.0);
  m.coat = 0.25; m.wrap = 0.15; m.sss = 0.22;                              // 얇은 잎: 빛이 살짝 비친다
  return m;
}
