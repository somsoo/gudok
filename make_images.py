#!/usr/bin/env python3
"""OG 이미지·파비콘 생성기 (Pillow 필요: pip install pillow). 브랜드/문구를 바꿨을 때만 다시 실행.

결과물: public/assets/og-image.png (1200x630), public/assets/apple-touch-icon.png (180x180), public/favicon.ico (16/32/48)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
ASSETS = PUBLIC / "assets"
SITE = json.loads((ROOT / "site.json").read_text(encoding="utf-8"))
TEAL, TEAL_DARK, WHITE = (15, 118, 110), (17, 78, 74), (255, 255, 255)

FONT_CANDIDATES = {
    "bold": ["C:/Windows/Fonts/malgunbd.ttf", "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
             "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"],
    "regular": ["C:/Windows/Fonts/malgun.ttf", "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"],
}


def font(kind: str, size: int) -> ImageFont.FreeTypeFont:
    for p in FONT_CANDIDATES[kind]:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    sys.exit(f"한글 폰트를 찾지 못했습니다: {FONT_CANDIDATES[kind]}")


def polyline(d: ImageDraw.ImageDraw, pts, width: int, fill) -> None:
    """둥근 끝·둥근 꺾임 선 (favicon.svg 의 stroke-linecap/linejoin=round 와 같은 모양)."""
    d.line(pts, fill=fill, width=width, joint="curve")
    r = width / 2
    for x, y in pts:
        d.ellipse((x - r, y - r, x + r, y + r), fill=fill)


def won_mark(size: int, bg=TEAL, fg=WHITE) -> Image.Image:
    """favicon.svg(64 단위 좌표)를 4배 크기로 그린 뒤 줄여서 안티에일리어싱."""
    ss = size * 4
    k = ss / 64
    img = Image.new("RGBA", (ss, ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, ss - 1, ss - 1), radius=int(14 * k), fill=bg)
    polyline(d, [(13 * k, 17 * k), (22 * k, 47 * k), (32 * k, 24 * k), (42 * k, 47 * k), (51 * k, 17 * k)],
             int(5.5 * k), fg)
    polyline(d, [(10 * k, 29 * k), (54 * k, 29 * k)], int(4 * k), fg)
    polyline(d, [(12 * k, 37 * k), (52 * k, 37 * k)], int(4 * k), fg)
    return img.resize((size, size), Image.LANCZOS)


def og_image() -> Image.Image:
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), TEAL)
    d = ImageDraw.Draw(img)
    for y in range(h):  # 세로 그라데이션
        t = y / (h - 1)
        d.line([(0, y), (w, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(TEAL, TEAL_DARK)))
    mark = won_mark(132, bg=WHITE, fg=TEAL)
    img.paste(mark, (80, 82), mark)
    d.text((80, 250), SITE["brand"], font=font("bold", 104), fill=WHITE)
    d.text((84, 385), SITE["tagline"], font=font("regular", 50), fill=(204, 251, 241))
    x, y = 84, 488
    chip_font = font("bold", 30)
    for label in ("OTT·음악·AI 요금 비교", "결합·제휴 할인", "해지·환불 방법"):
        tw = d.textlength(label, font=chip_font)
        d.rounded_rectangle((x, y, x + tw + 44, y + 58), radius=29, fill=(29, 140, 131))
        d.text((x + 22, y + 9), label, font=chip_font, fill=WHITE)
        x += tw + 44 + 16
    dom = SITE["domain"]
    df = font("regular", 28)
    d.text((w - 80 - d.textlength(dom, font=df), 96), dom, font=df, fill=(153, 246, 228))
    return img


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    og = og_image()
    og.save(ASSETS / "og-image.png", optimize=True)
    if (ASSETS / "og-image.png").stat().st_size > 300_000:  # 체크리스트 6-4: 300KB 이하
        og.quantize(colors=128, method=Image.Quantize.MEDIANCUT).save(ASSETS / "og-image.png", optimize=True)
    icon = won_mark(180)
    bg = Image.new("RGB", icon.size, TEAL)  # iOS 는 투명 영역을 검게 칠하므로 배경을 채운다
    bg.paste(icon, (0, 0), icon)
    bg.save(ASSETS / "apple-touch-icon.png", optimize=True)
    won_mark(256).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    for f in (ASSETS / "og-image.png", ASSETS / "apple-touch-icon.png", PUBLIC / "favicon.ico"):
        print(f.relative_to(ROOT), f.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
