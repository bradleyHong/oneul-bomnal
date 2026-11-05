// 07 풍경 조각 — 상자 안 21개 큐브가 한 장의 풍경을 이룬다. 파도처럼 뒤집힐 때마다 다른 날의 풍경으로 바뀌고, 몇 개는 뒤집히며 틀 밖까지 튀어나온다.
// @post {"exposure":1.0,"sat":1.25,"contrast":1.08,"bloom":0.05}
#define DT 1.7
#define WALL L(vec3(0.20, 0.18, 0.26))
#define GRID 0.27
#define GRIDW 0.010
#define GRIDK 0.35
#define FRAMEC L(vec3(0.08, 0.08, 0.10))
#define AMB_TOP L(vec3(0.50, 0.48, 0.60))
#define AMB_BOT L(vec3(0.26, 0.22, 0.28))
#define LKD vec3(-0.55, 0.62, -0.56)
#define HAS_PREP
#define CX 7
#define CY 3
const float P = 0.545, HS = 0.25;
float ZH;                         // 큐브 줄의 기본 깊이

// 큐브의 뒤집힌 각도와 앞으로 나온 거리
vec2 cubeAnim(float ix, float iy){
  float ang = 0.0, po = 0.0;
  float id = ix + iy*float(CX);
  for(int k=0;k<4;k++){
    float fk = float(k);
    float t0 = fk*3.75 + 0.6 + ix*0.11 + (2.0 - iy)*0.07;
    float x = clamp((uT - t0)/1.0, 0.0, 1.0);
    float e = x < 1.0 ? ease(x) + 0.08*sin(3.14159*x)*x : 1.0;
    ang += e;
    float hero = abs(id - mod(fk*8.0 + 3.0, 21.0)) < 0.5 ? 1.0 : 0.0;       // 이번 뒤집기의 주인공
    po += sin(3.14159*x)*(0.30 + 2.25*hero);
  }
  return vec2(-ang*1.5707963, po);
}
void prep(){ ZH = DT - 0.42; }
mat3 rx(float a){ float c = cos(a), s = sin(a); return mat3(1,0,0, 0,c,s, 0,-s,c); }

float cubeD(vec3 p, float ix, float iy, out vec3 lp){
  vec3 home = vec3((ix - float(CX - 1)*0.5)*P, (iy - float(CY - 1)*0.5)*P, ZH);
  vec2 an = cubeAnim(ix, iy);
  vec3 c = home - vec3(0, 0, an.y);
  lp = transpose(rx(an.x))*(p - c);
  return sdRBox(lp, vec3(HS), 0.018);
}
float map(vec3 p){
  // 칸 찾기 + 이웃 칸 (튀어나온 큐브가 커지므로 앞쪽은 넉넉히)
  float d = 1e9; vec3 lp;
  float gx = clamp(floor(p.x/P + float(CX)*0.5), 0.0, float(CX - 1));
  float gy = clamp(floor(p.y/P + float(CY)*0.5), 0.0, float(CY - 1));
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    float ix = gx + float(i), iy = gy + float(j);
    if(ix < 0.0 || iy < 0.0 || ix > float(CX - 1) || iy > float(CY - 1)) continue;
    d = min(d, cubeD(p, ix, iy, lp));
  }
  // 멀리 있는 주인공 큐브는 따로 확인
  for(int k=0;k<4;k++){
    float id = mod(float(k)*8.0 + 3.0, 21.0);
    float ix = mod(id, float(CX)), iy = floor(id/float(CX));
    d = min(d, cubeD(p, ix, iy, lp));
  }
  return d;
}

// 풍경 네 날
float ridge(float x, float s){ return fbm(vec2(x*s, s*3.1))*0.9; }
vec3 land(int v, vec2 u){
  float y = u.y;
  vec3 c;
  if(v == 0){        // 라임 아침, 분홍 산
    c = mix(L(vec3(0.85, 1.0, 0.35)), L(vec3(0.20, 0.70, 1.0)), smoothstep(-0.1, 0.8, y));
    c += vec3(5.0, 5.0, 3.0)*smoothstep(0.13, 0.11, length(u - vec2(0.8, 0.35)));
    if(y < -0.05 + 0.45*ridge(u.x + 3.0, 0.9) - 0.25) c = L(vec3(0.95, 0.40, 0.70));
    if(y < -0.30 + 0.35*ridge(u.x + 9.0, 1.4) - 0.2) c = L(vec3(0.55, 0.20, 0.62));
  } else if(v == 1){ // 노을 바다
    c = mix(L(vec3(1.0, 0.55, 0.20)), L(vec3(0.85, 0.10, 0.55)), smoothstep(0.0, 0.8, y));
    c += vec3(6.0, 3.5, 1.5)*smoothstep(0.24, 0.22, length(u - vec2(-0.4, 0.12)));
    if(y < 0.0){ c = mix(L(vec3(0.15, 0.10, 0.55)), L(vec3(1.0, 0.45, 0.30)), smoothstep(0.012, 0.0, abs(fract(y*9.0 + u.x*0.3) - 0.5) - 0.42)*smoothstep(-0.8, 0.0, y)*(1.0 - smoothstep(0.0, 0.6, abs(u.x + 0.4)))); }
  } else if(v == 2){ // 봄밤
    c = mix(L(vec3(0.20, 0.12, 0.50)), L(vec3(0.02, 0.03, 0.15)), smoothstep(-0.2, 0.8, y));
    c += vec3(3.0, 3.2, 3.6)*smoothstep(0.15, 0.13, length(u - vec2(0.3, 0.45)));
    vec2 g = floor(u*24.0); if(h21(g) > 0.94) c += vec3(1.5)*smoothstep(0.25, 0.0, length(fract(u*24.0) - 0.5));
    if(y < -0.2 + 0.3*ridge(u.x + 5.0, 1.1) - 0.15){ c = L(vec3(0.05, 0.06, 0.12)); if(h21(floor(u*vec2(14.0, 18.0))) > 0.965) c = L(vec3(0.83, 1.0, 0.23))*1.6; }
  } else {           // 물빛 한낮, 초록 언덕
    c = mix(L(vec3(0.80, 0.97, 1.0)), L(vec3(0.0, 0.55, 1.0)), smoothstep(-0.1, 0.8, y));
    float cl = fbm(u*vec2(2.0, 5.0) + 3.0); c = mix(c, vec3(1.0), smoothstep(0.55, 0.7, cl)*smoothstep(0.0, 0.3, y));
    if(y < -0.25 + 0.25*sin(u.x*1.8 + 1.0)) c = mix(L(vec3(0.10, 0.75, 0.35)), L(vec3(0.45, 0.95, 0.30)), smoothstep(-0.9, -0.3, y));
  }
  return c;
}
M mat(vec3 p, vec3 n){
  float gx = clamp(floor(p.x/P + float(CX)*0.5), 0.0, float(CX - 1));
  float gy = clamp(floor(p.y/P + float(CY)*0.5), 0.0, float(CY - 1));
  float best = 1e9, bx = 0.0, by = 0.0; vec3 lp, blp;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    float ix = gx + float(i), iy = gy + float(j);
    if(ix < 0.0 || iy < 0.0 || ix > float(CX - 1) || iy > float(CY - 1)) continue;
    float d = cubeD(p, ix, iy, lp); if(d < best){ best = d; bx = ix; by = iy; blp = lp; }
  }
  for(int k=0;k<4;k++){
    float id = mod(float(k)*8.0 + 3.0, 21.0);
    float ix = mod(id, float(CX)), iy = floor(id/float(CX));
    float d = cubeD(p, ix, iy, lp); if(d < best){ best = d; bx = ix; by = iy; blp = lp; }
  }
  vec3 a = abs(blp);
  if(a.x > a.y && a.x > a.z) return mk(L(vec3(0.95, 0.94, 0.92)), 0.4, 0.0);     // 옆면은 흰 종이
  int v = blp.z < 0.0 && a.z > a.y ? 0 : (blp.y > 0.0 && a.y > a.z ? 1 : (blp.z > 0.0 && a.z > a.y ? 2 : 3));
  // 그 면이 앞에 왔을 때의 방향으로 돌려 놓고 한 장 풍경 좌표로
  vec3 f = rx(-float(v)*1.5707963)*blp;
  vec2 home = vec2((bx - float(CX - 1)*0.5)*P, (by - float(CY - 1)*0.5)*P);
  vec2 u = (home + f.xy*(P/(2.0*HS)))/0.82;
  vec3 c = land(v, u);
  float edge = smoothstep(HS - 0.02, HS - 0.005, max(abs(f.x), abs(f.y)));
  M m = mk(mix(c, L(vec3(0.97)), edge), 0.35, 0.0);
  m.emit = c*0.22*(1.0 - edge);
  return m;
}
