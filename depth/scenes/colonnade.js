/* 빛의 회랑 — 기둥 사이로 빛줄기가 들이친다.
 *
 * 공기 속에 떠 있는 먼지가 빛을 받아 빛줄기가 보인다. 광선을 따라
 * 걸으며 걸음마다 "여기서 해가 보이나"를 물어 더하면, 기둥 그림자가
 * 공기 속에 줄무늬로 선다(체적광). 이것이 영화 같은 깊이의 절반이다.
 *
 * 기둥은 곧게 선 원기둥이라 해가 보이는지는 위에서 내려다본 평면에서만
 * 물으면 된다. 3D 로 물을 것을 2D 로 물어 값이 열 배 싸다.
 *
 * 회랑을 따라 한 칸만큼 걸어 들어간다. 기둥이 한 칸마다 되풀이되므로
 * 한 칸을 걸으면 끝 장이 첫 장이다. */
(function (g) {
  g.DepthScenes = g.DepthScenes || {};
  g.DepthScenes.colonnade = {
    en: "colonnade", ko: "빛의 회랑",
    desc: "기둥 사이로 빛줄기가 들이친다. 한 칸씩 걸어 들어간다",
    pals: [
      { name: "오후",   c: ["#060504", "#ffe9c4", "#ff9d4d"] },
      { name: "새벽",   c: ["#04050a", "#e4ecff", "#7ea6ff"] },
      { name: "먹",     c: ["#050505", "#f3efe6", "#bfb49a"] },
      { name: "쪽빛",   c: ["#03030c", "#e6e2ff", "#7a5cff"] }
    ],
    glsl: [
      "const float SP=1.7;               // 기둥 사이",
      "const float CR=.2;                // 기둥 굵기",
      "const float HT=3.4;               // 천장 높이",
      "// 평면에서 가장 가까운 기둥까지. 양옆 두 줄씩.",
      "float cols2(vec2 xz){",
      "  float z=mod(xz.y+SP*.5,SP)-SP*.5;",
      "  float x=abs(xz.x); x=min(abs(x-1.35),abs(x-3.05));",
      "  return length(vec2(x,z))-CR;",
      "}",
      "vec2 scene(vec3 p){",
      "  vec2 r=vec2(1e9,0.);",
      "  // 기둥 — 머리와 발에 테를 둘러 기둥으로 읽히게.",
      "  float c=cols2(p.xz);",
      "  float cap=smin(c-.07*smoothstep(HT-.25,HT,p.y), c-.07*smoothstep(.25,0.,p.y), .02);",
      "  r=opU(r, vec2(cap,1.));",
      "  r=opU(r, vec2(p.y,2.));                  // 바닥",
      "  r=opU(r, vec2(HT-p.y,3.));               // 천장",
      "  r=opU(r, vec2(4.2-abs(p.x),3.));         // 바깥 벽",
      "  return r;",
      "}",
      "// 해가 보이는가. 창은 오른쪽 벽 높은 곳 — 벽을 뚫고 오는 빛만, 기둥에 가리면 그림자.",
      "float sunVis(vec3 p, vec3 L){",
      "  // 오른쪽 벽(x=4.2)까지 가는 동안 기둥에 막히는지 평면에서 본다.",
      "  float tWall=(4.2-p.x)/max(L.x,1e-3);",
      "  vec3 w=p+L*tWall;",
      "  // 창: 벽에 난 높은 창 — 기둥 사이마다 하나.",
      "  float wz=mod(w.z+SP*.5,SP)-SP*.5;",
      "  float win=smoothstep(.52,.44,abs(wz))*smoothstep(1.3,1.45,w.y)*smoothstep(HT-.15,HT-.35,w.y);",
      "  if(win<.001) return 0.;",
      "  vec2 L2=normalize(L.xz); float t=0.; float vis=1.;",
      "  float t2=tWall*length(L.xz);",
      "  for(int i=0;i<20;i++){ float d=cols2(p.xz+L2*t); vis=min(vis,smoothstep(0.,.04,d)); t+=max(d,.05); if(t>t2) break; }",
      "  return vis*win;",
      "}",
      "vec3 render(vec2 uv){",
      "  float z=-PH/TAU*SP*2.;          // 한 바퀴에 두 칸. 기둥이 되풀이되니 끝이 처음이다",
      "  vec3 ro=vec3(-.35,1.25,z+2.);",
      "  vec3 rd=cameraRay(uv, ro, ro+vec3(.18,.05,-1.), 1.6);",
      "  vec3 L=normalize(vec3(.78,.46,-.42));",
      "  vec2 h=march(ro,rd,40.);",
      "  float tEnd=min(h.x,40.);",
      "  vec3 col=vec3(0.);",
      "  if(h.y>.5){",
      "    vec3 p=ro+rd*h.x, n=calcNormal(p);",
      "    float sv=sunVis(p+n*.01,L);",
      "    float dif=max(dot(n,L),0.)*sv;",
      "    float ao=calcAO(p,n);",
      "    vec3 base = h.y<1.5 ? vec3(.62,.6,.57) : (h.y<2.5 ? vec3(.30,.29,.28) : vec3(.42,.41,.40));",
      "    // 돌에 번지는 반사광. 해가 바닥에 떨어져 사방을 은은하게 밝힌다.",
      "    vec3 amb=C2*.05+C1*.035*(.5+.5*n.y);",
      "    col=base*(C1*dif*3.2+amb)*ao;",
      "    if(h.y>1.5&&h.y<2.5){",
      "      // 바닥 — 닦인 돌. 빛줄기와 기둥이 흐리게 비친다.",
      "      vec3 rf=reflect(rd,n); float fr=fresnel(max(dot(-rd,n),0.),.04);",
      "      vec2 h2=marchLite(p+n*.01,rf,12.);",
      "      vec3 rc=vec3(0.); if(h2.y>.5){ vec3 q=p+rf*h2.x; rc=vec3(.5)*C1*sunVis(q,L)*1.2+C2*.03; }",
      "      col+=rc*(.12+.5*fr);",
      "    }",
      "  }",
      "  // 빛줄기. 광선을 따라 걸으며 해가 보이는 자리의 먼지를 더한다.",
      "  // 걸음마다 조금 어긋나게 시작해(떨림) 계단 무늬를 알갱이로 바꾼다.",
      "  float jit=hash21(gl_FragCoord.xy+T);",
      "  vec3 fog=vec3(0.); float NV=36.;",
      "  float dt=tEnd/NV;",
      "  float ph=.25+.75*pow(max(dot(rd,L),0.),6.);   // 빛 쪽을 보면 더 빛난다",
      "  for(int i=0;i<36;i++){",
      "    float t=(float(i)+jit)*dt; vec3 q=ro+rd*t;",
      "    float v=sunVis(q,L);",
      "    fog+=v*exp(-.045*t)*dt;",
      "  }",
      "  col=col*exp(-.03*tEnd)+C1*fog*.24*ph*1.6+C2*.004*tEnd;",
      "  return col;",
      "}"
    ].join("\n")
  };
})(window);
