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

## 기법 출처

코드를 옮기지 않고 기법만 다시 구현했습니다: ABC 흐름(Arnold–Beltrami–Childress), Aizawa 끌개, 자이로이드, Inigo Quilez 의 거리장·잡음 글, 반복 커스틱(정의역 비틀기) 꼴, GGX(Karis 2013), 번짐(Jimenez 2014).

## GLSL 주의

- `pow(음수, 2.0)` 은 NaN 이다. 제곱은 `x*x` 로.
- 거리장 부호: 카메라 쪽이 양수여야 한다.
- 예약어 `out` · `active` 를 변수 이름으로 쓰지 않는다.
- 시간에 따라 칸을 밀어 올리는 무늬(불티 등)는 칸 번호를 mod 로 감아야 루프가 이어진다.
- 구조체(M 등)에는 삼항 연산자(`?:`)를 쓸 수 없다.
