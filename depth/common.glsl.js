/* 깊이(3D) — 모든 장면이 같이 쓰는 GLSL.
 *
 * 2D 캔버스로는 "실제 3D 영상 같은 질감"이 안 나온다. 그 질감은 네 가지에서
 * 온다 — 그림자가 부드럽게 번지고(soft shadow), 틈이 어둡고(AO), 반짝이는
 * 면에 주변이 비치고(반사·프레넬), 밝은 곳이 하얗게 타지 않고 필름처럼
 * 눕는다(ACES). 여기에 그 넷을 한 번만 적어 두고 장면들이 가져다 쓴다.
 *
 * 전부 거리장(SDF) 광선 행진이다. 모델 파일도 텍스처 이미지도 없다.
 * "코드로 그린다 · 사진이나 영상을 합성하지 않는다"가 그대로 참이다.
 *
 * 규칙
 *   · 시간은 PH(0~2π) 하나로만 흐른다. 한 바퀴가 5초 완전 루프다.
 *     움직임은 전부 PH 의 정수 배로만 쓴다 — 그래야 끝 장이 첫 장으로 붙는다
 *   · 잡음이 흘러야 하면 잡음 밭 위를 원으로 돈다(cos PH, sin PH)
 *   · 우연은 씨앗에서만 온다(S0, S1). Math.random 도 시계도 안 쓴다
 */
(function (global) {
  "use strict";

  var HEAD = [
    "#version 300 es",
    "precision highp float;",
    "precision highp int;",
    "out vec4 fragColor;",
    "uniform vec2  R;      // 화면 크기(화소)",
    "uniform float T;      // 한 바퀴 안의 초 (0 ~ DUR)",
    "uniform float PH;     // 한 바퀴 위상 (0 ~ 2π)",
    "uniform vec4  S0;     // 씨앗에서 뽑은 값 여덟 개 (0~1)",
    "uniform vec4  S1;",
    "uniform vec3  C0;     // 바탕",
    "uniform vec3  C1;     // 주된 빛",
    "uniform vec3  C2;     // 포인트 빛",
    "uniform vec2  OFF;    // 초과 표본 한 칸의 어긋남",
    "",
    "#define PI  3.14159265359",
    "#define TAU 6.28318530718",
    "",
    "// ── 잡음 ───────────────────────────────────────────────",
    "float hash11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }",
    "float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }",
    "float hash31(vec3 p){ p=fract(p*.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }",
    "float noise3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);",
    "  return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x), mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),",
    "             mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x), mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z); }",
    "float fbm3(vec3 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s; }",
    "// 한 바퀴 돌아 제자리로 오는 잡음. 밭 위를 원으로 걷는다.",
    "vec3 loopOff(float r){ return vec3(cos(PH), sin(PH), 0.)*r; }",
    "",
    "// ── 도형 · 연산 ─────────────────────────────────────────",
    "mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }",
    "float sdSphere(vec3 p,float r){ return length(p)-r; }",
    "float sdBox(vec3 p,vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }",
    "float sdRBox(vec3 p,vec3 b,float r){ return sdBox(p,b-r)-r; }",
    "float sdTorus(vec3 p,vec2 t){ vec2 q=vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }",
    "float sdCyl(vec3 p,float h,float r){ vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h); return min(max(d.x,d.y),0.)+length(max(d,0.)); }",
    "float sdCapsule(vec3 p,vec3 a,vec3 b,float r){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }",
    "float sdEllipsoid(vec3 p,vec3 r){ float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.)/k1; }",
    "float sdHexPrism(vec3 p,vec2 h){ const vec3 k=vec3(-.8660254,.5,.57735); p=abs(p); p.xy-=2.*min(dot(k.xy,p.xy),0.)*k.xy;",
    "  vec2 d=vec2(length(p.xy-vec2(clamp(p.x,-k.z*h.x,k.z*h.x),h.x))*sign(p.y-h.x), p.z-h.y); return min(max(d.x,d.y),0.)+length(max(d,0.)); }",
    "float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }",
    "float smax(float a,float b,float k){ return -smin(-a,-b,k); }",
    "vec2 opU(vec2 a,vec2 b){ return a.x<b.x?a:b; }",
    "",
    "// ── 장면이 채울 자리 ────────────────────────────────────",
    "vec2 scene(vec3 p);          // (거리, 재질 번호)",
    "float map(vec3 p){ return scene(p).x; }",
    "",
    "// ── 빛 ──────────────────────────────────────────────────",
    "vec3 calcNormal(vec3 p){ const vec2 e=vec2(1,-1)*.5773*.0007;",
    "  return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx)); }",
    "// 행진. 멀리 갈수록 걸음을 조금 키워 같은 걸음 수로 더 멀리 본다.",
    "vec2 march(vec3 ro,vec3 rd,float tmax){ float t=.01; float m=-1.;",
    "  for(int i=0;i<180;i++){ vec2 h=scene(ro+rd*t); if(abs(h.x)<.0004*t){ m=h.y; break; } t+=h.x*.9; if(t>tmax) break; }",
    "  return vec2(t,m); }",
    "// 두 번째 광선(반사)용. 반사 속 반사까지 정밀할 필요는 없다 — 걸음을 반으로.",
    "vec2 marchLite(vec3 ro,vec3 rd,float tmax){ float t=.02; float m=-1.;",
    "  for(int i=0;i<72;i++){ vec2 h=scene(ro+rd*t); if(abs(h.x)<.002*t){ m=h.y; break; } t+=h.x; if(t>tmax) break; }",
    "  return vec2(t,m); }",
    "// 부드러운 그림자. 가림에 가까이 스친 만큼 어두워진다(반그림자).",
    "float softShadow(vec3 ro,vec3 rd,float tmin,float tmax,float k){ float res=1., t=tmin, ph=1e10;",
    "  for(int i=0;i<48;i++){ float h=map(ro+rd*t); float y=h*h/(2.*ph); float d=sqrt(max(h*h-y*y,0.)); res=min(res,k*d/max(0.,t-y)); ph=h; t+=clamp(h,.01,.25); if(res<.002||t>tmax) break; }",
    "  res=clamp(res,0.,1.); return res*res*(3.-2.*res); }",
    "// 틈이 어두워지는 것. 이 한 줄이 \"실제로 놓인 물건\"처럼 보이게 한다.",
    "float calcAO(vec3 p,vec3 n){ float occ=0., sca=1.;",
    "  for(int i=0;i<6;i++){ float h=.01+.14*float(i)/5.; float d=map(p+h*n); occ+=(h-d)*sca; sca*=.92; }",
    "  return clamp(1.-2.4*occ,0.,1.)*(.5+.5*n.y); }",
    "",
    "// 사진관. 반짝이는 면에 비치는 것이 무엇이냐가 \"3D 렌더\" 질감의 절반이다.",
    "// 위에 큰 네모 조명 하나, 옆에 긴 띠 조명 둘, 바닥은 어둡게.",
    "vec3 studio(vec3 rd){",
    "  vec3 c = C0*.5 + C0*.3*rd.y;",
    "  // 둥근 벽(사이클로라마). 지평 근처가 은은하게 밝아야 거울 면이 \"금속\"으로 읽힌다.",
    "  // 이게 없으면 크롬이 검은 유리가 된다.",
    "  c += mix(C1,C0,.55)*.55*exp(-9.*rd.y*rd.y);",
    "  c += C1*2.2*smoothstep(.62,.95,rd.y)*smoothstep(.75,.25,abs(rd.x));        // 천장 네모",
    "  c += C1*1.4*smoothstep(.90,.985,dot(rd,normalize(vec3(1.,.2,.35))));       // 오른쪽 띠",
    "  c += C2*1.8*smoothstep(.92,.99,dot(rd,normalize(vec3(-1.,.3,-.2))));       // 왼쪽 띠 (포인트 빛)",
    "  c += C1*.9*smoothstep(.975,.998,dot(rd,normalize(vec3(-.2,.35,1.))));      // 뒤쪽 작은 반사판",
    "  return max(c,0.); }",
    "",
    "// 물리 기반 반사의 두 갈래. 매끈한 면일수록 빛 점이 작고 세다.",
    "float ggx(vec3 n,vec3 h,float r){ float a=r*r, a2=a*a, d=max(dot(n,h),0.); d=d*d*(a2-1.)+1.; return a2/(PI*d*d); }",
    "float fresnel(float c,float f0){ return f0+(1.-f0)*pow(1.-clamp(c,0.,1.),5.); }",
    "",
    "// ── 마감 ────────────────────────────────────────────────",
    "// 필름처럼 눕는 곡선. 밝은 곳이 하얗게 타는 대신 색을 품은 채 부드럽게 올라간다.",
    "vec3 aces(vec3 x){ const float a=2.51,b=.03,c=2.43,d=.59,e=.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.); }",
    "vec3 cameraRay(vec2 uv,vec3 ro,vec3 ta,float fl){ vec3 f=normalize(ta-ro), r=normalize(cross(f,vec3(0,1,0))), u=cross(r,f);",
    "  return normalize(uv.x*r+uv.y*u+fl*f); }",
    ""
  ].join("\n");

  /* 장면의 render() 를 초과 표본으로 불러 한 화소를 만든다.
     AA 는 컴파일 때 박는다 — 반복 수가 상수여야 빠르다. */
  /* aa 1 — 한 점. 미리보기용.
     aa 2 — 대각선 두 점. 값은 두 배인데 계단은 거의 다 지운다. 목록 영상은 이것으로.
     aa 3 — 비껴 세운 네 점(RGSS). 납품 4K 는 이것으로.
     aa 4 — 3×3 아홉 점. 정지 사진·인쇄용. */
  function tail(aa) {
    var pts = aa === 1 ? [[0, 0]]
      : aa === 2 ? [[-.25, -.25], [.25, .25]]
      : aa === 3 ? [[-.125, -.375], [.375, -.125], [.125, .375], [-.375, .125]]
      : [[-1/3,-1/3],[0,-1/3],[1/3,-1/3],[-1/3,0],[0,0],[1/3,0],[-1/3,1/3],[0,1/3],[1/3,1/3]];
    var body = pts.map(function (o) {
      return "  acc+=render((2.*(gl_FragCoord.xy+vec2(" + o[0].toFixed(4) + "," + o[1].toFixed(4) + "))-R)/R.y);";
    }).join("\n");
    return [
      "",
      "void main(){",
      "  vec3 acc=vec3(0);",
      body,
      "  vec3 col=acc/" + pts.length + ".;",
      "  col=aces(col);",
      "  vec2 q=gl_FragCoord.xy/R;",
      "  // 가장자리를 조금 눌러 눈을 가운데로. 벽에서는 이것이 액자 역할을 한다.",
      "  col*=.55+.45*pow(16.*q.x*q.y*(1.-q.x)*(1.-q.y),.18);",
      "  col=pow(col,vec3(1./2.2));",
      "  // 필름 알갱이 + 밴딩 막는 떨림. 어두운 그라데이션을 LED 에 올리면 계단이 보인다.",
      "  float g=hash21(gl_FragCoord.xy+fract(T*7.13)*97.)-.5;",
      "  col+=g*(1.2/255.)+g*.012*(1.-col);",
      "  fragColor=vec4(clamp(col,0.,1.),1);",
      "}"
    ].join("\n");
  }

  global.DepthGLSL = { HEAD: HEAD, tail: tail };
})(typeof window !== "undefined" ? window : globalThis);
