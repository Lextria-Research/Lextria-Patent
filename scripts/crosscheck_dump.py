import json
import os
from collections import defaultdict

# Load current 2286 master records
with open(r'Patent Dashboard\data\master_records.json', 'r', encoding='utf-8') as f:
    master_records = json.load(f)

# Load extracted dump tables
DATA_DIR = r'Patent Dashboard\data\extracted_pg_dump'

with open(os.path.join(DATA_DIR, 'patents.json'), 'r', encoding='utf-8') as f:
    dump_patents = json.load(f)

with open(os.path.join(DATA_DIR, 'inventors.json'), 'r', encoding='utf-8') as f:
    dump_inventors = json.load(f)

with open(os.path.join(DATA_DIR, 'deadlines.json'), 'r', encoding='utf-8') as f:
    dump_deadlines = json.load(f)

with open(os.path.join(DATA_DIR, 'fer_entries.json'), 'r', encoding='utf-8') as f:
    dump_fer_entries = json.load(f)

with open(os.path.join(DATA_DIR, 'users.json'), 'r', encoding='utf-8') as f:
    dump_users = json.load(f)

master_codes = {r['project_code']: r for r in master_records}
print(f"Total master records in system: {len(master_codes)}")
print(f"Total patents in dump: {len(dump_patents)}")

# Build dump patent maps
dump_by_code = {}
dump_by_app_no = {}
codes_with_duplicates = []

for p in dump_patents:
    code = (p.get('tracking_id') or '').strip().upper()
    app_no = (p.get('application_no') or '').strip()
    
    if code in dump_by_code:
        codes_with_duplicates.append(code)
    else:
        dump_by_code[code] = p
        
    if app_no and app_no != 'None' and app_no != '\\N':
        dump_by_app_no[app_no] = p

print(f"Unique tracking_ids in dump: {len(dump_by_code)}")
print(f"Duplicates in dump: {len(codes_with_duplicates)} ({codes_with_duplicates[:10]})")

# Cross check tracking_id sets
in_both = set(master_codes.keys()).intersection(set(dump_by_code.keys()))
in_master_only = set(master_codes.keys()) - set(dump_by_code.keys())
in_dump_only = set(dump_by_code.keys()) - set(master_codes.keys())

print(f"\n--- SET OVERLAP ---")
print(f"Codes in BOTH master & dump: {len(in_both)}")
print(f"Codes in MASTER only (not in dump): {len(in_master_only)}")
print(f"Codes in DUMP only (not in master): {len(in_dump_only)}")

# What are the dump-only codes?
dump_only_sample = sorted(list(in_dump_only))
print(f"Sample DUMP ONLY codes (first 25): {dump_only_sample[:25]}")
print(f"Sample MASTER ONLY codes (first 25): {sorted(list(in_master_only))[:25]}")

# Map dump inventors by patent_id
inv_by_patent_id = defaultdict(list)
for inv in dump_inventors:
    inv_by_patent_id[inv['patent_id']].append(inv)

print(f"\nTotal inventors in dump: {len(dump_inventors)}")
print(f"Dump patents with inventors: {len(inv_by_patent_id)}")

# Check for our matching 2,286 master records: how many have inventors in the dump?
master_with_inventors_count = 0
total_master_inventors_found = 0
for code in in_both:
    dp = dump_by_code[code]
    pid = dp['id']
    invs = inv_by_patent_id.get(pid, [])
    if invs:
        master_with_inventors_count += 1
        total_master_inventors_found += len(invs)

print(f"Master records that have inventors in dump: {master_with_inventors_count} / {len(in_both)}")
print(f"Total individual inventor entries for master records: {total_master_inventors_found}")

# Check applicant_address, inventor_email, inventor_phone in dump for master records
email_count = sum(1 for code in in_both if dump_by_code[code].get('inventor_email'))
phone_count = sum(1 for code in in_both if dump_by_code[code].get('inventor_phone'))
address_count = sum(1 for code in in_both if dump_by_code[code].get('applicant_address'))

print(f"Master records with inventor_email in dump: {email_count}")
print(f"Master records with inventor_phone in dump: {phone_count}")
print(f"Master records with applicant_address in dump: {address_count}")

# Check deadlines
deadlines_by_pid = defaultdict(list)
for d in dump_deadlines:
    deadlines_by_pid[d['patent_id']].append(d)

print(f"Total deadlines in dump: {len(dump_deadlines)}")
print(f"Patents with deadlines: {len(deadlines_by_pid)}")
master_with_deadlines = sum(1 for code in in_both if dump_by_code[code]['id'] in deadlines_by_pid)
print(f"Master records with deadlines in dump: {master_with_deadlines}")

