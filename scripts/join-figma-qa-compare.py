#!/usr/bin/env python3
"""Download Figma MCP assets and build side-by-side compare images."""
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FIGMA_DIR = ROOT / "artifacts" / "join-figma-alignment" / "figma"
APP_DIR = ROOT / "artifacts" / "join-figma-alignment" / "app"
COMPARE_DIR = ROOT / "artifacts" / "join-figma-alignment" / "compare"

# Populated from Figma MCP get_screenshot (2026-09-04 session)
FIGMA_ASSETS: dict[str, str] = {
    "figma-join-list-bright-390.png": "https://www.figma.com/api/mcp/asset/99c27d10-b932-4888-b97c-ac82408ebe6d.png",
    "figma-join-detail-bright-390.png": "https://www.figma.com/api/mcp/asset/6d5d249b-346b-41b7-acde-e5174e34cb94.png",
    "figma-join-list-360.png": "https://www.figma.com/api/mcp/asset/8f75c184-f7e7-4a49-9e94-1e29ef06ad13.png",
    "figma-join-list-390.png": "https://www.figma.com/api/mcp/asset/10ab5c68-6729-4611-b161-42d98ca81c8d.png",
    "figma-join-list-430.png": "https://www.figma.com/api/mcp/asset/a545277d-ead2-48b5-b2ec-d04ad1882e2c.png",
    "figma-join-card.png": "https://www.figma.com/api/mcp/asset/5393ab38-5a74-4d1a-981b-bf9aec2f03ca.png",
    "figma-join-detail-360.png": "https://www.figma.com/api/mcp/asset/3630de65-c50f-4188-b3ed-ce41a2b0c94f.png",
    "figma-join-detail-390.png": "https://www.figma.com/api/mcp/asset/5e425eab-4499-4cfa-86fa-188eee124be2.png",
    "figma-join-detail-430.png": "https://www.figma.com/api/mcp/asset/ec6bf62c-3808-4074-b372-a3e4f46bfde2.png",
    "figma-join-detail-full.png": "https://www.figma.com/api/mcp/asset/31c57d60-41c5-4cb8-83a0-34f6beaf2259.png",
    "figma-join-detail-host.png": "https://www.figma.com/api/mcp/asset/5806f224-ec69-4dea-9162-086d6ac3ce82.png",
}

COMPARE_PAIRS: list[tuple[str, str, str]] = [
    ("figma-join-list-bright-390.png", "final-join-list-real-data-390.png", "compare-join-list-real-data-390.png"),
    ("figma-join-detail-bright-390.png", "final-join-detail-real-data-390.png", "compare-join-detail-real-data-390.png"),
    ("figma-join-list-360.png", "app-join-list-360.png", "compare-join-list-360.png"),
    ("figma-join-list-390.png", "app-join-list-390.png", "compare-join-list-390.png"),
    ("figma-join-list-430.png", "app-join-list-430.png", "compare-join-list-430.png"),
    ("figma-join-detail-360.png", "app-join-detail-360.png", "compare-join-detail-360.png"),
    ("figma-join-detail-390.png", "app-join-detail-390.png", "compare-join-detail-390.png"),
    ("figma-join-detail-430.png", "app-join-detail-430.png", "compare-join-detail-430.png"),
  ("figma-join-card.png", "app-home-join-card-390.png", "compare-home-join-card-390.png"),
  ("figma-join-list-390.png", "app-my-joins-390.png", "compare-my-joins-390.png"),
]


def download_figma() -> None:
    FIGMA_DIR.mkdir(parents=True, exist_ok=True)
    for name, url in FIGMA_ASSETS.items():
        dest = FIGMA_DIR / name
        print(f"download {name}")
        req = urllib.request.Request(url, headers={"User-Agent": "jjoin-figma-qa"})
        with urllib.request.urlopen(req, timeout=60) as response:
            data = response.read()
        if len(data) < 1000:
            raise RuntimeError(f"figma asset too small for {name}: {len(data)} bytes")
        dest.write_bytes(data)


def crop_to_width(img: Image.Image, width: int) -> Image.Image:
    if img.width <= width:
        return img
    left = (img.width - width) // 2
    return img.crop((left, 0, left + width, img.height))


def side_by_side(left_path: Path, right_path: Path, out_path: Path, target_width: int | None = None) -> None:
    if not left_path.exists():
        raise FileNotFoundError(left_path)
    if not right_path.exists():
        raise FileNotFoundError(right_path)

    left = Image.open(left_path).convert("RGB")
    right = Image.open(right_path).convert("RGB")

    if target_width:
        left = crop_to_width(left, target_width)
        right = crop_to_width(right, target_width)

    height = min(left.height, right.height, 1200)
    left = left.crop((0, 0, left.width, height))
    right = right.crop((0, 0, right.width, height))

    canvas = Image.new("RGB", (left.width + right.width + 8, height), (240, 240, 240))
    canvas.paste(left, (0, 0))
    canvas.paste(right, (left.width + 8, 0))
    COMPARE_DIR.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path)
    print(f"compare -> {out_path}")


def build_compares() -> list[str]:
    missing: list[str] = []
    for figma_name, app_name, out_name in COMPARE_PAIRS:
        figma_path = FIGMA_DIR / figma_name
        app_path = APP_DIR / app_name
        out_path = COMPARE_DIR / out_name
        if not app_path.exists():
            missing.append(app_name)
            continue
        width = None
        if "360" in out_name:
            width = 360
        elif "390" in out_name:
            width = 390
        elif "430" in out_name:
            width = 430
        side_by_side(figma_path, app_path, out_path, target_width=width)
    return missing


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    if cmd in ("download", "all"):
        download_figma()
    if cmd in ("compare", "all"):
        missing = build_compares()
        if missing:
            print("missing app screenshots:", ", ".join(missing))
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
