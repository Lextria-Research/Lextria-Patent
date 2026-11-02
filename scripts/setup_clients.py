import urllib.request
import json

SUPABASE_URL = 'https://eafciegebhuhoneypsqy.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZmNpZWdlYmh1aG9uZXlwc3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA5NTU1NywiZXhwIjoyMTA2NjcxNTU3fQ.rxJJ-BO6bAeJYBu-tonvwxNZ3rh1D5ugjIpQMPk4qNo'

# Check existing clients
req = urllib.request.Request(
    f'{SUPABASE_URL}/rest/v1/clients?select=id,client_code,client_name',
    headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Accept-Profile': 'core'
    }
)
with urllib.request.urlopen(req) as resp:
    clients = json.loads(resp.read().decode())
    existing = {c.get('client_code'): c.get('id') for c in clients}

# Needed mappings:
# Lightspeed Photonics
# Mantrika AI
# Canara Engineering College
# Shri Madhwa Vadiraja Institute of Technology & Management

to_check = {
    'LIGHTSPEED': ('LIGHTSPEED', 'Lightspeed Photonics Private Limited', 'STARTUP'),
    'MANTRIKA': ('MANTRIKA', 'Mantrika AI Private Limited', 'STARTUP'),
    'CEC': ('CEC', 'Canara Engineering College', 'EDUCATIONAL_INSTITUTION'),
    'SMVITM': ('SMVITM', 'Shri Madhwa Vadiraja Institute of Technology and Management', 'EDUCATIONAL_INSTITUTION'),
}

for code, (c_code, name, etype) in to_check.items():
    found = None
    for c in clients:
        if c_code.lower() in (c.get('client_code') or '').lower() or name.lower() in (c.get('client_name') or '').lower():
            found = c
            break
    if found:
        print(f"FOUND: {code} -> {found['client_code']} | {found['client_name']} | ID: {found['id']}")
    else:
        print(f"MISSING: {code} -> Creating client...")
        post_req = urllib.request.Request(
            f'{SUPABASE_URL}/rest/v1/clients',
            data=json.dumps({
                'client_code': c_code,
                'client_name': name,
                'entity_type': etype
            }).encode('utf-8'),
            headers={
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json',
                'Accept-Profile': 'core',
                'Content-Profile': 'core',
                'Prefer': 'return=representation'
            }
        )
        try:
            with urllib.request.urlopen(post_req) as post_resp:
                res = json.loads(post_resp.read().decode())
                print(f"CREATED: {c_code} -> ID: {res[0]['id']}")
        except urllib.error.HTTPError as e:
            print(f"Error creating {c_code}:", e.code, e.read().decode())

