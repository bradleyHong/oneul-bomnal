// ── 겨울 공용 (scenes/s09·s10 이 // @lib _winter 로 불러 쓴다) ──
#define WALLSTYLE 2
#define PBR2
mat3 rotA(vec3 ax, float a){              // 축 ax 둘레로 a 만큼 (로드리게스)
  ax = normalize(ax); float c = cos(a), s = sin(a), k = 1.0 - c;
  return mat3(c + ax.x*ax.x*k, ax.y*ax.x*k + ax.z*s, ax.z*ax.x*k - ax.y*s,
              ax.x*ax.y*k - ax.z*s, c + ax.y*ax.y*k, ax.z*ax.y*k + ax.x*s,
              ax.x*ax.z*k + ax.y*s, ax.y*ax.z*k - ax.x*s, c + ax.z*ax.z*k);
}
// 눈 재질: 속빛 · 빛 스밈 · 반짝이 · 고운 결 (거칠기 0.85 → 흐린 반사 생략, 빠르다)
M snowMat(float bumpK){
  M m = mk(vec3(0.64, 0.67, 0.73), 0.85, 0.0);
  m.wrap = 0.40; m.sss = 0.85; m.glit = 210.0; m.bump = bumpK; m.bumpF = 30.0;
  return m;
}
// 밝은 석회석 (아치·창턱)
M stoneMat(vec3 p, float joint){
  float n = vnoise3(p*18.0)*0.6 + vnoise3(p*55.0)*0.4;
  M m = mk(L(vec3(0.72, 0.68, 0.62))*(0.80 + 0.30*n)*(1.0 - 0.55*joint), 0.70, 0.0);
  m.bump = 0.25; m.bumpF = 45.0;
  return m;
}
