/* 빛터널 — 고리가 줄지어 선 통로를 한 칸씩 지나간다.
 *
 * 모션그래픽의 고전이다. 고리 안쪽에 빛 띠가 둘러져 있고, 매끈한 검은
 * 벽이 그 빛을 비춘다. 가까운 고리는 크고 빠르게, 먼 고리는 작고
 * 느리게 지나간다 — 원근만으로 속도가 선다.
 *
 * 고리가 한 칸마다 되풀이되므로 한 바퀴에 두 칸을 지나면 끝 장이 첫 장이다. */
(function (g) {
  g.DepthScenes = g.DepthScenes || {};
  g.DepthScenes.tunnel = {
    en: "tunnel", ko: "빛터널",
    desc: "고리가 줄지어 선 통로를 한 칸씩 지나간다. 검은 벽이 빛을 비춘다",
    pals: [
      { name: "쪽빛",   c: ["#02030a", "#eaf0ff", "#5a6bff"] },
      { name: "홍",     c: ["#070203", "#ffe6e8", "#ff2e55"] },
      { name: "금",     c: ["#060402", "#fff0cc", "#ffa321"] },
      { name: "청록",   c: ["#020707", "#e0fff7", "#12e0b8"] }
    ],
    glsl: [
      "const float GAP=1.4;",
      "// 카메라가 서 있는 자리. 휘어짐을 카메라 기준으로 재야 한 바퀴 뒤 같은 모양이 된다 —",
      "// 세상 기준으로 재면 두 칸 걸어간 뒤의 휘어짐이 처음과 달라 이음매에서 튄다.",
      "float zc(){ return -PH/TAU*GAP*2.; }",
      "vec2 bend(float z){ float u=z-zc(); return vec2(.25*sin(u*.35+PH), .18*cos(u*.28+PH)); }",
      "vec2 scene(vec3 p){",
      "  // 통로가 천천히 휜다. 휘는 정도도 한 바퀴에 제자리.",
      "  p.xy+=bend(p.z);",
      "  float r=length(p.xy);",
      "  float z=mod(p.z+GAP*.5,GAP)-GAP*.5;",
      "  // 고리: 네모진 단면의 굵은 테.",
      "  vec2 q=vec2(r-1.55,z);",
      "  float ring=sdBox(vec3(q,0.),vec3(.16,.09,1.))-.02;",
      "  // 벽: 고리 바깥의 매끈한 원통.",
      "  float wall=1.95-r;",
      "  return opU(vec2(ring,1.),vec2(wall,2.));",
      "}",
      "vec3 render(vec2 uv){",
      "  vec3 ro=vec3(0.,0.,zc());",
      "  // 카메라도 휜 통로를 따라간다 — 안 그러면 벽에 부딪힌다.",
      "  ro.xy-=bend(ro.z);",
      "  vec3 ta=vec3(0.,0.,zc()-2.); ta.xy-=bend(ta.z);",
      "  vec3 rd=cameraRay(uv, ro, ta, 1.25);",
      "  vec2 h=march(ro,rd,40.);",
      "  vec3 col=vec3(0.);",
      "  if(h.y>.5){",
      "    vec3 p=ro+rd*h.x, n=calcNormal(p);",
      "    float ao=calcAO(p,n);",
      "    vec3 pp=p; pp.xy+=bend(pp.z);",
      "    float z=mod(pp.z+GAP*.5,GAP)-GAP*.5;",
      "    if(h.y<1.5){",
      "      // 고리 몸은 검은 금속이고, 안쪽 가운데에 가는 빛 띠 한 줄만 켜진다.",
      "      // 면 전체를 밝히면 3D 가 아니라 평면 과녁이 된다.",
      "      float inner=smoothstep(.3,-.3,dot(n,normalize(vec3(pp.xy,0.))));",
      "      float strip=smoothstep(.035,.012,abs(z))*inner;",
      "      // 밝기 물결은 카메라 기준 거리로 준다. 고리 번호로 주면 두 칸 지난 뒤",
      "      // 번호가 어긋나 이음매에서 깜빡인다.",
      "      float u=pp.z-zc();",
      "      float pulse=.5+.5*sin(PH*2.+u*1.1);",
      "      vec3 em=mix(C2,C1,.3)*strip*(1.2+3.*pulse);",
      "      vec3 rf=reflect(rd,n);",
      "      vec3 hv=normalize(normalize(vec3(-pp.xy,0.))-rd);",
      "      col=em + studio(rf)*.22*fresnel(max(dot(-rd,n),0.),.5) + C0*.6*ao + C1*ggx(n,hv,.25)*.06;",
      "    } else {",
      "      // 검은 벽 — 옻칠한 듯 매끈하다. 앞뒤 고리의 빛이 비친다.",
      "      vec3 rf=reflect(rd,n);",
      "      vec2 h2=marchLite(p+n*.01,rf,10.);",
      "      vec3 rc=vec3(0.);",
      "      if(h2.y>.5&&h2.y<1.5){ vec3 q=p+n*.01+rf*h2.x; vec3 qq=q; qq.xy+=bend(qq.z); float zq=mod(qq.z+GAP*.5,GAP)-GAP*.5; rc=mix(C2,C1,.3)*2.2*smoothstep(.05,.015,abs(zq))*exp(-.25*h2.x); }",
      "      float fr=fresnel(max(dot(-rd,n),0.),.04);",
      "      col=C0*.5*ao + rc*(.18+.7*fr);",
      "      // 고리 가까운 벽에 번진 빛. 가는 띠에서 번졌으니 좁게.",
      "      col+=C2*.12*exp(-abs(z)*14.)*ao;",
      "    }",
      "    col*=exp(-.075*h.x);",
      "  }",
      "  return col;",
      "}"
    ].join("\n")
  };
})(window);
