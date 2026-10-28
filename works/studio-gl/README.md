# ArtWork Studio 대표작 엔진 (2026-10-28)

손님이 `/studio` 에서 고르는 대표작을 그리는 GPU 엔진입니다. 예전 2,000개 프리셋(Canvas2D)은 손님 화면에서 내렸고, 예전 번호 납품용으로 `/studio-classic`(검색 제외)에만 남겼습니다.

## 파일

| 파일 | 하는 일 |
|---|---|
| `sgl.js` | 공통 틀: 카메라 행렬, 셰이더 만들기, 광선 행진 공통부(GGX · 흐린 반사 · 면광원 그림자 · AO · 안개) |
| `view.html` | 작품 한 편을 그린다. 스튜디오 크게 보기(iframe)와 납품 렌더가 같은 파일을 쓴다 |
| `works/<id>.js` | 작품 하나 (`SGL.add({...})`). 제목 · 설명 · 분위기 · 색 4가지 · 그림 |
| `catalog.js` | 손님 화면에 보이는 순서 |
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
3. `catalog.js` 에 id 를 넣는다.

## 기법 출처

코드를 옮기지 않고 기법만 다시 구현했습니다: ABC 흐름(Arnold–Beltrami–Childress), Aizawa 끌개, 자이로이드, Inigo Quilez 의 거리장·잡음 글, 반복 커스틱(정의역 비틀기) 꼴, GGX(Karis 2013), 번짐(Jimenez 2014).

## GLSL 주의

- `pow(음수, 2.0)` 은 NaN 이다. 제곱은 `x*x` 로.
- 거리장 부호: 카메라 쪽이 양수여야 한다.
- 예약어 `out` 을 변수 이름으로 쓰지 않는다.
- 구조체(M 등)에는 삼항 연산자(`?:`)를 쓸 수 없다.
