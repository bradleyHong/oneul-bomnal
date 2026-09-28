/* 결정 — 유리 기둥 무리가 빛을 쪼갠다.
 *
 * 유리가 유리로 보이려면 세 가지가 동시에 있어야 한다. 겉에 주변이
 * 비치고(반사), 속으로 뒤가 휘어 보이고(굴절), 가장자리에서 빛이 무지개로
 * 갈라진다(분산). 셋 중 하나만 있으면 플라스틱이다.
 *
 * 분산은 빨강·초록·파랑을 조금씩 다른 굴절률로 따로 꺾어서 낸다.
 * 결정 무리는 한 바퀴 동안 조금 흔들렸다 돌아온다. */
(function (g) {
  g.DepthScenes = g.DepthScenes || {};
  g.DepthScenes.crystal = {
    en: "crystal", ko: "결정",
    desc: "유리 기둥 무리가 빛을 쪼갠다. 반사·굴절·분산",
    pals: [
      { name: "먹과 빛", c: ["#030306", "#f3f5ff", "#9a7bff"] },
      { name: "청록",    c: ["#020607", "#e8fffb", "#2ee6c8"] },
      { name: "금빛",    c: ["#060403", "#fff1d6", "#ffae42"] },
      { name: "홍",      c: ["#070203", "#fff0f2", "#ff3d6e"] }
    ],
    glsl: [
      "// 끝이 뾰족한 육각 기둥 하나.",
      "float prism(vec3 p, float r, float h){",
      "  float d=sdHexPrism(p.xzy, vec2(r,h));",
      "  // 끝을 깎는다 — 여섯 면이 한 점으로 모인다.",
      "  float tip=dot(vec2(length(p.xz),p.y-h+r*.9), normalize(vec2(1.,.62)));",
      "  return smax(d,tip,.015);",
      "}",
      "vec2 scene(vec3 p){",
      "  vec3 q=p; q.xz*=rot(.28*sin(PH)); q.xy*=rot(.05*sin(PH*2.+1.));",
      "  float d=prism(q-vec3(0,-.2,0), .36, 1.35);",
      "  for(int i=0;i<6;i++){",
      "    float fi=float(i); float a=fi*1.047+S0.x*.8;",
      "    vec3 c=q; c.xz*=rot(a);",
      "    c.x-=.42; c.xy*=rot(-.55-.35*fract(fi*.61+S0.y));",
      "    float s=.55+.45*fract(fi*.37+S0.z);",
      "    d=min(d, prism(c-vec3(0,-.4,0), .18*s+.08, .7*s+.25));",
      "  }",
      "  float fl=p.y+1.3;",
      "  return opU(vec2(d,1.), vec2(fl,2.));",
      "}",
      "vec3 render(vec2 uv){",
      "  vec3 ro=vec3(0,.45,4.6);",
      "  vec3 rd=cameraRay(uv, ro, vec3(0,.05,0), 2.1);",
      "  vec3 bg=C0*(1.+.8*uv.y)+C2*.07*exp(-2.2*length(uv-vec2(0,.15)));",
      "  vec3 L=normalize(vec3(.5,.9,.4));",
      "  vec2 h=march(ro,rd,16.);",
      "  vec3 col=bg;",
      "  if(h.y>.5){",
      "    vec3 p=ro+rd*h.x, n=calcNormal(p);",
      "    if(h.y<1.5){",
      "      float c=max(dot(-rd,n),0.);",
      "      float fr=fresnel(c,.05);",
      "      vec3 refl=studio(reflect(rd,n));",
      "      // 굴절. 빛깔마다 조금씩 다르게 꺾인다 — 가장자리가 무지개로 갈라진다.",
      "      vec3 tR=refract(rd,n,1./1.49), tG=refract(rd,n,1./1.52), tB=refract(rd,n,1./1.56);",
      "      vec3 thru=vec3(studio(tR).r, studio(tG).g, studio(tB).b);",
      "      // 속을 지나며 조금 물든다. 어둠 앞의 유리는 속이 어둡다 — 밝게 칠하면",
      "      // 유리가 아니라 반투명 플라스틱이 된다. 비치는 조명 줄만 밝게 남긴다.",
      "      thru*=mix(vec3(1.),C2*1.3+.08,.4);",
      "      vec3 hv=normalize(L-rd);",
      "      float sp=ggx(n,hv,.05)*max(dot(n,L),0.);",
      "      col=mix(thru*.75,refl*1.3,clamp(fr*1.6,0.,1.))+C1*sp*1.6;",
      "      // 모서리의 빛. 깎인 면이 만나는 자리에서 반짝인다.",
      "      // 어둠 위의 유리는 가장자리로 읽힌다. 면이 꺾이는 자리마다 빛 한 줄.",
      "      col+=C1*1.1*pow(1.-c,4.)+C2*.18*pow(1.-c,2.);",
      "      col*=.7+.3*calcAO(p,n);",
      "    } else {",
      "      // 바닥에 떨어진 빛 — 결정을 지난 빛이 색을 입고 바닥에 모인다(가짜 코스틱).",
      "      float sh=softShadow(p+n*.01,L,.02,6.,8.);",
      "      float ca=exp(-2.2*length(p.xz-vec2(-.35,.25)))*(.6+.4*sin(PH*2.+p.x*6.)*.5);",
      "      col=C0*1.4*(.4+.6*sh)*calcAO(p,n)+C2*ca*.55+C1*ca*.12;",
            "      col=mix(col,bg,smoothstep(3.,9.,h.x));",
      "    }",
      "  }",
      "  return col;",
      "}"
    ].join("\n")
  };
})(window);
