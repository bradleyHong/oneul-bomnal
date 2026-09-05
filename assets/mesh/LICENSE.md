# 3D 뼈대 출처와 라이선스

여기 있는 파일은 **꼭짓점과 삼각형만** 담고 있습니다. 원본의 재질·
텍스처·색·뼈대 애니메이션은 전부 버렸습니다. 화면에 나가는 것은 그 좌표를
받아 **우리 코드가 매 프레임 다시 그린 선과 점**입니다. 원본 파일이나
원본이 렌더된 그림을 그대로 내보내지 않습니다.

## 받는 기준

- **CC0 만 받습니다.** 파는 물건에 들어가므로 표시 의무가 붙는 CC-BY 는
  쓰지 않습니다. 목록 페이지의 요약이 아니라 **모델마다 README 의
  Legal 항목을 직접 읽고** 확인합니다. 한 모델 안에서 부분마다 라이선스가
  갈리는 경우가 있어, 요약만 보면 CC-BY 를 CC0 로 잘못 읽습니다.
- 한 조각이라도 CC-BY 가 섞여 있으면 받지 않습니다.
- 받은 것은 아래 표에 반드시 적습니다. 적지 않은 것은 배포하지 않습니다.

## 받아 둔 것

출처: [KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets)

| 파일 | 이름 | 저작권 | 라이선스 | 확인일 | 꼭짓점 · 삼각형 |
|---|---|---|---|---|---|
| `AntiqueCamera.json` | 앤티크 카메라 | © 2018, UX3D | CC0 1.0 Universal | 2026-09-05 | 545 · 666 |
| `Avocado.json` | 아보카도 | © 2017, Public (Microsoft) | CC0 1.0 Universal | 2026-09-05 | 363 · 682 |
| `BarramundiFish.json` | 물고기 | © 2017, Public (Microsoft) | CC0 1.0 Universal | 2026-09-05 | 536 · 532 |
| `Corset.json` | 코르셋 | © 2017, UX3D | CC0 1.0 Universal | 2026-09-05 | 559 · 628 |
| `DiffuseTransmissionTeacup.json` | 찻잔 | © 2023, Public domain | CC0 1.0 Universal | 2026-09-05 | 537 · 696 |
| `GlassVaseFlowers.json` | 꽃병 | © 2023, Public | CC0 1.0 Universal | 2026-09-05 | 554 · 532 |
| `Lantern.json` | 랜턴 | © 2017, Microsoft | CC0 1.0 Universal | 2026-09-05 | 540 · 545 |
| `ScatteringSkull.json` | 해골 | © 2025, Public | CC0 1.0 Universal | 2026-09-05 | 525 · 568 |
| `SciFiHelmet.json` | 헬멧 | © 2017, Public | CC0 1.0 Universal | 2026-09-05 | 511 · 576 |
| `SheenChair.json` | 의자 | © 2020, Wayfair, LLC | CC0 1.0 Universal | 2026-09-05 | 540 · 572 |
| `Suzanne.json` | 원숭이 두상 | © 2017, UX3D | CC0 1.0 Universal | 2026-09-05 | 551 · 572 |
| `WaterBottle.json` | 물병 | © 2017, Public (Microsoft) | CC0 1.0 Universal | 2026-09-05 | 502 · 480 |

CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/legalcode

`AntiqueCamera` 원본에는 UX3D 로고가 텍스처로 들어 있고 그 로고에는 상표
표시가 붙어 있습니다. 우리는 텍스처를 통째로 버리므로 로고가 화면에
나가지 않습니다.

## 받았다가 뺀 것

| 모델 | 뺀 이유 | 날짜 |
|---|---|---|
| `Fox` | 형태는 CC0 지만 리깅·애니메이션과 glTF 변환본이 CC-BY 4.0. 우리가 읽는 파일이 그 변환본이라 뺐다 | 2026-09-05 |
| `DiffuseTransmissionPlant` | CC-BY 4.0 (Darmstadt Graphics Group) | 2026-09-05 |
| `SheenWoodLeatherSofa` | CC-BY 4.0 (Darmstadt Graphics Group) | 2026-09-05 |
| `DragonAttenuation` · `DragonDispersion` | 뒤에 붙은 커다란 배경판까지 좌표에 들어와, 상자에 맞추면 용이 콩알만 해진다 | 2026-09-05 |
| `ToyCar` | 부품이 잘게 나뉘어 있어 솎고 나면 형태가 안 읽힌다 | 2026-09-05 |
| `BoomBox` | 안쪽 그릴까지 좌표에 들어와, 빛을 치면 흑백 바둑판이 된다 | 2026-09-05 |

## 더 받으려면

    node tools/fetch-mesh.mjs <모델이름> <한글이름>
    node tools/build-meshes.mjs        # studio-meshes.js 다시 만들기
    node tools/check-studio.mjs        # 표에 안 적힌 것이 있으면 여기서 걸린다

CC0 인지 먼저 확인하십시오. glTF-Sample-Assets 의 `Models/<이름>/README.md`
Legal 항목을 직접 읽어야 합니다. 목록 파일(`Models/Models.md`)의 요약은
한 줄에 여러 라이선스가 섞여 나와 잘못 읽기 쉽습니다.

뼈대는 스튜디오 페이지에 통째로 실립니다. 한 모델이 대략 5KB(압축 후)이니
무턱대고 늘리지 마십시오. 형태가 또렷한 것만 남기는 편이 낫습니다.
