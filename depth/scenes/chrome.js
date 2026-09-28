/* 액체금속 — 크롬 방울이 모였다 흩어진다.
 *
 * "3D 렌더" 라고 하면 사람들이 제일 먼저 떠올리는 질감이 이것이다.
 * 거울 같은 면에 사진관 조명이 비치고, 방울끼리 서로를 비춘다. 서로를
 * 비추는 것(한 번 튕긴 반사)이 핵심이다 — 주변만 비추면 은박지 공이고,
 * 서로를 비춰야 무게가 있는 액체가 된다.
 *
 * 방울 여섯이 정수 배 주기의 리사주 길을 돈다. 한 바퀴에 제자리. */
(function (g) {
  g.DepthScenes = g.DepthScenes || {};
  g.DepthScenes.chrome = {
    en: "chrome", ko: "액체금속",
    desc: "크롬 방울이 모였다 흩어진다. 서로를 비추는 거울 면",
    pals: [
      { name: "먹과 은", c: ["#040507", "#f4f1ea", "#7fa8ff"] },
      { name: "쪽빛",   c: ["#03040c", "#dfe6ff", "#6a5cff"] },
      { name: "금빛",   c: ["#070503", "#ffe7b8", "#ff9a3c"] },
      { name: "청록",   c: ["#020707", "#e6fff8", "#2fd6c0"] }
    ],
    glsl: [
      "vec3 blobPos(int i){",
      "  float fi=float(i); float a=fi*1.7+S0.x*6.28, b=fi*2.3+S0.y*6.28, c=fi*.9+S0.z*6.28;",
      "  float k1=1.+mod(fi,2.), k2=1.+mod(fi+1.,2.);",
      "  return vec3(sin(PH*k1+a)*1.0, cos(PH*k2+b)*.42, sin(PH*k2+c)*.6);",
      "}",
      "vec2 scene(vec3 p){",
      "  float d=1e9;",
      "  for(int i=0;i<6;i++){ float r=.42+.22*fract(float(i)*.37+S0.w); d=smin(d, sdSphere(p-blobPos(i), r), .55); }",
      "  // 아래 바닥. 어둡고 매끈해 방울이 비친다.",
      "  float fl=p.y+1.25;",
      "  return opU(vec2(d,1.), vec2(fl,2.));",
      "}",
      "vec3 bg(vec3 rd, vec2 uv){",
      "  vec3 c=C0*(1.2+.9*uv.y);",
      "  c+=C2*.06*exp(-3.*length(uv-vec2(.35,.25)));",
      "  return c;",
      "}",
      "// 크롬. 주변과 서로를 비춘다. 한 번 튕긴 광선이 다시 방울에 닿으면 그 자리의 사진관을 본다.",
      "vec3 chromeCol(vec3 p, vec3 n, vec3 rd){",
      "  vec3 rf=reflect(rd,n);",
      "  float fr=fresnel(max(dot(-rd,n),0.), .62);",
      "  vec3 env=studio(rf);",
      "  vec2 h=marchLite(p+n*.01, rf, 8.);",
      "  if(h.y>.5){ vec3 q=p+n*.01+rf*h.x; vec3 n2=calcNormal(q);",
      "    env = h.y<1.5 ? studio(reflect(rf,n2))*.85 : C0*.6+studio(reflect(rf,n2))*.25; }",
      "  vec3 l=normalize(vec3(.5,.9,.3)); vec3 hh=normalize(l-rd);",
      "  float sp=ggx(n,hh,.12)*max(dot(n,l),0.);",
      "  return env*mix(vec3(.8),C1,.3)*fr*1.25 + C1*sp*.5;",
      "}",
      "vec3 render(vec2 uv){",
      "  vec3 ro=vec3(sin(PH)*.35, .35+.08*sin(PH*2.), 4.6);",
      "  vec3 rd=cameraRay(uv, ro, vec3(0,-.1,0), 1.9);",
      "  vec2 h=march(ro,rd,16.);",
      "  vec3 col=bg(rd,uv);",
      "  if(h.y>.5){",
      "    vec3 p=ro+rd*h.x, n=calcNormal(p);",
      "    if(h.y<1.5){",
      "      col=chromeCol(p,n,rd)*(.35+.65*calcAO(p,n));",
      "    } else {",
      "      // 바닥 — 검은 옻칠. 방울이 흐리게 비치고 멀어질수록 어둠에 잠긴다.",
      "      // 바닥에 비친 방울은 한 번만 튕긴다. 반사 속 반사까지 셈하면 값만 들고 눈에는 안 보인다.",
      "      vec3 rf=reflect(rd,n); vec2 h2=marchLite(p+n*.01,rf,8.);",
      "      vec3 refl=vec3(0); if(h2.y>.5&&h2.y<1.5){ vec3 q=p+rf*h2.x; vec3 n2=calcNormal(q);",
      "        refl=studio(reflect(rf,n2))*mix(vec3(.8),C1,.3)*fresnel(max(dot(-rf,n2),0.),.62); }",
      "      float fr=fresnel(max(dot(-rd,n),0.),.04);",
      "      float sh=softShadow(p+n*.01, normalize(vec3(.3,1.,.2)), .02, 6., 10.);",
      "      col=C0*(.35+.65*sh)*calcAO(p,n)+refl*(.18+.6*fr);",
      "      col=mix(col,bg(rd,uv),smoothstep(3.,9.,h.x));",
      "    }",
      "  }",
      "  return col;",
      "}"
    ].join("\n")
  };
})(window);
