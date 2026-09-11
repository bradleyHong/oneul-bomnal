# -*- coding: utf-8 -*-
"""배너의 그린스크린 자리에 실제 상영 화면을 끼운다.

원본 영상 파일을 이 환경에서 받을 수 없어(vimeo 차단), 같은 콘텐츠가
실제로 걸린 현장 사진에서 화면만 떼어 쓴다. 만들어 낸 그림이 아니라
실제로 상영된 화면이라는 점에서 오히려 정직하다.
"""
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np

U  = "/root/.claude/uploads/283a6f22-c257-5282-990b-07e5d1520a57/"
SD = "/tmp/claude-0/-home-user-oneul-bomnal/283a6f22-c257-5282-990b-07e5d1520a57/scratchpad/"

def coeffs(dst, src):
    """출력의 네 점 dst 가 입력의 네 점 src 에서 오도록 하는 원근 계수."""
    M, B = [], []
    for (dx, dy), (sx, sy) in zip(dst, src):
        M += [[dx, dy, 1, 0, 0, 0, -sx*dx, -sx*dy],
              [0, 0, 0, dx, dy, 1, -sy*dx, -sy*dy]]
        B += [sx, sy]
    return np.linalg.lstsq(np.array(M, float), np.array(B, float), rcond=None)[0]

def grow(quad, px):
    """네 귀퉁이를 무게중심 반대쪽으로 px 만큼 민다.

    초록 자리에 딱 맞춰 끼우면 가장자리에 초록 실선이 남는다. 마스크를
    넓혀 덮으려 하면 이번엔 워프 바깥의 검은 자리를 끌어온다. 그래서
    내용 쪽을 조금 키운다."""
    cx = sum(p[0] for p in quad) / 4.0
    cy = sum(p[1] for p in quad) / 4.0
    out = []
    for x, y in quad:
        dx, dy = x - cx, y - cy
        n = (dx*dx + dy*dy) ** 0.5 or 1
        out.append((x + dx/n*px, y + dy/n*px))
    return out

# ── 1. 현장 사진에서 화면만 떼어 원근을 편다 ────────────────────
photo = Image.open(U + "f94c77f6-image.jpg").convert("RGB")
SRC = [(152, 800), (1626, 856), (127, 1934), (1628, 1856)]   # 좌상 우상 좌하 우하
CW, CH = 1600, 900
flat = photo.transform((CW, CH), Image.PERSPECTIVE,
                       coeffs([(0,0),(CW,0),(0,CH),(CW,CH)], SRC), Image.BICUBIC)

# 가장자리에 천막과 케이블이 조금 걸린다. 안쪽으로 들어와 자른다.
m = int(CW * 0.015)
flat = flat.crop((m, m, CW - m, CH - m)).resize((CW, CH), Image.LANCZOS)

# 투사된 화면을 다시 찍은 사진이라 원본보다 흐리다. 켜져 있는 느낌이
# 나도록 조금만 올린다. 과하게 올리면 합성한 티가 난다.
flat = ImageEnhance.Color(flat).enhance(1.18)
flat = ImageEnhance.Contrast(flat).enhance(1.10)
flat = ImageEnhance.Brightness(flat).enhance(1.04)

# ── 2. 배너의 초록 사각형 자리에 끼운다 ─────────────────────────
banner = Image.open(U + "dfeae13d-image.png").convert("RGB")
BW, BH = banner.size
# 화면의 왼쪽 아래 귀퉁이는 프로젝터 상자에 가려져 있다. 그래서 초록
# 화소의 극점을 찍으면 (688, 552) 가 나오는데 그건 '보이는 끝'이지
# 모서리가 아니다. 아래변이 x=820 에서 617, x=1540 에서 633 이므로
# 그 선을 왼쪽으로 늘여 진짜 귀퉁이를 잡는다.
DST = [(689, 176), (1615, 74), (689, 614), (1624, 634)]      # 좌상 우상 좌하 우하

warped = flat.transform((BW, BH), Image.PERSPECTIVE,
                        coeffs(grow(DST, 5), [(0,0),(CW,0),(0,CH),(CW,CH)]),
                        Image.BICUBIC)

a = np.asarray(banner).astype(int)
r, g, b = a[...,0], a[...,1], a[...,2]
green = (g > 95) & (g > r + 28) & (g > b + 28)
mask = Image.fromarray((green * 255).astype(np.uint8), "L")
mask = mask.filter(ImageFilter.MaxFilter(3))     # 초록 실선까지 덮고
mask = mask.filter(ImageFilter.GaussianBlur(0.7))

out = banner.copy()
out.paste(warped, (0, 0), mask)
out.save(SD + "box-hero.png")
print("합성:", out.size)
