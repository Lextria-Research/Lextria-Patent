import json

with open(r'Patent Dashboard\data\extracted_pg_dump\patents.json', 'r', encoding='utf-8') as f:
    dump = json.load(f)

ex_kk = [p for p in dump if (p.get('tracking_id') or '').startswith('EX- KK') or (p.get('tracking_id') or '').startswith('EX-KK')]
print(f"Total EX-KK records in dump: {len(ex_kk)}")

print("\nFirst 5 EX-KK records:")
for p in ex_kk[:5]:
    print(json.dumps({
        'id': p['id'],
        'tracking_id': p['tracking_id'],
        'patent_title': p['patent_title'],
        'patent_applicant': p['patent_applicant'],
        'application_no': p['application_no'],
        'date_of_filing': p['date_of_filing'],
        'current_status': p['current_status'],
        'created_at': p['created_at']
    }, indent=2))

