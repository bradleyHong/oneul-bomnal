import sys, glob, re
from PIL import Image
for f in sys.argv[1:]:
    m = re.search(r'\.(\d+)x(\d+)\.rgba$', f); w, h = int(m[1]), int(m[2])
    im = Image.frombytes('RGBA', (w, h), open(f, 'rb').read()).transpose(Image.FLIP_TOP_BOTTOM).convert('RGB')
    im.save(re.sub(r'\.\d+x\d+\.rgba$', '.png', f)); print('png', f)
