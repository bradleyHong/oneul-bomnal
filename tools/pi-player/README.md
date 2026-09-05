# 봄날 전용 플레이어 · 라즈베리파이 5 (16GB) · 1,500,000원

고객이 **HDMI 만 꽂으면** 작품이 도는 물건이다. 작품을 넣고 켜지는 것까지
확인한 뒤에 보낸다. 고객이 할 일은 전원과 HDMI 두 줄이다.

## 안에 무엇이 들어 있나

- 작품 HTML 한 장 (`tools/pack-player.mjs` 로 만든 것). 영상 파일이 아니다.
  엔진이 그때그때 그리므로 어느 화면에 꽂아도 그 해상도로 그린다.
- 부팅하면 크로미움이 전체 화면으로 그 파일을 연다. 마우스도 글자도 없다.
- 인터넷이 없어도 된다. 계약된 번호는 도장 없이 돈다(`license.json` 을 박아 보낸다).
- 브라우저가 죽으면 10초 안에 다시 뜬다. 하루에 한 번 새로 연다.
- 운영 시간(`HOURS=08-20`)을 정하면 그 밖에는 검은 화면이다. 청사 소등 후
  화면만 빛나면 민원이 온다.

## 만드는 순서 (사내)

```bash
# 1. 결제가 끝난 번호를 판매 목록에 넣는다 — 이래야 도장이 안 찍힌다
node tools/mark-sold.mjs BN4-0AC6F6 "구미시청"

# 2. 작품을 HTML 한 장으로 싼다 (규격을 정해 주면 그 비율로 그린다)
node tools/pack-player.mjs BN4-0AC6F6 --w 3840 --h 1080

# 3. 라즈베리파이 5 에 라즈베리파이 OS(64-bit, Desktop) 를 깔고, 그 파일을 옮긴 뒤
sudo bash tools/pi-player/install.sh BN4-0AC6F6.html
sudo HOURS=08-20 bash tools/pi-player/install.sh BN4-0AC6F6.html   # 운영 시간을 두려면

# 4. 전원을 다시 넣어 도는 것을 눈으로 본 뒤에 상자에 넣는다
```

## API 연결 (별도 협의)

같은 작품을 고객 시스템이나 다른 플레이어에서 부르려면 주소 하나면 된다.

```
https://publicbloom.art/play?code=BN4-0AC6F6            전체 화면으로 열거나 iframe 으로
https://publicbloom.art/play?code=BN4-0AC6F6&w=3840&h=1080
https://publicbloom.art/api/art?code=BN4-0AC6F6          JSON — 재생 주소·계약 여부
```

## 왜 영상 파일이 아니라 HTML 인가

영상은 해상도가 박힌다. 3840×1080 으로 뽑은 파일을 1920×540 패널에 틀면
줄이고, 4K 패널에 틀면 늘려서 흐려진다. HTML 은 꽂힌 화면 크기로 그린다.
그리고 5초 한 바퀴가 정확히 맞물려 하루 종일 돌아도 이음매가 없다.
