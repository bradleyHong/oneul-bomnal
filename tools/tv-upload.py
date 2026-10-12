#!/usr/bin/env python3
"""
오늘은 봄날 TV 영상을 비메오에 올린다.

  python3 tools/tv-upload.py <영상.mp4> "<작품 이름>" [--ratio 16:9] [--ai]

  --ai   AI 로 만든 영상. 채널 화면에 "AI 영상"이라고 표시된다

올린 영상은 처음부터 이렇게 잠근다.
  - 비메오 사이트에서는 보이지 않는다 (view: disable)
  - publicbloom.art 안에서만 재생된다 (embed: whitelist)
  - 로고·버튼·제목·재생바를 모두 끈다. 로비 화면에 비메오 글자가 뜨면 안 된다
  - "오늘은 봄날 TV" 폴더에 모은다. 고객사 교육 영상과 섞이지 않게 하려는 것이다

끝나면 api/_tv-library.js 에 붙일 한 줄을 출력한다.
토큰: ~/.vimeo_token 또는 VIMEO_ACCESS_TOKEN (화면에 찍지 않는다)
"""
import json, os, ssl, sys, urllib.request, urllib.error

try:
    import certifi
    CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:  # 맥의 python.org 판은 인증서 묶음이 따로 없다
    CTX = ssl.create_default_context()

API = "https://api.vimeo.com"
FOLDER = "오늘은 봄날 TV"
DOMAINS = ["publicbloom.art", "www.publicbloom.art"]
EMBED = {
    "buttons": {"like": False, "watchlater": False, "share": False, "embed": False,
                "hd": False, "fullscreen": False, "scaling": False},
    "logos": {"vimeo": False},
    "title": {"name": "hide", "owner": "hide", "portrait": "hide"},
    "playbar": False, "volume": False,
}


def token():
    t = os.environ.get("VIMEO_ACCESS_TOKEN")
    if not t:
        p = os.path.expanduser("~/.vimeo_token")
        if os.path.exists(p):
            t = open(p).read().strip()
    if not t:
        sys.exit("토큰이 없습니다. ~/.vimeo_token 에 저장하세요.")
    return t


TOKEN = token()


def call(method, path, body=None, headers=None, raw=None):
    url = path if path.startswith("http") else API + path
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "bearer " + TOKEN)
    req.add_header("Accept", "application/vnd.vimeo.*+json;version=3.4")
    if body is not None:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=600, context=CTX) as r:
            txt = r.read().decode() or "{}"
            return r.status, (json.loads(txt) if txt.strip().startswith("{") else {}), r.headers
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:400]}, e.headers


def folder_id():
    st, d, _ = call("GET", "/me/projects?per_page=100&fields=uri,name")
    for p in d.get("data", []):
        if p["name"] == FOLDER:
            return p["uri"].split("/")[-1]
    st, d, _ = call("POST", "/me/projects", {"name": FOLDER})
    if st >= 300:
        # 지금 토큰에는 폴더를 만드는 권한(create)이 없다. 비메오에서 폴더를
        # 한 번만 손으로 만들어 두면 그다음부터는 여기서 알아서 넣는다.
        print(f"  ※ 비메오에 '{FOLDER}' 폴더가 없어 넣지 못했습니다. 폴더를 만든 뒤 다시 정리하면 됩니다.")
        return None
    return d["uri"].split("/")[-1]


def upload(path, name, ratio, kind="code"):
    size = os.path.getsize(path)
    privacy = {"view": "disable", "embed": "whitelist", "download": False, "add": False, "comments": "nobody"}
    st, d, _ = call("POST", "/me/videos", {
        "upload": {"approach": "tus", "size": size},
        "name": name, "description": "오늘은 봄날 TV", "privacy": privacy, "embed": EMBED,
    })
    if st >= 300 and "view" in str(d):
        # 요금제가 '숨김'을 막으면 일부공개로 낮춘다. 도메인 잠금은 그대로 건다.
        privacy["view"] = "unlisted"
        st, d, _ = call("POST", "/me/videos", {
            "upload": {"approach": "tus", "size": size},
            "name": name, "description": "오늘은 봄날 TV", "privacy": privacy, "embed": EMBED,
        })
    if st >= 300:
        sys.exit("업로드를 시작하지 못했습니다: " + str(d))
    vid = d["uri"].split("/")[-1]
    link = d["upload"]["upload_link"]

    off, chunk = 0, 64 * 1024 * 1024
    with open(path, "rb") as f:
        while off < size:
            f.seek(off)
            part = f.read(chunk)
            st, _, h = call("PATCH", link, raw=part, headers={
                "Tus-Resumable": "1.0.0", "Upload-Offset": str(off),
                "Content-Type": "application/offset+octet-stream"})
            if st not in (200, 204):
                sys.exit(f"전송 실패 ({st}) — 다시 실행하세요")
            off = int(h.get("Upload-Offset", off + len(part)))
            print(f"  {name}: {off * 100 // size}%", flush=True)

    for dom in DOMAINS:
        call("PUT", f"/videos/{vid}/privacy/domains/{dom}")
    fid = folder_id()
    if fid:
        call("PUT", f"/me/projects/{fid}/videos/{vid}")
    st, d, _ = call("GET", f"/videos/{vid}?fields=privacy.view,player_embed_url")
    print(f"완료 {vid} · 공개범위 {d.get('privacy', {}).get('view')}")
    print("api/_tv-library.js 에 붙일 줄:")
    print(json.dumps({"vimeo": vid, "title": name, "kind": kind, "ratio": ratio}, ensure_ascii=False) + ",")


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) < 2:
        sys.exit(__doc__)
    ratio = a[a.index("--ratio") + 1] if "--ratio" in a else "16:9"
    upload(a[0], a[1], ratio, "ai" if "--ai" in a else "code")
