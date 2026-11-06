#!/usr/bin/env python3
"""สร้าง src/core/manifest.php = รายการไฟล์ที่ต้องมีครบ (หน้า check_setup.php ใช้ตรวจว่าไฟล์ขาดไหม)
รันทุกครั้งที่เพิ่ม/ลบ/ย้ายไฟล์โปรแกรม:   python3 tools/make_manifest.py
(ไม่นับ data/, config.php และไฟล์ .zip)"""
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = []
for d, ds, fs in os.walk(root):
    rel = os.path.relpath(d, root)
    if rel == 'data' or rel.startswith('data' + os.sep):
        ds[:] = []
        continue
    for f in fs:
        r = os.path.normpath(os.path.join(rel, f))
        if r in ('config.php', 'src/core/manifest.php') or r.endswith('.zip') or r.endswith('.pyc'):
            continue
        out.append(r.replace(os.sep, '/'))
out.sort()
body = json.dumps(out, ensure_ascii=False, indent=1)
open(os.path.join(root, 'src/core/manifest.php'), 'w').write("<?php\n// สร้างอัตโนมัติด้วย tools/make_manifest.py: รายการไฟล์ที่ต้องมี (ใช้ตรวจใน check_setup.php)\nreturn " + body + ";\n")
print(len(out), 'ไฟล์')
