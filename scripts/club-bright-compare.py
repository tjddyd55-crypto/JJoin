#!/usr/bin/env python3
"""Side-by-side compare for club-bright Figma vs app screenshots."""
from __future__ import annotations

import json
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:  # pragma: no cover
    raise SystemExit('Pillow required: pip install pillow') from exc

ROOT = Path(__file__).resolve().parents[1]
FIGMA_DIR = ROOT / 'artifacts' / 'club-bright' / 'figma'
APP_DIR = ROOT / 'artifacts' / 'club-bright' / 'app'
OUT_DIR = ROOT / 'artifacts' / 'club-bright' / 'compare'

PAIRS = [
    ('CLUB_DISCOVERY_360.png', 'discover-360.png', 'discover-360.png'),
    ('CLUB_DISCOVERY_390.png', 'discover-390.png', 'discover-390.png'),
    ('CLUB_DISCOVERY_430.png', 'discover-430.png', 'discover-430.png'),
    ('CLUB_DETAIL_360.png', 'detail-360.png', 'detail-360.png'),
    ('CLUB_DETAIL_390.png', 'detail-390.png', 'detail-390.png'),
    ('CLUB_DETAIL_430.png', 'detail-430.png', 'detail-430.png'),
    ('MY_CLUBS_390.png', 'my-clubs-390.png', 'my-clubs-390.png'),
    ('CLUB_SEARCH_390.png', 'search-390.png', 'search-390.png'),
    ('CLUB_EMPTY_STATES.png', 'fallback-390.png', 'fallback-390.png'),
    ('CLUB_DETAIL_390.png', 'join-cta-390.png', 'join-cta-390.png'),
]


def load_image(path: Path, target_height: int) -> Image.Image:
    img = Image.open(path).convert('RGB')
    if img.height == target_height:
        return img
    ratio = target_height / img.height
    return img.resize((max(1, int(img.width * ratio)), target_height), Image.Resampling.LANCZOS)


def compose(figma: Path, app: Path, out: Path, label: str) -> bool:
    if not figma.exists() or not app.exists():
        print('SKIP', label, 'missing', figma.exists(), app.exists())
        return False
    f = Image.open(figma).convert('RGB')
    a = Image.open(app).convert('RGB')
    height = max(f.height, a.height)
    f2 = load_image(figma, height)
    a2 = load_image(app, height)
    gap = 16
    header = 40
    canvas = Image.new('RGB', (f2.width + a2.width + gap, height + header), '#F4F6F8')
    draw = ImageDraw.Draw(canvas)
    draw.text((8, 10), f'Figma · {figma.name}', fill='#1A2B4A')
    draw.text((f2.width + gap + 8, 10), f'App · {app.name}', fill='#1A2B4A')
    canvas.paste(f2, (0, header))
    canvas.paste(a2, (f2.width + gap, header))
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out)
    print('OK', out)
    return True


def main() -> None:
    results: list[dict[str, object]] = []
    for figma_name, app_name, out_name in PAIRS:
        ok = compose(FIGMA_DIR / figma_name, APP_DIR / app_name, OUT_DIR / out_name, out_name)
        results.append({'compare': out_name, 'ok': ok})
    summary = {
        'pairs': results,
        'ok': sum(1 for r in results if r['ok']),
        'total': len(results),
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / 'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
