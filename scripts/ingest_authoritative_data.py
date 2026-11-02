#!/usr/bin/env python3
"""
scripts/ingest_authoritative_data.py
High-fidelity extraction of LR_ALL PATENT LIST (As of 02-11-2026).xlsx
and Drafters_Dashbaord data.xlsx into complete normalized JSON bundles.
"""
import os
import sys
import json
import re
from datetime import datetime, date, timedelta
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(BASE_DIR, "LR_ALL PATENT LIST (As of 02-11-2026).xlsx")
DRAFTERS_EXCEL_PATH = os.path.join(BASE_DIR, "Drafters_Dashbaord data.xlsx")
DATA_DIR = os.path.join(BASE_DIR, "data")
PUBLIC_DIR = os.path.join(BASE_DIR, "frontend", "public")

CLIENT_MAP = {
    'MAHE': 'c0736c22-db5e-4bd1-b7f5-5facc08d865e',
    'AAIS': 'd6e92cb7-e6ed-45e0-ad6b-c260b49fa908',
    'CMRIT': 'b3ded64e-134f-41ab-855f-cff14793d73d',
    'SCEM': 'ccdb494e-7977-410a-b665-bece70e7e947',
    'YIT': 'd846fde2-5f8d-4ee0-a205-afbf19807db7',
    'DSU': '64c0d31c-b87f-42ec-be8a-64f7aa699c9a',
    'RV': 'eb053756-7bb5-463e-8c26-9706095befb4',
    'RVE': 'eb053756-7bb5-463e-8c26-9706095befb4',
    'SJEC': '13e8386a-9e3b-4c20-83ca-530026ba4352',
    'PRS': '67008f3c-a990-4d96-9a88-7d04a76d97bc',
    'P': '85be8aa2-26d5-4a37-8563-5857476706e5',
    'M': 'ade92c55-c49a-4112-aa5e-23665df05d95',
    'CC': 'b8865bb9-a220-404d-866e-77e4a011b520',
    'SM': 'b6714f0f-80b7-4950-b14c-a3dc317081fa',
    'WTMS': 'de332583-efb9-4ccf-a4a8-f63e4b73f6e7',
    'DEFAULT': '0597e2e3-8124-478d-911f-45fe9bf1dab4'
}

MAHE_PREFIXES = {
    'AR', 'BR', 'CD', 'CH', 'DA', 'DH', 'HK', 'HP', 'KM', 'MA', 'MB', 'MCODS',
    'MK', 'MN', 'MP', 'MS', 'MT', 'PH', 'SP', 'AP', 'LT', 'MI', 'DST'
}

PLACEHOLDERS = {'', 'na', 'n/a', '-', '--', 'nil', 'none', 'not filed', 'not yet postdated', 'ps not yet filed'}
RULE_CUTOFF = date(2024, 3, 15)

def clean_str(val):
    if val is None:
        return ''
    s = str(val).strip()
    return '' if s.lower() in PLACEHOLDERS or s.startswith('#') else s

def clean_app_num(val):
    if val is None:
        return None
    s = str(val).strip()
    if s.lower() in PLACEHOLDERS or s.startswith('#'):
        return None
    if s.endswith('.0'):
        s = s[:-2]
    return s if s else None

def parse_date(val):
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.strftime('%Y-%m-%d')
    s = str(val).strip()
    if s.lower() in PLACEHOLDERS or s.startswith('#'):
        return None
    m = re.match(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})', s)
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1))).strftime('%Y-%m-%d')
        except ValueError:
            pass
    m2 = re.match(r'^(\d{4})[/-](\d{1,2})[/-](\d{1,2})', s)
    if m2:
        try:
            return date(int(m2.group(1)), int(m2.group(2)), int(m2.group(3))).strftime('%Y-%m-%d')
        except ValueError:
            pass
    try:
        f = float(s)
        if 20000 < f < 70000:
            return (datetime(1899, 12, 30) + timedelta(days=int(f))).strftime('%Y-%m-%d')
    except ValueError:
        pass
    return None

def add_months_date(d_str, months):
    if not d_str:
        return None
    try:
        dt = datetime.strptime(d_str, '%Y-%m-%d').date()
        m = dt.month - 1 + months
        year = dt.year + m // 12
        month = m % 12 + 1
        day = min(dt.day, [31, 29 if year%4==0 and (year%100!=0 or year%400==0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month-1])
        return date(year, month, day).strftime('%Y-%m-%d')
    except Exception:
        return None

def add_days_date(d_str, days):
    if not d_str:
        return None
    try:
        dt = datetime.strptime(d_str, '%Y-%m-%d').date()
        return (dt + timedelta(days=days)).strftime('%Y-%m-%d')
    except Exception:
        return None

def classify_prefix(code):
    m = re.match(r'^[A-Za-z_]+', str(code).strip())
    prefix = m.group(0).upper() if m else ''
    is_mahe = prefix in MAHE_PREFIXES
    category = 'INTERNAL_FILING'
    if prefix.startswith('EX'):
        category = 'EXTERNAL_TAKEOVER'
    elif prefix in {'DA', 'KM', 'MB', 'MS', 'MI'}:
        category = 'WORKSHOP_IDF'
    return prefix, is_mahe, category

def sanitize_spec_type(ps_date, cs_date):
    if ps_date and cs_date:
        return 'PS_TO_CS'
    if cs_date and not ps_date:
        return 'CS'
    return 'PS'

def sanitize_color(raw_val):
    s = str(raw_val or '').strip().upper()
    if 'RED' in s: return 'RED'
    if 'GREEN' in s: return 'GREEN'
    if 'ORANGE' in s: return 'ORANGE'
    if 'YELLOW' in s: return 'YELLOW'
    if 'PURPLE' in s: return 'PURPLE'
    if 'BLUE' in s: return 'BLUE'
    if 'GREY' in s or 'GRAY' in s or 'NO TRAIL' in s: return 'GREY'
    return 'PURPLE'

def sanitize_receipt_status(val):
    s = str(val or '').strip().upper()
    if 'NOT' in s: return 'NOT_RECEIVED'
    if 'REC' in s: return 'RECEIVED'
    return 'PENDING'

def sanitize_comm_status(val):
    s = str(val or '').strip().upper()
    if 'CLOSE' in s: return 'CLOSE'
    if 'INVENTOR' in s: return 'PENDING_INVENTOR'
    return 'OPEN'

def sanitize_form_status(filing_date, deadline):
    if not filing_date and not deadline:
        return 'Pending'
    if filing_date and deadline:
        return 'Delayed' if filing_date > deadline else 'Within Deadline'
    if filing_date:
        return 'Within Deadline'
    return 'Pending'

def parse_drafters_dashboard():
    """Extract drafter assignments and stage triage from Drafters_Dashbaord data.xlsx"""
    if not os.path.exists(DRAFTERS_EXCEL_PATH):
        print(f"Warning: {DRAFTERS_EXCEL_PATH} not found.")
        return {}

    print(f"Reading Drafters Dashboard: {DRAFTERS_EXCEL_PATH}")
    wb = openpyxl.load_workbook(DRAFTERS_EXCEL_PATH, data_only=True)
    drafter_sheets = ['Thanush', 'Pratham', 'Amith', 'Anusha', 'Abhishek', 'Ayush', 'Thilak', 'Pramith']
    
    mapping = {}
    for dname in drafter_sheets:
        if dname not in wb.sheetnames:
            continue
        s = wb[dname]
        hdr = None
        dhmap = {}
        for r in s.iter_rows(values_only=True):
            if not hdr:
                if any(r):
                    hdr = [str(c).strip().upper() if c else '' for c in r]
                    dhmap = {h: i for i, h in enumerate(hdr)}
                continue
            code_idx = dhmap.get('AR CODE') or 0
            if code_idx < len(r) and r[code_idx]:
                code = str(r[code_idx]).strip().upper()
                if code and len(code) <= 35 and not code.startswith('='):
                    inv_idx = dhmap.get('INVENTOR NAME & POINT OF CONTACT') or 2
                    status_idx = dhmap.get('CASE STATUS') or 13
                    draft_sent_idx = dhmap.get('DRAFT SENT TO INVENTOR FOR CONFIRMATION ON') or 9
                    last_comm_idx = dhmap.get('LAST COMMUNICATION DATE WITH INVENTOR') or 11

                    drafter_item = {
                        'drafter': dname,
                        'inventor_name': clean_str(r[inv_idx]) if inv_idx < len(r) else None,
                        'case_status': clean_str(r[status_idx]) if status_idx < len(r) else None,
                        'draft_sent_date': parse_date(r[draft_sent_idx]) if draft_sent_idx < len(r) else None,
                        'last_comm_date': parse_date(r[last_comm_idx]) if last_comm_idx < len(r) else None,
                    }
                    mapping[code] = drafter_item
                    clean_code = re.sub(r'\s*\(.*?\)', '', code).strip()
                    if clean_code and clean_code != code:
                        mapping[clean_code] = drafter_item
    print(f"Mapped {len(mapping)} assignments across 8 drafters.")
    return mapping

def generate_datasets():
    print(f"Reading Master Excel: {EXCEL_PATH}")
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    s = wb['DATA']

    drafters_map = parse_drafters_dashboard()
    
    header = None
    hmap = {}
    master_records = []
    seen_codes = set()

    for row_idx, row in enumerate(s.iter_rows(values_only=True)):
        if not header:
            if any(row):
                header = [str(c).strip() if c is not None else f'Col_{i}' for i, c in enumerate(row)]
                hmap = {h: i for i, h in enumerate(header)}
            continue

        raw_code = row[0]
        if not raw_code or not str(raw_code).strip() or str(raw_code).strip().startswith('='):
            continue

        code = str(raw_code).strip().upper()
        if code in seen_codes:
            code = f"{code}_B"
        seen_codes.add(code)

        def get_val(col_name):
            idx = hmap.get(col_name)
            return row[idx] if idx is not None and idx < len(row) else None

        prefix, is_mahe, category = classify_prefix(code)
        drafter_info = drafters_map.get(code, {})

        title = clean_str(get_val('Title'))
        if not title:
            title = f"Patent Application {code}"

        app_name = clean_str(get_val('Applicant Name')) or ('Manipal Academy of Higher Education' if is_mahe else 'Independent Applicant')
        app_addr = clean_str(get_val('\nApplicant address\n')) or clean_str(get_val('Applicant address'))
        app_num = clean_app_num(get_val('Application Number'))

        assigned_to = drafter_info.get('drafter') or clean_str(get_val('Assigned to ')) or clean_str(get_val('Assigned to')) or 'Unassigned'
        filed_by = clean_str(get_val('Filed BY'))

        ps_date = parse_date(get_val('date of filing (PS)'))
        cs_date = parse_date(get_val('Date of filing (CS)'))
        post_date = parse_date(get_val('Post-Dated Date'))
        cs_deadline = parse_date(get_val('CS DEADLINE')) or add_months_date(post_date or ps_date, 12)
        spec_type = sanitize_spec_type(ps_date, cs_date)

        raw_color = drafter_info.get('case_status') or clean_str(get_val('Color Code Status')) or 'PURPLE'
        color_code = sanitize_color(raw_color)

        raw_status = clean_str(get_val('STATUS')) or ('Published' if get_val('Date of Publication') else 'PS Filed')
        is_abandoned = (color_code == 'RED') or ('abandon' in raw_status.lower()) or ('refused' in raw_status.lower())

        pub_date = parse_date(get_val('Date of Publication'))
        pub_num = clean_str(get_val('Publication number'))
        fer_date = parse_date(get_val('Date of FER Notice'))
        fer_reply = parse_date(get_val('Date of filing FER Reply'))
        fer_deadline = parse_date(get_val('FER Reply Deadline')) or add_months_date(fer_date, 6)

        hearing_notice = parse_date(get_val('Date of Hearing notice'))
        hearing_date = parse_date(get_val('Date of hearing'))
        ws_date = parse_date(get_val('Date of filing WS'))
        ws_deadline = parse_date(get_val('WS Deadline')) or add_days_date(hearing_date, 15)

        grant_date = parse_date(get_val('Date of Grant'))
        refusal_date = parse_date(get_val('Date of refusal'))
        renewal_date = parse_date(get_val('Date of Renewal'))
        next_renewal = parse_date(get_val('Date of Next Renewal'))

        rfe_date = parse_date(get_val('Form-18/18A date of filing'))
        priority_date = ps_date or cs_date
        rfe_deadline = None
        if priority_date:
            try:
                p_dt = datetime.strptime(priority_date, '%Y-%m-%d').date()
                mos = 31 if p_dt >= RULE_CUTOFF else 48
                rfe_deadline = add_months_date(priority_date, mos)
            except Exception:
                pass

        f1_date = parse_date(get_val('Form-1 date of filing'))
        f1_deadline = parse_date(get_val('Form-1 deadline')) or add_months_date(ps_date or cs_date, 6)
        f26_date = parse_date(get_val('Form-26 date of filing'))
        f26_deadline = parse_date(get_val('Form 26 Deadline')) or add_months_date(ps_date or cs_date, 3)

        f1_delayed = clean_str(get_val('F1 Delayed by')) or ('Filed within deadline' if f1_date and f1_deadline and f1_date <= f1_deadline else None)
        f26_delayed = clean_str(get_val('F26 Delayed by')) or ('Filed within deadline' if f26_date and f26_deadline and f26_date <= f26_deadline else None)

        f3_date = parse_date(get_val('FORM 3 date of filing'))
        f3_deadline = parse_date(get_val('FORM 3 deadline'))
        f9_date = parse_date(get_val('Form-9 date of filing'))
        f6_date = parse_date(get_val('Form 6- Date of Filing'))
        f13_date = parse_date(get_val('Form 13 date of filing'))
        f13_part = clean_str(get_val('Form 13 Particulars'))
        f4_fer = parse_date(get_val('Form 4 FER Date of filing'))
        f4_ws = parse_date(get_val('Form 4 for WS Date of filing'))
        f4_f3 = parse_date(get_val('Form 4 for Form 3'))
        f8_date = parse_date(get_val('Form 8 Date of filing'))
        f8a_date = parse_date(get_val('Form 8A Date of filling'))
        f24_date = parse_date(get_val('Form 24 Date of filing'))
        f27_date = parse_date(get_val('Form 27 Date of filing'))

        inv_names = clean_str(get_val('Inventor Name')) or drafter_info.get('inventor_name') or ''
        inv_summary = ", ".join([p.strip() for p in re.split(r'\b\d+\s*[\.\)]\s*|\n|,', inv_names) if len(p.strip()) > 2])

        client_id = CLIENT_MAP.get(prefix) or (CLIENT_MAP['MAHE'] if is_mahe else CLIENT_MAP['DEFAULT'])

        record = {
            "id": f"rec_{code}",
            "project_code": code,
            "title": title,
            "application_number": app_num,
            "patent_number": None,
            "record_category": category,
            "specification_type": spec_type,
            "classification": prefix,
            "applicant_name": app_name,
            "applicant_address": app_addr,
            "is_mahe": is_mahe,
            "client_id": client_id,
            "entity_category": "EDUCATIONAL_INSTITUTION" if is_mahe else "LARGE_ENTITY",
            "external_attorney": None,
            "assigned_to": assigned_to,
            "filed_by": filed_by,
            "application_filing_receipt_status": sanitize_receipt_status(get_val('APPLICATION FILING RECEIPT')),
            "communication_status": sanitize_comm_status(get_val('Communication Status')),
            "current_status": raw_status,
            "is_abandoned": is_abandoned,
            "color_code_status": color_code,
            "workdrive_folder_url": None,
            "inventors_summary": inv_summary or None,
            "ps_filing_date": ps_date,
            "post_date_allowed": clean_str(get_val('POST DATE ALLOWED')).lower() in {'yes', 'true'},
            "post_dated_date": post_date,
            "remaining_post_date_days": 181,
            "cs_filing_date": cs_date,
            "cs_deadline": cs_deadline,
            "publication_date": pub_date,
            "publication_number": pub_num or None,
            "rfe_filed": bool(rfe_date),
            "rfe_filing_date": rfe_date,
            "rfe_deadline": rfe_deadline,
            "fer_notice_date": fer_date,
            "fer_reply_filing_date": fer_reply,
            "fer_reply_deadline": fer_deadline,
            "hearing_notice_date": hearing_notice,
            "hearing_date": hearing_date,
            "ws_filing_date": ws_date,
            "ws_deadline": ws_deadline,
            "grant_date": grant_date,
            "refusal_date": refusal_date,
            "last_renewal_date": renewal_date,
            "next_renewal_date": next_renewal,
            "form_1_filing_date": f1_date,
            "form_1_deadline": f1_deadline,
            "f1_status": sanitize_form_status(f1_date, f1_deadline),
            "f1_delayed_by": f1_delayed,
            "form_26_filing_date": f26_date,
            "form_26_deadline": f26_deadline,
            "f26_status": sanitize_form_status(f26_date, f26_deadline),
            "f26_delayed_by": f26_delayed,
            "form_3_filing_date": f3_date,
            "form_3_deadline": f3_deadline,
            "form_9_filing_date": f9_date,
            "form_18_filing_date": rfe_date,
            "form_6_filing_date": f6_date,
            "form_13_filing_date": f13_date,
            "form_13_particulars": f13_part or None,
            "form_4_fer_filing_date": f4_fer,
            "form_4_ws_filing_date": f4_ws,
            "form_4_form_3_filing_date": f4_f3,
            "form_8_filing_date": f8_date,
            "form_8a_filing_date": f8a_date,
            "form_24_filing_date": f24_date,
            "form_27_filing_date": f27_date,
            "petition_137_filed": bool(clean_str(get_val('Petition under 137'))),
            "petition_138_filed": bool(clean_str(get_val('Petition under 138'))),
            "additional_comments": clean_str(get_val('Additional Comments')) or None,
            "queries": clean_str(get_val('Queries')) or None,
            "query_status": clean_str(get_val('Query Status')) or 'OPEN'
        }
        master_records.append(record)

    print(f"Total processed master records: {len(master_records)}")

    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)

    print("Writing master_records.json...")
    with open(os.path.join(DATA_DIR, "master_records.json"), "w", encoding="utf-8") as f:
        json.dump(master_records, f, indent=2, ensure_ascii=False)

    with open(os.path.join(PUBLIC_DIR, "master_records.json"), "w", encoding="utf-8") as f:
        json.dump(master_records, f, indent=2, ensure_ascii=False)

    return master_records

if __name__ == "__main__":
    generate_datasets()
