#!/usr/bin/env python3
"""Rebuild golf-practice-ranges baseline snapshots from LOCALDATA CSV.

Does not overwrite existing baseline files. Fresh download is used only when
targets are missing (this workspace had no prior snapshots).
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "data" / "golf-practice-ranges"
SOURCE_CSV = Path("/tmp/golf_download.bin")

BASELINE_FILES = [
    "raw-active.json",
    "normalized-active.json",
    "normalized-active.csv",
    "screen-golf-candidates.json",
    "screen-golf-candidates.csv",
]

STRONG_PATTERNS: list[tuple[str, int, str]] = [
    ("스크린골프", 50, "NAME_SCREEN_GOLF"),
    ("GOLFZON", 40, "BRAND_GOLFZON"),
    ("골프존", 40, "BRAND_GOLFZON"),
    ("SG골프", 40, "BRAND_SG"),
    ("SGGOLF", 40, "BRAND_SG"),
    ("프렌즈스크린", 40, "BRAND_FRIENDS"),
]

WEAK_PATTERNS: list[tuple[str, int, str]] = [
    ("스크린", 20, "NAME_SCREEN"),
]


def normalize_name(name: str) -> str:
    return re.sub(r"\s+", "", (name or "").upper())


def detect_brand(norm: str) -> str:
    if "GOLFZON" in norm or "골프존" in norm:
        return "GOLFZON"
    if "SG골프" in norm or "SGGOLF" in norm:
        return "SG_GOLF"
    if "프렌즈스크린" in norm:
        return "FRIENDS_SCREEN"
    return "OTHER"


def score_screen_golf(name: str) -> tuple[int, list[str]]:
    norm = normalize_name(name)
    score = 0
    reasons: list[str] = []
    for keyword, points, reason in STRONG_PATTERNS:
        if keyword in norm and reason not in reasons:
            score += points
            reasons.append(reason)
    has_strong_screen = "NAME_SCREEN_GOLF" in reasons
    if not has_strong_screen:
        for keyword, points, reason in WEAK_PATTERNS:
            if keyword in norm and reason not in reasons:
                score += points
                reasons.append(reason)
    return score, reasons


def parse_optional_float(value: str) -> float | None:
    text = (value or "").strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def row_to_raw(row: dict[str, str]) -> dict:
    return {key: (row.get(key) or "").strip() for key in row}


def row_to_normalized(row: dict[str, str]) -> dict:
    name = (row.get("사업장명") or "").strip()
    norm = normalize_name(name)
    tm_x = parse_optional_float(row.get("좌표정보(X)", ""))
    tm_y = parse_optional_float(row.get("좌표정보(Y)", ""))
    return {
        "managementNo": (row.get("관리번호") or "").strip(),
        "name": name,
        "brand": detect_brand(norm),
        "statusName": (row.get("영업상태명") or "").strip(),
        "detailStatusName": (row.get("상세영업상태명") or "").strip(),
        "industryName": (row.get("문화체육업종명") or "").strip(),
        "roadAddress": (row.get("도로명주소") or "").strip(),
        "jibunAddress": (row.get("지번주소") or "").strip(),
        "phone": (row.get("전화번호") or "").strip(),
        "tmX": tm_x,
        "tmY": tm_y,
        "crdInfoX": (row.get("좌표정보(X)") or "").strip(),
        "crdInfoY": (row.get("좌표정보(Y)") or "").strip(),
        "openDate": (row.get("인허가일자") or "").strip(),
        "orgCode": (row.get("개방자치단체코드") or "").strip(),
        "updatedAt": (row.get("데이터갱신시점") or "").strip(),
    }


def write_json(path: Path, payload: object) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            out = dict(row)
            if isinstance(out.get("screenGolfReasons"), list):
                out["screenGolfReasons"] = "|".join(out["screenGolfReasons"])
            writer.writerow(out)


def main() -> int:
    existing = [name for name in BASELINE_FILES if (OUT_DIR / name).exists()]
    if existing:
        print("Baseline already present — refusing overwrite:")
        for name in existing:
            print(f"  - {name}")
        return 0

    if not SOURCE_CSV.exists():
        print(f"Missing source CSV: {SOURCE_CSV}", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with SOURCE_CSV.open("r", encoding="cp949", newline="") as handle:
        raw_rows = list(csv.DictReader(handle))

    active_raw = [row_to_raw(row) for row in raw_rows if (row.get("영업상태명") or "").strip() == "영업/정상"]
    normalized = [row_to_normalized(row) for row in raw_rows if (row.get("영업상태명") or "").strip() == "영업/정상"]

    candidates: list[dict] = []
    for item in normalized:
        score, reasons = score_screen_golf(item["name"])
        if score <= 0:
            continue
        candidates.append(
            {
                **item,
                "screenGolfScore": score,
                "screenGolfReasons": reasons,
            }
        )

    candidates.sort(key=lambda row: (-row["screenGolfScore"], row["name"], row["managementNo"]))

    write_json(OUT_DIR / "raw-active.json", active_raw)
    write_json(OUT_DIR / "normalized-active.json", normalized)
    write_csv(
        OUT_DIR / "normalized-active.csv",
        normalized,
        [
            "managementNo",
            "name",
            "brand",
            "statusName",
            "detailStatusName",
            "industryName",
            "roadAddress",
            "jibunAddress",
            "phone",
            "tmX",
            "tmY",
            "crdInfoX",
            "crdInfoY",
            "openDate",
            "orgCode",
            "updatedAt",
        ],
    )
    write_json(OUT_DIR / "screen-golf-candidates.json", candidates)
    write_csv(
        OUT_DIR / "screen-golf-candidates.csv",
        candidates,
        [
            "managementNo",
            "name",
            "brand",
            "statusName",
            "detailStatusName",
            "industryName",
            "roadAddress",
            "jibunAddress",
            "phone",
            "tmX",
            "tmY",
            "crdInfoX",
            "crdInfoY",
            "openDate",
            "orgCode",
            "updatedAt",
            "screenGolfScore",
            "screenGolfReasons",
        ],
    )

    with_coords = sum(1 for row in normalized if row["tmX"] is not None and row["tmY"] is not None)
    print("Baseline created:")
    print(f"  active: {len(normalized)}")
    print(f"  with TM coords: {with_coords}")
    print(f"  screen candidates: {len(candidates)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
