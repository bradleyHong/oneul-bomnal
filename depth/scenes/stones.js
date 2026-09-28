/* 돌정원 — 조약돌이 모래 위에 떠서 숨을 쉰다.
 *
 * 매끈한 것만 3D 가 아니다. 무광 돌에 부드러운 그림자가 모래로 번지고,
 * 모래에 갈퀴 자국이 원을 그린다. 반짝임이 없어도 틈과 그림자만으로
 * "실제로 놓인 물건"이 된다 — 그게 AO 와 반그림자의 힘이다.
 *
 * 돌은 제자리에서 오르내린다. 오르면 그림자가 옅고 넓어지고, 내리면
 * 짙고 좁아진다. 그림자가 움직이는 것을 보고 사람은 높이를 안다. */
(function (g) {
  g.DepthScenes = g.DepthScenes || {};
  g.DepthScenes.stones = {
    en: "stones", ko: "돌정원",
    desc: "조약돌이 모래 위에 떠서 숨을 쉰다. 그림자로 높이를 안다",
    pals: [
      { name: "새벽",   c: ["#0b0c10", "#fff1dc", "#8cb4ff"] },
      { name: "먹",     c: ["#070707", "#f5f0e6", "#c9b48a"] },
      { name: "달밤",   c: ["#04060d", "#dfe8ff", "#6f8dff"] },
      { name: "노을",   c: ["#0c0605", "#ffe0c2", "#ff8a4a"] }
    ],
    glsl: [
      "vec3 stoneC(int i){",
      "  float fi=float(i);",
      "  float a=fi*2.399+S0.x*6.28; float r=.35+1.05*sqrt(fract(fi*.618+S0.y));",
      "  return vec3(cos(a)*r*1.35, 0., sin(a)*r*.9);",
      "}",
      "float stone(vec3 p, int i){",
      "  float fi=float(i);",
      "  vec3 c=stoneC(i);",
      "  float s=.32+.26*fract(fi*.73+S0.z);",
      "  // 오르내림. 돌마다 박자가 다르지만 전부 한 바퀴에 한 번.",
      "  c.y=-.35+s*.55+.12*sin(PH+fi*1.9);",
      "  vec3 q=p-c; q.xz*=rot(fi*1.3); q.xy*=rot(.15*sin(fi*2.));",
      "  float d=sdEllipsoid(q, vec3(1.25,.62,.95)*s);",
      "  // 돌결. 아주 옅게 — 울퉁불퉁하면 돌이 아니라 감자다.",
      "  // 멀리서는 안 보이니 돌 가까이에서만 잰다. 전부 재면 값이 열 배 든다.",
      "  if(d<.08) d+=.012*noise3(q*6.+fi*3.)+.006*noise3(q*13.+fi);",
      "  return d;",
      "}",
      "vec2 scene(vec3 p){",
      "  float d=1e9;",
      "  for(int i=0;i<5;i++) d=min(d,stone(p,i));",
      "  // 모래. 돌 둘레로 갈퀴 자국이 원을 그린다.",
      "  float rake=0.;",
      "  for(int i=0;i<5;i++){ float l=length((p-stoneC(i)).xz); rake=max(rake, .5+.5*cos(l*18.)); }",
      "  float sand=p.y+.62-.014*rake-.0015*noise3(p*14.);",
      "  return opU(vec2(d,1.), vec2(sand,2.));",
      "}",
      "vec3 render(vec2 uv){",
      "  vec3 ro=vec3(0.,2.35,4.3); ro.xz*=rot(.12*sin(PH));",
      "  vec3 rd=cameraRay(uv, ro, vec3(0,-.35,0), 2.);",
      "  vec3 L=normalize(vec3(-.7,.85,.45));",
      "  vec3 bg=C0*(1.4+.6*uv.y);",
      "  vec2 h=march(ro,rd,18.);",
      "  vec3 col=bg;",
      "  if(h.y>.5){",
      "    vec3 p=ro+rd*h.x, n=calcNormal(p);",
      "    float sh=softShadow(p+n*.004,L,.02,6.,9.);",
      "    float ao=calcAO(p,n);",
      "    vec3 hv=normalize(L-rd);",
      "    float dif=max(dot(n,L),0.)*sh;",
      "    float sky=.5+.5*n.y;",
      "    if(h.y<1.5){",
      "      // 무광 돌. 은은한 윤 하나만.",
      "      vec3 st=mix(vec3(.10,.10,.11),vec3(.20,.19,.18),fbm3(p*3.));",
      "      col=st*(C1*dif*1.8 + C2*sky*.22*ao) + C1*ggx(n,hv,.45)*dif*.12;",
      "      col+=C2*.08*pow(1.-max(dot(-rd,n),0.),3.)*ao;",
      "    } else {",
      "      vec3 sd=mix(C1,vec3(.85,.8,.72),.5)*.2;",
      "      col=sd*(dif*1.4 + C2*sky*.18) * mix(.55,1.,ao);",
      "    }",
      "    // 멀리는 옅은 안개. 깊이가 한 겹 더 생긴다.",
      "    col=mix(col,bg*1.1,1.-exp(-.028*h.x*h.x));",
      "  }",
      "  return col;",
      "}"
    ].join("\n")
  };
})(window);
