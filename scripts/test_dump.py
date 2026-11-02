import struct
import zlib
import sys

def read_str(f):
    # pg_dump stores strings as int length + bytes (or negative for null)
    raw_len = f.read(4)
    if not raw_len or len(raw_len) < 4:
        return None
    (length,) = struct.unpack('<i', raw_len)
    if length <= 0:
        return ''
    s_bytes = f.read(length)
    return s_bytes.decode('utf-8', errors='replace')

def read_int(f):
    b = f.read(4)
    if not b or len(b) < 4:
        return 0
    return struct.unpack('<i', b)[0]

def read_offset(f):
    b = f.read(8)
    if not b or len(b) < 8:
        return 0
    return struct.unpack('<q', b)[0]

with open(r'Patent Dashboard\postgres_backup.dump', 'rb') as f:
    magic = f.read(5)
    v_maj, v_min, v_rev = struct.unpack('BBB', f.read(3))
    int_size, off_size, fmt = struct.unpack('BBB', f.read(3))
    comp = struct.unpack('B', f.read(1))[0]
    print(f"Format: {fmt}, Compression: {comp}")
    
    # date: 7 ints
    f.read(7 * 4)
    dbname = read_str(f)
    server_ver = read_str(f)
    pg_dump_ver = read_str(f)
    print(f"DB: {dbname}, Server: {server_ver}, pg_dump: {pg_dump_ver}")
    
    num_toc = read_int(f)
    print(f"Num TOC entries: {num_toc}")

