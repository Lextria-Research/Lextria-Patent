import urllib.request
import json

URL = 'https://eafciegebhuhoneypsqy.supabase.co/rest/v1/'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZmNpZWdlYmh1aG9uZXlwc3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA5NTU1NywiZXhwIjoyMTA2NjcxNTU3fQ.rxJJ-BO6bAeJYBu-tonvwxNZ3rh1D5ugjIpQMPk4qNo'

tables = [
    ('core', 'project_codes?department=eq.IP_PATENT'),
    ('patent', 'applications'),
    ('patent', 'prosecution_dates'),
    ('patent', 'forms_tracker'),
    ('patent', 'inventors'),
    ('patent', 'application_inventors'),
    ('patent', 'dues_manual')
]

print("=== FINAL SUPABASE ROW COUNTS ===")
for schema, tbl in tables:
    sep = '&' if '?' in tbl else '?'
    req = urllib.request.Request(f"{URL}{tbl}{sep}select=count", headers={
        'apikey': KEY,
        'Authorization': f"Bearer {KEY}",
        'Accept-Profile': schema,
        'Range-Unit': 'items',
        'Range': '0-0',
        'Prefer': 'count=exact'
    })
    with urllib.request.urlopen(req) as resp:
        name = tbl.split('?')[0]
        cr = resp.headers.get('content-range')
        total = cr.split('/')[-1] if cr else 'unknown'
        print(f"  {schema}.{name:25}: {total} rows")

