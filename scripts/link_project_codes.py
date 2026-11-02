import os
import json
import re
import urllib.request
import urllib.error

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

def main():
    print("=== LINKING PROJECT CODES FOR NEW PATENT APPLICATIONS ===")
    
    # 1. Fetch applications with null project_code_id
    apps_missing_pcid = postgrest_fetch_all("applications?project_code_id=is.null&select=id,project_code,client_id,title", HEADERS_PATENT)
    print(f"Applications missing project_code_id: {len(apps_missing_pcid)}")
    
    if not apps_missing_pcid:
        print("No applications missing project_code_id!")
        return

    # 2. Fetch all existing project codes to see if any were already created
    existing_pc = postgrest_fetch_all("project_codes?department=eq.IP_PATENT&select=id,code", HEADERS_CORE)
    pc_by_code = {r['code']: r['id'] for r in existing_pc}
    print(f"Existing IP_PATENT project codes: {len(pc_by_code)}")

    # 3. Insert project codes for those that don't exist yet
    to_create = []
    for app in apps_missing_pcid:
        code = app['project_code']
        if code in pc_by_code:
            continue
        to_create.append({
            'code': code,
            'department': 'IP_PATENT',
            'owning_app': 'IP_LEDGER',
            'client_id': app['client_id'],
            'title': app['title'] or f"Patent Application {code}",
            'status': 'ACTIVE'
        })

    print(f"Project codes to create: {len(to_create)}")
    for i in range(0, len(to_create), 100):
        batch = to_create[i:i+100]
        try:
            created = postgrest_post("project_codes", batch, HEADERS_CORE)
            for pc in created:
                pc_by_code[pc['code']] = pc['id']
            print(f"  Created project codes {i + len(created)} / {len(to_create)}")
        except Exception as e:
            print(f"Error creating project_codes batch {i}: {e}")

    # 4. Patch applications with their project_code_id
    print("Patching applications with project_code_id...")
    patched = 0
    for app in apps_missing_pcid:
        code = app['project_code']
        pcid = pc_by_code.get(code)
        if not pcid:
            continue
        try:
            postgrest_patch(f"applications?id=eq.{app['id']}", {'project_code_id': pcid}, HEADERS_PATENT)
            patched += 1
            if patched % 200 == 0:
                print(f"  Patched {patched} / {len(apps_missing_pcid)}")
        except Exception as e:
            print(f"Error patching app {code}: {e}")

    print(f"Successfully patched {patched} applications with project_code_id!")

    # 5. Refresh exported master records
    print("Refreshing local master records JSON...")
    all_final_apps = postgrest_fetch_all("applications?select=*,prosecution_dates(*),forms_tracker(*)", HEADERS_PATENT)
    print(f"Total applications in portfolio: {len(all_final_apps)}")
    
    out_master_path = r'Patent Dashboard\data\master_records.json'
    out_public_path = r'Patent Dashboard\frontend\public\master_records.json'
    
    with open(out_master_path, 'w', encoding='utf-8') as f:
        json.dump(all_final_apps, f, indent=2, ensure_ascii=False)
    with open(out_public_path, 'w', encoding='utf-8') as f:
        json.dump(all_final_apps, f, indent=2, ensure_ascii=False)
        
    print("Export complete!")

if __name__ == '__main__':
    main()

