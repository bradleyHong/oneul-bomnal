"""미팅 페이지(/p/mw-...)에 넣을 작품 영상 만들기 — 540×540 정사각 루프 + 240px 썸네일 + works.js 목록.
  python3 tools/make-meet-media.py p/mw-73pc806s
원본은 '오늘은봄날 TV' 폴더의 1080p/LED 규격 렌더. 루프 길이 그대로 자른다(이음매 없이 돌게).
"""
import json, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
TV = SITE / "오늘은봄날 TV"
OUT = SITE / sys.argv[1]
MED = OUT / "media"; MED.mkdir(parents=True, exist_ok=True)

items = []  # (cat, id, name, sub, src, crop)
# 세로 패널(80×200 cm, 2:5) 아나모픽: 화면 한 면에 한 작품씩 그대로 (360×900)
for f in sorted(p for p in (TV / "10_아나모픽_세로패널_80x200").glob("V[0-9][0-9]_*_864x2160.mp4") if not p.name.startswith("._")):
    n, title = re.match(r"(V\d+)_(.+)_864x2160\.mp4$", f.name).groups()
    items.append(("vert", f"vt-{n.lower()}", title, "세로 패널 아나모픽", f, "TALL"))
LIFE = re.compile(r"^life-")
DROP = re.compile(r"^drop-")
for f in sorted(p for p in (TV / "5_ArtWork_Studio_1080p").glob("*_0_*_1920x1080.mp4") if not p.name.startswith("._")):
    m = re.match(r"(.+?)_0_(.+?)_(.+?)_1920x1080\.mp4$", f.name)
    if not m: continue
    wid, name, pal = m.groups()
    cat = "life" if LIFE.match(wid) else "drop" if DROP.match(wid) else "code"
    items.append((cat, wid, name, pal, f, "crop=1080:1080"))
if not any(i[1] == "drop-breeze" for i in items):
    items.append(("drop", "drop-breeze", "바람", "양산", TV / "7_방울방울나_1080p/drop-breeze_바람_1920x1080_30s.mp4", "crop=1080:1080"))
items.append(("drop", "drop-self", "자화상", "방울방울, 나", TV / "7_방울방울나_1080p/drop-self_자화상_1920x1080_30s.mp4", "crop=1080:1080"))
for f in sorted(p for p in (TV / "4_AI루프_렌탈LED규격").glob("[0-9][0-9]_*.mp4") if not p.name.startswith("._")):
    n, title = re.match(r"(\d+)_(.+)_2064x1032\.mp4$", f.name).groups()
    items.append(("ai", f"ai-{n}", title, "AI 장면", f, "crop=1032:1032"))
for f in sorted(p for p in (TV / "2_아나모픽_봄_렌탈LED").glob("A[0-9][0-9]_*.mp4") if not p.name.startswith("._")):
    n, title = re.match(r"(A\d+)_(.+)_2064x1032\.mp4$", f.name).groups()
    items.append(("ana", f"an-{n.lower()}", title.replace("아나모픽 · ", ""), "아나모픽 · 봄", f, "crop=1032:1032"))
for f in sorted(p for p in (TV / "3_아나모픽_크리스마스_렌탈LED").glob("X[0-9][0-9]_*.mp4") if not p.name.startswith("._")):
    n, title = re.match(r"(X\d+)_(.+)_2064x1032\.mp4$", f.name).groups()
    items.append(("xmas", f"xm-{n.lower()}", title, "크리스마스", f, "crop=1032:1032"))

def enc(it):
    cat, wid, name, sub, src, crop = it
    mp4, jpg = MED / f"{wid}.mp4", MED / f"{wid}.jpg"
    if crop == "TALL":
        if not mp4.exists():
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-an", "-vf", "scale=360:900:flags=lanczos,fps=30,format=yuv420p",
                            "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-maxrate", "900k", "-bufsize", "1800k", "-g", "60",
                            "-movflags", "+faststart", str(mp4)], check=True)
        if not jpg.exists():
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "7", "-i", str(mp4), "-frames:v", "1", "-vf", "crop=360:360:0:200,scale=240:240", "-q:v", "5", str(jpg)], check=True)
        return wid
    if not mp4.exists():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-an", "-vf", f"{crop},scale=540:540,fps=30,format=yuv420p",
                        "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-maxrate", "650k", "-bufsize", "1300k", "-g", "60",
                        "-movflags", "+faststart", str(mp4)], check=True)
    if not jpg.exists():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "3", "-i", str(mp4), "-frames:v", "1", "-vf", "scale=240:240", "-q:v", "5", str(jpg)], check=True)
    return wid

with ThreadPoolExecutor(6) as ex:
    for w in ex.map(enc, items): pass

CATS = [("vert", "세로 패널 아나모픽"), ("code", "코드 작품"), ("life", "삶의 선"), ("drop", "방울방울, 나"), ("ai", "AI 장면"), ("ana", "아나모픽"), ("xmas", "크리스마스")]
data = {"cats": [{"id": c, "name": n} for c, n in CATS],
        "works": [dict({"id": w, "cat": c, "name": n, "sub": s}, **({"tall": True} if cr == "TALL" else {})) for (c, w, n, s, _, cr) in items]}
(OUT / "works.js").write_text("// tools/make-meet-media.py 가 만든다\nwindow.MEET_WORKS = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
print(len(items), "works")
