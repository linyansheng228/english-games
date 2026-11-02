"""Deterministic crops from the supplied character sheet; no generated artwork."""
from pathlib import Path
from collections import deque
from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / 'assets' / 'images'
sheet = Image.open(DIR / 'cats.png').convert('RGB')
crops = {
    'lucy': (130, 115, 490, 359),
    'billy': (574, 5, 878, 365),
    'milo': (1020, 10, 1479, 367),
    'tommy': (32, 502, 494, 789),
    'sammy': (529, 444, 841, 790),
    'maggie': (910, 477, 1260, 786),
    'puffy': (1353, 500, 1752, 789),
}
for name, box in crops.items():
    rgb = np.array(sheet.crop(box))
    h, w = rgb.shape[:2]
    # Only whites connected to the crop boundary are background. White fur stays.
    eligible = (rgb.min(axis=2) > 212) & (np.ptp(rgb, axis=2) < 31)
    outside = np.zeros((h, w), dtype=bool)
    queue = deque([(x, y) for x in range(w) for y in (0, h-1)] +
                  [(x, y) for y in range(h) for x in (0, w-1)])
    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or outside[y, x] or not eligible[y, x]:
            continue
        outside[y, x] = True
        queue.extend(((x-1, y), (x+1, y), (x, y-1), (x, y+1)))
    alpha = np.where(outside, 0, 255).astype('uint8')
    rgba = Image.fromarray(np.dstack((rgb, alpha)))
    bounds = rgba.getbbox()
    rgba = rgba.crop(bounds)
    padded = Image.new('RGBA', (rgba.width + 8, rgba.height + 8))
    padded.alpha_composite(rgba, (4, 4))
    padded.save(DIR / f'{name}.png')
    assert padded.getextrema()[3] == (0, 255)
    print(name, padded.size, 'transparent RGBA')

# Exact pixels of the original box front, layered above Lucy after placement.
room = Image.open(DIR / 'room.png').convert('RGBA')
mask = Image.new('L', room.size)
ImageDraw.Draw(mask).polygon([(28,550),(49,450),(199,517),(400,449),(436,526),
                             (401,545),(402,617),(200,691),(58,631)], fill=255)
room.putalpha(mask)
room.save(DIR / 'box-front.png')

# A checkerboard contact sheet makes transparency and missing body parts visible.
preview = Image.new('RGB', (1000, 600), '#d0d6dc')
draw = ImageDraw.Draw(preview)
for y in range(0,600,20):
    for x in range(0,1000,20):
        if (x//20+y//20)%2: draw.rectangle((x,y,x+19,y+19), fill='#eef0f2')
for i, name in enumerate(crops):
    cat = Image.open(DIR / f'{name}.png')
    cat.thumbnail((225,235))
    x, y = (i%4)*250, (i//4)*300
    preview.paste(cat, (x+(250-cat.width)//2,y+20),cat)
    draw.text((x+90,y+270),name,fill='black')
preview.save(ROOT / 'tools' / 'cutout-preview.png')
