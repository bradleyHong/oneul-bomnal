// X01 오너먼트 그네 — 사이버 상자 천장에 매달린 오너먼트들이 그네처럼 흔들리고, 앞줄은 틀 밖 관객 코앞까지 넘어왔다 돌아간다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.22,"contrast":1.1,"bloom":0.08}
#define DT 1.9
#define SNOW 7
#define SNOWD 0.16
#define FLOOR_REFL 0.12
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.30, 0.30, 0.42))
#define AMB_BOT L(vec3(0.16, 0.12, 0.18))
#define LKD vec3(-0.42, 0.72, -0.55)
#define HAS_PREP
#define NO 7
vec3 OP[NO]; vec3 OV[NO]; float ORR[NO];
void prep(){
  for(int i=0;i<NO;i++){
    float fi = float(i);
    vec3 piv = vec3((fi - 3.0)*0.52 + 0.1*sin(fi*3.1), HO.y, 0.25 + 1.3*h11(fi*3.7 + 1.0));
    if(i == 1 || i == 4) piv.z = 0.18;                       // 앞줄 둘: 크게 넘어온다
    float len = 0.75 + 0.6*h11(fi*5.3);
    if(i == 1 || i == 4) len = 1.30;
    float k = i == 1 || i == 4 ? 1.0 : floor(1.0 + h11(fi*9.1)*2.0);
    float amp = (i == 1 || i == 4) ? 0.95 : 0.35;
    float th = amp*sin(TAU*(uT/T*k*2.0 + h11(fi*2.3)));
    float side = 0.18*sin(TAU*(uT/T*k*2.0 + 0.25 + fi));
    vec3 dir = vec3(sin(side)*cos(th), -cos(th)*cos(side), -sin(th));
    OV[i] = piv; ORR[i] = 0.13 + 0.07*h11(fi*1.9); if(i == 1 || i == 4) ORR[i] = 0.22;
    OP[i] = piv + dir*len;
  }
}
float map(vec3 p){
  float d = 1e9;
  for(int i=0;i<NO;i++){
    vec3 a = OP[i] - OV[i];
    vec3 up = normalize(-a);
    // 오너먼트 꼭지가 끈 쪽을 보게 돌린 지역 좌표
    vec3 x = normalize(cross(up, vec3(0, 0, 1))), z = cross(x, up);
    vec3 q = p - OP[i]; q = vec3(dot(q, x), dot(q, up), dot(q, z));
    float part; d = min(d, sdOrnament(q, ORR[i], part));
    d = min(d, sdCap(p, OV[i], OP[i] - a/length(a)*ORR[i]*1.2, 0.006));   // 끈
  }
  return d;
}
M mat(vec3 p, vec3 n){
  int k = 0; float best = 1e9; vec3 bq;
  for(int i=0;i<NO;i++){ float d = length(p - OP[i]) - ORR[i]; if(d < best){ best = d; k = i; } }
  if(best > ORR[k]*0.35) return mk(L(vec3(0.85, 0.85, 0.9)), 0.3, 1.0);            // 끈·꼭지 금속
  vec3 lq = (p - OP[k])/ORR[k];
  M m;
  int c = k - 5*(k/5);
  if(c == 0){ m = mk(XRED, 0.30, 0.0); m.coat = 1.0; }                              // 빨강 유광 칠
  else if(c == 1){ m = mk(XGOLD, 0.32, 1.0); m.glit = 260.0; }                     // 금 반짝이 펄
  else if(c == 2){ m = mk(XGREEN, 0.35, 0.2); m.coat = 1.0; m.glit = 200.0; }       // 초록 펄 + 겉칠
  else if(c == 3){ m = mk(XSILVER, 0.03, 1.0); }                                   // 거울 은
  else { m = mk(vec3(0.82, 0.80, 0.88), 0.55, 0.0); m.iri = 0.35; m.coat = 1.0; m.bump = 0.06; m.bumpF = 60.0; }   // 진주 무광 + 겉칠
  // 금 띠 장식 (빨강·초록 구슬)
  if(c == 0 || c == 2){ float band = smoothstep(0.03, 0.0, abs(abs(lq.y) - 0.28) - 0.05); m.alb = mix(m.alb, XGOLD, band); m.metal = mix(m.metal, 1.0, band); m.rough = mix(m.rough, 0.25, band); m.glit = mix(m.glit, 320.0, band); }
  return m;
}
