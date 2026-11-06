// 빈 벽돌 상자 점검용
#define WALLSTYLE 2
#define PBR2
#define DT 1.8
#define FLOOR_REFL 0.0
#define LKD vec3(-0.55, 0.62, -0.55)
#define KEYC vec3(2.8, 2.55, 2.25)
#define AMB_TOP L(vec3(0.40, 0.40, 0.46))
#define AMB_BOT L(vec3(0.22, 0.18, 0.16))
#define MOSS 0.6
float map(vec3 p){ return length(p - vec3(0.3, -0.55, 0.9)) - 0.42; }
M mat(vec3 p, vec3 n){ return mk(L(vec3(0.85, 0.82, 0.78)), 0.35, 0.0); }
