// X04 자라는 트리 — 상자 바닥에서 빛 트리가 자라나 전구가 반짝이고, 꼭대기 별이 떨어져 나와 관객 머리 위로 날아간다.
// @lib _xmas
// @post {"exposure":1.05,"sat":1.25,"contrast":1.1,"bloom":0.09}
#define DT 1.9
#define SNOW 7
#define SNOWD 0.15
#define FLOOR_REFL 0.14
#define FRAMEC L(vec3(0.05, 0.05, 0.07))
#define AMB_TOP L(vec3(0.32, 0.34, 0.42))
#define AMB_BOT L(vec3(0.16, 0.14, 0.16))
#define CYE L(vec3(0.35, 1.0, 0.60))
#define HAS_PREP
float TS; vec3 SP; mat3 SR; float SS;
void prep(){
  float t = uT;
  TS = t < 12.0 ? ease(t/4.5) : 1.0 - ease((t - 12.0)/2.6);
  TS = max(TS, 0.0);
  vec3 top = vec3(0.0, -HO.y + 1.62*TS + 0.10, 1.05);
  float spin = TAU*uT/T*2.0;
  if(t < 7.5){ SP = top; SS = TS; }
  else {
    float k = clamp((t - 7.5)/4.5, 0.0, 1.0);
    vec3 a = top, c = vec3(-0.55, 0.85, -0.6), b = vec3(-1.6, 2.6, -3.2);
    SP = mix(mix(a, c, k), mix(c, b, k), k);
    SS = 1.0 + 0.4*k;
    spin += k*k*12.0;
  }
  SR = rotA(vec3(0, 1, 0), spin);
}
float map(vec3 p){
  float d = 1e9;
  if(TS > 0.01){ vec3 q = (p - vec3(0, -HO.y + 0.10*TS, 1.05))/TS; d = sdTree(q, 1.55)*TS; }
  if(SS > 0.01){ vec3 q = transpose(SR)*(p - SP); d = min(d, sdStar3(q, 0.22*SS, 0.07*SS)); }
  return d;
}
M mat(vec3 p, vec3 n){
  float ds = SS > 0.01 ? sdStar3(transpose(SR)*(p - SP), 0.22*SS, 0.07*SS) : 1e9;
  if(ds < 0.01){ M m = mk(XGOLD, 0.15, 1.0); m.emit = XGOLD*1.2; m.glit = 300.0; return m; }
  vec3 q = (p - vec3(0, -HO.y + 0.10*TS, 1.05))/max(TS, 0.01);
  if(q.y < 0.05) return mk(vec3(0.25, 0.12, 0.05), 0.6, 0.0);       // 줄기
  M m = mk(vec3(0.01, 0.30, 0.10), 0.75, 0.0);
  // 잎 결 + 감아 올라가는 금빛 줄 + 전구
  float a = atan(q.z, q.x);
  float garland = smoothstep(0.04, 0.0, abs(fract(q.y*2.2 + a/TAU) - 0.5) - 0.45);
  m.alb = mix(m.alb, XGOLD, garland); m.metal = garland; m.rough = mix(0.75, 0.25, garland);
  m.bump = 0.9*(1.0 - garland); m.bumpF = 38.0; m.glit = garland*320.0;   // 솔잎 결 · 금줄 반짝이
  m.emit = twinkle(q, 0.11, 3.0)*smoothstep(0.0, 0.5, TS);
  return m;
}
