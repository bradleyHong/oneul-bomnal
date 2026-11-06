// ── 봄 벽돌 상자 공용 도우미 (scenes/s0?.glsl 이 // @lib _spring 로 불러 쓴다) ──
#define WALLSTYLE 2
#define PBR2

mat3 rotA(vec3 ax, float a){              // 축 ax 둘레로 a 만큼 (로드리게스)
  ax = normalize(ax); float c = cos(a), s = sin(a), k = 1.0 - c;
  return mat3(c + ax.x*ax.x*k, ax.y*ax.x*k + ax.z*s, ax.z*ax.x*k - ax.y*s,
              ax.x*ax.y*k - ax.z*s, c + ax.y*ax.y*k, ax.z*ax.y*k + ax.x*s,
              ax.x*ax.z*k + ax.y*s, ax.y*ax.z*k - ax.x*s, c + ax.z*ax.z*k);
}
// 타원체 (넘지 않는 근사)
float sdEll(vec3 p, vec3 r){ float k0 = length(p/r), k1 = length(p/(r*r)); return k0*(k0 - 1.0)/max(k1, 1e-5); }
// 2차 베지어 곡선까지 거리 근사: 몇 점으로 쪼갠 선분 (굵기 r0→r1)
float sdBez(vec3 p, vec3 a, vec3 b, vec3 c, float r0, float r1, out float tt){
  float d = 1e9; tt = 0.0;
  vec3 pr = a;
  for(int i=1;i<=6;i++){
    float t = float(i)/6.0;
    vec3 q = mix(mix(a, b, t), mix(b, c, t), t);
    vec3 pa = p - pr, ba = q - pr; float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0);
    float tc = (float(i) - 1.0 + h)/6.0;
    float e = length(pa - ba*h) - mix(r0, r1, tc);
    if(e < d){ d = e; tt = tc; }
    pr = q;
  }
  return d;
}
// 벽돌 한 장 재질 (벽과 같은 두 색 사이, 결 · 그을림)
vec3 brickAlb(vec3 q, float seed, vec3 c1, vec3 c2){
  float h = h11(seed*7.1 + 2.0), h2 = h11(seed*3.7 + 5.0);
  float grain = vnoise(q.xz*40.0 + q.y*30.0)*0.6 + vnoise(q.xy*90.0)*0.4;
  return mix(c1, c2, h)*(0.78 + 0.34*h2)*(0.86 + 0.28*grain);
}
// 두 구를 잇는 둥근 원뿔 (굵기가 줄어드는 가지)
float sdRCone(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a; float l2 = dot(ba, ba); float rr = r1 - r2; float a2 = l2 - rr*rr; float il2 = 1.0/l2;
  vec3 pa = p - a; float y = dot(pa, ba); float z = y - l2;
  vec3 xv = pa*l2 - ba*y; float x2 = dot(xv, xv); float y2 = y*y*l2; float z2 = z*z*l2;
  float k = sign(rr)*rr*rr*x2;
  if(sign(z)*a2*z2 > k) return sqrt(x2 + z2)*il2 - r2;
  if(sign(y)*a2*y2 < k) return sqrt(x2 + y2)*il2 - r1;
  return (sqrt(x2*a2*il2) + y*rr)*il2 - r1;
}
