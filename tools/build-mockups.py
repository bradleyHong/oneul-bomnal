# -*- coding: utf-8 -*-
"""현장 목업 판을 굽는다.

크로마(초록·마젠타)로 비워 둔 화면 자리를 찾아 네 귀퉁이를 재고, 그
좌표를 판 크기로 나눠 0~1 로 적어 둔다. 웹에서는 판이 어떤 크기로
보이든 같은 자리를 가리킨다.

크로마는 자산에서 지운다. 그 위에 작품이 올라가므로 보일 일이 없지만,
작품이 끝내 안 뜨면 형광 초록 판이 그대로 남는다. 꺼진 화면처럼
어둡게 칠해 두면 그 상태로도 사진이 완성되어 보인다.

  python3 tools/build-mockups.py
"""
from PIL import Image, ImageFilter
from collections import deque
import numpy as np, json, os, sys

SRC = os.path.expanduser("~/.claude/uploads/283a6f22-c257-5282-990b-07e5d1520a57")
OUT = os.path.join("assets", "mockup")

# 판 하나에 면이 둘일 수 있다(두 면 기둥). surfaces 는 그 면들이다.
PLATES = [
    {"id": "cityhall", "file": "4fe60e89-image.png", "width": 1500,
     "label": "시청 외벽 대형 전광판", "place": "청사 외벽 · 광장에서 보는 화면",
     "surfaces": [{"id": "main", "chroma": "magenta"}]},
    {"id": "column-hall", "file": "ed3991e1-image.png", "width": 900,
     "label": "기둥형 세로 사이니지", "place": "로비 기둥 · 올려다보는 화면",
     "surfaces": [{"id": "main", "chroma": "green"}]},
    {"id": "column-atrium", "file": "e9e3f8d0-image.png", "width": 900,
     "label": "기둥형 세로 사이니지", "place": "아트리움 기둥 · 사방에서 보는 화면",
     "surfaces": [{"id": "main", "chroma": "green"}]},
    {"id": "column-two", "file": "84a68ab9-image.png", "width": 900,
     "label": "두 면 기둥 사이니지", "place": "복층 로비 · 두 면이 동시에 도는 화면",
     "surfaces": [{"id": "main", "chroma": "green"}, {"id": "side", "chroma": "magenta"}]},
    {"id": "lobby-led", "file": "b741109c-image.png", "width": 1500,
     "label": "건물 정면 LED 전광판", "place": "주출입구 위 · 지나가며 보는 화면",
     "surfaces": [{"id": "main", "chroma": "magenta"}]},
]

def spill_mask(a):
    """판 밖으로 번진 화면 빛. 크로마 자체보다 옅고 넓게 퍼져 있어
       판을 찾을 때 쓰는 기준으로는 걸리지 않는다. 색상각으로 잡는다 —
       초록(120°)과 마젠타(300°) 언저리이면서 어느 정도 진한 것.

       콘크리트·나무·피부는 그 각도에 들어오지 않는다. 난간 유리가
       초록·마젠타로 보이는 것은 건축이 아니라 기둥 두 면의 빛이다 —
       왼쪽은 마젠타 면, 오른쪽은 초록 면 색과 정확히 같다."""
    f = a.astype(float)
    mx = f.max(2); mn = f.min(2)
    d = mx - mn
    sat = np.where(mx > 0, d / np.maximum(mx, 1), 0)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    hue = np.zeros_like(mx)
    with np.errstate(invalid="ignore", divide="ignore"):
        i = (mx == r) & (d > 0); hue[i] = (60 * ((g - b) / d))[i]
        i = (mx == g) & (d > 0); hue[i] = (60 * (2 + (b - r) / d))[i]
        i = (mx == b) & (d > 0); hue[i] = (60 * (4 + (r - g) / d))[i]
    hue = np.mod(hue, 360)
    near = lambda h0, w: np.abs((hue - h0 + 180) % 360 - 180) < w
    return (sat > 0.16) & (mx > 26) & (near(120, 42) | near(300, 42))

def mask_of(a, chroma):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if chroma == "green":
        return (g > 110) & (g > r + 60) & (g > b + 60)
    return (r > 110) & (b > 110) & (r > g + 60) & (b > g + 60)

def biggest(m):
    """화면이 켜지면 바닥과 유리에 그 색이 비친다. 그 반사까지 크로마로
       세면 사각형이 화면 밖으로 번진다. 가장 큰 덩어리만 남긴다.

       4/1 로 줄여 훑는다. 판마다 수백만 화소라 원본에서 훑으면 느리고,
       덩어리를 가르는 데에는 그만한 해상도가 필요 없다."""
    s = 4
    small = m[::s, ::s]
    seen = np.zeros_like(small, bool)
    best, bestn = None, 0
    H, W = small.shape
    for y0 in range(H):
        for x0 in range(W):
            if not small[y0, x0] or seen[y0, x0]: continue
            q = deque([(y0, x0)]); seen[y0, x0] = True; cells = []
            while q:
                y, x = q.popleft(); cells.append((y, x))
                for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                    ny, nx = y+dy, x+dx
                    if 0 <= ny < H and 0 <= nx < W and small[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
            if len(cells) > bestn: bestn, best = len(cells), cells
    keep = np.zeros_like(small, bool)
    for y, x in best: keep[y, x] = True
    # 줄여서 고른 덩어리를 원본 크기로 되돌린 뒤, 원래 마스크와 겹친다
    up = np.kron(keep, np.ones((s, s), bool))[:m.shape[0], :m.shape[1]]
    pad = np.zeros_like(m); pad[:up.shape[0], :up.shape[1]] = up
    grown = pad.copy()
    for _ in range(2):                      # 줄인 격자의 경계를 조금 넓힌다
        grown[1:, :] |= pad[:-1, :]; grown[:-1, :] |= pad[1:, :]
        grown[:, 1:] |= pad[:, :-1]; grown[:, :-1] |= pad[:, 1:]
        pad = grown.copy()
    return m & grown

def hull(pts):
    pts = sorted(map(tuple, pts))
    def half(ps):
        out = []
        for p in ps:
            while len(out) >= 2:
                (ax, ay), (bx, by) = out[-2], out[-1]
                if (bx-ax)*(p[1]-ay) - (by-ay)*(p[0]-ax) > 0: break
                out.pop()
            out.append(p)
        return out
    return np.array(half(pts)[:-1] + half(pts[::-1])[:-1], float)

def area(ring):
    s = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]; x2, y2 = ring[(i+1) % len(ring)]
        s += x1*y2 - x2*y1
    return abs(s) / 2

def corners(h):
    """넓이가 가장 큰 네 점이 진짜 귀퉁이다. 극점을 그대로 쓰면 무언가에
       가려졌을 때 '보이는 끝'을 모서리로 착각한다."""
    best, bestA, n = None, -1, len(h)
    for i in range(0, n, max(1, n // 120)):
        p1 = h[i]
        p2 = h[int(np.argmax(((h - p1) ** 2).sum(1)))]
        d = p2 - p1; L = np.hypot(*d) or 1
        side = ((h - p1)[:, 0] * d[1] - (h - p1)[:, 1] * d[0]) / L
        if side.max() <= 0 or side.min() >= 0: continue
        q = np.array([p1, h[int(np.argmax(side))], p2, h[int(np.argmin(side))]])
        a = area(q)
        if a > bestA: bestA, best = a, q
    return best

def order(q):
    """위 둘·아래 둘로 가른 뒤 좌우를 정한다. 무게중심 각도로 돌리는
       방법은 기울어진 면에서 자꾸 어긋났다."""
    q = q[np.argsort(q[:, 1])]
    top = q[:2][np.argsort(q[:2][:, 0])]
    bot = q[2:][np.argsort(q[2:][:, 0])]
    return [top[0], top[1], bot[0], bot[1]]          # 좌상 우상 좌하 우하

def true_ratio(q, W, H):
    """사진에 찍힌 네 귀퉁이로 원래 직사각형의 가로:세로를 되찾는다.

    사진 속 비율을 그대로 쓰면 안 된다. 원근에 눌린 값이라, 비스듬히
    찍힌 면일수록 실제와 멀어진다. 화면 중심이 광축이고 화소가
    정사각이라고 두면 초점거리를 풀 수 있고, 그러면 원래 비율이 나온다.
    (Zhang & He, 화이트보드 펴기에 쓰는 것과 같은 방법)

    거의 정면에서 찍혀 소실점이 무한대로 가면 식이 풀리지 않는다.
    그때는 사진에 보이는 비율이 곧 실제 비율이므로 그대로 쓴다."""
    # 좌상 우상 좌하 우하 → m1 m2 m3 m4 (좌상 우상 좌하 우하)
    c = np.array([W / 2.0, H / 2.0])
    m = [np.array([p[0] - c[0], p[1] - c[1], 1.0]) for p in q]
    m1, m2, m3, m4 = m[0], m[1], m[2], m[3]
    def k(a, b, d):
        num = np.dot(np.cross(a, b), d)
        return num
    d2 = k(m1, m4, m2)
    d3 = k(m1, m4, m3)
    if abs(d3) < 1e-9 or abs(d2) < 1e-9:
        return None
    k2 = k(m1, m4, m3) / k(m2, m4, m3)
    k3 = k(m1, m4, m2) / k(m3, m4, m2)
    n2 = k2 * m2 - m1
    n3 = k3 * m3 - m1
    if abs(n2[2]) < 1e-9 or abs(n3[2]) < 1e-9:
        return None
    f2 = -(n2[0] * n3[0] + n2[1] * n3[1]) / (n2[2] * n3[2])
    if not np.isfinite(f2) or f2 <= 0:
        return None
    f2 = float(f2)
    num = (n2[0] ** 2 + n2[1] ** 2) / f2 + n2[2] ** 2
    den = (n3[0] ** 2 + n3[1] ** 2) / f2 + n3[2] ** 2
    if den <= 0 or num <= 0:
        return None
    return float(np.sqrt(num / den))

def converges(q):
    """마주 보는 두 변이 얼마나 모이는가. 거의 나란하면 소실점이 멀리
       달아나 위 계산이 불안정해진다 — 정면에 가깝게 찍힌 면이 그렇다.
       그때는 사진에 보이는 비율이 이미 실제에 가까우므로 그것을 쓴다.
       두 방향 중 작은 쪽 각도를 도 단위로 돌려준다."""
    def ang(a, b):
        va, vb = a[1] - a[0], b[1] - b[0]
        na, nb = np.hypot(*va), np.hypot(*vb)
        if na < 1e-9 or nb < 1e-9: return 0.0
        cosv = abs(float(np.dot(va, vb)) / (na * nb))
        return float(np.degrees(np.arccos(min(1.0, cosv))))
    tl, tr, bl, br = q
    return min(ang((tl, tr), (bl, br)), ang((tl, bl), (tr, br)))

os.makedirs(OUT, exist_ok=True)
book = []
for P in PLATES:
    im = Image.open(os.path.join(SRC, P["file"])).convert("RGB")
    a = np.asarray(im).astype(int)
    W, H = im.size
    dark = np.asarray(im).copy()
    panel = np.zeros(a.shape[:2], bool)
    entry = {"id": P["id"], "label": P["label"], "place": P["place"],
             "image": f"./assets/mockup/{P['id']}.webp", "surfaces": []}
    for S in P["surfaces"]:
        m = biggest(mask_of(a, S["chroma"]))
        ys, xs = np.nonzero(m)
        q = order(corners(hull(np.stack([xs, ys], 1))))
        ring = [q[0], q[1], q[3], q[2]]
        cover = m.sum() / area(np.array(ring))
        seen_ratio = float(np.hypot(*(q[1] - q[0])) / max(1e-6, np.hypot(*(q[2] - q[0]))))
        conv = converges(q)
        real = true_ratio(q, W, H) if conv >= 1.2 else None
        # 되찾은 값이 보이는 값의 두 배를 넘게 벌어지면 계산이 미끄러진
        # 것으로 본다. 목업 미리보기지 측량이 아니다.
        if real and not (0.5 <= real / seen_ratio <= 2.0):
            real = None
        entry["surfaces"].append({
            "id": S["id"],
            # 0~1 로 적어 둔다. 판이 어떤 크기로 보이든 같은 자리를 가리킨다.
            "quad": [[round(float(x) / W, 5), round(float(y) / H, 5)] for x, y in q],
            "seenRatio": round(seen_ratio, 3),
            "ratio": round(real if real else seen_ratio, 3),
            "ratioFrom": "복원" if real else "사진 그대로",
        })
        print(f"  {P['id']:<14} {S['id']:<5} 채움 {cover:.3f} · 모임각 {conv:5.2f}° · "
              f"보이는 비 {seen_ratio:.3f} → 쓰는 비 "
              f"{(real if real else seen_ratio):.3f} ({'복원' if real else '사진 그대로'})")
        # 작품이 끝내 안 뜨면 형광 판이 그대로 남는다. 꺼진 화면처럼 칠한다.
        dark[m] = (11, 15, 24)
        panel |= m
    # 화면이 켜져 있으면 바닥과 난간에 그 색이 비친다. 판 자리 밖에 남은
    # 그 빛은 '형광 초록·마젠타'로 굳어 있어서, 위에 올라갈 작품이 무슨
    # 색이든 부딪힌다. 밝기는 남기고 색만 뺀다 — 빛이 있었다는 사실은
    # 지우지 않고, 무슨 색이었는지만 지운다.
    spill = spill_mask(a) & ~panel
    if spill.any():
        lum = (dark[..., 0] * 0.2126 + dark[..., 1] * 0.7152 + dark[..., 2] * 0.0722)
        for ch in range(3):
            v = dark[..., ch].astype(float)
            dark[..., ch] = np.where(spill, np.clip(v * 0.18 + lum * 0.82, 0, 255), v).astype(np.uint8)
        print(f"  {P['id']:<14} 번진 빛 {int(spill.sum()):>8} 화소의 색을 뺐다")

    out = Image.fromarray(dark)
    # 칠한 자리의 경계가 톱니로 남는다. 아주 약하게만 눌러 준다.
    out = out.filter(ImageFilter.SMOOTH)
    w = P["width"]
    out = out.resize((w, round(H * w / W)), Image.LANCZOS)
    path = os.path.join(OUT, P["id"] + ".webp")
    out.save(path, "WEBP", quality=80, method=6)
    entry["size"] = [out.width, out.height]
    book.append(entry)
    print(f"  {P['id']:<14} → {out.size}  {os.path.getsize(path)/1024:.0f}KB")

json.dump(book, open(os.path.join(OUT, "plates.json"), "w"), ensure_ascii=False, indent=2)
print("\n목업 생성 완료 · " + OUT)
