from math import cos, pi, sin
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "myfitpick-fashion-hero.png"
OUTPUT = ROOT / "myfitpick-fashion-loop.webp"

frame_count = 48
duration_ms = 167
target = (1280, 720)

source = Image.open(SOURCE).convert("RGB")
frames = []

for index in range(frame_count):
    phase = 2 * pi * index / (frame_count - 1)
    zoom = 1.0 + 0.024 * (1 - cos(phase)) / 2
    crop_width = source.width / zoom
    crop_height = source.height / zoom
    shift_x = 7 * sin(phase)
    shift_y = 3 * sin(phase + pi / 2)
    center_x = source.width / 2 + shift_x
    center_y = source.height / 2 + shift_y
    box = (
        round(center_x - crop_width / 2),
        round(center_y - crop_height / 2),
        round(center_x + crop_width / 2),
        round(center_y + crop_height / 2),
    )
    frame = source.crop(box).resize(target, Image.Resampling.LANCZOS)
    frames.append(frame)

frames[0].save(
    OUTPUT,
    save_all=True,
    append_images=frames[1:],
    duration=duration_ms,
    loop=0,
    quality=80,
    method=3,
)

print(OUTPUT)
