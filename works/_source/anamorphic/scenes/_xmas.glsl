// ── 크리스마스 공용 모양·재질 (scenes/x??.glsl 이 // @lib _xmas 로 불러 쓴다) ──
// 모든 모양은 지역 좌표 q 에서 잰 거리. 크기 s 는 대략 반지름·반높이.

#define WALLSTYLE 1
#define PBR2
const vec3 XRED = vec3(0.56, 0.010, 0.030), XGREEN = vec3(0.0, 0.33, 0.12), XGOLD = vec3(1.0, 0.70, 0.30);
const vec3 XSILVER = vec3(0.92, 0.93, 0.96), XSNOW = vec3(0.70, 0.72, 0.78), XICE = vec3(0.55, 0.85, 1.0);

float sdCone(vec3 q, float h, float r){        // 꼭짓점이 위(y=h), 바닥 y=0 반지름 r
  vec2 c = normalize(vec2(h, r));
  vec2 w = vec2(length(q.xz), q.y);
  vec2 a = w - vec2(r, 0.0)*clamp(dot(w, vec2(r, -h))/dot(vec2(r, -h), vec2(r, -h)), 0.0, 1.0) - vec2(0.0, 0.0);
  // 옆면까지 거리 (선분 (r,0)-(0,h))
  vec2 e = vec2(-r, h);
  vec2 pa = w - vec2(r, 0.0);
  float k = clamp(dot(pa, e)/dot(e, e), 0.0, 1.0);
  float ds = length(pa - e*k);
  float db = length(vec2(max(w.x - r, 0.0), w.y));          // 바닥 원판
  float d = min(ds, w.y < 0.0 ? db : 1e9);
  float inside = (w.y > 0.0 && w.y < h && w.x < r*(1.0 - w.y/h)) ? -1.0 : 1.0;
  return inside*min(ds, length(vec2(max(w.x - r, 0.0), w.y)) + (w.y > 0.0 ? 1e9 : 0.0));
}
float sdCyl(vec3 q, float r, float h){ vec2 d = abs(vec2(length(q.xz), q.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }
float sdStar5(vec2 p, float r, float rf){
  const vec2 k1 = vec2(0.809016994375, -0.587785252292), k2 = vec2(-k1.x, k1.y);
  p.x = abs(p.x);
  p -= 2.0*max(dot(k1, p), 0.0)*k1;
  p -= 2.0*max(dot(k2, p), 0.0)*k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf*vec2(-k1.y, k1.x) - vec2(0, 1);
  float h = clamp(dot(p, ba)/dot(ba, ba), 0.0, r);
  return length(p - ba*h)*sign(p.y*ba.x - p.x*ba.y);
}

// 오너먼트: 구슬 + 금속 꼭지 + 고리. part: 0 구슬, 1 꼭지
float sdOrnament(vec3 q, float r, out float part){
  float ball = length(q) - r;
  float cap = sdCyl(q - vec3(0, r*0.98, 0), r*0.22, r*0.12) - 0.004;
  float loop = sdTorus((q - vec3(0, r*1.22, 0)).yxz, vec2(r*0.09, r*0.025));
  float d = min(ball, min(cap, loop));
  part = ball <= min(cap, loop) ? 0.0 : 1.0;
  return d;
}
// 지팡이 사탕: 세운 막대 + 위에서 +x 쪽으로 꺾인 고리
float sdCane(vec3 q, float h, float r){
  float R = h*0.22;
  float stick = sdCap(q, vec3(0, 0, 0), vec3(0, h, 0), r);
  vec3 c = q - vec3(R, h, 0);
  float arc = max(length(vec2(length(c.xy) - R, c.z)) - r, -c.y);
  float tip = sdCap(q, vec3(2.0*R, h, 0), vec3(2.0*R, h - R*0.7, 0), r);
  return min(stick, min(arc, tip));
}
float caneStripe(vec3 q, float h){
  float R = h*0.22;
  float s;
  if(q.y > h){ vec3 c = q - vec3(R, h, 0); s = atan(c.y, -c.x)*R + h; }
  else s = q.y;
  float a = atan(q.z, q.x - (q.y > h ? R : 0.0));
  return step(0.5, fract(s*3.2/h*2.0 + a/TAU*2.0));
}
// 선물 상자: 몸 + 리본 띠 두 줄 + 위 나비 리본. part: 0 몸, 1 리본
float sdGift(vec3 q, vec3 b, out float part){
  float box = sdRBox(q, b, 0.02);
  float w = min(b.x, b.z)*0.16;
  float rib = min(sdBox(q, vec3(w, b.y + 0.006, b.z + 0.006)), sdBox(q, vec3(b.x + 0.006, b.y + 0.006, w)));
  vec3 t = q - vec3(0, b.y + 0.02, 0);
  float bow = min(sdTorus(vec3(t.x - b.x*0.22, t.y - b.x*0.10, t.z).yxz*vec3(1.0, 1.0, 1.6), vec2(b.x*0.20, w*0.45))/1.6,
                  sdTorus(vec3(t.x + b.x*0.22, t.y - b.x*0.10, t.z).yxz*vec3(1.0, 1.0, 1.6), vec2(b.x*0.20, w*0.45))/1.6);
  bow = min(bow, length(t) - w*0.9);
  float r = min(rib, bow);
  part = r < box + 0.003 ? 1.0 : 0.0;
  return min(box, r);
}
// 트리: 층층 원뿔 셋 + 줄기
float sdTree(vec3 q, float h){
  float r = h*0.42;
  float d = sdCap(q, vec3(0, -h*0.12, 0), vec3(0, h*0.1, 0), h*0.06);
  for(int i=0;i<3;i++){
    float fi = float(i);
    float y0 = h*(0.08 + fi*0.26), hh = h*(0.50 - fi*0.08), rr = r*(1.0 - fi*0.24);
    vec2 w = vec2(length(q.xz), q.y - y0);
    // 원뿔 측면 거리 (둥근 끝)
    vec2 e = vec2(-rr, hh), pa = w - vec2(rr, 0.0);
    float k = clamp(dot(pa, e)/dot(e, e), 0.0, 1.0);
    float side = length(pa - e*k);
    float inside = (w.y > 0.0 && w.y < hh && w.x < rr*(1.0 - w.y/hh)) ? -1.0 : 1.0;
    float base = (w.y < 0.0) ? length(vec2(max(w.x - rr, 0.0), w.y)) : 1e9;
    float c = inside < 0.0 ? -min(side, w.y) : min(side, base);
    d = smin(d, c - h*0.01, h*0.03);
  }
  return d;
}
// 별: 다섯 뿔 별을 앞뒤로 뾰족하게 (각진 보석)
float sdStar3(vec3 q, float r, float th){
  float d2 = sdStar5(q.xy, r, 0.48);
  return max((d2 + abs(q.z)*r/th*0.35)*0.75, abs(q.z) - th);
}
// 눈송이: 여섯 갈래 + 잔가지, 얇은 판
float sdFlake(vec3 q, float r, float th){
  float a = atan(q.y, q.x), ln = length(q.xy);
  float sec = TAU/6.0;
  a = mod(a + sec*0.5, sec) - sec*0.5;
  vec2 p = ln*vec2(cos(a), abs(sin(a)));
  float w = r*0.055;
  float arm = length(p - vec2(clamp(p.x, 0.0, r), 0.0)) - w;
  vec2 b1 = vec2(r*0.45, 0.0), d1 = vec2(0.5, 0.866)*r*0.30;
  vec2 b2 = vec2(r*0.70, 0.0), d2 = vec2(0.5, 0.866)*r*0.20;
  float br1 = length(p - b1 - d1*clamp(dot(p - b1, d1)/dot(d1, d1), 0.0, 1.0)) - w*0.85;
  float br2 = length(p - b2 - d2*clamp(dot(p - b2, d2)/dot(d2, d2), 0.0, 1.0)) - w*0.75;
  float hexc = length(p) - r*0.16;
  float d = min(min(arm, hexc), min(br1, br2));
  return length(vec2(max(d, 0.0), max(abs(q.z) - th, 0.0))) + min(max(d, abs(q.z) - th), 0.0) - th*0.4;
}
// 종: 돌려 만든 몸 + 아래 테 + 추. part: 0 몸, 1 추
float sdBell(vec3 q, float s, out float part){
  float y = q.y/s;
  float prof = (0.28 + 0.62*smoothstep(0.9, -0.55, y) + 0.12*smoothstep(-0.5, -0.8, y))*s;
  float body = max(length(q.xz) - prof, max(q.y - 0.95*s, -q.y - 0.8*s))*0.8;
  body = smin(body, length(q - vec3(0, 0.95*s, 0)) - 0.26*s, 0.08*s);
  float hollow = max(length(q.xz) - (prof - 0.06*s), -q.y - 0.85*s);
  body = max(body, -max(hollow, q.y - 0.55*s));
  float lip = sdTorus(q - vec3(0, -0.8*s, 0), vec2(0.98*s, 0.06*s));
  body = min(body, lip);
  float clap = length(q - vec3(0, -0.88*s, 0)) - 0.16*s;
  part = clap < body ? 1.0 : 0.0;
  return min(body, clap);
}
// 생강빵 사람: 납작하게 부푼 모양 (얼굴 앞 = -z)
float sdGinger(vec3 q, float s){
  vec2 p = q.xy/s;
  float head = length(p - vec2(0, 0.62)) - 0.30;
  float body = sdCap(vec3(p, 0), vec3(0, 0.25, 0), vec3(0, -0.30, 0), 0.30);
  float arms = sdCap(vec3(abs(p.x), p.y, 0), vec3(0.0, 0.18, 0), vec3(0.62, 0.05, 0), 0.14);
  float legs = sdCap(vec3(abs(p.x), p.y, 0), vec3(0.12, -0.35, 0), vec3(0.32, -0.88, 0), 0.15);
  float d2 = smin(smin(head, body, 0.08), smin(arms, legs, 0.08), 0.08)*s;
  float th = 0.09*s;
  return length(vec2(max(d2 + th*0.6, 0.0), max(abs(q.z) - th, 0.0))) + min(max(d2 + th*0.6, abs(q.z) - th), 0.0) - th*0.6;
}
// 리스: 울퉁불퉁 솔잎 고리
float sdWreath(vec3 q, float R, float r){
  float a = atan(q.y, q.x);
  float bump = 0.18*r*sin(a*28.0)*sin(q.z/r*5.0 + a*9.0);
  return (length(vec2(length(q.xy) - R, q.z)) - r - bump)*0.8;
}
// 전구(C9): 둥근 유리 + 꼭지 금속. part: 0 유리, 1 꼭지
float sdBulb(vec3 q, float s, out float part){
  float glass = smin(length(q - vec3(0, -0.35*s, 0)) - 0.45*s, sdCap(q, vec3(0, -0.3*s, 0), vec3(0, 0.45*s, 0), 0.22*s), 0.3*s);
  float base = sdCyl(q - vec3(0, 0.62*s, 0), 0.24*s, 0.18*s) - 0.01*s;
  part = base < glass ? 1.0 : 0.0;
  return min(glass, base);
}
// 눈사람: 공 셋 + 당근 코 + 모자. part: 0 눈, 1 코, 2 모자
float sdSnowman(vec3 q, float s, out float part){
  float b = length(q - vec3(0, 0.0, 0)) - 0.42*s;
  b = smin(b, length(q - vec3(0, 0.55*s, 0)) - 0.31*s, 0.06*s);
  b = smin(b, length(q - vec3(0, 0.98*s, 0)) - 0.22*s, 0.05*s);
  vec3 nq = q - vec3(0, 0.98*s, -0.2*s);
  float nose = sdCap(nq, vec3(0), vec3(0, -0.02*s, -0.22*s), 0.045*s) ;
  float hat = min(sdCyl(q - vec3(0, 1.30*s, 0), 0.15*s, 0.13*s), sdCyl(q - vec3(0, 1.17*s, 0), 0.26*s, 0.02*s)) - 0.005*s;
  float d = min(b, min(nose, hat));
  part = d == b ? 0.0 : (d == nose ? 1.0 : 2.0);
  return d;
}

// 표면에 박힌 작은 전구 (트리·리스 위에 반짝임)
vec3 twinkle(vec3 q, float cell, float seed){
  vec3 g = floor(q/cell), f = fract(q/cell) - 0.5;
  vec3 h = h33(g + seed);
  float on = step(0.72, h.x);
  float d = length(f - (h - 0.5)*0.5);
  vec3 c = h.y < 0.33 ? vec3(1.0, 0.25, 0.2) : (h.y < 0.66 ? vec3(1.0, 0.8, 0.35) : vec3(0.5, 0.85, 1.0));
  float bl = 0.55 + 0.45*sin(TAU*(uT/T*floor(2.0 + h.z*4.0) + h.z*7.0));
  return c*on*smoothstep(0.22, 0.05, d)*bl*5.0;
}

// ── 움직임 도우미 ──
mat3 rotA(vec3 ax, float a){              // 축 ax 둘레로 a 만큼 (로드리게스)
  ax = normalize(ax); float c = cos(a), s = sin(a), k = 1.0 - c;
  return mat3(c + ax.x*ax.x*k, ax.y*ax.x*k + ax.z*s, ax.z*ax.x*k - ax.y*s,
              ax.x*ax.y*k - ax.z*s, c + ax.y*ax.y*k, ax.z*ax.y*k + ax.x*s,
              ax.x*ax.z*k + ax.y*s, ax.y*ax.z*k - ax.x*s, c + ax.z*ax.z*k);
}
// 바닥 높이 h0 에서 떨어뜨린 물체의 s초 뒤 (높이, 속도). 중력 g, 반발 e
vec2 bounceY(float h0, float s, float g, float e){
  float t1 = sqrt(2.0*max(h0, 0.0)/g);
  if(s < t1) return vec2(h0 - 0.5*g*s*s, -g*s);
  s -= t1; float v = g*t1*e;
  for(int k=0;k<10;k++){ float d = 2.0*v/g; if(s < d) return vec2(v*s - 0.5*g*s*s, v - g*s); s -= d; v *= e; }
  return vec2(0.0);
}
// 용수철: 축 = 지역 +z, 길이 lc, 감은 수 n, 반지름 r, 굵기 w
float sdCoil(vec3 q, float lc, float n, float r, float w){
  float pitch = lc/n;
  float a = atan(q.y, q.x)/TAU;
  float zz = q.z - a*pitch;
  float zm = zz - pitch*floor(zz/pitch + 0.5);
  float d = length(vec2(length(q.xy) - r, zm)) - w;
  return max(d*0.8, max(-q.z, q.z - lc));
}
