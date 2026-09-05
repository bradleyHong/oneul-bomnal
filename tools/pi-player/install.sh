#!/usr/bin/env bash
# 봄날 전용 플레이어 · 라즈베리파이 5 (16GB)
#
# 무엇을 하는가: HDMI 만 꽂으면 켜질 때마다 작품이 저절로 돈다.
#   - 부팅하면 크로미움이 전체 화면으로 작품 HTML 을 연다. 마우스도 글자도 없다.
#   - 인터넷이 없어도 된다. 작품은 이 기계 안에 있다.
#   - 화면 절전·화면보호기를 끈다. 하루 종일 켜 두는 물건이다.
#   - 브라우저가 죽으면 10초 안에 다시 뜬다. 하루에 한 번 새로 연다.
#   - 운영 시간을 정하면 그 밖에는 검은 화면이다(HOURS=08-20).
#
# 쓰는 법 (라즈베리파이 OS Desktop, 64-bit, 사용자 pi 로 로그인된 상태):
#   sudo bash install.sh /path/to/BN4-0AC6F6.html
#   sudo HOURS=08-20 bash install.sh /path/to/BN4-0AC6F6.html
#
# 작품 파일은 tools/pack-player.mjs 로 만든 HTML 한 장이다.
set -euo pipefail

ART="${1:-}"
[ -f "$ART" ] || { echo "작품 HTML 파일을 주세요:  sudo bash install.sh BN4-XXXXXX.html"; exit 1; }
USER_NAME="${SUDO_USER:-pi}"
HOME_DIR="$(getent passwd "$USER_NAME" | cut -d: -f6)"
HOURS="${HOURS:-}"

mkdir -p /opt/bomnal
cp "$ART" /opt/bomnal/art.html
chmod 644 /opt/bomnal/art.html
[ -n "$HOURS" ] && echo "$HOURS" > /opt/bomnal/hours || rm -f /opt/bomnal/hours

apt-get update -qq
apt-get install -y -qq chromium unclutter >/dev/null 2>&1 || apt-get install -y -qq chromium-browser unclutter >/dev/null
CHROME="$(command -v chromium || command -v chromium-browser)"

# 재생 스크립트. 브라우저가 죽으면 다시 띄우고, 운영 시간 밖에는 검은 화면을 띄운다.
cat > /opt/bomnal/run.sh <<RUN
#!/usr/bin/env bash
export DISPLAY=:0
export XDG_RUNTIME_DIR=/run/user/\$(id -u)
xset s off -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true
unclutter -idle 0.5 -root >/dev/null 2>&1 &
while true; do
  if [ -f /opt/bomnal/hours ]; then
    H=\$(cat /opt/bomnal/hours); FROM=\${H%-*}; TO=\${H#*-}; NOW=\$(date +%H)
    if [ "\$NOW" -lt "\$FROM" ] || [ "\$NOW" -ge "\$TO" ]; then
      "$CHROME" --kiosk --noerrdialogs --disable-infobars --no-first-run "data:text/html,<body style=background:%23000>" &
      P=\$!; sleep 300; kill \$P 2>/dev/null; continue
    fi
  fi
  "$CHROME" --kiosk --noerrdialogs --disable-infobars --no-first-run --disable-session-crashed-bubble \\
    --autoplay-policy=no-user-gesture-required --check-for-update-interval=31536000 \\
    --enable-features=OverlayScrollbar --overscroll-history-navigation=0 \\
    "file:///opt/bomnal/art.html" &
  P=\$!
  # 하루에 한 번 새로 연다. 메모리를 비우고 혹시 멈춘 그림을 되살린다.
  sleep 86400; kill \$P 2>/dev/null; sleep 2
done
RUN
chmod +x /opt/bomnal/run.sh

# 로그인 세션이 뜨면 시작하고, 죽으면 10초 뒤 다시 뜨는 서비스
cat > /etc/systemd/system/bomnal-player.service <<UNIT
[Unit]
Description=Bomnal media art player
After=graphical.target
Wants=graphical.target

[Service]
User=$USER_NAME
Environment=HOME=$HOME_DIR
ExecStart=/opt/bomnal/run.sh
Restart=always
RestartSec=10

[Install]
WantedBy=graphical.target
UNIT

# 자동 로그인 (라즈베리파이 OS 의 raspi-config 를 쓴다)
raspi-config nonint do_boot_behaviour B4 >/dev/null 2>&1 || true
# 화면이 꺼지지 않게
raspi-config nonint do_blanking 1 >/dev/null 2>&1 || true

systemctl daemon-reload
systemctl enable bomnal-player.service >/dev/null
systemctl restart bomnal-player.service || true

echo "설치 끝. 전원을 다시 넣으면 작품이 돈다.  (작품: /opt/bomnal/art.html)"
echo "작품을 바꾸려면:  sudo cp 새파일.html /opt/bomnal/art.html && sudo systemctl restart bomnal-player"
