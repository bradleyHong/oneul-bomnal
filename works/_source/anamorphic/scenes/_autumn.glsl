// ── 가을 공용 모양·재질 (scenes/s06·s07·s08 이 // @lib _autumn 으로 불러 쓴다) ──
// 벽돌 상자(WALLSTYLE 2) + 실사 재질판(PBR2). 모든 모양은 지역 좌표 q 에서 잰 거리.
#define WALLSTYLE 2
#define PBR2

mat3 rotA(vec3 ax, float a){              // 축 ax 둘레로 a 만큼 (로드리게스)
  ax = normalize(ax); float c = cos(a), s = sin(a), k = 1.0 - c;
  return mat3(c + ax.x*ax.x*k, ax.y*ax.x*k + ax.z*s, ax.z*ax.x*k - ax.y*s,
              ax.x*ax.y*k - ax.z*s, c + ax.y*ax.y*k, ax.z*ax.y*k + ax.x*s,
              ax.x*ax.z*k + ax.y*s, ax.y*ax.z*k - ax.x*s, c + ax.z*ax.z*k);
}
// 포물선 한 번: s초 동안 ya → yb, 걸리는 시간 D, 중력 g (등속 수평 + 일정 중력)
float arcY(float ya, float yb, float s, float D, float g){ return mix(ya, yb, s/D) + 0.5*g*s*(D - s); }
float sdEll(vec3 p, vec3 r){ float k0 = length(p/r); float k1 = length(p/(r*r)); return k0*(k0 - 1.0)/max(k1, 1e-5); }
float sdSeg2(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0); return length(pa - ba*h); }
vec2 vor2(vec2 p){                       // (가장 가까운 칸까지 거리, 칸 경계까지 거리 근사) + 칸 번호는 VID 로
  vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 g = vec2(x, y); vec2 o2 = g + 0.15 + 0.7*vec2(h21(i + g), h21(i + g + 17.0)) - f;
    float d = dot(o2, o2);
    if(d < d1){ d2 = d1; d1 = d; } else if(d < d2) d2 = d;
  }
  return vec2(sqrt(d1), sqrt(d2) - sqrt(d1));
}
float vorId(vec2 p){
  vec2 i = floor(p), f = fract(p); float d1 = 9.0, id = 0.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 g = vec2(x, y); vec2 o2 = g + 0.15 + 0.7*vec2(h21(i + g), h21(i + g + 17.0)) - f;
    float d = dot(o2, o2);
    if(d < d1){ d1 = d; id = h21(i + g + 3.3); }
  }
  return id;
}

// ── 단풍잎 ──
// 뾰족한 렌즈 모양(양끝이 뾰족한 잎 조각). 길이 반 hl, 너비 반 hw, 세로 방향
float sdVesica(vec2 p, float hl, float hw){
  float r = 0.5*(hw + hl*hl/hw), d = r - hw;
  p = abs(p);
  return ((p.y - hl)*d > p.x*hl) ? length(p - vec2(0.0, hl)) : length(p - vec2(-d, 0.0)) - r;
}
vec2 lobeQ(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(p.x*c - p.y*s, p.x*s + p.y*c); }
float mapleLobe(vec2 p, float a, float len, float wid){
  vec2 q = lobeQ(p, a);
  float d = sdVesica(q - vec2(0.0, len*0.5), len*0.5, wid);
  float t = clamp(q.y/len, 0.0, 1.0);
  d += 0.020*(abs(fract(q.y*10.0) - 0.5)*2.0 - 0.5)*smoothstep(0.30, 0.60, t);   // 톱니
  return d;
}
// 다섯 갈래 단풍잎 (단위 크기, 잎자루 붙는 곳이 원점, 가운데 갈래가 +y)
float maple2(vec2 p){
  float d = length(p - vec2(0.0, 0.10)) - 0.20;
  d = smin(d, mapleLobe(p, 0.0, 1.00, 0.25), 0.10);
  d = smin(d, mapleLobe(p, 0.95, 0.86, 0.22), 0.10);
  d = smin(d, mapleLobe(p, -0.95, 0.86, 0.22), 0.10);
  d = smin(d, mapleLobe(p, 1.90, 0.50, 0.15), 0.07);
  d = smin(d, mapleLobe(p, -1.90, 0.50, 0.15), 0.07);
  return d;
}
// 잎맥까지 거리 (단위 크기)
float mapleVein(vec2 p){
  float d = sdSeg2(p, vec2(0.0), vec2(0.0, 0.92));
  d = min(d, sdSeg2(p, vec2(0.0), lobeQ(vec2(0.0, 0.78), -0.95)));
  d = min(d, sdSeg2(p, vec2(0.0), lobeQ(vec2(0.0, 0.78), 0.95)));
  d = min(d, sdSeg2(p, vec2(0.0), lobeQ(vec2(0.0, 0.42), -1.90)));
  d = min(d, sdSeg2(p, vec2(0.0), lobeQ(vec2(0.0, 0.42), 1.90)));
  return d;
}
// 잎 지역 좌표 → 휘어 편 2D 좌표 (잎 판 위)
vec3 leafBend(vec3 q, float s, float curl){
  vec2 p = q.xy/s + vec2(0.0, 0.30);
  vec2 pc = clamp(p, vec2(-1.0, -0.4), vec2(1.0, 1.1));        // 잎 밖에서는 휨을 멈춰 거리값이 부풀지 않게
  q.z -= s*curl*(0.32*pc.x*pc.x - 0.10*pc.y + 0.10*abs(pc.x));   // 오목하게 말리고 가운데 잎맥이 살짝 접힌다
  return vec3(p, q.z);
}
float sdLeaf(vec3 q, float s, float curl){
  vec3 b = leafBend(q, s, curl);
  float d2 = maple2(b.xy)*s;
  float th = 0.012*s + 0.0030;
  if(d2 < 0.01) th += 0.010*s*(1.0 - smoothstep(0.0, 0.035, mapleVein(b.xy)));   // 도드라진 잎맥
  vec2 w = vec2(d2, abs(b.z) - th);
  float d = min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
  d = min(d, sdCap(vec3(q.xy, b.z), vec3(0.0, -0.30*s, 0.0), vec3(0.04*s, -0.66*s, -0.03*s), 0.020*s));   // 잎자루
  return d*0.72;
}

// ── 밤 · 도토리 · 밤송이 ──
// 밤: 아래가 넓고 위가 뾰족한 납작 공. 아래쪽 넓은 배꼽(흰 밑동). y 위
float sdChestnut(vec3 q, float r){
  float k = smoothstep(-0.2*r, 1.0*r, q.y);
  vec3 qq = q/vec3(1.0 - 0.30*k, 0.92, 0.72 - 0.10*k);
  float d = (length(qq) - r)*0.70;
  d = smin(d, sdCap(q, vec3(0.0, 0.55*r, 0.0), vec3(0.0, 1.08*r, 0.0), 0.05*r), 0.10*r);   // 뾰족한 꼭지
  d = -smin(-d, q.y + 0.78*r, 0.10*r);                         // 밑이 판판
  return d;
}
// 도토리: 갸름한 열매 + 깍정이(겹겹이 포갠 작은 비늘이 열매 윗부분을 감싼 잔) + 짧은 꼭지. part 0 열매, 1 깍정이
float sdAcorn(vec3 q, float r, out float part){
  float k = smoothstep(0.2*r, -1.3*r, q.y);
  float nut = sdEll(q, vec3(r*(1.0 - 0.25*k), 1.30*r, r*(1.0 - 0.25*k)));
  nut = smin(nut, sdCap(q, vec3(0.0, -1.1*r, 0.0), vec3(0.0, -1.40*r, 0.0), 0.05*r), 0.08*r);   // 뾰족한 끝
  vec3 c = q - vec3(0.0, 0.45*r, 0.0);
  float cup = sdEll(c, vec3(1.10*r, 0.95*r, 1.10*r));
  cup = max(cup, -(q.y - 0.22*r));                              // 테두리 아래로는 열매가 드러난다
  if(cup < 0.08*r){
    // 비늘: 줄마다 반 칸 어긋나게, 아래 끝이 들린 기와처럼 포갠다
    float a = atan(c.z, c.x)/TAU, v = (q.y - 0.22*r)/r*11.0;
    float row = floor(v);
    float ax = a*30.0 + 0.5*mod(row, 2.0) + 0.25*(h11(row*3.7) - 0.5);
    vec2 f = vec2(fract(ax), fract(v));
    float hs = h21(vec2(floor(ax), row));
    float sh = (1.0 - f.y)*(1.0 - (f.x - 0.5)*(f.x - 0.5)*4.0)*(0.7 + 0.6*hs);
    cup -= 0.05*r*sh;
  }
  float stem = sdCap(q, vec3(0.0, 1.25*r, 0.0), vec3(0.05*r, 1.55*r, 0.02*r), 0.065*r);
  cup = min(cup, stem);
  part = cup < nut ? 1.0 : 0.0;
  return min(nut, cup)*0.85;
}
// 밤송이: 네 갈래로 갈라져 살짝 벌어진 둥근 가시 껍질. open = 벌어진 각(라디안). part 0 껍질, 1 가시
// 갈래 틈은 위로 갈수록 넓다. 가시는 어긋난 두 겹의 칸에 하나씩, 방향·길이를 흩뜨려 촘촘하고 부드럽게
float burrSpine(vec3 lq, vec3 n, float R, float dth, float off, out float tipH){
  float th = acos(clamp(n.y, -1.0, 1.0)) + off;
  float bi = floor(th/dth + 0.5);
  float tb = bi*dth - off;
  float cnt = max(1.0, floor(sin(max(tb, 0.05))*TAU/dth + 0.5));
  float pp = atan(n.z, n.x) + 0.37*bi + off*3.0;
  float jj = floor(pp/(TAU/cnt) + 0.5);
  vec3 hj = h33(vec3(bi, jj, off*10.0));
  float pj = jj*(TAU/cnt) - 0.37*bi - off*3.0 + (hj.x - 0.5)*0.5*(TAU/cnt);
  tb += (hj.y - 0.5)*0.5*dth;
  vec3 ax = vec3(sin(tb)*cos(pj), cos(tb), sin(tb)*sin(pj));
  ax = normalize(ax + (hj - 0.5)*0.35);                          // 가시마다 조금씩 다른 쪽을 본다
  float len = R*(0.20 + 0.22*hj.z);
  float t = clamp(dot(lq, ax), R*0.92, R*0.92 + len);
  float h = (t - R*0.92)/len; tipH = h;
  return length(lq - ax*t) - mix(0.032*R, 0.008*R, h);
}
float sdBurr(vec3 q, float R, float open, out float part){
  float qs = 1.5707963;
  float ph = atan(q.z, q.x);
  float pc = (floor(ph/qs) + 0.5)*qs;
  vec3 u = vec3(cos(pc), 0.0, sin(pc)), tg = vec3(-sin(pc), 0.0, cos(pc));
  vec3 hinge = u*0.70*R - vec3(0.0, 0.55*R, 0.0);
  vec3 lq = rotA(tg, open)*(q - hinge) + hinge;
  float l = length(lq);
  vec3 n = lq/max(l, 1e-4);
  float a2 = atan(lq.z, lq.x) - pc; a2 = mod(a2 + 3.14159, 6.28318) - 3.14159;
  float gap = 0.03 + 0.26*smoothstep(0.0, 0.95*R, lq.y);           // 위로 갈수록 넓게 갈라진 틈
  float wedge = (abs(a2) - (qs*0.5 - gap))*length(lq.xz);
  float shell = max(max(l - R, 0.82*R - l), wedge);
  float t1, t2;
  float sp = min(burrSpine(lq, n, R, 0.13, 0.0, t1), burrSpine(lq, n, R, 0.13, 0.065, t2));
  sp = max(sp, wedge + 0.01*R);
  part = sp < shell ? 1.0 : 0.0;
  return min(shell, sp)*0.6;
}
// ── 벽돌 무늬 (SDF 계단·턱용 바탕색): 반환 (색, 줄눈) ──
vec4 brickAlb(vec2 uv, vec2 S, float seed, vec3 c1, vec3 c2, vec3 mc){
  float row = floor(uv.y/S.y);
  vec2 q = uv; q.x += mod(row, 2.0)*S.x*0.5;
  vec2 cid = vec2(floor(q.x/S.x), row);
  vec2 f = fract(q/S)*S;
  float h = h21(cid + seed), h2 = h21(cid*1.7 + 9.1 + seed);
  vec2 e2 = min(f, S - f); float e = min(e2.x, e2.y);
  float mortar = 1.0 - smoothstep(0.006, 0.010, e);
  vec2 wq = uv*vec2(9.0, 14.0);
  float grain = vnoise(wq*3.0)*0.6 + vnoise(wq*9.0)*0.4;
  vec3 bc = mix(c1, c2, h)*(0.78 + 0.34*h2)*(0.86 + 0.28*grain);
  if(fract(h*7.3) < 0.08) bc *= 0.6;
  bc *= 1.0 - 0.3*smoothstep(0.5, 0.85, fbm(uv*1.3 + seed));
  return vec4(mix(bc, mc*(0.8 + 0.3*vnoise(uv*60.0)), mortar), mortar);
}
