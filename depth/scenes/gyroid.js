/* 결구 — 둥근 공 안에 끝없이 이어지는 격자.
 *
 * 자이로이드는 안과 밖이 한 번도 끊기지 않고 이어지는 면이다. 공으로
 * 잘라 두면 속이 비치는 조각이 되고, 면에 얇은 막이 덮인 듯 보는 각도에
 * 따라 빛깔이 바뀐다(박막 간섭 — 비눗방울·전복 껍데기 빛깔).
 *
 * 격자 속을 한 바퀴에 정확히 한 주기만큼 흘러간다. 공 모양은 그대로인데
 * 속이 흐르므로 끝 장이 첫 장으로 붙는다. */
(function (g) {
  g.DepthScenes = g.DepthScenes || {};
  g.DepthScenes.gyroid = {
    en: "gyroid", ko: "결구",
    desc: "공 안에 끝없이 이어지는 격자. 보는 각도에 따라 빛깔이 바뀐다",
    pals: [
      { name: "전복",   c: ["#030407", "#f1f4ff", "#58e0ff"] },
      { name: "금속",   c: ["#050403", "#fff0d8", "#ffb347"] },
      { name: "쪽빛",   c: ["#030313", "#e8e6ff", "#8a6bff"] },
      { name: "먹",     c: ["#040404", "#f4f1ea", "#9aa3b5"] }
    ],
    glsl: [
      "float gyr(vec3 p){ return dot(sin(p),cos(p.yzx)); }",
      "vec2 scene(vec3 p){",
      "  vec3 q=p; q.xz*=rot(.35*sin(PH)); q.yz*=rot(.2*sin(PH*2.+.5));",
      "  float sc=3.2+1.4*S0.x;",
      "  // 격자 속을 한 주기(2π/sc 가 아니라 sc 좌표로 2π)만큼 흘러간다 — 한 바퀴에 제자리.",
      "  vec3 g=q*sc+vec3(0.,PH,0.);",
      "  float gy=abs(gyr(g))/sc-.05;",
      "  float sph=sdSphere(q,1.35);",
      "  float d=smax(gy*.7, sph, .06);",
            "  float fl=p.y+1.6;",
      "  return opU(vec2(d,1.), vec2(fl,2.));",
      "}",
      "// 박막 간섭 빛깔. 보는 각도(cos)에 따라 무지개가 돈다.",
      "vec3 film(float c){ vec3 k=vec3(.0,.33,.67)+S0.y; return .5+.5*cos(TAU*(c*1.6+k)); }",
      "vec3 render(vec2 uv){",
      "  vec3 ro=vec3(0,.3,4.4);",
      "  vec3 rd=cameraRay(uv, ro, vec3(0,0,0), 2.);",
      "  vec3 L=normalize(vec3(.6,.8,.5));",
      "  vec3 bg=C0*(1.+.8*uv.y)+C2*.05*exp(-2.*length(uv));",
      "  vec2 h=march(ro,rd,14.);",
      "  vec3 col=bg;",
      "  if(h.y>.5){",
      "    vec3 p=ro+rd*h.x, n=calcNormal(p);",
      "    float ao=calcAO(p,n);",
      "    if(h.y<1.5){",
      "      float c=max(dot(-rd,n),0.);",
      "      float sh=softShadow(p+n*.004,L,.02,5.,10.);",
      "      vec3 hv=normalize(L-rd);",
      "      vec3 tint=mix(C1, film(c)*mix(C2,vec3(1.),.35)*1.3, .72);",
      "      float fr=fresnel(c,.08);",
      "      vec3 refl=studio(reflect(rd,n));",
      "      float dif=max(dot(n,L),0.)*sh;",
      "      col=tint*(dif*.9+.12)*ao + refl*tint*fr*.9 + C1*ggx(n,hv,.2)*dif*.6;",
      "      // 속 깊은 곳은 어둡게. 격자가 겹으로 쌓여 깊이가 생긴다.",
      "      col*=smoothstep(1.45,.3,length(p))*.7+.3;",
      "    } else {",
      "      float sh=softShadow(p+n*.01,L,.02,6.,8.);",
      "      col=C0*1.3*(.35+.65*sh)*ao;",
      "      col=mix(col,bg,smoothstep(3.,9.,h.x));",
      "    }",
      "  }",
      "  return col;",
      "}"
    ].join("\n")
  };
})(window);
