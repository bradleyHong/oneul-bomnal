/* 밤바다 — 달빛이 물결 위에 길을 낸다.
 *
 * 물이 물로 보이려면 두 가지다. 비스듬히 볼수록 하늘이 더 많이 비치고
 * (프레넬), 물마루가 얇아지는 자리에서 빛이 속을 지나 초록빛으로 비친다
 * (투과). 그리고 달빛이 한 줄로 길게 부서져 수평선까지 이어진다.
 *
 * 물결은 방향·길이가 다른 여덟 겹을 더한다. 겹마다 한 바퀴에 정수 번
 * 출렁인다 — 5초 뒤 바다는 처음과 같은 자리에 있다. */
(function (g) {
  g.DepthScenes = g.DepthScenes || {};
  g.DepthScenes.ocean = {
    en: "ocean", ko: "밤바다",
    desc: "달빛이 물결 위에 길을 낸다. 비스듬할수록 하늘이 비친다",
    pals: [
      { name: "달밤",   c: ["#02040a", "#e6eeff", "#2e7fa8"] },
      { name: "새벽",   c: ["#0a0710", "#ffe2cf", "#3d8fa0"] },
      { name: "먹",     c: ["#030303", "#f2efe8", "#4f6b6b"] },
      { name: "노을",   c: ["#0e0504", "#ffc79a", "#1f6f7a"] }
    ],
    glsl: [
      "float waves(vec2 x){",
      "  float h=0., a=.22, f=.55;",
      "  for(int i=0;i<8;i++){",
      "    float fi=float(i); float an=fi*1.33+S0.x*6.28;",
      "    vec2 d=vec2(cos(an),sin(an));",
      "    // 겹마다 한 바퀴에 정수 번 출렁인다. 1, 2, 3 … 번.",
      "    float m=1.+mod(fi,3.);",
      "    float w=dot(d,x)*f+PH*m+fi*1.7;",
      "    // 마루는 뾰족하게, 골은 둥글게 — 사인을 그대로 쓰면 물이 아니라 주름천이다.",
      "    h+=a*(pow(.5+.5*sin(w),2.2)*2.-1.);",
      "    a*=.62; f*=1.62;",
      "  }",
      "  return h;",
      "}",
      "vec2 scene(vec3 p){ return vec2(p.y-waves(p.xz),1.); }",
      "vec3 sky(vec3 rd, vec3 M){",
      "  float y=max(rd.y,0.);",
      "  vec3 c=mix(C2*.12+C0*1.5, C0, pow(y,.45));",
      "  float md=max(dot(rd,M),0.);",
      "  c+=C1*(pow(md,900.)*14.+pow(md,48.)*.35+pow(md,6.)*.05);  // 달과 달무리",
      "  // 옅은 구름 띠. 한 바퀴 동안 옆으로 흐른다(원으로 돌아 제자리).",
      "  vec2 cp=rd.xz/max(rd.y,.05)*.35;",
      "  float cl=smoothstep(.55,.85,fbm3(vec3(cp*2.,0.)+loopOff(.25)));",
      "  c=mix(c, C1*.10+C0, cl*smoothstep(0.,.25,rd.y)*.7);",
      "  return c;",
      "}",
      "vec3 render(vec2 uv){",
      "  vec3 ro=vec3(0.,1.15,0.);",
      "  vec3 rd=cameraRay(uv, ro, vec3(0.,1.02,-4.), 1.7);",
      "  vec3 M=normalize(vec3(.05,.2,-1.));",
      "  vec3 col;",
      "  if(rd.y>0.){ col=sky(rd,M); }",
      "  else {",
      "    // 물 — 높이장 위를 걷다가 넘으면 되짚어 정확한 자리를 찾는다.",
      "    float t=0., lt=0., ld=0.; vec3 p;",
      "    for(int i=0;i<110;i++){ p=ro+rd*t; float d=p.y-waves(p.xz); if(d<0.){ t=lt+(t-lt)*ld/(ld-d); break; } lt=t; ld=d; t+=max(d*.55,.01+t*.012); if(t>70.) break; }",
      "    p=ro+rd*t;",
      "    vec2 e=vec2(.02+t*.002,0.);",
      "    vec3 n=normalize(vec3(waves(p.xz-e.xy)-waves(p.xz+e.xy), 2.*e.x, waves(p.xz-e.yx)-waves(p.xz+e.yx)));",
      "    float c=max(dot(-rd,n),0.);",
      "    float fr=fresnel(c,.02);",
      "    vec3 refl=sky(reflect(rd,n),M);",
      "    // 속빛. 물마루가 얇은 자리에서 달빛이 속을 지나 비친다.",
      "    float sss=pow(max(dot(rd,-M)*.5+.5,0.),3.)*smoothstep(-.1,.25,p.y-waves(p.xz)+.25+p.y);",
      "    vec3 deep=C2*.08*(.4+.6*sss)+C2*.25*max(p.y+.1,0.)*sss;",
      "    col=mix(deep, refl, clamp(fr*1.25,0.,1.));",
      "    // 달빛 길. 물결 하나하나에 달이 부서져 수평선까지 이어진다.",
      "    col+=C1*pow(max(dot(reflect(rd,n),M),0.),220.)*3.;",
      "    col=mix(col, sky(vec3(rd.x,0.,rd.z),M), 1.-exp(-.0009*t*t));",
      "  }",
      "  return col;",
      "}"
    ].join("\n")
  };
})(window);
