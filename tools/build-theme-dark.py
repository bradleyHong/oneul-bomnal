"""styles.css 에 토큰 없이 박힌 먹빛(rgba(16,32,26,a) · #10201a)을 찾아
같은 선택자로 밝은 글자색을 덮어쓰는 규칙을 만든다 → theme26-ink.css

  python3 tools/build-theme-dark.py

styles.css 를 고치면 다시 돌린다. 선택자가 같고 뒤에 실리므로 그대로 이긴다."""
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
css = (root / "styles.css").read_text(encoding="utf-8")
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
INK = re.compile(r"rgba\(\s*16\s*,\s*32\s*,\s*26\s*,\s*([0-9.]+)\s*\)|#10201a", re.I)

def flip(m):
    if m.group(0).lower() == "#10201a":
        return "#f3f2ee"
    a = float(m.group(1))
    return f"rgba(243, 242, 238, {a:.3g})"

def lift(prop, val):
    # 글자색은 어두운 판에서 4.5:1 이 나오도록 바닥을 0.56 으로
    if prop == "color":
        return INK.sub(lambda m: "#f3f2ee" if m.group(0).lower() == "#10201a"
                       else f"rgba(243, 242, 238, {max(float(m.group(1)), 0.56):.3g})", val)
    if prop.startswith("background"):
        # 밝은 판에서 그림자처럼 깔던 먹빛 얼룩은 어두운 판에서 흰 얼룩이 된다. 아주 옅게.
        return INK.sub(lambda m: f"rgba(243, 242, 238, {float(m.group(1)) * 0.35 if m.group(1) else 0.1:.3g})", val)
    return INK.sub(flip, val)

out = []
def walk(block, indent=""):
    i = 0
    while i < len(block):
        j = block.find("{", i)
        if j < 0: break
        sel = block[i:j].strip()
        depth, k = 1, j + 1
        while depth and k < len(block):
            depth += {"{": 1, "}": -1}.get(block[k], 0); k += 1
        body = block[j + 1:k - 1]
        if sel.startswith("@media") or sel.startswith("@supports"):
            inner = []
            saved = len(out); walk(body, indent + "  ")
            got = out[saved:]; del out[saved:]
            if got: out.append(f"{indent}{sel} {{\n" + "\n".join(got) + f"\n{indent}}}")
        elif not sel.startswith("@") and INK.search(body):
            decls = []
            for d in body.split(";"):
                if ":" not in d or not INK.search(d): continue
                p, v = d.split(":", 1)
                decls.append(f"{p.strip()}: {lift(p.strip(), v.strip())};")
            if decls:
                out.append(f"{indent}{sel} {{ " + " ".join(decls) + " }")
        i = k

walk(css)
head = "/* 자동 생성 — tools/build-theme-dark.py. 손으로 고치지 않는다. */\n"
(root / "theme26-ink.css").write_text(head + "\n".join(out) + "\n", encoding="utf-8")
print(len(out), "rules")
