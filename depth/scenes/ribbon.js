/* 띠 — 비단결 금속 띠가 고리를 그리며 몸을 비튼다.
 *
 * 모션그래픽에서 제일 많이 쓰는 모양이 이것이다. 띠가 비틀리면 면이
 * 빛을 받았다 잃었다 하며 반짝임이 띠를 따라 흘러간다. 거울 크롬이
 * 아니라 결이 있는 금속(새틴)이라 빛 점이 길게 늘어진다.
 *
 * 고리를 따라 비틀림이 흘러간다. 띠는 반 바퀴만 돌아도 제 모양이라
 * 한 바퀴 동안 π 만큼 돌면 끝 장이 첫 장이다. */
(function (g) {
  g.DepthScenes = g.DepthScenes || {};
  g.DepthScenes.ribbon = {
    en: "ribbon", ko: "띠",
    desc: "금속 띠가 고리를 그리며 몸을 비튼다. 반짝임이 띠를 따라 흐른다",
    pals: [
      { name: "금",     c: ["#050302", "#ffe2a8", "#ff8c3a"] },
      { name: "은",     c: ["#040507", "#eef2ff", "#7aa2ff"] },
      { name: "장미금", c: ["#070304", "#ffd9d2", "#ff6f8e"] },
      { name: "청록",   c: ["#020606", "#dffff6", "#23d3b4"] }
    ],
    glsl: [
      "float band(vec3 p, float R, float w, float th, float tw, float ph){",
      "  float a=atan(p.z,p.x);",
      "  vec2 q=vec2(length(p.xz)-R, p.y);",
      "  // 고리를 따라 비틀림이 흐른다. 띠는 π 대칭이라 ph 로 π 만 돌면 제 모양.",
      "  q*=rot(a*tw+ph);",
      "  // 띠 폭이 고리를 따라 숨 쉬듯 조금 넓어졌다 좁아진다.",
      "  float ww=w*(.85+.15*sin(a*2.+PH));",
      "  vec2 d=abs(q)-vec2(ww,th);",
      "  return length(max(d,0.))+min(max(d.x,d.y),0.)-.006;",
      "}",
      "vec2 scene(vec3 p){",
      "  vec3 q=p; q.yz*=rot(.55+.08*sin(PH)); q.xy*=rot(.2);",
      "  float tw=1.5+floor(S0.x*2.);         // 한 바퀴에 몇 번 비트는가 (반 정수: 뫼비우스)",
      "  float d=band(q, 1.25, .34, .018, tw, PH*.5);",
      "  // 안쪽에 가는 띠 하나 더. 겹이 생겨 깊이가 선다.",
      "  vec3 q2=p; q2.yz*=rot(.55+.08*sin(PH)+.35); q2.xz*=rot(.9);",
      "  d=min(d, band(q2, .82, .14, .012, tw+1., -PH*.5+1.));",
      "  return vec2(d*.62,1.);",
      "}",
      "vec3 render(vec2 uv){",
      "  vec3 ro=vec3(0,.2,4.2);",
      "  vec3 rd=cameraRay(uv, ro, vec3(0,0,0), 1.95);",
      "  vec3 L=normalize(vec3(.4,.9,.6));",
      "  vec3 bg=C0*(1.+.8*uv.y)+C2*.06*exp(-2.4*length(uv-vec2(.1,.1)));",
      "  vec2 h=march(ro,rd,12.);",
      "  vec3 col=bg;",
      "  if(h.y>.5){",
      "    vec3 p=ro+rd*h.x, n=calcNormal(p);",
      "    float c=abs(dot(-rd,n));",
      "    vec3 nn=faceforward(n,rd,n);",
      "    // 새틴 금속. 주변을 흐리게 비추고(거친 반사) 빛 점을 길게 늘인다.",
      "    vec3 r1=reflect(rd,nn);",
      "    vec3 env=(studio(r1)*.6+studio(normalize(r1+vec3(0,.25,0)))*.4);",
      "    float fr=fresnel(c,.55);",
      "    vec3 hv=normalize(L-rd);",
      "    float sp=ggx(nn,hv,.26)*max(dot(nn,L),0.);",
      "    col=env*C1*fr*1.2 + C1*sp*.9 + C2*.05;",
      "    col*=.55+.45*calcAO(p,nn);",
      "    // 가장자리 빛",
      "    col+=C2*.35*pow(1.-c,5.);",
      "  }",
      "  return col;",
      "}"
    ].join("\n")
  };
})(window);
