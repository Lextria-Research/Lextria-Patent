import os
import json
import re
import urllib.request
import urllib.error
from collections import defaultdict

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://eafciegebhuhoneypsqy.supabase.co")
SERVICE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZmNpZWdlYmh1aG9uZXlwc3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA5NTU1NywiZXhwIjoyMTA2NjcxNTU3fQ.rxJJ-BO6bAeJYBu-tonvwxNZ3rh1D5ugjIpQMPk4qNo"
)

HEADERS_CORE = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Accept-Profile': 'core',
    'Content-Profile': 'core',
    'Prefer': 'return=representation'
}

HEADERS_PATENT = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Accept-Profile': 'patent',
    'Content-Profile': 'patent',
    'Prefer': 'return=representation'
}

DATA_DIR = r'Patent Dashboard\data\extracted_pg_dump'

# Exact Verified Client UUIDs from core.clients
MAHE_ID = "c0736c22-db5e-4bd1-b7f5-5facc08d865e"
SMVITM_ID = "b6714f0f-80b7-4950-b14c-a3dc317081fa"
CANARA_ID = "b8865bb9-a220-404d-866e-77e4a011b520"
SJEC_ID = "13e8386a-9e3b-4c20-83ca-530026ba4352"
INDEP_ID = "0597e2e3-8124-478d-911f-45fe9bf1dab4"

def norm_code(c):
    return re.sub(r'[^A-Za-z0-9]', '', c or '').upper()

def postgrest_fetch_all(endpoint, headers):
    results = []
    offset = 0
    limit = 1000
    while True:
        sep = '&' if '?' in endpoint else '?'
        url = f"{SUPABASE_URL}/rest/v1/{endpoint}{sep}offset={offset}&limit={limit}"
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            if not data:
                break
            results.extend(data)
            offset += len(data)
            if len(data) < limit:
                break
    return results

def postgrest_post(endpoint, data_list, headers):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    payload = json.dumps(data_list).encode('utf-8')
    req = urllib.request.Request(url, data=payload, method='POST', headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def postgrest_patch(endpoint, data_dict, headers):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    payload = json.dumps(data_dict).encode('utf-8')
    req = urllib.request.Request(url, data=payload, method='PATCH', headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def map_client(applicant_name, code):
    app_upper = (applicant_name or '').upper()
    code_upper = (code or '').upper()
    if 'SHR' in app_upper or 'MADHWA' in app_upper or 'SMVITM' in app_upper or code_upper.startswith('SM'):
        return SMVITM_ID, 'Shri Madhwa Vadiraja Institute of Technology and Management', False
    if 'CANARA' in app_upper or code_upper.startswith('CC'):
        return CANARA_ID, 'Canara Engineering College', False
    if 'JOSEPH' in app_upper or code_upper.startswith('SJEC'):
        return SJEC_ID, 'St. Joseph Engineering College', False
    if 'MANIPAL' in app_upper or code_upper.startswith('EX-KK') or code_upper.startswith('AR'):
        return MAHE_ID, 'Manipal Academy of Higher Education (MAHE)', True
    return INDEP_ID, applicant_name or 'Independent & Private Inventors Portfolio', False

def map_status(raw_status):
    s_map = {
        'CS_WAITING_FOR_DATA': 'CS Waiting for Data',
        'PS_IDF_SENT_AWAITING_DATA': 'PS IDF Sent - Awaiting Data',
        'PS_FILED': 'PS Filed',
        'FORM_18_FILED': 'Form 18 Filed',
        'PATENT_PUBLISHED': 'Patent Published',
        'PS_WAITING_FOR_CONFIRMATION': 'PS Waiting for Confirmation',
        'CS_CHECKLIST_SENT_POST_PS': 'CS Checklist Sent (Post-PS)',
        'APPLICATION_POST_DATED': 'Application Post-Dated',
        'GRANTED': 'Granted',
        'FORM_3_FILED': 'Form 3 Filed',
        'CS_WAITING_FOR_DATA_POST_PS': 'CS Waiting for Data (Post-PS)',
        'FORM_9_FILED': 'Form 9 Filed',
        'CS_FILED': 'CS Filed',
        'CS_FILED_POST_PS': 'CS Filed (Post-PS)',
        'RESPONSE_FILED_AWAITING_HEARING': 'Response Filed - Awaiting Hearing',
        'CS_WAITING_FOR_CONFIRMATION': 'CS Waiting for Confirmation',
        'WS_FILED_AWAITING_ORDER': 'WS Filed - Awaiting Order',
        'RENEWAL_DUE': 'Renewal Due',
        'CS_CHECKLIST_SENT': 'CS Checklist Sent',
        'CS_WAITING_FOR_CONFIRMATION_POST_PS': 'CS Waiting for Confirmation (Post-PS)',
        'FER_ISSUED_AWAITING_RESPONSE': 'FER Issued - Awaiting Response',
        'HEARING_NOTICE_ISSUED': 'Hearing Notice Issued',
        'PS_UNDER_DRAFTING': 'PS Under Drafting',
        'CS_UNDER_DRAFTING': 'CS Under Drafting',
        'CS_UNDER_REVIEW': 'CS Under Review',
        'CS_SENT_TO_ADMINISTRATOR': 'CS Sent to Administrator',
        'CS_UNDER_REVIEW_POST_PS': 'CS Under Review (Post-PS)',
        'PS_SENT_TO_ADMINISTRATOR': 'PS Sent to Administrator',
        'PS_UNDER_REVIEW': 'PS Under Review',
        'CS_UNDER_DRAFTING_POST_PS': 'CS Under Drafting (Post-PS)',
    }
    return s_map.get(raw_status, 'PS Not Yet Filed')

def map_color(status_label):
    if status_label == 'Granted':
        return 'GREEN'
    if status_label in ('Patent Published', 'Form 18 Filed', 'PS Filed', 'CS Filed', 'CS Filed (Post-PS)'):
        return 'BLUE'
    if status_label in ('FER Issued - Awaiting Response', 'Hearing Notice Issued', 'Renewal Due'):
        return 'RED'
    if status_label in ('Response Filed - Awaiting Hearing', 'WS Filed - Awaiting Order'):
        return 'ORANGE'
    if status_label in ('CS Waiting for Data', 'PS IDF Sent - Awaiting Data', 'CS Waiting for Confirmation'):
        return 'YELLOW'
    return 'PURPLE'

def standardize_code(raw_code):
    c = re.sub(r'\s+', '', raw_code.strip())
    return c

def main():
    print("=== LEXTRIA PATENT ECOSYSTEM: POSTGRES BACKUP INGESTION & ENRICHMENT ===")
    
    # 1. Load Extracted Dump Data
    with open(os.path.join(DATA_DIR, 'patents.json'), 'r', encoding='utf-8') as f:
        dump_patents = json.load(f)
    with open(os.path.join(DATA_DIR, 'inventors.json'), 'r', encoding='utf-8') as f:
        dump_inventors = json.load(f)
    with open(os.path.join(DATA_DIR, 'deadlines.json'), 'r', encoding='utf-8') as f:
        dump_deadlines = json.load(f)

    print(f"Loaded from dump: {len(dump_patents)} patents, {len(dump_inventors)} inventors, {len(dump_deadlines)} deadlines.")
    
    # 2. Fetch Existing Database Applications & Project Codes
    print("\nFetching existing Supabase state...")
    existing_apps = postgrest_fetch_all("applications?select=id,project_code,application_number,title,applicant_address,current_status", HEADERS_PATENT)
    print(f"Existing patent applications in Supabase: {len(existing_apps)}")
    
    existing_pc = postgrest_fetch_all("project_codes?department=eq.IP_PATENT&select=id,code,code_normalized", HEADERS_CORE)
    pc_map_by_norm = {r['code_normalized']: r for r in existing_pc}
    print(f"Existing IP_PATENT project codes in Supabase: {len(pc_map_by_norm)}")
    
    # Build maps of existing applications
    app_by_code = {r['project_code']: r for r in existing_apps}
    app_by_norm = {norm_code(r['project_code']): r for r in existing_apps}
    app_by_appno = {r['application_number']: r for r in existing_apps if r.get('application_number')}

    # 3. Categorize Dump Patents: Matched vs New Valid Matters
    matched_dump_to_app = {} # dump_patent_id -> existing_app
    new_matters = []
    seen_new_norm = set(app_by_norm.keys())

    for p in dump_patents:
        c = (p.get('tracking_id') or '').strip()
        nc = norm_code(c)
        app_no = (p.get('application_no') or '').strip()
        title = (p.get('patent_title') or '').strip()
        
        # Filter junk
        if not c or c.upper() in ('ABCD', 'TEST', 'TEMP', 'XYZ', 'SAMPLE') or title.upper() in ('TEST', 'TESTING', 'SAMPLE'):
            continue
            
        m_app = app_by_norm.get(nc) or (app_by_appno.get(app_no) if app_no and app_no not in ('12345', 'NA', 'None') else None)
        
        if m_app:
            matched_dump_to_app[p['id']] = m_app
        else:
            if nc in seen_new_norm:
                continue
            seen_new_norm.add(nc)
            new_matters.append(p)

    print(f"\nDump categorization:")
    print(f"  Matched to existing applications: {len(matched_dump_to_app)}")
    print(f"  New valid matters to create: {len(new_matters)}")

    # =========================================================================
    # PHASE A: INGEST NEW 868 VALID MATTERS
    # =========================================================================
    print("\n--- PHASE A: Creating Project Codes & Applications for New Matters ---")

    # 1. Insert into core.project_codes
    new_pc_to_insert = []
    for p in new_matters:
        raw_code = p.get('tracking_id') or ''
        std_code = standardize_code(raw_code)
        nc = norm_code(std_code)
        
        if nc in pc_map_by_norm:
            continue
            
        cid, cname, is_mahe = map_client(p.get('patent_applicant'), std_code)
        new_pc_to_insert.append({
            'code': std_code,
            'code_normalized': nc,
            'department': 'IP_PATENT',
            'client_id': cid,
            'title': p.get('patent_title') or f"Patent Application {std_code}",
            'status': 'ACTIVE'
        })
        
    print(f"Project codes to insert: {len(new_pc_to_insert)}")
    for i in range(0, len(new_pc_to_insert), 100):
        batch = new_pc_to_insert[i:i+100]
        try:
            created_pc = postgrest_post("project_codes", batch, HEADERS_CORE)
            for pc in created_pc:
                pc_map_by_norm[pc['code_normalized']] = pc
        except Exception as e:
            print(f"Error inserting project_codes batch {i}: {e}")
            
    print(f"Total project codes now available: {len(pc_map_by_norm)}")

    # 2. Insert into patent.applications
    new_apps_to_insert = []
    for p in new_matters:
        raw_code = p.get('tracking_id') or ''
        std_code = standardize_code(raw_code)
        nc = norm_code(std_code)
        
        pc_rec = pc_map_by_norm.get(nc)
        pc_id = pc_rec['id'] if pc_rec else None
        cid, cname, is_mahe = map_client(p.get('patent_applicant'), std_code)
        
        app_no = p.get('application_no')
        if app_no in ('12345', '1234', 'test', 'NA', 'N/A', 'None', '\\N', ''):
            app_no = None
            
        title = p.get('patent_title') or f"Patent Application {std_code}"
        rec_cat = 'EXTERNAL_TAKEOVER' if std_code.startswith('EX-') else 'INTERNAL_FILING'
        spec_type = 'CS' if app_no else 'PS'
        
        st_mapped = map_status(p.get('current_status'))
        color = map_color(st_mapped)
        
        new_apps_to_insert.append({
            'project_code': std_code,
            'project_code_id': pc_id,
            'client_id': cid,
            'record_category': rec_cat,
            'application_number': app_no,
            'title': title,
            'specification_type': spec_type,
            'applicant_name': p.get('patent_applicant') or cname,
            'applicant_address': p.get('applicant_address'),
            'is_mahe': is_mahe,
            'entity_category': 'EDUCATIONAL_INSTITUTION' if is_mahe else 'LARGE_ENTITY',
            'current_status': st_mapped,
            'color_code_status': color,
            'workdrive_folder_url': None
        })

    print(f"Patent applications to insert: {len(new_apps_to_insert)}")
    created_new_apps = []
    for i in range(0, len(new_apps_to_insert), 100):
        batch = new_apps_to_insert[i:i+100]
        try:
            res = postgrest_post("applications", batch, HEADERS_PATENT)
            created_new_apps.extend(res)
            print(f"  Inserted applications {i + len(res)} / {len(new_apps_to_insert)}")
        except Exception as e:
            print(f"Error inserting applications batch {i}: {e}")

    # Map the newly created apps back to dump patents
    for app in created_new_apps:
        app_by_code[app['project_code']] = app
        app_by_norm[norm_code(app['project_code'])] = app
        if app.get('application_number'):
            app_by_appno[app['application_number']] = app

    for p in new_matters:
        raw_code = p.get('tracking_id') or ''
        std_code = standardize_code(raw_code)
        nc = norm_code(std_code)
        app = app_by_norm.get(nc)
        if app:
            matched_dump_to_app[p['id']] = app

    print(f"Total matched dump patents across whole portfolio: {len(matched_dump_to_app)}")

    # 3. Insert prosecution dates and forms tracker for new applications
    new_dates_to_insert = []
    new_forms_to_insert = []
    for p in new_matters:
        raw_code = p.get('tracking_id') or ''
        std_code = standardize_code(raw_code)
        app = app_by_norm.get(norm_code(std_code))
        if not app:
            continue
            
        fdate = p.get('date_of_filing')
        if fdate in ('None', '\\N', ''): fdate = None
        pdate = p.get('publication_date')
        if pdate in ('None', '\\N', ''): pdate = None
        
        new_dates_to_insert.append({
            'application_id': app['id'],
            'ps_filing_date': fdate,
            'publication_date': pdate
        })
        new_forms_to_insert.append({
            'application_id': app['id']
        })

    print(f"Inserting prosecution_dates ({len(new_dates_to_insert)}) and forms_tracker ({len(new_forms_to_insert)}) for new matters...")
    for i in range(0, len(new_dates_to_insert), 100):
        try:
            postgrest_post("prosecution_dates", new_dates_to_insert[i:i+100], HEADERS_PATENT)
            postgrest_post("forms_tracker", new_forms_to_insert[i:i+100], HEADERS_PATENT)
        except Exception as e:
            print(f"Error in dates/forms batch {i}: {e}")

    # =========================================================================
    # PHASE B: ENRICH EXISTING MATTERS (TITLES, DATES, ADDRESSES)
    # =========================================================================
    print("\n--- PHASE B: Enriching Existing Matters with Recovered Titles & Addresses ---")
    title_updates = 0
    address_updates = 0
    pub_updates = 0

    for p in dump_patents:
        m_app = matched_dump_to_app.get(p['id'])
        if not m_app:
            continue
            
        cur_title = m_app.get('title') or ''
        d_title = (p.get('patent_title') or '').strip()
        
        # Recover real title if placeholder
        if (cur_title.startswith('Patent Application ') or cur_title.upper() == 'IDF') and d_title and d_title.upper() != 'IDF' and not d_title.startswith('Patent Application '):
            try:
                postgrest_patch(f"applications?id=eq.{m_app['id']}", {'title': d_title}, HEADERS_PATENT)
                m_app['title'] = d_title
                title_updates += 1
            except Exception as e:
                pass
                
        # Recover address if empty
        if not m_app.get('applicant_address') and p.get('applicant_address'):
            try:
                postgrest_patch(f"applications?id=eq.{m_app['id']}", {'applicant_address': p.get('applicant_address')}, HEADERS_PATENT)
                m_app['applicant_address'] = p.get('applicant_address')
                address_updates += 1
            except Exception as e:
                pass
                
        # Recover publication date
        if p.get('publication_date'):
            try:
                postgrest_patch(f"prosecution_dates?application_id=eq.{m_app['id']}&publication_date=is.null", {'publication_date': p.get('publication_date')}, HEADERS_PATENT)
                pub_updates += 1
            except Exception as e:
                pass

    print(f"Enrichment complete:")
    print(f"  Real titles recovered: {title_updates}")
    print(f"  Applicant addresses updated: {address_updates}")
    print(f"  Publication dates patched: {pub_updates}")

    # =========================================================================
    # PHASE C: INGEST NORMALIZED INVENTORS & APPLICATION_INVENTORS
    # =========================================================================
    print("\n--- PHASE C: Ingesting Normalized Inventors & Links ---")
    
    inv_by_pid = defaultdict(list)
    for inv in dump_inventors:
        inv_by_pid[inv['patent_id']].append(inv)

    inventors_to_insert = []
    app_inv_to_insert = []
    app_summaries = {} # app_id -> summary string

    for pid, invs in inv_by_pid.items():
        app = matched_dump_to_app.get(pid)
        if not app:
            continue
            
        app_id = app['id']
        names = []
        for idx, inv in enumerate(invs):
            inv_name = (inv.get('inventor_name') or '').strip()
            if not inv_name:
                continue
            names.append(inv_name)
            
            inv_id = inv['id']
            inventors_to_insert.append({
                'id': inv_id,
                'full_name': inv_name,
                'address': inv.get('inventor_address'),
                'institution_department': inv.get('institution'),
                'nationality': inv.get('nationality') or 'Indian',
                'country_of_residence': inv.get('country_of_residence') or 'India'
            })
            app_inv_to_insert.append({
                'application_id': app_id,
                'inventor_id': inv_id,
                'inventor_order': idx + 1,
                'is_point_of_contact': (idx == 0)
            })
            
        if names and not app.get('inventors_summary'):
            app_summaries[app_id] = ", ".join(names)

    print(f"Total inventors to insert: {len(inventors_to_insert)}")
    print(f"Total application_inventor links to insert: {len(app_inv_to_insert)}")
    
    # Insert patent.inventors in batches
    for i in range(0, len(inventors_to_insert), 200):
        batch = inventors_to_insert[i:i+200]
        try:
            postgrest_post("inventors?on_conflict=id", batch, HEADERS_PATENT)
            if i % 1000 == 0:
                print(f"  Inserted inventors {i} / {len(inventors_to_insert)}")
        except Exception as e:
            print(f"Error inserting inventors batch {i}: {e}")

    # Insert patent.application_inventors in batches
    for i in range(0, len(app_inv_to_insert), 200):
        batch = app_inv_to_insert[i:i+200]
        try:
            postgrest_post("application_inventors?on_conflict=application_id,inventor_id", batch, HEADERS_PATENT)
            if i % 1000 == 0:
                print(f"  Inserted application_inventors {i} / {len(app_inv_to_insert)}")
        except Exception as e:
            print(f"Error inserting application_inventors batch {i}: {e}")

    # Update inventors_summary on applications that don't have it
    print(f"Updating inventors_summary on {len(app_summaries)} applications...")
    summary_count = 0
    for app_id, summary_str in app_summaries.items():
        try:
            postgrest_patch(f"applications?id=eq.{app_id}&inventors_summary=is.null", {'inventors_summary': summary_str}, HEADERS_PATENT)
            summary_count += 1
        except Exception:
            pass
    print(f"Updated inventors_summary on {summary_count} applications.")

    # =========================================================================
    # PHASE D: INGEST STATUTORY DEADLINES INTO patent.dues_manual
    # =========================================================================
    print("\n--- PHASE D: Ingesting Statutory Deadlines into patent.dues_manual ---")
    
    type_map = {
        'poa_form_26': 'FORM 26',
        'por_form_1': 'FORM 1',
        'form_18_18a': 'FORM 18',
        'cs_filing': 'PS-CS',
        'fer_f3_response': 'FORM 3',
        'fer_main_response': 'FER',
        'hearing': 'HEARING',
        'written_submission': 'WRITTEN SUBMISSION',
        'renewal': 'RENEWAL'
    }

    dues_to_insert = []
    seen_dues = set() # (project_code, type_of_due, due_date)

    for d in dump_deadlines:
        pid = d.get('patent_id')
        app = matched_dump_to_app.get(pid)
        if not app:
            continue
            
        dtype_raw = d.get('deadline_type')
        if not dtype_raw or dtype_raw not in type_map:
            continue
            
        mapped_type = type_map[dtype_raw]
        ddate = d.get('deadline_date')
        if not ddate or ddate in ('None', '\\N', ''):
            continue
            
        pcode = app['project_code']
        due_key = (pcode, mapped_type, ddate)
        if due_key in seen_dues:
            continue
        seen_dues.add(due_key)
        
        is_comp = (d.get('is_completed') == 't')
        if is_comp:
            st = 'completed'
        else:
            st = 'overdue' if ddate < '2026-11-02' else 'pending'
            
        dues_to_insert.append({
            'application_id': app['id'],
            'project_code': pcode,
            'type_of_due': mapped_type,
            'due_date': ddate,
            'status': st,
            'status_notes': d.get('description') or f"{mapped_type} statutory deadline",
            'suggested_action': 'Completed' if is_comp else 'Review and file required statutory form'
        })

    print(f"Total unique statutory dues to insert: {len(dues_to_insert)}")
    for i in range(0, len(dues_to_insert), 200):
        batch = dues_to_insert[i:i+200]
        try:
            postgrest_post("dues_manual?on_conflict=project_code,type_of_due,due_date", batch, HEADERS_PATENT)
            if i % 1000 == 0:
                print(f"  Inserted dues {i} / {len(dues_to_insert)}")
        except Exception as e:
            print(f"Error inserting dues batch {i}: {e}")

    print("Statutory dues successfully inserted!")

    # =========================================================================
    # PHASE E: EXPORT UPDATED MASTER RECORDS & REBUILD
    # =========================================================================
    print("\n--- PHASE E: Exporting Updated Master Dataset ---")
    all_final_apps = postgrest_fetch_all("applications?select=*,prosecution_dates(*),forms_tracker(*)", HEADERS_PATENT)
    print(f"Total applications in Supabase portfolio: {len(all_final_apps)}")
    
    out_master_path = r'Patent Dashboard\data\master_records.json'
    out_public_path = r'Patent Dashboard\frontend\public\master_records.json'
    
    with open(out_master_path, 'w', encoding='utf-8') as f:
        json.dump(all_final_apps, f, indent=2, ensure_ascii=False)
    with open(out_public_path, 'w', encoding='utf-8') as f:
        json.dump(all_final_apps, f, indent=2, ensure_ascii=False)
        
    print(f"Saved {len(all_final_apps)} records to {out_master_path} and {out_public_path}!")
    print("\n=== INGESTION & ENRICHMENT COMPLETE ===")

if __name__ == '__main__':
    main()
