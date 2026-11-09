"""Background texture for the Playground exhibition page (public/playground/texture.png).

Sand scattered here and there: a fine stipple whose density drifts in soft clouds, and a few faint
halftone patches on a tilted grid. Black dots on a transparent tile that repeats seamlessly.
The page shows it at half size (2x pixels), so 1400 px here is a 700 px tile on screen.

    pip install numpy pillow
    python3 scripts/make_playground_texture.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw

SIZE = 1400          # tile size in image pixels
SEED = 7
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'playground', 'texture.png')

rng = np.random.default_rng(SEED)
yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32)


def wrapped_blob(cx, cy, sigma):
    """A soft cloud that wraps around the tile edges so the tile repeats without a seam."""
    dx = np.abs(xx - cx); dx = np.minimum(dx, SIZE - dx)
    dy = np.abs(yy - cy); dy = np.minimum(dy, SIZE - dy)
    return np.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma))


# where sand gathers: a handful of clouds of different sizes
density = np.zeros((SIZE, SIZE), np.float32)
for _ in range(9):
    density += rng.uniform(0.35, 1.0) * wrapped_blob(rng.uniform(0, SIZE), rng.uniform(0, SIZE), rng.uniform(90, 260))
density /= density.max()

img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)


def dot(x, y, r, a):
    # draw at the wrapped copies too when a dot touches an edge
    for ox in (-SIZE, 0, SIZE):
        for oy in (-SIZE, 0, SIZE):
            px, py = x + ox, y + oy
            if -4 < px < SIZE + 4 and -4 < py < SIZE + 4:
                draw.ellipse((px - r, py - r, px + r, py + r), fill=(0, 0, 0, int(a)))


# 1. fine stipple: a thin sprinkle everywhere, much thicker inside the clouds
n = 90000
px = rng.uniform(0, SIZE, n); py = rng.uniform(0, SIZE, n)
keep = rng.uniform(0, 1, n) < 0.025 + 0.5 * density[py.astype(int), px.astype(int)] ** 1.6
for x, y in zip(px[keep], py[keep]):
    big = rng.uniform() < 0.04
    r = rng.uniform(1.4, 2.3) if big else rng.uniform(0.6, 1.25)
    dot(x, y, r, rng.uniform(18, 38) if not big else rng.uniform(28, 46))

# 2. halftone patches on a tilted grid, dots growing toward the middle of each patch
for _ in range(3):
    cx, cy = rng.uniform(0, SIZE), rng.uniform(0, SIZE)
    sigma = rng.uniform(70, 130)
    ang = np.radians(rng.uniform(20, 70))
    step = 11.0
    ca, sa = np.cos(ang), np.sin(ang)
    reach = int(3.2 * sigma / step)
    for i in range(-reach, reach + 1):
        for j in range(-reach, reach + 1):
            gx, gy = i * step, j * step
            x = cx + gx * ca - gy * sa
            y = cy + gx * sa + gy * ca
            w = np.exp(-(gx * gx + gy * gy) / (2 * sigma * sigma)) * rng.uniform(0.55, 1.0)
            r = 2.6 * w
            if r > 0.45:
                dot(x % SIZE, y % SIZE, r, 26)

img.save(OUT, optimize=True)
print('saved', os.path.abspath(OUT), os.path.getsize(OUT) // 1024, 'KB')
