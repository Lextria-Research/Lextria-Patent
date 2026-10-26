#!/usr/bin/env python3
"""
scripts/push_to_supabase.py
Idempotently inserts or updates all normalized patent applications,
prosecution dates, and forms trackers into Supabase using the service role key.
"""
import os
import sys
import json
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://eafciegebhuhoneypsqy.supabase.co")
SERVICE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZmNpZWdlYmh1aG9uZXlwc3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA5NTU1NywiZXhwIjoyMTA2NjcxNTU3fQ.rxJJ-BO6bAeJYBu-tonvwxNZ3rh1D5ugjIpQMPk4qNo"
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "master_records.json")

def sanitize_receipt_status(val):
    s = str(val or '').strip().upper()
    if 'NOT' in s:
        return 'NOT_RECEIVED'
    if 'REC' in s:
        return 'RECEIVED'
    return 'PENDING'

def sanitize_comm_status(val):
    s = str(val or '').strip().upper()
    if 'CLOSE' in s:
        return 'CLOSE'
    if 'INVENTOR' in s:
        return 'PENDING_INVENTOR'
    return 'OPEN'

def sanitize_spec_type(val):
    s = str(val or '').strip().upper()
    valid = {'PS', 'CS', 'PS_TO_CS', 'DIVISIONAL', 'PATENT_OF_ADDITION'}
    if s in valid:
        return s
    if 'CS' in s and 'PS' in s:
        return 'PS_TO_CS'
    if 'CS' in s:
        return 'CS'
    return 'PS'

def sanitize_color(val):
    s = str(val or '').strip().upper()
    valid = {'PURPLE', 'GREEN', 'RED', 'YELLOW', 'ORANGE', 'BLUE', 'GREY'}
    return s if s in valid else 'PURPLE'

def sanitize_category(val):
    s = str(val or '').strip().upper()
    valid = {'INTERNAL_FILING', 'EXTERNAL_TAKEOVER', 'WORKSHOP_IDF'}
    return s if s in valid else 'INTERNAL_FILING'

def sanitize_entity(val):
    s = str(val or '').strip().upper()
    valid = {'EDUCATIONAL_INSTITUTION', 'STARTUP_DPIIT', 'SMALL_ENTITY_UDYAM', 'INDIVIDUAL', 'LARGE_ENTITY'}
    return s if s in valid else 'EDUCATIONAL_INSTITUTION'

def sanitize_form_status(val):
    s = str(val or '').strip().title()
    valid = {'Within Deadline', 'Delayed', 'Pending', 'Exempt'}
    return s if s in valid else 'Pending'

def parse_iso_date(val):
    if not val:
        return None
    s = str(val).strip()
    if len(s) >= 10 and s[4] == '-' and s[7] == '-':
        return s[:10]
    return None

def fetch_app_id_map(headers):
    """Fetch mapping of project_code -> UUID id from Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/applications?select=id,project_code&limit=5000"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        items = json.loads(resp.read().decode("utf-8"))
        return {item["project_code"]: item["id"] for item in items}

def push_records():
    if not os.path.exists(DATA_PATH):
        print(f"ERROR: {DATA_PATH} not found. Run scripts/migrate_all_data.py first.")
        return

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        records = json.load(f)

    print(f"Loaded {len(records)} records from {DATA_PATH}.")
    print(f"Connecting to Supabase at {SUPABASE_URL}...")

    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Accept-Profile": "patent",
        "Content-Profile": "patent",
        "Prefer": "resolution=merge-duplicates"
    }

    # 1. Push applications
    print("\n--- 1/3 Syncing patent.applications ---")
    batch_size = 100
    total = len(records)
    inserted = 0

    for i in range(0, total, batch_size):
        chunk = records[i:i + batch_size]
        payload = []
        for r in chunk:
            item = {
                "project_code": str(r.get("project_code")).strip(),
                "record_category": sanitize_category(r.get("record_category")),
                "application_number": str(r.get("application_number")).strip() if r.get("application_number") else None,
                "patent_number": str(r.get("patent_number")).strip() if r.get("patent_number") else None,
                "title": r.get("title") or "Untitled Patent Application",
                "specification_type": sanitize_spec_type(r.get("specification_type")),
                "classification": r.get("classification"),
                "applicant_name": r.get("applicant_name", "Manipal Academy of Higher Education (MAHE)"),
                "applicant_address": r.get("applicant_address"),
                "is_mahe": bool(r.get("is_mahe", True)),
                "entity_category": sanitize_entity(r.get("entity_category")),
                "external_attorney": r.get("external_attorney"),
                "assigned_to": r.get("assigned_to"),
                "filed_by": r.get("filed_by"),
                "application_filing_receipt_status": sanitize_receipt_status(r.get("application_filing_receipt_status")),
                "communication_status": sanitize_comm_status(r.get("communication_status")),
                "current_status": r.get("current_status") or "PS Not Yet Filed",
                "is_abandoned": bool(r.get("is_abandoned", False)),
                "color_code_status": sanitize_color(r.get("color_code_status")),
                "workdrive_folder_url": r.get("workdrive_folder_url"),
                "inventors_summary": r.get("inventors_summary")
            }
            payload.append(item)

        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/applications?on_conflict=project_code",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                if resp.status in (200, 201, 204):
                    inserted += len(chunk)
                    print(f"  Applications: batch {i//batch_size + 1}/{(total + batch_size - 1)//batch_size} ({inserted}/{total} rows)")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            print(f"  Batch {i//batch_size + 1} HTTP {e.code}: {err_body}")

    # Fetch app id mapping
    print("\nRetrieving application UUIDs for relational child sync...")
    app_id_map = fetch_app_id_map(headers)
    print(f"Mapped {len(app_id_map)} applications.")

    # 2. Push prosecution_dates
    print("\n--- 2/3 Syncing patent.prosecution_dates ---")
    dates_payload = []
    for r in records:
        code = str(r.get("project_code")).strip()
        app_id = app_id_map.get(code)
        if not app_id:
            continue
        item = {
            "application_id": app_id,
            "ps_filing_date": parse_iso_date(r.get("ps_filing_date")),
            "post_date_allowed": bool(r.get("post_date_allowed", False)),
            "post_dated_date": parse_iso_date(r.get("post_dated_date")),
            "remaining_post_date_days": int(r.get("remaining_post_date_days") or 181),
            "cs_filing_date": parse_iso_date(r.get("cs_filing_date")),
            "publication_date": parse_iso_date(r.get("publication_date")),
            "publication_number": str(r.get("publication_number")).strip() if r.get("publication_number") else None,
            "rfe_filed": bool(r.get("rfe_filed", False)),
            "rfe_filing_date": parse_iso_date(r.get("rfe_filing_date")),
            "rfe_deadline": parse_iso_date(r.get("rfe_deadline")),
            "fer_notice_date": parse_iso_date(r.get("fer_notice_date")),
            "fer_reply_filing_date": parse_iso_date(r.get("fer_reply_filing_date")),
            "hearing_notice_date": parse_iso_date(r.get("hearing_notice_date")),
            "hearing_date": parse_iso_date(r.get("hearing_date")),
            "ws_filing_date": parse_iso_date(r.get("ws_filing_date")),
            "grant_date": parse_iso_date(r.get("grant_date")),
            "refusal_date": parse_iso_date(r.get("refusal_date")),
            "last_renewal_date": parse_iso_date(r.get("last_renewal_date")),
            "next_renewal_date": parse_iso_date(r.get("next_renewal_date")),
            "current_annuity_year": int(r.get("current_annuity_year")) if r.get("current_annuity_year") else None
        }
        dates_payload.append(item)

    for i in range(0, len(dates_payload), batch_size):
        chunk = dates_payload[i:i + batch_size]
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/prosecution_dates?on_conflict=application_id",
            data=json.dumps(chunk).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"  Prosecution Dates: batch {i//batch_size + 1}/{(len(dates_payload) + batch_size - 1)//batch_size}")
        except urllib.error.HTTPError as e:
            print(f"  Dates Batch {i//batch_size + 1} HTTP {e.code}: {e.read().decode('utf-8')[:200]}")

    # 3. Push forms_tracker
    print("\n--- 3/3 Syncing patent.forms_tracker ---")
    forms_payload = []
    for r in records:
        code = str(r.get("project_code")).strip()
        app_id = app_id_map.get(code)
        if not app_id:
            continue
        item = {
            "application_id": app_id,
            "form_1_filing_date": parse_iso_date(r.get("form_1_filing_date")),
            "form_1_deadline": parse_iso_date(r.get("form_1_deadline")),
            "f1_delayed_by": r.get("f1_delayed_by"),
            "f1_status": sanitize_form_status(r.get("f1_status")),
            "form_26_filing_date": parse_iso_date(r.get("form_26_filing_date")),
            "form_26_deadline": parse_iso_date(r.get("form_26_deadline")),
            "f26_delayed_by": r.get("f26_delayed_by"),
            "f26_status": sanitize_form_status(r.get("f26_status")),
            "form_3_filing_date": parse_iso_date(r.get("form_3_filing_date")),
            "form_3_deadline": parse_iso_date(r.get("form_3_deadline")),
            "form_9_filing_date": parse_iso_date(r.get("form_9_filing_date")),
            "form_18_filing_date": parse_iso_date(r.get("form_18_filing_date")),
            "form_13_filing_date": parse_iso_date(r.get("form_13_filing_date")),
            "form_13_particulars": r.get("form_13_particulars"),
            "petition_137_filed": bool(r.get("petition_137_filed", False)),
            "petition_138_filed": bool(r.get("petition_138_filed", False))
        }
        forms_payload.append(item)

    for i in range(0, len(forms_payload), batch_size):
        chunk = forms_payload[i:i + batch_size]
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/forms_tracker?on_conflict=application_id",
            data=json.dumps(chunk).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"  Forms Tracker: batch {i//batch_size + 1}/{(len(forms_payload) + batch_size - 1)//batch_size}")
        except urllib.error.HTTPError as e:
            print(f"  Forms Batch {i//batch_size + 1} HTTP {e.code}: {e.read().decode('utf-8')[:200]}")

    print("\n✅ COMPLETE ECOSYSTEM SEED SUCCESSFUL!")
    print(f"Synced {len(records)} applications, prosecution dates, and statutory forms tracker to Supabase.")

if __name__ == "__main__":
    push_records()
