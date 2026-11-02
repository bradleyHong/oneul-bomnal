/* 삶의 선 4 · 애 · 슬픔 · Sorrow
 *
 * 슬픔은 아래로 흐른다. 가는 선 수백 가닥이 버들가지처럼 늘어져 천천히 흔들리고,
 * 선을 타고 물방울 빛이 미끄러져 내려와 검은 물 위에 떨어진다. 물에는 동그란 물결이 번진다.
 * 흔들림·물방울·물결 모두 30초의 정수배 주기.
 */
SGL.add({
  id: "life-sorrow", title: "애 · 슬픔", en: "Sorrow", mood: ["calm"],
  desc: "슬픔은 아래로 흐릅니다. 버들가지처럼 늘어진 빛의 선을 타고 물방울이 미끄러져 내려와 검은 물 위에 동그란 물결을 남깁니다.",
  palettes: [
    { name: "비 오는 밤", colors: ["#5a8aff", "#9ab8e8", "#e8f4ff", "#04070e"] },
    { name: "쪽빛", colors: ["#2a5aff", "#5ac8ff", "#d0ecff", "#03050c"] },
    { name: "잿빛", colors: ["#8a96a8", "#c8d0dc", "#ffffff", "#060708"] },
    { name: "보랏빛 저녁", colors: ["#7a5aff", "#c8a0ff", "#f4e8ff", "#07040e"] },
  ],
  post: { exposure: 1.0, bloom: 0.10, sat: 1.05, contrast: 1.10, vignette: 0.42, grain: 0.014 },
  N: (ctx) => (ctx.cap ? 420 : 320), K: 80,
  body: `
float DROP(float id, out float dp, out vec3 g){
  vec3 h = h3(id*1.37 + 0.5); g = h3(id*5.1 + 3.0);
  float k = 1.0 + floor(h.z*3.0);
  dp = fract(uT/T*k + g.x);
  return k;
}
vec3 LP(float id, float u, out vec3 col, out float w){
  vec3 h = h3(id*1.37 + 0.5), g;
  float dp; DROP(id, dp, g);
  float ph = TAU*uT/T;
  float x0 = (h.x - 0.5)*7.5, z0 = (h.y - 0.5)*4.5 - 0.3;
  float top = 3.2 + 0.6*g.x;
  float len = 3.0 + 1.9*g.y;
  float y = top - u*len;
  float sway = (0.05 + 0.45*u*u)*sin(ph*(1.0 + floor(g.z*2.0)) + h.z*TAU + u*1.4);
  float sway2 = 0.10*u*u*sin(ph*2.0 + h.x*9.0 + u*2.5);
  vec3 p = vec3(x0 + sway, y, z0 + sway2);
  float dd = (u - dp*1.15)*28.0;
  float drop = exp(-dd*dd);
  col = mix(uC0, uC1, g.z)*(0.10 + 0.10*(1.0 - u))*smoothstep(1.0, 0.8, u)*smoothstep(0.0, 0.15, u) + uC2*drop*1.3*smoothstep(0.0, 0.08, dp);
  w = 0.0045 + 0.004*drop;
  return p;
}`,
  bg: `
void main(){
  vec3 rd = RD();
  float ph = TAU*uT/T;
  vec3 col = uC3*0.5 + uC0*0.012*smoothstep(-0.1, 0.5, rd.y);
  const float WY = -1.75;
  if(rd.y < 0.0){
    float d = (WY - uEye.y)/rd.y;
    vec3 p = uEye + rd*d;
    // 물결: 칸마다 한 번씩 떨어진 자리에서 번지는 동그라미 (30초에 정수 번)
    float rip = 0.0;
    vec2 cellSz = vec2(0.9);
    vec2 cid = floor(p.xz/cellSz);
    for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
      vec2 cc = cid + vec2(float(i), float(j));
      vec3 hh = h33(vec3(cc, 4.0));
      vec2 ctr = (cc + 0.2 + 0.6*hh.xy)*cellSz;
      float k = 1.0 + floor(hh.z*3.0);
      float age = fract(uT/T*k + hh.x);
      float r = length(p.xz - ctr);
      float ring = exp(-abs(r - age*1.1)*40.0)*(1.0 - age)*(1.0 - age);
      rip += ring;
    }
    float fres = pow(1.0 - max(-rd.y, 0.0), 4.0);
    col = uC3*0.30 + uC3*0.15*fres + uC1*0.10*rip*exp(-d*0.12);
    col += uC0*0.006*fres*exp(-abs(rd.y)*30.0);
  }
  o = vec4(col*uGain, 1.0);
}`,
  camera(t) {
    const ph = 2 * Math.PI * t / SGL.T;
    const eye = [0.8 * Math.sin(ph), 0.2 + 0.15 * Math.sin(ph * 2), 6.2 + 0.3 * Math.cos(ph)];
    return { eye, ta: [0, 0.1, 0], fov: 0.78, focus: 6.0, ap: 0.012 };
  },
  init(G, ctx) { return SGL.lineInit(this, G, ctx); },
  draw(G, st, t, ctx) { SGL.lineDraw(this, G, st, t, ctx); },
});
