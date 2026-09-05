#!/usr/bin/env bash
# 봄날 미디어박스 · USB 플레이어 설치
#
# 상자에 한 번만 돌리면 된다. 그다음부터는 전원을 넣으면 바로 재생이다.
#   sudo bash install.sh
#
# 하는 일
#   1. 이 폴더를 /opt/bomnal-usb 로 복사한다
#   2. 재생 서버를 systemd 서비스로 등록한다 (죽으면 스스로 다시 뜬다)
#   3. 로그인하면 크로미움이 전체화면으로 그 주소를 연다
#   4. 화면 보호기와 절전을 끈다. 로비 화면이 꺼지면 안 된다.
set -euo pipefail

APP_DIR=/opt/bomnal-usb
PORT="${PORT:-8080}"
HOURS="${HOURS:-}"              # 예: HOURS=08-20 bash install.sh
RUN_USER="${SUDO_USER:-$(id -un)}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "sudo 로 실행해 주세요:  sudo bash install.sh" >&2
  exit 1
fi

echo "▸ 프로그램 복사 → $APP_DIR"
install -d -o "$RUN_USER" -g "$RUN_USER" "$APP_DIR"
install -o "$RUN_USER" -g "$RUN_USER" -m 644 \
  "$SRC_DIR/server.py" "$SRC_DIR/index.html" "$SRC_DIR/usb.css" "$SRC_DIR/usb.js" "$APP_DIR/"
install -d -o "$RUN_USER" -g "$RUN_USER" "$APP_DIR/cache"

echo "▸ 재생 서버 등록"
cat >/etc/systemd/system/bomnal-usb.service <<EOF
[Unit]
Description=봄날 미디어박스 USB 플레이어
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/python3 $APP_DIR/server.py --port $PORT
# 어떤 이유로 멈추든 5초 뒤에 다시 뜬다. 현장에 사람이 없다는 전제다.
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now bomnal-usb.service

echo "▸ 켜면 바로 재생되도록 등록"
URL="http://127.0.0.1:$PORT/"
[[ -n "$HOURS" ]] && URL="$URL?hours=$HOURS"

AUTOSTART_DIR="/home/$RUN_USER/.config/autostart"
install -d -o "$RUN_USER" -g "$RUN_USER" "$AUTOSTART_DIR"
CHROME_BIN="$(command -v chromium-browser || command -v chromium || echo /usr/bin/chromium-browser)"

cat >"$AUTOSTART_DIR/bomnal-usb.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=봄날 미디어박스
# --kiosk        : 주소창 없는 전체화면
# --autoplay-*   : 사람이 누르지 않아도 영상이 시작되게
# --incognito    : 껐다 켤 때마다 같은 상태로 시작
Exec=$CHROME_BIN --kiosk --incognito --noerrdialogs --disable-infobars \\
  --autoplay-policy=no-user-gesture-required \\
  --disable-features=Translate,MediaSessionService \\
  --check-for-update-interval=31536000 \\
  --disable-session-crashed-bubble --disable-pinch --overscroll-history-navigation=0 \\
  "$URL"
X-GNOME-Autostart-enabled=true
EOF
chown "$RUN_USER":"$RUN_USER" "$AUTOSTART_DIR/bomnal-usb.desktop"

echo "▸ 화면 보호기·절전 끄기"
LX_DIR="/home/$RUN_USER/.config/lxsession/LXDE-pi"
if [[ -d "$(dirname "$LX_DIR")" ]] || [[ -d /etc/xdg/lxsession ]]; then
  install -d -o "$RUN_USER" -g "$RUN_USER" "$LX_DIR"
  cat >"$LX_DIR/autostart" <<'EOF'
@xset s off
@xset -dpms
@xset s noblank
EOF
  chown "$RUN_USER":"$RUN_USER" "$LX_DIR/autostart"
fi

echo
echo "끝났습니다."
echo "  재생 주소 : $URL"
echo "  상태 보기 : systemctl status bomnal-usb"
echo "  기록 보기 : journalctl -u bomnal-usb -f"
echo
echo "USB를 꽂으면 몇 초 안에 바로 재생됩니다. 다시 시작하지 않아도 됩니다."
