#!/usr/bin/env python3
"""
아나모픽 작품(렌탈 LED 2:1, 15초 루프)을 ArtWork Studio(/studio) 목록에 싣는다.

  python3 tools/studio-anamorphic.py

- 목록은 works/studio-gl/anamorphic.json (id · 제목 · 설명 · 원본 파일(오늘은봄날 TV/ 기준) · 비메오).
- 카드 미리보기(works/studio-gl/preview/<id>.mp4 · .jpg, 864×432)를 원본에서 줄여 만든다.
- 비메오: vid 가 있으면(예전에 올린 봄 연작) 재생 주소만 받아 오고, 없으면 원본을 올린다.
  올린 영상은 비메오 사이트에서 안 보이고 publicbloom.art 안에서만 재생된다 (tools/tv-upload.py).
- 카드 색 띠(colors)는 대표 장면을 2×2로 줄여 네 색을 뽑는다.
- 끝나면 node tools/build-studio-catalog.mjs 를 돌린다 (catalog.js 맨 뒤에 붙는다).
- 아나모픽 원본 코드는 works/_source/anamorphic/ (웹에 안 올림). 주문이 들어오면 화면 규격으로 다시 렌더한다.
"""
import importlib.util, json, os, subprocess

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TV = SITE + "/오늘은봄날 TV/"
AJ = SITE + "/works/studio-gl/anamorphic.json"
PV = SITE + "/works/studio-gl/preview/"
spec = importlib.util.spec_from_file_location("tv", SITE + "/tools/tv-upload.py")
tv = importlib.util.module_from_spec(spec); spec.loader.exec_module(tv)


def save(L):
    json.dump(L, open(AJ, "w"), ensure_ascii=False, indent=1)


L = json.load(open(AJ))
for e in L:
    src = TV + e["file"]
    mp4, jpg = PV + e["id"] + ".mp4", PV + e["id"] + ".jpg"
    if not os.path.exists(mp4):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-an", "-vf", "scale=864:432:flags=lanczos",
                        "-c:v", "libx264", "-crf", "30", "-preset", "slow", "-pix_fmt", "yuv420p",
                        "-movflags", "+faststart", mp4], check=True)
    if not os.path.exists(jpg):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "5", "-i", mp4, "-frames:v", "1", "-q:v", "4", jpg], check=True)
    if not e.get("colors"):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", "5", "-i", src, "-frames:v", "1",
                              "-vf", "scale=2:2:flags=area,eq=saturation=1.4", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                             capture_output=True, check=True).stdout
        e["colors"] = ["#%02x%02x%02x" % tuple(raw[i:i + 3]) for i in range(0, 12, 3)]
        save(L)
    if not e.get("vimeo"):
        if e.get("vid"):
            st, d, _ = tv.call("GET", f"/videos/{e['vid']}?fields=player_embed_url")
            e["vimeo"] = d.get("player_embed_url") or f"https://player.vimeo.com/video/{e['vid']}"
        else:
            vid, url = tv.upload(src, f"아나모픽 · {e['title']}", "2:1", kind="studio",
                                 desc="ArtWork Studio 아나모픽 (publicbloom.art/studio)", folder=False)
            e["vid"] = vid
            e["vimeo"] = url or f"https://player.vimeo.com/video/{vid}"
        save(L)
        print(e["id"], "vimeo", e["vimeo"], flush=True)
subprocess.run(["node", "tools/build-studio-catalog.mjs"], cwd=SITE)
print("ANAMORPHIC DONE", flush=True)
