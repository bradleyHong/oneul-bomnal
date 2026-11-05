#!/usr/bin/env python3
"""
ArtWork Studio 크게 보기 영상: 작품 × 색 4가지를 1080p 30초로 렌더해 비메오에 올린다.

  python3 tools/studio-vimeo.py <작품 id> [<작품 id> ...]

- 사이트 폴더에서 `python3 -m http.server 4737` 이 떠 있어야 한다 (렌더가 view.html 을 연다).
- 이미 vimeo.json 에 주소가 있는 색은 건너뛴다. 중간에 끊겨도 다시 돌리면 이어서 한다.
- 올린 영상은 비메오 사이트에서 안 보이고 publicbloom.art 안에서만 재생된다 (tools/tv-upload.py).
- 한 편 올릴 때마다 works/studio-gl/vimeo.json 과 catalog.js 를 고친다. 배포는 따로 한다.
- GPU 렌더 큐는 하나씩: 다음 렌더 전에 헤드리스 크롬을 모두 끄므로 다른 렌더와 같이 돌리지 않는다.
"""
import importlib.util, json, os, subprocess, sys

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = SITE + "/오늘은봄날 TV/5_ArtWork_Studio_1080p"
VJ = SITE + "/works/studio-gl/vimeo.json"
os.makedirs(OUT, exist_ok=True)
spec = importlib.util.spec_from_file_location("tv", SITE + "/tools/tv-upload.py")
tv = importlib.util.module_from_spec(spec); spec.loader.exec_module(tv)

ids = sys.argv[1:]
meta = json.loads(subprocess.run(["node", "-e", """
const fs=require('fs'),vm=require('vm');const got={};const ctx={SGL:new Proxy({add:w=>got[w.id]=w},{get:(t,k)=>k in t?t[k]:()=>''})};vm.createContext(ctx);
for(const id of process.argv.slice(1)) vm.runInContext(fs.readFileSync('works/studio-gl/works/'+id+'.js','utf8'),ctx);
console.log(JSON.stringify(Object.fromEntries(Object.values(got).map(w=>[w.id,{title:w.title,pals:w.palettes.map(p=>p.name)}]))));
""", *ids], cwd=SITE, capture_output=True, text=True).stdout)

for wid in ids:
    for pal in range(4):
        vj = json.load(open(VJ))
        if (vj.get(wid) or [None] * 4)[pal]:
            continue
        title, pname = meta[wid]["title"], meta[wid]["pals"][pal]
        out = f"{OUT}/{wid}_{pal}_{title}_{pname}_1920x1080.mp4"
        if not os.path.exists(out):
            ok = False
            for attempt in range(3):
                subprocess.run(["pkill", "-f", "Google Chrome --headless=new --remote-debugging-port"])
                try:
                    r = subprocess.run(["node", "tools/render-gl-video.mjs",
                        f"http://localhost:4737/works/studio-gl/view.html?work={wid}&pal={pal}&speed=1&capture=1&w=1920&h=1080&aa=1&sub=4",
                        out + ".tmp.mp4", "900", "30"], cwd=SITE, capture_output=True, text=True, env={**os.environ, "CRF": "15"}, timeout=1800)
                    ok = "done" in r.stdout and "ERROR" not in r.stdout
                except subprocess.TimeoutExpired:
                    # 2026-11-06: 900프레임을 다 쓰고 끝맺음에서 멈춘 적이 있다 → 프레임이 다 있으면 받아 준다
                    n = subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v", "-show_entries",
                                        "stream=nb_read_packets", "-of", "csv=p=0", out + ".tmp.mp4"], capture_output=True, text=True).stdout.strip()
                    ok = n == "900"
                    class r: stdout = "timeout, frames " + n
                if ok:
                    break
                print(wid, pal, "retry", attempt, r.stdout[-200:], flush=True)
            if not ok:
                print(wid, pal, "RENDER FAIL", flush=True)
                continue
            os.replace(out + ".tmp.mp4", out)
            print(wid, pal, "rendered", flush=True)
        vid, url = tv.upload(out, f"ArtWork Studio · {title} · {pname}", "16:9", kind="studio",
                             desc="ArtWork Studio 크게 보기 (publicbloom.art/studio)", folder=False)
        vj = json.load(open(VJ))
        vj.setdefault(wid, [None] * 4)[pal] = url or f"https://player.vimeo.com/video/{vid}"
        json.dump(vj, open(VJ, "w"), ensure_ascii=False, indent=1)
        subprocess.run(["node", "tools/build-studio-catalog.mjs"], cwd=SITE)
        print(wid, pal, "uploaded", vid, flush=True)
print("STUDIO VIMEO DONE", flush=True)
