# ArtWork Studio 대표작 엔진 (2026-10-28)

손님이 `/studio` 에서 고르는 대표작을 그리는 GPU 엔진입니다.

**이 폴더의 코드는 웹에 올리지 않습니다** (`.vercelignore`, 2026-10-28 대표 결정). 손님 화면에는 `catalog.js`(제목·설명·색·비메오 주소)와 `preview/` 영상만 나갑니다. 크게 보기는 색마다 미리 렌더해 비메오에 올린 1080p 영상이고(publicbloom.art 에서만 재생), 주문이 들어오면 여기 코드로 화면 규격에 맞게 새로 렌더해 납품합니다. 예전 2,000개 프리셋(Canvas2D)은 손님 화면에서 내렸고, 예전 번호 납품용으로 `/studio-classic`(검색 제외)에만 남겼습니다.

## 파일

| 파일 | 하는 일 |
|---|---|
| `sgl.js` | 공통 틀: 카메라 행렬, 셰이더 만들기, 광선 행진 공통부(GGX · 흐린 반사 · 면광원 그림자 · AO · 안개) |
| `view.html` | 작품 한 편을 그린다. 납품 렌더·미리보기·비메오 영상 렌더가 쓴다 (로컬 전용) |
| `works/<id>.js` | 작품 하나 (`SGL.add({...})`). 제목 · 설명 · 분위기 · 색 4가지 · 그림 |
| `order.txt` | 손님 화면에 보이는 순서 |
| `vimeo.json` | 작품마다 색 4가지의 비메오 재생 주소 |
| `catalog.js` | 손님 화면용 목록 (자동 생성: `node tools/build-studio-catalog.mjs`) |
| `preview/<id>.mp4 · .jpg` | 목록 카드용 30초 미리보기 (854×480) |

화면 틀은 `works/lib/bomnal-gl.js` (HDR · 번짐 · AgX · 그레인 · 디더)를 그대로 씁니다. 기준서는 `works/QUALITY.md`.

## 납품 렌더 (손님 화면 규격 그대로)

사이트 폴더에서 `python3 -m http.server 4737` 을 띄운 뒤:

```bash
node tools/render-gl-video.mjs "http://localhost:4737/works/studio-gl/view.html?work=<id>&pal=<색 번호 0~3>&speed=1&capture=1&w=<가로>&h=<세로>&aa=2&sub=8" 출력.mp4 900 30
```

- 프레임 수 = 30fps × 30초 ÷ 빠르기. 보통(speed=1)은 900, 느리게(speed=0.5)는 1800.
- 모든 작품은 30초(느리게면 60초) 완전 루프입니다.
- 렌더 중에는 다른 GPU 작업(Topaz 등)을 같이 돌리지 않습니다. 같이 돌리면 GPU 오류로 둘 다 멈춥니다.

## 새 작품 올리기

1. `works/<id>.js` 를 만든다. 광선 행진 작품은 `src` 에 `map · material · env · camera` 를 두고 `SGL.drawRay` 로 그린다.
   입자 작품은 `init` 에서 셰이더를 만들고 `G.custom` 으로 HDR 판에 더한다.
2. 미리보기를 뽑는다: `...view.html?work=<id>&capture=1&w=960&h=540&aa=1&sub=4&fps=24` 를 720프레임, 854×480 crf 30 으로 줄인다.
3. `order.txt` 에 id 를 넣고 `node tools/build-studio-catalog.mjs` 를 돌린다.
4. 색 4가지 비메오 영상: 1080p `aa=1&sub=4` 900프레임(CRF 15)을 `tools/tv-upload.py` 의 `upload(..., folder=False)` 로 올리고 `vimeo.json` 에 재생 주소를 넣은 뒤 3을 다시 돌린다. 원본은 `오늘은봄날 TV/5_ArtWork_Studio_1080p/`.

렌더 큐를 여러 개 돌릴 때: 큐마다 다음 장면 전에 헤드리스 크롬을 모두 끄므로(`pkill`), 두 큐를 같이 돌리면 서로의 렌더를 죽인다. 하나씩 차례로.

## 선 작품 (삶의 선 연작, 2026-11-02)

`SGL.lines(gl, body)` 는 선을 이어진 띠로 그린다. 마디마다 앞뒤 점으로 접선을 구해 이웃 마디와 꼭짓점을 같이 쓰므로 겹쳐 더해지는 구슬 무늬가 없다. 굵기는 세계 단위이고, 초점 밖은 넓고 옅어진다(피사계 심도, 에너지 보존).
작품은 `body` 에 `vec3 LP(float id, float u, out vec3 col, out float w)`(선 번호 · 선 위 위치 0..1 → 자리 · 빛 · 굵기)를 두고, `N · K · camera(t) · bg` 를 정한 뒤 `init/draw` 에서 `SGL.lineInit/lineDraw` 를 부른다. 예: `works/life-birth.js`.
`view.html` 은 `sgl.js` 를 늘 새로 읽는다(헤드리스 크롬이 옛 엔진을 캐시해 `lineInit` 이 없다고 멈춘 적이 있다).

## 물방울 작품 (방울방울, 나 연작, 2026-11-03)

`SGL.dropInit/dropDraw` 는 물방울 수천 개를 그린다. 방울마다 화면을 향한 사각형 위에서 타원체와 광선을 직접 만나게 해 두 번 굴절(물 1.333)시키고, 지나온 길이만큼 색을 먹이고(비어–람베르트), 프레넬 반사 · GGX 반짝임 · 반대편 커스틱을 얹는다. 방울 속 세상은 매 장면 그리는 512×256 등장방형 환경 그림(밉맵)에서 읽으므로 방울마다 풍경이 거꾸로 담긴다. 수면(y=0)은 거울이라 방울을 거울 눈에서 한 번 더 그리고, 수면에 닿을 때마다 동그란 물결(최근 32개)을 그린다. 초점 밖 방울은 원판으로 퍼진다.
방울의 자리 · 튀기(통통통, 반발 e≈0.52) · 찌그러짐 · 사라짐(rise 빛이 되어 · drop 물로 떨어져 · sink 녹아들기 · blow 바람에 실려)은 JS `SGL.dropAt` 에서 t 의 함수로 정하고, 하위 프레임마다 멀리서 가까이 순으로 정렬해 그린다.
작품은 `scene`(GLSL: `sky(rd)` · `pond(p, rd)` · `tint(k)`, 보통 `SGL.monet({...})` 모네풍 하늘·숲·연못 + tint) · `build(N)`(방울 목록: 자리 · 크기 · 닿는 때 land · 머무는 시간 stay · 사라지는 시간 E · 방식 leave) · `camera(t)`(focus · ap 로 피사계 심도) · `light()` 를 둔다.
형상은 `SGL.dropFill`(거리장 겉면에 이슬 앉히기, `weight` 로 윤곽에 모으기) 또는 `SGL.dropSurf`(매개 곡면) 로 만든다. 방울을 빽빽하게 채우면 개구리알처럼 보인다 → 성글게(overlap 1.2 이상) · 크기는 작은 것 많이 큰 것 조금(rPow 2.5~3) · 윤곽에 더 모이게. 예: `works/drop-nympheas.js`.

## 기법 출처

코드를 옮기지 않고 기법만 다시 구현했습니다: ABC 흐름(Arnold–Beltrami–Childress), Aizawa 끌개, 자이로이드, Inigo Quilez 의 거리장·잡음 글, 반복 커스틱(정의역 비틀기) 꼴, GGX(Karis 2013), 번짐(Jimenez 2014).

## GLSL 주의

- `pow(음수, 2.0)` 은 NaN 이다. 제곱은 `x*x` 로.
- 거리장 부호: 카메라 쪽이 양수여야 한다.
- 예약어 `out` · `active` 를 변수 이름으로 쓰지 않는다.
- 시간에 따라 칸을 밀어 올리는 무늬(불티 등)는 칸 번호를 mod 로 감아야 루프가 이어진다.
- 구조체(M 등)에는 삼항 연산자(`?:`)를 쓸 수 없다.

## 아나모픽 (2026-11-06)

렌탈 LED 2:1 아나모픽 29편(봄 10 · 크리스마스 19)도 목록 맨 뒤에 실린다. 코드는 `works/_source/anamorphic/`(웹에 안 올림), 목록은 `anamorphic.json`.
`python3 tools/studio-anamorphic.py` 가 미리보기(864×432)를 만들고, 비메오에 없으면 올린 뒤 catalog.js 를 다시 만든다.
손님 화면에서는 '아나모픽' · '크리스마스' 칩으로 고르고, 크게 보기는 작품 비율(2:1) 그대로, 빠르기 고르기는 숨긴다(15초 루프).

## 자연의 기하학 연작 (2026-11-06)

주상절리 · 앵무조개 · 방산충 · 튜링 무늬 · 황금각 · 소리의 무늬 · 잠자리 날개 · 비스무트 결정 · 고사리 새순 · 결정의 심장, 10편 (`works/geo-*.js`).
order.txt 맨 뒤 일반 작품으로 실린다. 카드 미리보기는 `bash tools/studio-preview.sh <id>...` (960×540 렌더 → 854×480, 12초 장면 포스터. 잠자리 날개만 18초로 다시 뽑음).
