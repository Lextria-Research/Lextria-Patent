import struct
import zlib
import re
import json
import os

DUMP_PATH = r'Patent Dashboard\postgres_backup.dump'
OUTPUT_DIR = r'Patent Dashboard\data\extracted_pg_dump'

os.makedirs(OUTPUT_DIR, exist_ok=True)

with open(DUMP_PATH, 'rb') as f:
    content = f.read()

toc_tables = {}
matches = list(re.finditer(rb'COPY public\.([a-zA-Z0-9_]+)\s*\(([^)]+)\)', content))
for m in matches:
    tname = m.group(1).decode()
    cols = [c.strip() for c in m.group(2).decode().split(',')]
    sub = content[max(0, m.start()-120):m.start()]
    id_matches = list(re.finditer(rb'\x00([\x00-\xff])\x11\x00\x00', sub))
    if id_matches:
        last_id_m = id_matches[-1]
        dump_id = 0x1100 + last_id_m.group(1)[0]
        toc_tables[dump_id] = {'name': tname, 'cols': cols}

print(f"Total mapped tables: {len(toc_tables)}")

table_data = {}
for dump_id, info in sorted(toc_tables.items(), key=lambda x: x[0]):
    low_byte = dump_id - 0x1100
    pattern = b'\x01\x00' + bytes([low_byte]) + b'\x11\x00\x00'
    pos = content.find(pattern)
    if pos == -1:
        print(f"Table {info['name']} (dump_id {dump_id}): NO DATA BLOCK FOUND")
        continue
    
    # read chunks
    f_pos = pos + len(pattern)
    dctx = zlib.decompressobj()
    chunks = []
    while f_pos < len(content):
        s_b = content[f_pos]
        chunk_len = struct.unpack('<I', content[f_pos+1:f_pos+5])[0]
        f_pos += 5
        if chunk_len == 0:
            break
        data = content[f_pos:f_pos+chunk_len]
        f_pos += chunk_len
        chunks.append(dctx.decompress(data))
    
    raw_text = b''.join(chunks).decode('utf-8', errors='replace')
    lines = [l for l in raw_text.split('\n') if l.strip()]
    
    # parse TSV into list of dicts
    records = []
    for line in lines:
        parts = line.split('\t')
        # if cols length doesn't match parts, store raw or pad
        row = {}
        for idx, col in enumerate(info['cols']):
            if idx < len(parts):
                val = parts[idx]
                if val == r'\N':
                    val = None
                row[col] = val
            else:
                row[col] = None
        records.append(row)
        
    table_data[info['name']] = records
    print(f"Table {info['name']}: {len(records)} rows extracted (columns: {len(info['cols'])})")
    
    # Save as JSON for easy inspection
    out_file = os.path.join(OUTPUT_DIR, f"{info['name']}.json")
    with open(out_file, 'w', encoding='utf-8') as out_f:
        json.dump(records, out_f, indent=2, ensure_ascii=False)

print("Extraction complete! Saved to:", OUTPUT_DIR)

