#!/usr/bin/env python3
"""Build nationwide GolfFacility master staging (all active LOCALDATA rows).

Policy:
  - Keep all ~7,440 active facilities as master rows.
  - Screen availability is a separate attribute (hasScreenGolf / screenStatus).
  - Missing screen evidence ⇒ UNKNOWN (never mass NON_SCREEN / NO).
  - Practice range / academy / indoor alone never removes screen possibility.
  - Park golf stays in master but isScreenJoinEligible=false.

Does not touch Prisma / production DB / NAVER geocoding / git commit.
"""

from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "golf-practice-ranges"
FINAL = DATA / "final"
PROJ4_CONVERT = ROOT / "scripts" / "golf-practice-ranges" / "batch-tm-to-wgs84.cjs"

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

GWANGJU_DISTRICTS = {"광산구", "동구", "서구", "남구", "북구"}

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

FALSE_SCREEN_GOLF_STEMS = ("윈스크린골프", "윈윈스크린골프")

MIXED_MARKERS = (
    "연습장",
    "아카데미",
    "인도어",
    "실내",
    "실외",
    "야외",
    "스쿨",
    "레슨",
    "클리닉",
    "타석",
)

ACADEMY_MARKERS = ("아카데미", "골프스쿨", "스쿨", "레슨", "클리닉", "프로골프")
INDOOR_MARKERS = ("인도어", "실내")
OUTDOOR_MARKERS = ("실외", "야외")
PRACTICE_MARKERS = ("골프연습장", "연습장")

STAGING_FIELDS = [
    "governmentSourceKey",
    "managementNo",
    "localGovernmentCode",
    "name",
    "normalizedName",
    "phone",
    "phoneRaw",
    "phoneStatus",
    "roadAddress",
    "lotAddress",
    "postalCode",
    "sido",
    "sigungu",
    "tmX",
    "tmY",
    "latitude",
    "longitude",
    "coordinateSource",
    "coordinateStatus",
    "facilityType",
    "hasScreenGolf",
    "screenStatus",
    "screenConfidence",
    "screenEvidence",
    "screenGolfScore",
    "screenCandidate",
    "brandCandidate",
    "screenBrands",
    "sportType",
    "exclusionReason",
    "isActive",
    "isScreenJoinEligible",
    "businessStatusCode",
    "businessStatusName",
    "detailStatusCode",
    "detailStatusName",
    "licenseDate",
    "closureDate",
    "lastModifiedAt",
    "dataUpdatedAt",
    "source",
    "previousScreenClassification",
]


def collapse(name: str) -> str:
    return re.sub(r"\s+", "", name or "")


def normalize_name(name: str) -> str:
    return collapse(name).upper()


def mask_winscreen(collapsed: str) -> str:
    masked = collapsed
    for stem in FALSE_SCREEN_GOLF_STEMS:
        masked = masked.replace(stem, "§WINSCREEN§")
    return re.sub(r"윈스크린골프", "§WINSCREEN§", masked)


def extract_sido(road: str, lot: str) -> str:
    text = f"{road or ''} {lot or ''}".strip()
    if text.startswith("전남광주통합특별시"):
        district = text.split()[1] if len(text.split()) > 1 else ""
        return "광주" if district in GWANGJU_DISTRICTS else "전남"
    for full, short in SIDO_ALIASES:
        if text.startswith(full):
            return short
    for short in SIDO_ORDER:
        if text.startswith(short):
            return short
    return "기타"


def extract_sigungu(road: str, lot: str) -> str:
    text = (road or lot or "").strip()
    parts = text.split()
    if not parts:
        return ""
    if parts[0] == "전남광주통합특별시" and len(parts) > 1:
        return parts[1]
    if len(parts) >= 2:
        # 세종은 시군구 없이 읍면동이 올 수 있음
        if parts[0].startswith("세종"):
            return parts[1] if len(parts) > 1 else ""
        return parts[1]
    return ""


def phone_status(raw: str) -> tuple[str, str]:
    phone_raw = (raw or "").strip()
    digits = re.sub(r"\D", "", phone_raw)
    if not phone_raw:
        return "", "EMPTY"
    if len(digits) < 9:
        return phone_raw, "INVALID"
    return phone_raw, "PRESENT"


def detect_brands(collapsed: str) -> tuple[str, list[str], list[str]]:
    """Return brandCandidate, screenBrands, evidence brand tags."""
    upper = collapsed.upper()
    brands: list[str] = []
    evidence: list[str] = []
    if "GOLFZON" in upper or "골프존" in collapsed:
        brands.append("GOLFZON")
        evidence.append("BRAND_GOLFZON")
    if "SG골프" in collapsed or "SGGOLF" in upper:
        brands.append("SG_GOLF")
        evidence.append("BRAND_SG_GOLF")
    if "프렌즈스크린" in collapsed:
        brands.append("FRIENDS_SCREEN")
        evidence.append("BRAND_FRIENDS_SCREEN")
    if not brands:
        return "UNKNOWN", [], []
    if len(brands) == 1:
        return brands[0], brands, evidence
    return "OTHER", brands, evidence


def has_any(collapsed: str, markers: tuple[str, ...]) -> bool:
    return any(marker in collapsed for marker in markers)


def classify_facility_and_screen(
    name: str,
    previous: dict | None,
) -> dict:
    """Core remapping: facility type vs screen attributes are independent."""
    collapsed = collapse(name)
    masked = mask_winscreen(collapsed)
    brand_candidate, screen_brands, brand_evidence = detect_brands(collapsed)

    prev_class = (previous or {}).get("screenGolfClassification")
    prev_score = (previous or {}).get("screenGolfScore")
    screen_candidate = previous is not None

    # --- Park golf: keep in master, exclude from screen-join service ---
    if "파크골프" in collapsed:
        evidence = list(brand_evidence)
        if "스크린골프" in masked or "스크린" in collapsed:
            evidence.append("NAME_GENERIC_SCREEN" if "스크린골프" not in masked else "NAME_SCREEN_GOLF")
        # Screen gear may exist on park-golf venues, but sport differs.
        has_screen = "YES" if evidence and any(
            e.startswith("NAME_") or e.startswith("BRAND_") for e in evidence
        ) else "UNKNOWN"
        return {
            "facilityType": "OTHER_GOLF_FACILITY",
            "hasScreenGolf": has_screen,
            "screenStatus": "UNKNOWN",
            "screenConfidence": "LOW" if has_screen == "YES" else "UNKNOWN",
            "screenEvidence": evidence,
            "screenGolfScore": prev_score if prev_score is not None else 0,
            "screenCandidate": screen_candidate,
            "brandCandidate": brand_candidate,
            "screenBrands": screen_brands,
            "sportType": "PARK_GOLF",
            "exclusionReason": "PARK_GOLF",
            "isScreenJoinEligible": False,
            "previousScreenClassification": prev_class,
        }

    evidence: list[str] = []
    evidence.extend(brand_evidence)

    strong_screen_golf = "스크린골프" in masked
    generic_screen = "스크린" in collapsed
    winscreen = "윈스크린" in collapsed
    outdoor_screen = "야외스크린" in collapsed

    if strong_screen_golf:
        evidence.append("NAME_SCREEN_GOLF")
    elif generic_screen:
        evidence.append("NAME_GENERIC_SCREEN")

    # Deduplicate evidence preserving order
    seen = set()
    evidence = [e for e in evidence if not (e in seen or seen.add(e))]

    mixed_hint = has_any(collapsed, MIXED_MARKERS)
    academy_hint = has_any(collapsed, ACADEMY_MARKERS)
    indoor_hint = has_any(collapsed, INDOOR_MARKERS)
    outdoor_hint = has_any(collapsed, OUTDOOR_MARKERS) and not outdoor_screen
    practice_hint = has_any(collapsed, PRACTICE_MARKERS)

    golfzon_park = "골프존파크" in collapsed or "GOLFZONPARK" in collapsed.upper()
    friends = "프렌즈스크린" in collapsed
    sg = "SG골프" in collapsed or "SGGOLF" in collapsed.upper()
    golfzon = "골프존" in collapsed or "GOLFZON" in collapsed.upper()

    # ----- Screen attributes -----
    # Never invent NON_SCREEN / NO from name absence.
    # Outdoor screen: keep POSSIBLE until product policy decides.
    if outdoor_screen:
        has_screen = "YES"
        screen_status = "POSSIBLE"
        confidence = "MEDIUM"
    elif strong_screen_golf or golfzon_park or friends or sg:
        has_screen = "YES"
        screen_status = "CONFIRMED"
        confidence = "HIGH"
    elif golfzon and not winscreen:
        # Brand strongly implies Golfzon screen systems, but venue may be mixed.
        has_screen = "YES"
        screen_status = "CONFIRMED"
        confidence = "HIGH"
    elif generic_screen:
        # e.g. 부대앞 스크린, 윈스크린* — screen likely present, form unclear
        has_screen = "YES"
        screen_status = "POSSIBLE"
        confidence = "MEDIUM"
    elif prev_class == "CONFIRMED":
        has_screen = "YES"
        screen_status = "CONFIRMED"
        confidence = "HIGH"
    elif prev_class == "REVIEW":
        has_screen = "UNKNOWN"
        screen_status = "POSSIBLE"
        confidence = "MEDIUM"
    else:
        has_screen = "UNKNOWN"
        screen_status = "UNKNOWN"
        confidence = "UNKNOWN"

    # ----- Facility type (independent of join eligibility) -----
    if golfzon_park or friends or (sg and not mixed_hint):
        facility_type = "SCREEN_GOLF"
    elif strong_screen_golf and not mixed_hint:
        facility_type = "SCREEN_GOLF"
    elif (strong_screen_golf or generic_screen or golfzon or sg or friends) and mixed_hint:
        facility_type = "MIXED_GOLF_FACILITY"
    elif strong_screen_golf and mixed_hint:
        facility_type = "MIXED_GOLF_FACILITY"
    elif academy_hint and not (strong_screen_golf or generic_screen or golfzon):
        facility_type = "GOLF_ACADEMY"
    elif indoor_hint and not (strong_screen_golf or generic_screen):
        facility_type = "INDOOR_PRACTICE"
    elif outdoor_hint and not (strong_screen_golf or generic_screen):
        facility_type = "OUTDOOR_PRACTICE"
    elif practice_hint and not (strong_screen_golf or generic_screen or golfzon):
        facility_type = "PRACTICE_RANGE"
    elif golfzon and practice_hint:
        facility_type = "MIXED_GOLF_FACILITY"
    elif golfzon and not mixed_hint:
        # 골프존 OO점 — usually dedicated screen store
        facility_type = "SCREEN_GOLF"
    elif generic_screen and not mixed_hint:
        facility_type = "UNKNOWN"
    elif not evidence:
        # Default active LOCALDATA row without type signals
        if academy_hint:
            facility_type = "GOLF_ACADEMY"
        elif indoor_hint:
            facility_type = "INDOOR_PRACTICE"
        elif outdoor_hint:
            facility_type = "OUTDOOR_PRACTICE"
        elif practice_hint:
            facility_type = "PRACTICE_RANGE"
        else:
            facility_type = "OTHER_GOLF_FACILITY"
    else:
        facility_type = "UNKNOWN"

    # Join eligibility: only confirmed screen presence for now.
    # POSSIBLE stays false until verified (operator override later).
    join_eligible = has_screen == "YES" and screen_status == "CONFIRMED"

    return {
        "facilityType": facility_type,
        "hasScreenGolf": has_screen,
        "screenStatus": screen_status,
        "screenConfidence": confidence,
        "screenEvidence": evidence,
        "screenGolfScore": prev_score if prev_score is not None else (50 if strong_screen_golf else 0),
        "screenCandidate": screen_candidate,
        "brandCandidate": brand_candidate,
        "screenBrands": screen_brands,
        "sportType": "SCREEN_GOLF" if join_eligible else "GOLF_PRACTICE",
        "exclusionReason": None,
        "isScreenJoinEligible": join_eligible,
        "previousScreenClassification": prev_class,
    }


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            out = {}
            for key in fields:
                value = row.get(key)
                if isinstance(value, list):
                    out[key] = "|".join(str(v) for v in value)
                elif isinstance(value, bool):
                    out[key] = "true" if value else "false"
                elif value is None:
                    out[key] = ""
                else:
                    out[key] = value
            writer.writerow(out)


def convert_tm_batch(rows: list[dict]) -> dict[str, dict]:
    """Call proj4 batch helper; returns governmentSourceKey → {lat,lng,ok}."""
    payload = []
    for row in rows:
        tm_x, tm_y = row.get("tmX"), row.get("tmY")
        if tm_x is None or tm_y is None:
            continue
        payload.append(
            {
                "id": row["governmentSourceKey"],
                "tmX": tm_x,
                "tmY": tm_y,
            }
        )
    if not payload:
        return {}

    input_path = DATA / "tmp-tm-batch-input.json"
    output_path = DATA / "tmp-tm-batch-output.json"
    write_json(input_path, payload)
    subprocess.run(
        ["node", str(PROJ4_CONVERT), str(input_path), str(output_path)],
        check=True,
    )
    result = load_json(output_path)
    input_path.unlink(missing_ok=True)
    output_path.unlink(missing_ok=True)
    return {item["id"]: item for item in result}


def build_row(raw: dict, previous: dict | None, coords: dict | None) -> dict:
    org = (raw.get("개방자치단체코드") or "").strip()
    mng = (raw.get("관리번호") or "").strip()
    source_key = f"{org}:{mng}"
    name = (raw.get("사업장명") or "").strip()
    road = (raw.get("도로명주소") or "").strip()
    lot = (raw.get("지번주소") or "").strip()
    phone_raw = (raw.get("전화번호") or "").strip()
    phone, p_status = phone_status(phone_raw)

    tm_x = raw.get("좌표정보(X)", "").strip()
    tm_y = raw.get("좌표정보(Y)", "").strip()
    try:
        tm_x_f = float(tm_x) if tm_x else None
    except ValueError:
        tm_x_f = None
    try:
        tm_y_f = float(tm_y) if tm_y else None
    except ValueError:
        tm_y_f = None

    classified = classify_facility_and_screen(name, previous)

    latitude = None
    longitude = None
    coordinate_source = "UNKNOWN"
    coordinate_status = "UNKNOWN"
    if coords and coords.get("ok"):
        latitude = coords["latitude"]
        longitude = coords["longitude"]
        coordinate_source = "GOV_TM_CONVERTED"
        coordinate_status = "OK"
    elif tm_x_f is not None and tm_y_f is not None:
        coordinate_source = "UNKNOWN"
        coordinate_status = "TM_PRESENT_CONVERT_FAILED"
    else:
        coordinate_source = "UNKNOWN"
        coordinate_status = "TM_MISSING"

    postal = (raw.get("도로명우편번호") or raw.get("소재지우편번호") or "").strip()

    return {
        "governmentSourceKey": source_key,
        "managementNo": mng,
        "localGovernmentCode": org,
        "name": name,
        "normalizedName": normalize_name(name),
        "phone": phone,
        "phoneRaw": phone_raw,
        "phoneStatus": p_status,
        "roadAddress": road,
        "lotAddress": lot,
        "postalCode": postal,
        "sido": extract_sido(road, lot),
        "sigungu": extract_sigungu(road, lot),
        "tmX": tm_x_f,
        "tmY": tm_y_f,
        "latitude": latitude,
        "longitude": longitude,
        "coordinateSource": coordinate_source,
        "coordinateStatus": coordinate_status,
        **classified,
        "isActive": True,
        "businessStatusCode": (raw.get("영업상태코드") or "").strip(),
        "businessStatusName": (raw.get("영업상태명") or "").strip(),
        "detailStatusCode": (raw.get("상세영업상태코드") or "").strip(),
        "detailStatusName": (raw.get("상세영업상태명") or "").strip(),
        "licenseDate": (raw.get("인허가일자") or "").strip(),
        "closureDate": (raw.get("폐업일자") or "").strip(),
        "lastModifiedAt": (raw.get("최종수정시점") or "").strip(),
        "dataUpdatedAt": (raw.get("데이터갱신시점") or "").strip(),
        "source": "LOCALDATA_GOLF_PRACTICE_RANGE",
    }


def sample(rows: list[dict], limit: int = 20) -> list[dict]:
    return rows[:limit]


def print_cases(title: str, rows: list[dict], limit: int = 20) -> None:
    print(f"\n=== {title} (n={len(rows)}, showing {min(limit, len(rows))}) ===")
    for row in sample(rows, limit):
        print(
            json.dumps(
                {
                    "name": row["name"],
                    "facilityType": row["facilityType"],
                    "hasScreenGolf": row["hasScreenGolf"],
                    "screenStatus": row["screenStatus"],
                    "screenConfidence": row["screenConfidence"],
                    "screenEvidence": row["screenEvidence"],
                    "isScreenJoinEligible": row["isScreenJoinEligible"],
                    "address": row["roadAddress"] or row["lotAddress"],
                    "phone": row["phone"],
                },
                ensure_ascii=False,
            )
        )


def main() -> int:
    raw_path = DATA / "raw-active.json"
    classified_path = DATA / "screen-golf-classified.json"
    if not raw_path.exists():
        print(f"missing {raw_path}", file=sys.stderr)
        return 1

    raw_rows = load_json(raw_path)
    classified_rows = load_json(classified_path) if classified_path.exists() else []
    classified_by_key: dict[str, dict] = {}
    for row in classified_rows:
        org = (row.get("orgCode") or "").strip()
        mng = (row.get("managementNo") or "").strip()
        classified_by_key[f"{org}:{mng}"] = row

    # Prepare tm list for conversion — key MUST be governmentSourceKey (org:mng)
    tm_inputs = []
    for raw in raw_rows:
        org = (raw.get("개방자치단체코드") or "").strip()
        mng = (raw.get("관리번호") or "").strip()
        x = (raw.get("좌표정보(X)") or "").strip()
        y = (raw.get("좌표정보(Y)") or "").strip()
        try:
            tm_inputs.append(
                {
                    "governmentSourceKey": f"{org}:{mng}",
                    "tmX": float(x),
                    "tmY": float(y),
                }
            )
        except ValueError:
            continue

    print(f"Converting TM coords for {len(tm_inputs)} facilities via proj4...")
    coords_map = convert_tm_batch(tm_inputs)
    print(f"Converted OK: {sum(1 for v in coords_map.values() if v.get('ok'))}")

    staging: list[dict] = []
    for raw in raw_rows:
        org = (raw.get("개방자치단체코드") or "").strip()
        mng = (raw.get("관리번호") or "").strip()
        source_key = f"{org}:{mng}"
        prev = classified_by_key.get(source_key)
        staging.append(build_row(raw, prev, coords_map.get(source_key)))

    staging.sort(key=lambda r: (r["sido"], r["sigungu"], r["name"], r["managementNo"]))

    write_json(FINAL / "golf-facility-master-staging.json", staging)
    write_csv(FINAL / "golf-facility-master-staging.csv", staging, STAGING_FIELDS)

    # ---- Stats ----
    total = len(staging)
    type_counts = Counter(r["facilityType"] for r in staging)
    status_counts = Counter(r["screenStatus"] for r in staging)
    has_counts = Counter(r["hasScreenGolf"] for r in staging)
    join_true = sum(1 for r in staging if r["isScreenJoinEligible"])
    brand_counts = Counter(r["brandCandidate"] for r in staging)
    coord_source = Counter(r["coordinateSource"] for r in staging)
    park = [r for r in staging if r.get("sportType") == "PARK_GOLF" or r.get("exclusionReason") == "PARK_GOLF"]

    prev_confirmed = [r for r in staging if r.get("previousScreenClassification") == "CONFIRMED"]
    prev_review = [r for r in staging if r.get("previousScreenClassification") == "REVIEW"]
    prev_excluded = [r for r in staging if r.get("previousScreenClassification") == "EXCLUDED"]

    sido_stats = {}
    for sido in SIDO_ORDER:
        subset = [r for r in staging if r["sido"] == sido]
        sido_stats[sido] = {
            "total": len(subset),
            "CONFIRMED": sum(1 for r in subset if r["screenStatus"] == "CONFIRMED"),
            "POSSIBLE": sum(1 for r in subset if r["screenStatus"] == "POSSIBLE"),
            "UNKNOWN": sum(1 for r in subset if r["screenStatus"] == "UNKNOWN"),
            "joinEligible": sum(1 for r in subset if r["isScreenJoinEligible"]),
        }

    report = {
        "activeSourceCount": len(raw_rows),
        "masterStagingCount": total,
        "missingFromMaster": len(raw_rows) - total,
        "facilityType": dict(type_counts),
        "screenStatus": dict(status_counts),
        "hasScreenGolf": dict(has_counts),
        "isScreenJoinEligible": {"true": join_true, "false": total - join_true},
        "brandCandidate": dict(brand_counts),
        "coordinateSource": dict(coord_source),
        "coordinateOkRatePct": round(
            coord_source.get("GOV_TM_CONVERTED", 0) / total * 100, 2
        )
        if total
        else 0,
        "parkGolf": {
            "count": len(park),
            "keptInMaster": True,
            "isScreenJoinEligibleAllFalse": all(not r["isScreenJoinEligible"] for r in park),
            "names": [r["name"] for r in park],
        },
        "previousConfirmedRemap": {
            "total": len(prev_confirmed),
            "facilityType": dict(Counter(r["facilityType"] for r in prev_confirmed)),
            "screenStatus": dict(Counter(r["screenStatus"] for r in prev_confirmed)),
            "hasScreenGolf": dict(Counter(r["hasScreenGolf"] for r in prev_confirmed)),
        },
        "previousReviewRemap": {
            "total": len(prev_review),
            "facilityType": dict(Counter(r["facilityType"] for r in prev_review)),
            "screenStatus": dict(Counter(r["screenStatus"] for r in prev_review)),
            "hasScreenGolf": dict(Counter(r["hasScreenGolf"] for r in prev_review)),
            "decisionNote": (
                "REVIEW names containing 스크린 → hasScreenGolf=YES + screenStatus=POSSIBLE "
                "(screen likely, facility form unclear). "
                "Otherwise POSSIBLE + hasScreenGolf=UNKNOWN."
            ),
        },
        "previousExcludedRemap": {
            "total": len(prev_excluded),
            "facilityType": dict(Counter(r["facilityType"] for r in prev_excluded)),
            "sportType": dict(Counter(r.get("sportType") for r in prev_excluded)),
        },
        "screenCandidateTrue": sum(1 for r in staging if r["screenCandidate"]),
        "sido": sido_stats,
        "nonScreenAutoGenerated": status_counts.get("NON_SCREEN", 0),
        "hasScreenNoAutoGenerated": has_counts.get("NO", 0),
    }
    write_json(FINAL / "golf-facility-master-staging-report.json", report)

    print("=== Facility master staging summary ===")
    print(json.dumps(report, ensure_ascii=False, indent=2))

    a = [r for r in staging if r["facilityType"] == "SCREEN_GOLF" and r["screenStatus"] == "CONFIRMED"]
    b = [r for r in staging if r["facilityType"] == "MIXED_GOLF_FACILITY" and r["screenStatus"] == "CONFIRMED"]
    c = [r for r in staging if r["facilityType"] == "PRACTICE_RANGE" and r["screenStatus"] == "UNKNOWN"]
    d = [r for r in staging if r["facilityType"] == "GOLF_ACADEMY" and r["screenStatus"] == "UNKNOWN"]
    e = [r for r in staging if r["screenStatus"] == "POSSIBLE"]
    f = park

    print_cases("A. SCREEN_GOLF + CONFIRMED", a)
    print_cases("B. MIXED_GOLF_FACILITY + CONFIRMED", b)
    print_cases("C. PRACTICE_RANGE + UNKNOWN", c)
    print_cases("D. GOLF_ACADEMY + UNKNOWN", d)
    print_cases("E. POSSIBLE", e)
    print_cases("F. 파크골프/서비스 제외", f)

    json_size = (FINAL / "golf-facility-master-staging.json").stat().st_size
    csv_size = (FINAL / "golf-facility-master-staging.csv").stat().st_size
    print("\n=== Output files ===")
    print(f"json: {FINAL / 'golf-facility-master-staging.json'} count={total} size={json_size}")
    print(f"csv:  {FINAL / 'golf-facility-master-staging.csv'} count={total} size={csv_size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
