/* 달항아리 — 빛이 항아리를 한 바퀴 돈다.
 *
 * 우리 것이고, 3D 로 그렸을 때 제일 크게 이기는 그림이다. 2D 로는
 * 흰 원이지만, 빛이 돌면 둥근 몸이 드러나고 그림자가 받침 위를 쓸고
 * 지나간다. 항아리는 가만히 있고 빛만 움직인다 — 사진관에서 도자기를
 * 찍는 방식 그대로다.
 *
 * 달항아리는 위아래 두 사발을 붙여 구운 것이라 허리에 이음 자국이 있고
 * 몸이 조금 비뚤다. 그 비뚤음이 없으면 달항아리가 아니라 공이다.
 * 유약에는 철분 반점이 드문드문 있고 면은 반쯤 윤이 난다. */
(function (g) {
  g.DepthScenes = g.DepthScenes || {};
  g.DepthScenes.moonjar = {
    en: "moonjar", ko: "달항아리",
    desc: "빛이 항아리를 한 바퀴 돈다. 둥근 몸과 그림자가 드러난다",
    pals: [
      { name: "먹",     c: ["#050404", "#fff4e2", "#9fb6ff"] },
      { name: "쪽빛",   c: ["#03050c", "#f2f0ff", "#5d7bff"] },
      { name: "노을",   c: ["#080403", "#ffe6c9", "#ff7a3d"] },
      { name: "청자",   c: ["#030706", "#effff6", "#48c2a0"] }
    ],
    glsl: [
      "// 항아리의 몸. 위아래 두 사발을 붙였다 — 허리가 살짝 잘록하고 이음이 돈다.",
      "float jar(vec3 p){",
      "  vec3 q=p; q.y-=.05;",
      "  // 비뚤음. 씨앗마다 다르게, 아주 조금.",
      "  q.x+=.035*sin(q.y*2.1+S0.x*6.28); q.z+=.03*cos(q.y*1.7+S0.y*6.28);",
      "  float up=sdEllipsoid(q-vec3(0,.26,0), vec3(1.04,.94,1.04));",
      "  float dn=sdEllipsoid(q-vec3(0,-.2,0), vec3(1.0,.9,1.0));",
      "  float b=smin(up,dn,.34);",
      "  b+=.005*smoothstep(.08,0.,abs(q.y-.03));           // 허리의 이음 — 만져야 알 만큼만",
      "  // 목과 입",
      "  float neck=sdCyl(q-vec3(0,1.08,0),.1,.38)-.03;",
      "  b=smin(b,neck,.12);",
      "  b=smax(b,-sdCyl(q-vec3(0,1.2,0),.2,.3),.02);        // 입 안을 비운다",
      "  // 굽",
      "  float foot=sdCyl(q-vec3(0,-1.0,0),.05,.5)-.02;",
      "  b=smin(b,foot,.08);",
      "  return b;",
      "}",
      "vec2 scene(vec3 p){",
      "  vec2 r=vec2(jar(p),1.);",
      "  // 받침. 짙은 돌 한 장.",
      "  float pl=sdRBox(p-vec3(0,-1.3,0), vec3(1.3,.2,1.3), .03);",
      "  r=opU(r, vec2(pl,2.));",
      "  r=opU(r, vec2(p.y+1.48,3.));",
      "  return r;",
      "}",
      "vec3 render(vec2 uv){",
      "  vec3 ro=vec3(0.,.2,5.4); ro.xz*=rot(.18*sin(PH));",
      "  vec3 rd=cameraRay(uv, ro, vec3(0,.05,0), 2.25);",
      "  // 빛이 항아리를 한 바퀴 돈다. 한 바퀴에 정확히 한 번 — 끝 장이 첫 장이다.",
      "  vec3 L=normalize(vec3(cos(PH+.6)*1.3,1.05,sin(PH+.6)*1.3));",
      "  vec3 bg=C0*(1.+.7*uv.y) + C2*.05*exp(-2.5*length(uv-vec2(0,.25)));",
      "  vec2 h=march(ro,rd,20.);",
      "  vec3 col=bg;",
      "  if(h.y>.5){",
      "    vec3 p=ro+rd*h.x, n=calcNormal(p);",
      "    float sh=softShadow(p+n*.004,L,.02,8.,14.);",
      "    float ao=calcAO(p,n);",
      "    vec3 hv=normalize(L-rd);",
      "    if(h.y<1.5){",
      "      // 유약. 흰 흙 위에 투명한 유리막 — 빛이 살짝 안으로 스며 그늘이 새까매지지 않는다.",
      "      float w=.35; float dif=clamp((dot(n,L)+w)/(1.+w),0.,1.)*mix(.35,1.,sh);",
      "      vec3 glaze=C1*mix(.9,1.,fbm3(p*3.));",
      "      // 철분 반점. 드물게, 작게.",
      "      float spot=smoothstep(.72,.78,fbm3(p*7.+S1.xyz*9.));",
      "      glaze=mix(glaze, glaze*vec3(.55,.45,.35), spot*.7);",
      "      float fr=fresnel(max(dot(-rd,n),0.),.045);",
      "      vec3 refl=studio(reflect(rd,n));",
      "      float sp=ggx(n,hv,.28)*max(dot(n,L),0.)*sh;",
      "      col=glaze*dif*1.15 + glaze*C2*.10*(.5+.5*n.y)*ao + refl*fr*.55 + C1*sp*.55;",
      "      // 뒤에서 드는 빛. 가장자리만 은은하게 떠서 몸이 어둠에서 떨어진다.",
      "      col+=C2*.25*pow(1.-max(dot(-rd,n),0.),3.)*ao;",
      "      col*=.6+.4*ao;",
      "    } else if(h.y<2.5){",
      "      // 받침 — 무광 흑석. 그림자가 여기 떨어져야 항아리가 놓인다.",
      "      float dif=max(dot(n,L),0.)*sh;",
      "      vec3 st=C0*2.2+vec3(.012)*fbm3(p*6.);",
      "      col=st*(.25+dif*1.4)*ao + C1*ggx(n,hv,.55)*dif*.06;",
      "    } else {",
      "      col=C0*.6*ao*(.4+.6*sh);",
      "    }",
      "    col=mix(col,bg,smoothstep(7.,14.,h.x));",
      "  }",
      "  return col;",
      "}"
    ].join("\n")
  };
})(window);
