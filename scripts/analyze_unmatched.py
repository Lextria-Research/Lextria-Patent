import json
import re

with open(r'Patent Dashboard\data\master_records.json', 'r', encoding='utf-8') as f:
    master = json.load(f)

with open(r'Patent Dashboard\data\extracted_pg_dump\patents.json', 'r', encoding='utf-8') as f:
    dump = json.load(f)

def norm_code(c):
    return re.sub(r'[^A-Za-z0-9]', '', c or '').upper()

master_norm = {norm_code(r['project_code']): r for r in master}
master_apps = {r['application_number']: r for r in master if r.get('application_number')}

unmatched = []
for p in dump:
    c = p.get('tracking_id') or ''
    app = p.get('application_no') or ''
    nc = norm_code(c)
    if nc not in master_norm and app not in master_apps:
        unmatched.append(p)

print(f"Total unmatched dump records: {len(unmatched)}")

app_counts = {}
for p in unmatched:
    applicant = p.get('patent_applicant') or 'Unknown'
    app_counts[applicant] = app_counts.get(applicant, 0) + 1

print("\nTop Applicants in Unmatched Dump Records:")
for a, count in sorted(app_counts.items(), key=lambda x: x[1], reverse=True)[:15]:
    print(f"  {a}: {count}")

print("\nSample 25 Unmatched Records:")
for p in unmatched[:25]:
    code = p.get('tracking_id') or ''
    app_no = p.get('application_no') or ''
    applicant = (p.get('patent_applicant') or '')[:25]
    title = (p.get('patent_title') or '')[:35]
    status = p.get('current_status') or ''
    print(f"  Code: {code:15} | AppNo: {app_no:15} | Applicant: {applicant:25} | Status: {status:25} | Title: {title}")

# Also check how many of these have application numbers vs are just blank/IDF/drafts
with_app_no = [p for p in unmatched if p.get('application_no')]
without_app_no = [p for p in unmatched if not p.get('application_no')]
print(f"\nUnmatched with application_no: {len(with_app_no)}")
print(f"Unmatched without application_no (drafts/IDFs): {len(without_app_no)}")

# What prefixes are these unmatched codes?
prefixes = {}
for p in unmatched:
    c = p.get('tracking_id') or ''
    m = re.match(r'^([A-Za-z\- ]+)', c)
    pfx = m.group(1).strip() if m else 'OTHER'
    prefixes[pfx] = prefixes.get(pfx, 0) + 1

print("\nUnmatched Code Prefixes:")
for pfx, count in sorted(prefixes.items(), key=lambda x: x[1], reverse=True)[:20]:
    print(f"  {pfx:15}: {count}")

