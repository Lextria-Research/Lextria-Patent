import struct
import zlib
import sys

def read_int(f):
    b = f.read(1)
    if not b:
        return None
    sign = b[0]
    if sign not in (0, 1):
        return None
    b_len = f.read(1)[0]
    val_bytes = f.read(b_len)
    val = int.from_bytes(val_bytes, byteorder='little')
    return -val if sign == 1 else val

def read_offset(f):
    b = f.read(1)
    if not b:
        return None
    sign = b[0]
    b_len = f.read(1)[0]
    val_bytes = f.read(b_len)
    val = int.from_bytes(val_bytes, byteorder='little')
    return -val if sign == 1 else val

def read_str(f):
    l = read_int(f)
    if l is None or l <= 0:
        return ''
    return f.read(l).decode('utf-8', errors='replace')

with open(r'Patent Dashboard\postgres_backup.dump', 'rb') as f:
    f.seek(11) # after magic(5) + v(3) + int_size(1) + off_size(1) + fmt(1)
    comp = f.read(1)[0]
    sec = read_int(f)
    minute = read_int(f)
    hour = read_int(f)
    day = read_int(f)
    mon = read_int(f)
    year = read_int(f)
    isdst = read_int(f)
    print(f"Date: {1900+year}-{mon+1}-{day} {hour}:{minute}:{sec}, Comp: {comp}")
    
    dbname = read_str(f)
    server_ver = read_str(f)
    pg_dump_ver = read_str(f)
    print(f"DB: '{dbname}', Server: '{server_ver}', pg_dump: '{pg_dump_ver}'")
    
    num_toc = read_int(f)
    print(f"Total TOC entries: {num_toc}")
    
    toc_entries = []
    for i in range(num_toc):
        dump_id = read_int(f)
        data_dumper = read_int(f)
        table_oid = read_str(f)
        tag = read_str(f)
        desc = read_str(f)
        section = read_int(f)
        defn = read_str(f)
        drop_stmt = read_str(f)
        copy_stmt = read_str(f)
        namespace = read_str(f)
        tablespace = read_str(f)
        owner = read_str(f)
        with_oids = read_str(f)
        
        # dependencies
        dep_count = 0
        while True:
            dep = read_str(f)
            if not dep:
                break
            dep_count += 1
            
        offset = read_offset(f)
        
        toc_entries.append({
            'dump_id': dump_id,
            'data_dumper': data_dumper,
            'tag': tag,
            'desc': desc,
            'namespace': namespace,
            'copy_stmt': copy_stmt,
            'offset': offset
        })
    print(f"Successfully parsed {len(toc_entries)} TOC entries!")
    for e in toc_entries:
        if 'TABLE DATA' in e['desc']:
            print(f"TABLE DATA: {e['tag']} (Namespace: {e['namespace']}, DumpID: {e['dump_id']}, Offset: {e['offset']})")

