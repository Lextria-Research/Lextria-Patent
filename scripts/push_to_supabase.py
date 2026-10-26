#!/usr/bin/env python3
"""
scripts/push_to_supabase.py
Idempotently inserts or updates all normalized patent applications into Supabase
using the service role key.
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

def push_records():
    if not os.path.exists(DATA_PATH):
        print(f"ERROR: {DATA_PATH} not found. Run scripts/migrate_all_data.py first.")
        return

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        records = json.load(f)

    print(f"Loaded {len(records)} records from {DATA_PATH}.")
    print(f"Connecting to Supabase at {SUPABASE_URL}...")

    # We will batch records into chunks of 100
    batch_size = 100
    total = len(records)
    inserted = 0

    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Accept-Profile": "patent",
        "Content-Profile": "patent",
        "Prefer": "resolution=merge-duplicates"
    }

    # Transform records to match patent.applications columns
    for i in range(0, total, batch_size):
        chunk = records[i:i + batch_size]
        payload = []
        for r in chunk:
            item = {
                "project_code": r.get("project_code"),
                "record_category": r.get("record_category", "INTERNAL_FILING"),
                "application_number": r.get("application_number"),
                "patent_number": r.get("patent_number"),
                "title": r.get("title") or "Untitled Patent Application",
                "specification_type": r.get("specification_type", "PS"),
                "classification": r.get("classification"),
                "applicant_name": r.get("applicant_name", "Manipal Academy of Higher Education (MAHE)"),
                "applicant_address": r.get("applicant_address"),
                "is_mahe": r.get("is_mahe", True),
                "entity_category": r.get("entity_category", "EDUCATIONAL_INSTITUTION"),
                "external_attorney": r.get("external_attorney"),
                "assigned_to": r.get("assigned_to"),
                "filed_by": r.get("filed_by"),
                "application_filing_receipt_status": r.get("application_filing_receipt_status", "PENDING"),
                "communication_status": r.get("communication_status", "OPEN"),
                "current_status": r.get("current_status", "PS Not Yet Filed"),
                "is_abandoned": r.get("is_abandoned", False),
                "color_code_status": r.get("color_code_status", "PURPLE"),
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
                    print(f"  Pushed batch {i//batch_size + 1}/{(total + batch_size - 1)//batch_size} ({inserted}/{total} rows)")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            print(f"  Batch {i//batch_size + 1} HTTP {e.code}: {err_body}")
            if "Invalid schema" in err_body or e.code == 406:
                print("\n[CRITICAL NOTE]: Supabase requires the 'patent' schema migration to be executed first.")
                print("Please run `supabase/migrations/0200_patent_schema.sql` in the Supabase SQL Editor:")
                print(f"👉 https://supabase.com/dashboard/project/eafciegebhuhoneypsqy/sql")
                return

if __name__ == "__main__":
    push_records()
