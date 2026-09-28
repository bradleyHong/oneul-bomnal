/* 산수 — 겹겹의 산등성이 사이로 안개가 흐른다.
 *
 * 수묵 산수를 3D 로 세운다. 가까운 산은 짙고 또렷하고, 먼 산일수록
 * 옅어지며 하늘에 녹는다(공기 원근). 산등성이 사이 골짜기에는 안개가
 * 고여 흐른다. 먹 한 가지로 깊이를 다섯 겹 내는 옛 그림의 방식을
 * 빛 계산으로 한다.
 *
 * 산은 가만히 있고 안개와 빛만 움직인다. 안개는 잡음 밭 위를 원으로
 * 돌아 제자리로 온다. */
(function (g) {
  g.DepthScenes = g.DepthScenes || {};
  g.DepthScenes.mountains = {
    en: "mountains", ko: "산수",
    desc: "겹겹의 산등성이 사이로 안개가 흐른다. 먼 산일수록 하늘에 녹는다",
    pals: [
      { name: "먹",     c: ["#0b0c0e", "#f1ede4", "#9aa7b8"] },
      { name: "새벽",   c: ["#0c0b12", "#ffe3cc", "#8a9cff"] },
      { name: "청록",   c: ["#050b0b", "#e6fff6", "#5fbfa8"] },
      { name: "노을",   c: ["#120806", "#ffd0a8", "#ff7a4a"] }
    ],
    glsl: [
      "// 산 높이. 봉우리는 뾰족하게(능선 잡음), 골은 넓게.",
      "float ridge(vec2 p){ float h=0., a=.55, f=1.;",
      "  for(int i=0;i<5;i++){ float n=1.-abs(noise3(vec3(p*f,S0.x*10.))*2.-1.); h+=a*n*n; p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; }",
      "  return h; }",
      "float height(vec2 p){ return ridge(p*.33)*2.6-1.2; }",
      "vec2 scene(vec3 p){ return vec2((p.y-height(p.xz))*.45,1.); }",
      "vec3 render(vec2 uv){",
      "  vec3 ro=vec3(.3*sin(PH),1.55,4.);",
      "  vec3 rd=cameraRay(uv, ro, vec3(0.,1.05,-6.), 1.6);",
      "  vec3 L=normalize(vec3(-.6,.45,-.65));",
      "  // 하늘은 어둡게. 밝으면 알프스 사진이 되고, 어두워야 수묵이 된다.",
      "  vec3 sky=mix(C1*.12+C0*1.4,C0*.9,pow(max(rd.y+.05,0.),.5));",
      "  sky+=C1*.22*pow(max(dot(rd,L),0.),10.);",
      "  vec2 h=march(ro,rd,48.);",
      "  vec3 col=sky;",
      "  if(h.y>.5){",
      "    vec3 p=ro+rd*h.x;",
      "    vec2 e=vec2(.03,0.);",
      "    vec3 n=normalize(vec3(height(p.xz-e.xy)-height(p.xz+e.xy),2.*e.x,height(p.xz-e.yx)-height(p.xz+e.yx)));",
      "    // 그림자는 안 잰다. 산이 크고 해가 낮아 면의 기울기만으로 명암이 선다 —",
      "    // 재면 값이 세 배 들고 눈에는 거의 안 보인다.",
      "    float dif=max(dot(n,L),0.);",
      "    // 먹색 바위. 해 받는 능선만 은은하게 떠오른다.",
      "    vec3 rock=C0*1.1+vec3(.012)*noise3(vec3(p.xz*3.,0.));",
      "    col=rock*(.25+.5*n.y)+C1*pow(dif,1.5)*.28;",
      "    // 공기 원근. 멀수록 하늘빛에 녹는다 — 이것이 산수의 겹이다.",
      "    col=mix(col,sky*1.05,1.-exp(-.07*h.x));",
      "  }",
      "  // 골짜기 안개. 낮은 자리에 고여 옆으로 흐른다(원으로 돌아 제자리).",
      "  float fogAcc=0.;",
      "  float tE=min(h.x,48.);",
      "  for(int i=0;i<18;i++){",
      "    float t=tE*(float(i)+.5)/18.; vec3 q=ro+rd*t;",
      "    float dens=smoothstep(.55,-.2,q.y)*fbm3(vec3(q.xz*.35,0.)+loopOff(.6)+vec3(q.y*.3));",
      "    fogAcc+=dens*tE/18.*.09;",
      "  }",
      "  col=mix(col, C1*.28+C0*1.6, 1.-exp(-fogAcc*1.4));",
      "  return col;",
      "}"
    ].join("\n")
  };
})(window);
