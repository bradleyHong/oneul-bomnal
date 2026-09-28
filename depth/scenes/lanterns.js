/* 연등 — 등불이 검은 물 위로 떠오른다.
 *
 * 한지 등은 속에서 빛나는 물건이다. 겉면이 빛을 머금어 가운데가 밝고
 * 가장자리로 갈수록 붉게 짙어진다(빛이 종이를 지나며 물든다). 그 빛이
 * 물에 비쳐 길게 흔들린다. 떠오르는 등이 많을수록 멀리 있는 것은
 * 작고 흐리다 — 그것으로 공간의 깊이가 선다.
 *
 * 등은 한 바퀴에 정수 칸만큼 오른다. 맨 위로 나간 등이 맨 아래에서
 * 다시 들어오므로 끝 장이 첫 장이다. */
(function (g) {
  g.DepthScenes = g.DepthScenes || {};
  g.DepthScenes.lanterns = {
    en: "lanterns", ko: "연등",
    desc: "한지 등이 검은 물 위로 떠오른다. 빛이 물에 비쳐 흔들린다",
    pals: [
      { name: "등불",   c: ["#050304", "#ffcf8a", "#ff5a2a"] },
      { name: "달빛",   c: ["#03040a", "#e8efff", "#7ba6ff"] },
      { name: "연분홍", c: ["#070306", "#ffd6e2", "#ff5c93"] },
      { name: "청록",   c: ["#020606", "#e0fff4", "#1fcfa8"] }
    ],
    glsl: [
      "const int NL=14;",
      "vec3 lanPos(int i, out float s){",
      "  float fi=float(i);",
      "  float a=hash11(fi*3.1+S0.x*7.), b=hash11(fi*5.7+S0.y*9.), c=hash11(fi*1.3+S0.z*5.);",
      "  s=.14+.12*c;",
      "  // 오르는 높이. 한 바퀴에 한 칸 — 위로 나간 등이 아래로 다시 든다.",
      "  float y=fract(b+PH/TAU)*4.2-.9;",
      "  // 꼭대기에 닿기 전에 작아지며 사라진다. 그대로 두면 맨 위에서 뚝 끊겨 아래로 튄다.",
      "  s*=smoothstep(3.3,2.4,y);",
      "  float z=-1.5-a*7.;",
      "  float x=(hash11(fi*7.9+S0.w*3.)-.5)*(2.6+(-z)*.9);",
      "  // 바람에 조금 흔들린다.",
      "  x+=.08*sin(PH+fi*2.);",
      "  return vec3(x,y,z);",
      "}",
      "vec2 scene(vec3 p){",
      "  float d=1e9;",
      "  for(int i=0;i<NL;i++){ float s; vec3 c=lanPos(i,s); vec3 q=p-c;",
      "    // 등의 몸: 아래위가 조금 눌린 원통. 한지를 대나무 살에 붙인 모양.",
      "    float body=sdCyl(q,s*1.15,s)-s*.25;",
      "    d=min(d,body); }",
      "  return vec2(d,1.);",
      "}",
      "// 등 하나의 빛. 가까이 갈수록 빛이 공기에 번진다(달무리처럼).",
      "vec3 glowAt(vec3 ro, vec3 rd){",
      "  vec3 acc=vec3(0.);",
      "  for(int i=0;i<NL;i++){ float s; vec3 c=lanPos(i,s);",
      "    vec3 oc=c-ro; float t=max(dot(oc,rd),0.); float d=length(oc-rd*t);",
      "    acc+=C2*.02*s/(d*d+.02)*exp(-.06*t) + C1*.006*s/(d*d+.004)*exp(-.06*t); }",
      "  return acc;",
      "}",
      "vec3 lanternCol(vec3 p, vec3 n, vec3 rd){",
      "  float c=max(dot(-rd,n),0.);",
      "  // 한지를 지나는 빛. 정면은 밝은 노랑, 비스듬한 가장자리는 짙은 주홍.",
      "  vec3 core=mix(C2*1.8, C1*3.2, pow(c,1.6));",
      "  // 대나무 살. 가로로 몇 줄.",
      "  float rib=smoothstep(.9,.98,abs(sin(p.y*42.)));",
      "  core*=1.-.35*rib;",
      "  return core;",
      "}",
      "vec3 render(vec2 uv){",
      "  vec3 ro=vec3(0.,.35,3.2);",
      "  vec3 rd=cameraRay(uv, ro, vec3(0.,1.05,-3.), 1.55);",
      "  vec3 col=C0*(1.+1.2*max(uv.y+.2,0.));",
      "  // 물. 수면(y=-.4)에서 튕겨 등을 비춘다. 물결에 비친 빛이 길게 흔들린다.",
      "  float tw=(-.4-ro.y)/rd.y;",
      "  vec2 h=march(ro,rd,14.);",
      "  bool water = rd.y<0. && tw>0. && (h.y<.5 || tw<h.x);",
      "  if(water){",
      "    vec3 wp=ro+rd*tw;",
      "    vec2 ww=wp.xz*vec2(1.,3.);",
      "    vec3 n=normalize(vec3(.04*sin(ww.x*3.+PH*2.)+.03*sin(ww.y*2.1-PH),1.,.05*sin(ww.y*4.+PH*3.)+.02*cos(ww.x*5.+PH)));",
      "    vec3 rf=reflect(rd,n);",
      "    vec3 rc=C0*.5+glowAt(wp,rf)*.8;",
      "    vec2 h2=march(wp+n*.01,rf,12.);",
      "    if(h2.y>.5){ vec3 q=wp+rf*h2.x; rc+=lanternCol(q,calcNormal(q),rf)*.55; }",
      "    float fr=fresnel(max(dot(-rd,n),0.),.02);",
      "    col=C0*.3+rc*(.35+.65*fr);",
      "    col*=exp(-.05*tw);",
      "  } else if(h.y>.5){",
      "    vec3 p=ro+rd*h.x, n=calcNormal(p);",
      "    col=lanternCol(p,n,rd)*exp(-.07*h.x);",
      "  }",
      "  col+=glowAt(ro,rd);",
      "  return col;",
      "}"
    ].join("\n")
  };
})(window);
