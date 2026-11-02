import json
import re

with open(r'Patent Dashboard\data\master_records.json', 'r', encoding='utf-8') as f:
    master = json.load(f)

with open(r'Patent Dashboard\data\extracted_pg_dump\patents.json', 'r', encoding='utf-8') as f:
    dump = json.load(f)

def norm(c): return re.sub(r'[^A-Za-z0-9]', '', c or '').upper()

dump_by_norm = {norm(p.get('tracking_id')): p for p in dump}
dump_by_app = {p.get('application_no'): p for p in dump if p.get('application_no')}

missing_app_no_filled = 0
missing_filing_date_filled = 0
fallback_title_filled = 0
publication_date_found = 0

sample_updates = []

for r in master:
    c = r['project_code']
    nc = norm(c)
    app = r.get('application_number')
    
    dp = dump_by_norm.get(nc) or (dump_by_app.get(app) if app else None)
    if not dp:
        continue
        
    # Check application_number
    if not app and dp.get('application_no'):
        missing_app_no_filled += 1
        sample_updates.append((c, 'application_no', dp.get('application_no')))
        
    # Check filing_date
    if not r.get('filing_date') and dp.get('date_of_filing'):
        missing_filing_date_filled += 1
        
    # Check title
    if r['title'].startswith('Patent Application ') or r['title'].strip().upper() == 'IDF':
        d_title = dp.get('patent_title') or ''
        if d_title and d_title.strip().upper() != 'IDF' and not d_title.startswith('Patent Application '):
            fallback_title_filled += 1
            sample_updates.append((c, 'title', d_title))
            
    # Check publication_date
    if dp.get('publication_date'):
        publication_date_found += 1

print(f"Matching master records where dump provides:")
print(f"  - Missing application number filled: {missing_app_no_filled}")
print(f"  - Missing filing date filled: {missing_filing_date_filled}")
print(f"  - Fallback/IDF title replaced with real title: {fallback_title_filled}")
print(f"  - Publication date found: {publication_date_found}")

if sample_updates:
    print(f"\nSample title/app_no updates (first 10):")
    for s in sample_updates[:10]:
        print(f"  {s[0]}: {s[1]} -> {s[2]}")

