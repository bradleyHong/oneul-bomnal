# -*- coding: utf-8 -*-
"""봄날 미디어박스 · USB 플레이어 (박스 안에서 도는 작은 서버)

현장에서 담당자가 하는 일은 USB를 꽂는 것 하나다. 그 이상을 요구하면
결국 우리가 현장에 가야 한다. 그래서 이 프로그램은 이렇게 움직인다.

  1. 꽂힌 USB를 스스로 찾는다. 경로를 물어보지 않는다.
  2. 안에 있는 영상을 순서대로 재생목록으로 만든다.
  3. USB를 뽑았다 다른 걸 꽂으면 알아서 갈아탄다. 재부팅이 필요 없다.
  4. USB가 없으면 마지막으로 복사해 둔 영상으로 계속 돈다. 화면이 검게 죽지 않는다.

브라우저에서 https 페이지는 로컬 파일을 읽지 못한다. 그래서 재생 화면도
이 서버가 같이 내보낸다. 인터넷이 끊겨도 상관없는 구조이기도 하다.

의존 라이브러리가 없다. 라즈베리파이 OS에 들어 있는 python3만으로 돈다.

    python3 server.py                 # 기본 8080
    python3 server.py --port 9000
    python3 server.py --dir /mnt/usb  # 마운트 위치를 직접 지정
"""
import argparse
import json
import mimetypes
import os
import re
import shutil
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "cache")          # USB가 빠졌을 때 틀 영상
VIDEO_EXT = (".mp4", ".m4v", ".mov", ".webm", ".mkv")
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp")
PLAYABLE = VIDEO_EXT + IMAGE_EXT

# 사람이 흔히 쓰는 USB 마운트 자리. 위에서부터 찾는다.
MOUNT_ROOTS = ["/media", "/run/media", "/mnt", "/Volumes"]
# 시스템 디스크를 USB로 착각하면 안 된다.
SKIP_NAMES = {"boot", "boot firmware", "rootfs", "macintosh hd", "system", "recovery"}

state = {"rev": 0, "items": [], "source": None, "label": None, "cached": False}
lock = threading.Lock()


# ── USB 찾기 ────────────────────────────────────────────────────────
def looks_like_media(path):
    """이 폴더에 우리가 틀 수 있는 파일이 하나라도 있는가."""
    try:
        for name in os.listdir(path):
            if name.startswith("."):
                continue
            if name.lower().endswith(PLAYABLE):
                return True
    except OSError:
        return False
    return False


def find_usb(explicit=None):
    """꽂힌 USB를 찾아 (경로, 이름)으로 돌려준다. 없으면 (None, None)."""
    if explicit:
        return (explicit, os.path.basename(explicit.rstrip("/"))) if os.path.isdir(explicit) else (None, None)

    for root in MOUNT_ROOTS:
        if not os.path.isdir(root):
            continue
        try:
            entries = sorted(os.listdir(root))
        except OSError:
            continue
        for name in entries:
            if name.startswith("."):
                continue
            path = os.path.join(root, name)
            if not os.path.isdir(path) or name.lower() in SKIP_NAMES:
                continue
            # /media/pi/USB 처럼 사용자 이름이 한 겹 더 있는 경우가 많다
            if looks_like_media(path):
                return path, name
            try:
                for sub in sorted(os.listdir(path)):
                    subpath = os.path.join(path, sub)
                    if (not sub.startswith(".") and os.path.isdir(subpath)
                            and sub.lower() not in SKIP_NAMES and looks_like_media(subpath)):
                        return subpath, sub
            except OSError:
                continue
    return None, None


def scan(path):
    """폴더 안 재생 대상을 이름순으로. 01_, 02_ 처럼 앞에 번호를 붙이면 그 순서다."""
    out = []
    try:
        names = sorted(os.listdir(path), key=lambda n: n.lower())
    except OSError:
        return out
    for name in names:
        if name.startswith(".") or not name.lower().endswith(PLAYABLE):
            continue
        full = os.path.join(path, name)
        if not os.path.isfile(full):
            continue
        try:
            size = os.path.getsize(full)
        except OSError:
            continue
        if size <= 0:
            continue
        out.append({
            "name": name,
            "url": "/media/" + name,
            "size": size,
            "kind": "image" if name.lower().endswith(IMAGE_EXT) else "video",
        })
    return out


def remember(src_dir, items):
    """USB를 뽑아도 화면이 죽지 않도록 로컬에 한 벌 복사해 둔다.

    현장에서 담당자가 USB를 뽑아 가는 일이 실제로 있다. 그때 검은 화면이
    떠 있으면 우리가 불려 간다. 그래서 마지막 정상 재생분을 남겨 둔다."""
    try:
        os.makedirs(CACHE, exist_ok=True)
        keep = {it["name"] for it in items}
        for old in os.listdir(CACHE):
            if old not in keep:
                try:
                    os.remove(os.path.join(CACHE, old))
                except OSError:
                    pass
        free = shutil.disk_usage(CACHE).free
        for it in items:
            dst = os.path.join(CACHE, it["name"])
            if os.path.exists(dst) and os.path.getsize(dst) == it["size"]:
                continue
            if it["size"] + (2 << 30) > free:      # 여유 2GB는 남긴다
                continue
            shutil.copy2(os.path.join(src_dir, it["name"]), dst)
            free -= it["size"]
    except Exception:
        pass                                        # 복사 실패가 재생을 막으면 안 된다


def watch(explicit, interval=3.0):
    """USB가 꽂히고 빠지는 것을 지켜본다. 바뀌면 rev를 올려 화면에 알린다."""
    while True:
        path, label = find_usb(explicit)
        items, source, cached = [], None, False

        if path:
            items = scan(path)
            source, cached = path, False
        if not items and os.path.isdir(CACHE):
            items = scan(CACHE)
            source, cached = CACHE, True
            label = label or "마지막 재생분"

        with lock:
            changed = ([i["name"] for i in items] != [i["name"] for i in state["items"]]
                       or source != state["source"])
            if changed:
                state["items"] = items
                state["source"] = source
                state["label"] = label
                state["cached"] = cached
                state["rev"] += 1
                print("[usb] %s · %d편%s" % (label or "없음", len(items),
                                             " (복사본)" if cached else ""), flush=True)
        if path and not cached and items:
            remember(path, items)
        time.sleep(interval)


# ── 서버 ────────────────────────────────────────────────────────────
RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass                                        # 로그가 SD카드를 채우면 안 된다

    def _head(self, status, ctype, length, extra=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(length))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()

    def _json(self, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self._head(200, "application/json; charset=utf-8", len(body))
        self.wfile.write(body)

    def _asset(self, name, ctype):
        path = os.path.join(HERE, name)
        if not os.path.isfile(path):
            self._head(404, "text/plain; charset=utf-8", 0)
            return
        with open(path, "rb") as f:
            body = f.read()
        self._head(200, ctype, len(body))
        self.wfile.write(body)

    def _media(self, name):
        """영상은 Range 요청을 받아야 한다. 안 그러면 브라우저가 되감기에서 막힌다."""
        with lock:
            source = state["source"]
        if not source:
            self._head(404, "text/plain; charset=utf-8", 0)
            return
        safe = os.path.basename(name)               # 경로 타고 올라가는 것을 막는다
        path = os.path.join(source, safe)
        if not os.path.isfile(path):
            self._head(404, "text/plain; charset=utf-8", 0)
            return

        total = os.path.getsize(path)
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        rng = self.headers.get("Range")
        start, end = 0, total - 1
        status = 200
        extra = {"Accept-Ranges": "bytes"}

        if rng:
            m = RANGE_RE.match(rng.strip())
            if m:
                a, b = m.group(1), m.group(2)
                if a:
                    start = min(int(a), total - 1)
                    if b:
                        end = min(int(b), total - 1)
                elif b:                              # bytes=-500 (뒤에서 500바이트)
                    start = max(0, total - int(b))
                if start > end:
                    start, end = 0, total - 1
                status = 206
                extra["Content-Range"] = "bytes %d-%d/%d" % (start, end, total)

        length = end - start + 1
        self._head(status, ctype, length, extra)
        if self.command == "HEAD":
            return
        try:
            with open(path, "rb") as f:
                f.seek(start)
                left = length
                while left > 0:
                    chunk = f.read(min(1 << 20, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass                                     # 브라우저가 먼저 끊는 것은 정상이다

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html"):
            self._asset("index.html", "text/html; charset=utf-8")
        elif path == "/usb.css":
            self._asset("usb.css", "text/css; charset=utf-8")
        elif path == "/usb.js":
            self._asset("usb.js", "application/javascript; charset=utf-8")
        elif path == "/playlist.json":
            with lock:
                self._json({
                    "rev": state["rev"],
                    "label": state["label"],
                    "cached": state["cached"],
                    "mounted": bool(state["source"]) and not state["cached"],
                    "items": state["items"],
                })
        elif path.startswith("/media/"):
            self._media(path[len("/media/"):])
        else:
            self._head(404, "text/plain; charset=utf-8", 0)


def main():
    ap = argparse.ArgumentParser(description="봄날 미디어박스 USB 플레이어")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--dir", default=None, help="USB 마운트 위치를 직접 지정")
    args = ap.parse_args()

    threading.Thread(target=watch, args=(args.dir,), daemon=True).start()
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print("[usb] http://127.0.0.1:%d 에서 대기합니다" % args.port, flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
