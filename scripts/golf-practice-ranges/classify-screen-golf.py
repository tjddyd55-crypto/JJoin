#!/usr/bin/env python3
"""Second-pass screen-golf candidate classification.

Inputs (read-only):
  data/golf-practice-ranges/screen-golf-candidates.json
  data/golf-practice-ranges/normalized-active.json

Outputs (new files only):
  screen-golf-classified.json/.csv
  screen-golf-confirmed.csv
  screen-golf-review.csv
  screen-golf-excluded.csv
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "golf-practice-ranges"

SIDO_ALIASES = [
    ("서울특별시", "서울"),
    ("부산광역시", "부산"),
    ("대구광역시", "대구"),
    ("인천광역시", "인천"),
    ("광주광역시", "광주"),
    ("대전광역시", "대전"),
    ("울산광역시", "울산"),
    ("세종특별자치시", "세종"),
    ("경기도", "경기"),
    ("강원특별자치도", "강원"),
    ("강원도", "강원"),
    ("충청북도", "충북"),
    ("충청남도", "충남"),
    ("전북특별자치도", "전북"),
    ("전라북도", "전북"),
    ("전라남도", "전남"),
    ("경상북도", "경북"),
    ("경상남도", "경남"),
    ("제주특별자치도", "제주"),
]

SIDO_ORDER = [
    "서울",
    "부산",
    "대구",
    "인천",
    "광주",
    "대전",
    "울산",
    "세종",
    "경기",
    "강원",
    "충북",
    "충남",
    "전북",
    "전남",
    "경북",
    "경남",
    "제주",
    "기타",
]

ACADEMY_KEYWORDS = [
    "골프연습장",
    "골프아카데미",
    "골프 아카데미",
    "골프스쿨",
    "골프 스쿨",
    "실외",
    "야외",
    "인도어",
]

# False-positive stems that embed "스크린골프" as a substring.
FALSE_SCREEN_GOLF_STEMS = [
    "윈스크린골프",
    "윈윈스크린골프",
]


def collapse_name(name: str) -> str:
    return re.sub(r"\s+", "", name or "")


def normalize_for_match(name: str) -> str:
    return collapse_name(name).upper()


def mask_false_screen_golf(collapsed: str) -> str:
    masked = collapsed
    for stem in FALSE_SCREEN_GOLF_STEMS:
        masked = masked.replace(stem, "§WINSCREEN§")
    # Generic guard: '윈' immediately before '스크린골프'
    masked = re.sub(r"윈스크린골프", "§WINSCREEN§", masked)
    return masked


def has_park_golf(collapsed: str) -> bool:
    return "파크골프" in collapsed


def has_outdoor_screen(collapsed: str) -> bool:
    return "야외스크린" in collapsed


def strong_screen_signals(collapsed: str, masked: str) -> list[str]:
    reasons: list[str] = []
    upper = collapsed.upper()

    if "스크린골프" in masked:
        reasons.append("CONFIRMED_SCREEN_GOLF")
    if "골프존파크" in collapsed or "골프존" in collapsed or "GOLFZON" in upper:
        reasons.append("CONFIRMED_GOLFZON")
    if "SG골프" in collapsed or "SGGOLF" in upper:
        reasons.append("CONFIRMED_SG_GOLF")
    if "프렌즈스크린" in collapsed:
        reasons.append("CONFIRMED_FRIENDS_SCREEN")
    return reasons


def has_generic_screen(collapsed: str) -> bool:
    return "스크린" in collapsed


def detect_brand(collapsed: str) -> str:
    upper = collapsed.upper()
    if "GOLFZON" in upper or "골프존" in collapsed:
        return "GOLFZON"
    if "SG골프" in collapsed or "SGGOLF" in upper:
        return "SG_GOLF"
    if "프렌즈스크린" in collapsed:
        return "FRIENDS_SCREEN"
    return "OTHER"


GWANGJU_DISTRICTS = ("광산구", "동구", "서구", "남구", "북구")


def extract_sido(road_address: str, jibun_address: str) -> str:
    text = f"{road_address or ''} {jibun_address or ''}".strip()
    # 2026 LOCALDATA: Gwangju+Jeonnam merged label
    if text.startswith("전남광주통합특별시"):
        parts = text.split()
        district = parts[1] if len(parts) > 1 else ""
        if district in GWANGJU_DISTRICTS:
            return "광주"
        return "전남"
    for full, short in SIDO_ALIASES:
        if text.startswith(full) or f" {full}" in text:
            return short
    for short in SIDO_ORDER:
        if text.startswith(short):
            return short
    return "기타"


def classify(candidate: dict) -> dict:
    name = candidate.get("name") or ""
    collapsed = collapse_name(name)
    masked = mask_false_screen_golf(collapsed)
    class_reasons: list[str] = []

    # 1) Park golf exclusion has priority over confirm rules.
    if has_park_golf(collapsed):
        return finalize(
            candidate,
            classification="EXCLUDED",
            confidence="HIGH",
            reasons=["PARK_GOLF"],
        )

    # 2) Outdoor screen → REVIEW
    if has_outdoor_screen(collapsed):
        return finalize(
            candidate,
            classification="REVIEW",
            confidence="MEDIUM",
            reasons=["OUTDOOR_SCREEN"],
        )

    strong = strong_screen_signals(collapsed, masked)
    if strong:
        return finalize(
            candidate,
            classification="CONFIRMED",
            confidence="HIGH",
            reasons=strong,
        )

    # 3) Generic '스크린' only
    if has_generic_screen(collapsed):
        confidence = "MEDIUM" if (candidate.get("screenGolfScore") or 0) >= 20 else "LOW"
        # Winscreen-like names: still REVIEW, tagged for clarity
        reasons = ["GENERIC_SCREEN_ONLY"]
        if "윈스크린" in collapsed:
            reasons.append("WINSCREEN_SUBSTRING")
        return finalize(
            candidate,
            classification="REVIEW",
            confidence=confidence,
            reasons=reasons,
        )

    # 4) Brand-only without screen word already handled in strong (골프존/SG).
    # Remaining candidates with academy/outdoor keywords and no screen signal → EXCLUDED
    academy_hits = [kw for kw in ACADEMY_KEYWORDS if collapse_name(kw) in collapsed or kw in name]
    original_reasons = candidate.get("screenGolfReasons") or []
    if not strong and not has_generic_screen(collapsed):
        # Candidate likely entered via brand keyword that we failed to re-confirm,
        # or weak first-pass noise. Exclude if academy-like and no brand.
        brand = detect_brand(collapsed)
        if brand == "OTHER":
            reasons = ["NO_SCREEN_SIGNAL"]
            if academy_hits:
                reasons.append("ACADEMY_OR_OUTDOOR_KEYWORD")
            if original_reasons:
                reasons.append("FIRST_PASS_REASON:" + ",".join(original_reasons))
            return finalize(
                candidate,
                classification="EXCLUDED",
                confidence="MEDIUM",
                reasons=reasons,
            )
        # Brand present but strong matcher missed (should be rare) → REVIEW
        return finalize(
            candidate,
            classification="REVIEW",
            confidence="LOW",
            reasons=["BRAND_UNCLEAR"] + ([f"FIRST_PASS_REASON:{','.join(original_reasons)}"] if original_reasons else []),
        )

    return finalize(
        candidate,
        classification="REVIEW",
        confidence="LOW",
        reasons=["UNCLASSIFIED"],
    )


def finalize(candidate: dict, classification: str, confidence: str, reasons: list[str]) -> dict:
    collapsed = collapse_name(candidate.get("name") or "")
    brand = detect_brand(collapsed)
    sido = extract_sido(candidate.get("roadAddress") or "", candidate.get("jibunAddress") or "")
    return {
        **candidate,
        "brand": brand,
        "sido": sido,
        "screenGolfClassification": classification,
        "screenGolfConfidence": confidence,
        "classificationReasons": reasons,
    }


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            out = {key: row.get(key) for key in fieldnames}
            for key in ("screenGolfReasons", "classificationReasons"):
                value = out.get(key)
                if isinstance(value, list):
                    out[key] = "|".join(value)
            writer.writerow(out)


CSV_FIELDS = [
    "managementNo",
    "name",
    "brand",
    "sido",
    "screenGolfClassification",
    "screenGolfConfidence",
    "screenGolfScore",
    "screenGolfReasons",
    "classificationReasons",
    "roadAddress",
    "jibunAddress",
    "phone",
    "tmX",
    "tmY",
    "statusName",
    "detailStatusName",
]


def sample_rows(rows: list[dict], limit: int = 20) -> list[dict]:
    """Prefer suspicious + brand-diverse rows for human spot checks."""
    picked: list[dict] = []
    seen: set[str] = set()

    def add(row: dict) -> None:
        key = row.get("managementNo") or row.get("name") or ""
        if key in seen:
            return
        seen.add(key)
        picked.append(row)

    # 1) Suspicious reason tags first
    priority_tags = (
        "WINSCREEN_SUBSTRING",
        "PARK_GOLF",
        "OUTDOOR_SCREEN",
        "GENERIC_SCREEN_ONLY",
        "NO_SCREEN_SIGNAL",
    )
    for tag in priority_tags:
        for row in rows:
            if tag in (row.get("classificationReasons") or []):
                add(row)
            if len(picked) >= limit:
                return picked[:limit]

    # 2) Brand diversity
    for brand in ("GOLFZON", "SG_GOLF", "FRIENDS_SCREEN", "OTHER"):
        brand_rows = [row for row in rows if row.get("brand") == brand]
        brand_rows.sort(key=lambda row: (-(row.get("screenGolfScore") or 0), row.get("name") or ""))
        for row in brand_rows[: max(3, limit // 4)]:
            add(row)
            if len(picked) >= limit:
                return picked[:limit]

    # 3) Fill remaining by score
    rest = sorted(rows, key=lambda row: (-(row.get("screenGolfScore") or 0), row.get("name") or ""))
    for row in rest:
        add(row)
        if len(picked) >= limit:
            break
    return picked[:limit]


def print_sample(title: str, rows: list[dict]) -> None:
    print(f"\n=== {title} ({len(rows)} shown) ===")
    for row in rows:
        print(
            json.dumps(
                {
                    "name": row.get("name"),
                    "brand": row.get("brand"),
                    "classification": row.get("screenGolfClassification"),
                    "confidence": row.get("screenGolfConfidence"),
                    "score": row.get("screenGolfScore"),
                    "reasons": row.get("classificationReasons"),
                    "firstPassReasons": row.get("screenGolfReasons"),
                    "roadAddress": row.get("roadAddress"),
                    "phone": row.get("phone"),
                },
                ensure_ascii=False,
            )
        )


def main() -> None:
    candidates_path = DATA_DIR / "screen-golf-candidates.json"
    active_path = DATA_DIR / "normalized-active.json"
    candidates = json.loads(candidates_path.read_text(encoding="utf-8"))
    active = json.loads(active_path.read_text(encoding="utf-8"))

    classified = [classify(item) for item in candidates]

    # Keyword investigation stats (not auto-exclude alone)
    keyword_stats: dict[str, dict[str, int]] = {}
    for keyword in ACADEMY_KEYWORDS:
        key = collapse_name(keyword)
        hits = [row for row in classified if key in collapse_name(row.get("name") or "") or keyword in (row.get("name") or "")]
        no_screen = [
            row
            for row in hits
            if "스크린" not in collapse_name(row.get("name") or "")
            and detect_brand(collapse_name(row.get("name") or "")) == "OTHER"
        ]
        keyword_stats[keyword] = {
            "inCandidates": len(hits),
            "noScreenSignalOther": len(no_screen),
        }

    park_cases = [row for row in classified if "PARK_GOLF" in (row.get("classificationReasons") or [])]
    outdoor_cases = [row for row in classified if "OUTDOOR_SCREEN" in (row.get("classificationReasons") or [])]
    generic_cases = [row for row in classified if "GENERIC_SCREEN_ONLY" in (row.get("classificationReasons") or [])]
    winscreen_cases = [row for row in classified if "WINSCREEN_SUBSTRING" in (row.get("classificationReasons") or [])]

    counts = Counter(row["screenGolfClassification"] for row in classified)
    confirmed = [row for row in classified if row["screenGolfClassification"] == "CONFIRMED"]
    review = [row for row in classified if row["screenGolfClassification"] == "REVIEW"]
    excluded = [row for row in classified if row["screenGolfClassification"] == "EXCLUDED"]

    brand_counts = Counter(row["brand"] for row in confirmed)
    sido_counts = Counter(row["sido"] for row in confirmed)

    reason_counter = Counter()
    for row in classified:
        for reason in row.get("classificationReasons") or []:
            reason_counter[reason] += 1

    write_json(DATA_DIR / "screen-golf-classified.json", classified)
    write_csv(DATA_DIR / "screen-golf-classified.csv", classified, CSV_FIELDS)
    write_csv(DATA_DIR / "screen-golf-confirmed.csv", confirmed, CSV_FIELDS)
    write_csv(DATA_DIR / "screen-golf-review.csv", review, CSV_FIELDS)
    write_csv(DATA_DIR / "screen-golf-excluded.csv", excluded, CSV_FIELDS)

    active_total = len(active)
    confirmed_ratio = (len(confirmed) / active_total * 100) if active_total else 0.0

    report = {
        "activeTotal": active_total,
        "candidateTotal": len(classified),
        "CONFIRMED": len(confirmed),
        "REVIEW": len(review),
        "EXCLUDED": len(excluded),
        "confirmedRatioOfActivePct": round(confirmed_ratio, 2),
        "brandConfirmed": {
            "GOLFZON": brand_counts.get("GOLFZON", 0),
            "SG_GOLF": brand_counts.get("SG_GOLF", 0),
            "FRIENDS_SCREEN": brand_counts.get("FRIENDS_SCREEN", 0),
            "OTHER": brand_counts.get("OTHER", 0),
        },
        "sidoConfirmed": {sido: sido_counts.get(sido, 0) for sido in SIDO_ORDER},
        "reasonCounts": dict(reason_counter.most_common()),
        "parkGolfCases": len(park_cases),
        "parkGolfNames": [row["name"] for row in park_cases],
        "outdoorScreenCases": len(outdoor_cases),
        "outdoorScreenNames": [row["name"] for row in outdoor_cases],
        "genericScreenOnly": len(generic_cases),
        "winscreenCases": len(winscreen_cases),
        "winscreenNames": [row["name"] for row in winscreen_cases],
        "academyKeywordStats": keyword_stats,
        "firstPassReasonReinspect": dict(
            Counter(
                tuple(row.get("screenGolfReasons") or [])
                for row in classified
            ).most_common(20)
        ),
    }
    # Counter keys as tuples are not JSON-serializable in nested form above — fix:
    report["firstPassReasonReinspect"] = [
        {"reasons": list(reasons), "count": count}
        for reasons, count in Counter(
            tuple(row.get("screenGolfReasons") or []) for row in classified
        ).most_common(20)
    ]

    write_json(DATA_DIR / "screen-golf-classification-report.json", report)

    print("=== Screen golf classification summary ===")
    print(f"activeTotal: {active_total}")
    print(f"candidateTotal: {len(classified)}")
    print(f"CONFIRMED: {len(confirmed)}")
    print(f"REVIEW: {len(review)}")
    print(f"EXCLUDED: {len(excluded)}")
    print(f"confirmedRatioOfActivePct: {confirmed_ratio:.2f}%")
    print("brandConfirmed:", report["brandConfirmed"])
    print("sidoConfirmed:")
    for sido in SIDO_ORDER:
        print(f"  {sido}: {sido_counts.get(sido, 0)}")
    print("reasonCounts:", report["reasonCounts"])
    print(f"PARK_GOLF cases: {len(park_cases)}")
    for name in [row["name"] for row in park_cases]:
        print(f"  - {name}")
    print(f"OUTDOOR_SCREEN cases: {len(outdoor_cases)}")
    for name in [row["name"] for row in outdoor_cases]:
        print(f"  - {name}")
    print(f"GENERIC_SCREEN_ONLY: {len(generic_cases)}")
    print(f"WINSCREEN_SUBSTRING: {len(winscreen_cases)}")
    for name in [row["name"] for row in winscreen_cases]:
        print(f"  - {name}")
    print("academyKeywordStats:")
    for keyword, stats in keyword_stats.items():
        print(f"  {keyword}: {stats}")

    print_sample("A. CONFIRMED sample", sample_rows(confirmed))
    print_sample("B. REVIEW sample", sample_rows(review))
    print_sample("C. EXCLUDED sample", sample_rows(excluded))


if __name__ == "__main__":
    main()
