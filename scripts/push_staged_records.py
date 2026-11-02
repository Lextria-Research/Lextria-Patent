#!/usr/bin/env python3
"""
scripts/push_staged_records.py
Robust batch sync of 2,286 authoritative patent records into Central Supabase.
Inserts into:
  1. core.project_codes (owning_app='IP_LEDGER', department='IP_PATENT')
  2. patent.applications
  3. patent.prosecution_dates
  4. patent.forms_tracker
"""
import os
import sys
import json
import time
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

BATCH_SIZE = 100

def post_with_retry(url, payload, headers, max_retries=3):
    data_bytes = json.dumps(payload).encode('utf-8')
    for attempt in range(max_retries):
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, resp.read().decode('utf-8')
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8')
            if attempt == max_retries - 1:
                raise RuntimeError(f"HTTP {e.code}: {err_msg}")
            time.sleep(1 + attempt)
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(1 + attempt)

def fetch_json(url, headers):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def fetch_all_paginated(base_url, headers, page_size=1000):
    all_rows = []
    offset = 0
    sep = '&' if '?' in base_url else '?'
    while True:
        url = f"{base_url}{sep}limit={page_size}&offset={offset}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if not data:
                break
            all_rows.extend(data)
            if len(data) < page_size:
                break
            offset += page_size
    return all_rows

def main():
    if not os.path.exists(DATA_PATH):
        print(f"ERROR: {DATA_PATH} not found.")
        sys.exit(1)

    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        records = json.load(f)

    total = len(records)
    print(f"Loaded {total} authoritative records from {DATA_PATH}")

    headers_core = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Accept-Profile': 'core',
        'Content-Profile': 'core',
        'Prefer': 'resolution=merge-duplicates'
    }

    headers_patent = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Accept-Profile': 'patent',
        'Content-Profile': 'patent',
        'Prefer': 'resolution=merge-duplicates'
    }

    # =========================================================================
    # STEP 1: Sync core.project_codes
    # =========================================================================
    print("\n[1/4] Checking core.project_codes...")
    all_codes = fetch_all_paginated(
        f"{SUPABASE_URL}/rest/v1/project_codes?department=eq.IP_PATENT&select=id,code",
        headers_core
    )
    code_id_map = {item['code']: item['id'] for item in all_codes}
    print(f"Existing IP_PATENT in core.project_codes: {len(code_id_map)}")

    if len(code_id_map) < total:
        print("Inserting missing core.project_codes...")
        project_codes_payload = []
        for r in records:
            code = str(r['project_code']).strip()
            if code not in code_id_map:
                project_codes_payload.append({
                    'code': code,
                    'title': r['title'] or f"Patent Application {code}",
                    'department': 'IP_PATENT',
                    'owning_app': 'IP_LEDGER',
                    'client_id': r['client_id'],
                    'status': 'ABANDONED' if r.get('is_abandoned') else 'ACTIVE'
                })

        for i in range(0, len(project_codes_payload), BATCH_SIZE):
            chunk = project_codes_payload[i:i + BATCH_SIZE]
            post_with_retry(
                f"{SUPABASE_URL}/rest/v1/project_codes",
                chunk,
                headers_core
            )
            print(f"  core.project_codes: batch {i//BATCH_SIZE + 1}/{(len(project_codes_payload) + BATCH_SIZE - 1)//BATCH_SIZE}")

        all_codes = fetch_all_paginated(
            f"{SUPABASE_URL}/rest/v1/project_codes?department=eq.IP_PATENT&select=id,code",
            headers_core
        )
        code_id_map = {item['code']: item['id'] for item in all_codes}
    print(f"core.project_codes verified: {len(code_id_map)} IDs.")

    # =========================================================================
    # STEP 2: Sync patent.applications
    # =========================================================================
    print("\n[2/4] Checking patent.applications...")
    all_apps = fetch_all_paginated(
        f"{SUPABASE_URL}/rest/v1/applications?select=id,project_code",
        headers_patent
    )
    app_id_map = {item['project_code']: item['id'] for item in all_apps}
    print(f"Existing in patent.applications: {len(app_id_map)}")

    if len(app_id_map) < total:
        print("Inserting missing patent.applications...")
        applications_payload = []
        for r in records:
            code = str(r['project_code']).strip()
            applications_payload.append({
                'project_code': code,
                'project_code_id': code_id_map.get(code),
                'client_id': r['client_id'],
                'title': r['title'] or f"Patent Application {code}",
                'application_number': r.get('application_number'),
                'patent_number': r.get('patent_number'),
                'record_category': r.get('record_category') or 'INTERNAL_FILING',
                'specification_type': r.get('specification_type') or 'PS',
                'classification': r.get('classification') or 'AR',
                'applicant_name': r.get('applicant_name') or 'Manipal Academy of Higher Education (MAHE)',
                'applicant_address': r.get('applicant_address'),
                'is_mahe': bool(r.get('is_mahe', True)),
                'entity_category': r.get('entity_category') or 'EDUCATIONAL_INSTITUTION',
                'external_attorney': r.get('external_attorney'),
                'assigned_to': r.get('assigned_to') or 'Unassigned',
                'filed_by': r.get('filed_by'),
                'application_filing_receipt_status': r.get('application_filing_receipt_status') or 'PENDING',
                'communication_status': r.get('communication_status') or 'OPEN',
                'current_status': r.get('current_status') or 'PS Not Yet Filed',
                'is_abandoned': bool(r.get('is_abandoned', False)),
                'color_code_status': r.get('color_code_status') or 'PURPLE',
                'workdrive_folder_url': r.get('workdrive_folder_url'),
                'inventors_summary': r.get('inventors_summary')
            })

        for i in range(0, len(applications_payload), BATCH_SIZE):
            chunk = applications_payload[i:i + BATCH_SIZE]
            post_with_retry(
                f"{SUPABASE_URL}/rest/v1/applications?on_conflict=project_code",
                chunk,
                headers_patent
            )
            print(f"  patent.applications: batch {i//BATCH_SIZE + 1}/{(len(applications_payload) + BATCH_SIZE - 1)//BATCH_SIZE}")

        all_apps = fetch_all_paginated(
            f"{SUPABASE_URL}/rest/v1/applications?select=id,project_code",
            headers_patent
        )
        app_id_map = {item['project_code']: item['id'] for item in all_apps}
    print(f"patent.applications verified: {len(app_id_map)} IDs.")

    # =========================================================================
    # STEP 3: Sync patent.prosecution_dates
    # =========================================================================
    print("\n[3/4] Checking patent.prosecution_dates...")
    all_dates = fetch_all_paginated(
        f"{SUPABASE_URL}/rest/v1/prosecution_dates?select=application_id",
        headers_patent
    )
    existing_dates_apps = {item['application_id'] for item in all_dates}
    print(f"Existing in patent.prosecution_dates: {len(existing_dates_apps)}")

    if len(existing_dates_apps) < total:
        print("Inserting missing patent.prosecution_dates...")
        dates_payload = []
        for r in records:
            code = str(r['project_code']).strip()
            app_id = app_id_map.get(code)
            if not app_id or app_id in existing_dates_apps:
                continue
            dates_payload.append({
                'application_id': app_id,
                'ps_filing_date': r.get('ps_filing_date'),
                'post_date_allowed': bool(r.get('post_date_allowed', False)),
                'post_dated_date': r.get('post_dated_date'),
                'remaining_post_date_days': int(r.get('remaining_post_date_days') or 181),
                'cs_filing_date': r.get('cs_filing_date'),
                'publication_date': r.get('publication_date'),
                'publication_number': r.get('publication_number'),
                'rfe_filed': bool(r.get('rfe_filed', False)),
                'rfe_filing_date': r.get('rfe_filing_date'),
                'rfe_deadline': r.get('rfe_deadline'),
                'fer_notice_date': r.get('fer_notice_date'),
                'fer_reply_filing_date': r.get('fer_reply_filing_date'),
                'hearing_notice_date': r.get('hearing_notice_date'),
                'hearing_date': r.get('hearing_date'),
                'ws_filing_date': r.get('ws_filing_date'),
                'grant_date': r.get('grant_date'),
                'refusal_date': r.get('refusal_date'),
                'last_renewal_date': r.get('last_renewal_date'),
                'next_renewal_date': r.get('next_renewal_date'),
            })

        for i in range(0, len(dates_payload), BATCH_SIZE):
            chunk = dates_payload[i:i + BATCH_SIZE]
            post_with_retry(
                f"{SUPABASE_URL}/rest/v1/prosecution_dates?on_conflict=application_id",
                chunk,
                headers_patent
            )
            print(f"  patent.prosecution_dates: batch {i//BATCH_SIZE + 1}/{(len(dates_payload) + BATCH_SIZE - 1)//BATCH_SIZE}")
    print(f"patent.prosecution_dates verified.")

    # =========================================================================
    # STEP 4: Sync patent.forms_tracker
    # =========================================================================
    print("\n[4/4] Syncing patent.forms_tracker...")
    forms_payload = []
    for r in records:
        code = str(r['project_code']).strip()
        app_id = app_id_map.get(code)
        if not app_id:
            continue
        forms_payload.append({
            'application_id': app_id,
            'form_1_filing_date': r.get('form_1_filing_date'),
            'form_1_deadline': r.get('form_1_deadline'),
            'f1_delayed_by': r.get('f1_delayed_by'),
            'f1_status': r.get('f1_status') or 'Pending',
            'form_26_filing_date': r.get('form_26_filing_date'),
            'form_26_deadline': r.get('form_26_deadline'),
            'f26_delayed_by': r.get('f26_delayed_by'),
            'f26_status': r.get('f26_status') or 'Pending',
            'form_3_filing_date': r.get('form_3_filing_date'),
            'form_3_deadline': r.get('form_3_deadline'),
            'form_9_filing_date': r.get('form_9_filing_date'),
            'form_18_filing_date': r.get('form_18_filing_date'),
            'form_6_filing_date': r.get('form_6_filing_date'),
            'form_13_filing_date': r.get('form_13_filing_date'),
            'form_13_particulars': r.get('form_13_particulars'),
            'form_4_fer_filing_date': r.get('form_4_fer_filing_date'),
            'form_4_ws_filing_date': r.get('form_4_ws_filing_date'),
            'form_4_form_3_filing_date': r.get('form_4_form_3_filing_date'),
            'form_8_filing_date': r.get('form_8_filing_date'),
            'form_8a_filing_date': r.get('form_8a_filing_date'),
            'form_24_filing_date': r.get('form_24_filing_date'),
            'form_27_filing_date': r.get('form_27_filing_date'),
            'petition_137_filed': bool(r.get('petition_137_filed', False)),
            'petition_138_filed': bool(r.get('petition_138_filed', False))
        })

    for i in range(0, len(forms_payload), BATCH_SIZE):
        chunk = forms_payload[i:i + BATCH_SIZE]
        post_with_retry(
            f"{SUPABASE_URL}/rest/v1/forms_tracker?on_conflict=application_id",
            chunk,
            headers_patent
        )
        print(f"  patent.forms_tracker: batch {i//BATCH_SIZE + 1}/{(len(forms_payload) + BATCH_SIZE - 1)//BATCH_SIZE} ({min(i + BATCH_SIZE, len(forms_payload))}/{len(forms_payload)})")

    # =========================================================================
    # VERIFICATION
    # =========================================================================
    print("\n--- FINAL VERIFICATION ---")
    c_codes = fetch_all_paginated(f"{SUPABASE_URL}/rest/v1/project_codes?department=eq.IP_PATENT&select=id", headers_core)
    c_apps = fetch_all_paginated(f"{SUPABASE_URL}/rest/v1/applications?select=id", headers_patent)
    c_dates = fetch_all_paginated(f"{SUPABASE_URL}/rest/v1/prosecution_dates?select=application_id", headers_patent)
    c_forms = fetch_all_paginated(f"{SUPABASE_URL}/rest/v1/forms_tracker?select=application_id", headers_patent)

    print(f"core.project_codes (IP_PATENT): {len(c_codes)} rows")
    print(f"patent.applications:           {len(c_apps)} rows")
    print(f"patent.prosecution_dates:       {len(c_dates)} rows")
    print(f"patent.forms_tracker:           {len(c_forms)} rows")

    if len(c_apps) == total and len(c_codes) == total and len(c_dates) == total and len(c_forms) == total:
        print("\n🎉 SUCCESS: All 2,286 records successfully ingested and synchronized!")
    else:
        print(f"\n⚠️ WARNING: Row count mismatch: expected {total}, got apps={len(c_apps)}, codes={len(c_codes)}, dates={len(c_dates)}, forms={len(c_forms)}")

if __name__ == '__main__':
    main()
