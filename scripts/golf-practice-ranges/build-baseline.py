#!/usr/bin/env python3
"""Rebuild golf-practice-ranges baseline snapshots from LOCALDATA CSV or API JSON.

Does not overwrite existing baseline files unless --force is set.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "data" / "golf-practice-ranges"
DEFAULT_SOURCE = OUT_DIR / "source" / "golf_download.bin"

BASELINE_FILES = [
    "raw-active.json",
    "normalized-active.json",
    "normalized-active.csv",
    "screen-golf-candidates.json",
    "screen-golf-candidates.csv",
]

# LOCALDATA open API field code -> CSV column (build-facility-master-staging raw schema)
API_FIELD_TO_CSV: dict[str, str] = {
    "OPN_ATMY_GRP_CD": "개방자치단체코드",
    "MNG_NO": "관리번호",
    "BPLC_NM": "사업장명",
    "SALS_STTS_NM": "영업상태명",
    "SALS_STTS_CD": "영업상태코드",
    "DTL_SALS_STTS_NM": "상세영업상태명",
    "DTL_SALS_STTS_CD": "상세영업상태코드",
    "CULTR_SPTS_TPBIZ_NM": "문화체육업종명",
    "ROAD_NM_ADDR": "도로명주소",
    "LOTNO_ADDR": "지번주소",
    "TELNO": "전화번호",
    "CRD_INFO_X": "좌표정보(X)",
    "CRD_INFO_Y": "좌표정보(Y)",
    "LCPMT_YMD": "인허가일자",
    "CLSBIZ_YMD": "폐업일자",
    "DAT_UPDT_PNT": "데이터갱신시점",
    "LAST_MDFCN_PNT": "최종수정시점",
    "ROAD_NM_ZIP": "도로명우편번호",
    "LCTN_ZIP": "소재지우편번호",
}

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


def resolve_source_path(cli_input: str | None) -> Path:
    if cli_input:
        return Path(cli_input).expanduser()

    env_path = os.environ.get("GOLF_PRACTICE_RANGES_SOURCE_FILE", "").strip()
    if env_path:
        return Path(env_path).expanduser()

    if DEFAULT_SOURCE.exists():
        return DEFAULT_SOURCE

    legacy_candidates = [
        Path("/tmp/golf_download.bin"),
    ]
    temp_dir = os.environ.get("TEMP") or os.environ.get("TMP")
    if temp_dir:
        legacy_candidates.append(Path(temp_dir) / "golf_download.bin")

    for candidate in legacy_candidates:
        if candidate.exists():
            return candidate

    return DEFAULT_SOURCE


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            out = dict(row)
            if isinstance(out.get("screenGolfReasons"), list):
                out["screenGolfReasons"] = "|".join(out["screenGolfReasons"])
            writer.writerow(out)


def is_active_csv_row(row: dict[str, str]) -> bool:
    status = (row.get("영업상태명") or "").strip()
    code = (row.get("영업상태코드") or "").strip()
    return status == "영업/정상" or code == "01"


def api_item_to_csv_row(item: dict) -> dict[str, str]:
    row: dict[str, str] = {}
    for api_key, csv_key in API_FIELD_TO_CSV.items():
        value = item.get(api_key)
        row[csv_key] = "" if value is None else str(value).strip()
    return row


def load_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="cp949", newline="") as handle:
        return list(csv.DictReader(handle))


def load_api_json_rows(path: Path) -> list[dict[str, str]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict) and isinstance(payload.get("items"), list):
        items = payload["items"]
    else:
        raise ValueError(
            "API JSON must be an array or an object with an 'items' array"
        )
    return [api_item_to_csv_row(item) for item in items]


def detect_input_format(path: Path, fmt: str) -> str:
    if fmt != "auto":
        return fmt
    if path.suffix.lower() == ".json":
        return "api-json"
    head = path.read_bytes()[:4096].lstrip()
    if head.startswith(b"{") or head.startswith(b"["):
        return "api-json"
    return "csv"


def load_source_rows(path: Path, fmt: str) -> tuple[list[dict[str, str]], str]:
    resolved = detect_input_format(path, fmt)
    if resolved == "api-json":
        return load_api_json_rows(path), "api-json"
    return load_csv_rows(path), "csv"


def build_baseline_outputs(raw_rows: list[dict[str, str]]) -> tuple[list[dict], list[dict], list[dict]]:
    active_raw = [row_to_raw(row) for row in raw_rows if is_active_csv_row(row)]
    normalized = [row_to_normalized(row) for row in raw_rows if is_active_csv_row(row)]

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
    return active_raw, normalized, candidates


def write_baseline_artifacts(active_raw: list[dict], normalized: list[dict], candidates: list[dict]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rebuild golf-practice-ranges baseline snapshots from LOCALDATA CSV or API JSON.",
    )
    parser.add_argument(
        "--input",
        dest="input_path",
        help=(
            "LOCALDATA source path (CSV cp949 or API JSON wrapper). "
            f"Default: {DEFAULT_SOURCE} or GOLF_PRACTICE_RANGES_SOURCE_FILE."
        ),
    )
    parser.add_argument(
        "--format",
        choices=("auto", "csv", "api-json"),
        default="auto",
        help="Input format (default: auto-detect from extension/content).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing baseline artifacts in data/golf-practice-ranges/.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_path = resolve_source_path(args.input_path)

    existing = [name for name in BASELINE_FILES if (OUT_DIR / name).exists()]
    if existing and not args.force:
        print("Baseline already present - refusing overwrite:")
        for name in existing:
            print(f"  - {name}")
        print("Re-run with --force to replace baseline artifacts.", file=sys.stderr)
        return 0

    if not source_path.exists():
        print(f"Missing source file: {source_path}", file=sys.stderr)
        print(
            "Provide LOCALDATA export via --input <path> or copy to "
            f"{DEFAULT_SOURCE}",
            file=sys.stderr,
        )
        print(
            "Optional env: GOLF_PRACTICE_RANGES_SOURCE_FILE=<path>",
            file=sys.stderr,
        )
        return 1

    try:
        raw_rows, detected_format = load_source_rows(source_path, args.format)
    except (json.JSONDecodeError, ValueError, UnicodeDecodeError) as err:
        print(f"Failed to parse source ({source_path}): {err}", file=sys.stderr)
        return 1

    active_raw, normalized, candidates = build_baseline_outputs(raw_rows)
    write_baseline_artifacts(active_raw, normalized, candidates)

    with_coords = sum(1 for row in normalized if row["tmX"] is not None and row["tmY"] is not None)
    print("Baseline created:")
    print(f"  source: {source_path}")
    print(f"  format: {detected_format}")
    print(f"  input rows: {len(raw_rows)}")
    print(f"  active: {len(normalized)}")
    print(f"  with TM coords: {with_coords}")
    print(f"  screen candidates: {len(candidates)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
