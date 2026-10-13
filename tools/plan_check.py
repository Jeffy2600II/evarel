#!/usr/bin/env python3
"""ตรวจโครงแผน docs/plan/: ลิงก์ไม่หัก, แผนหลักไม่มีวิธีทำ/โค้ด/ความลับ, ภาษาตามกฎ (ไม่มีอิโมจิ/em dash), ทุกขั้นมีไฟล์ลึก
รัน: python3 tools/plan_check.py   (exit 0 = ผ่านทั้งหมด)"""
import re, sys, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'plan')
EMOJI = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2705\u274C]')
SECRET = re.compile(r'(sb_secret_[A-Za-z0-9]|gsk_[A-Za-z0-9]|cfut_[A-Za-z0-9]|AKIA[0-9A-Z]{8}|-----BEGIN)')
HOWTO = re.compile(r'(```|\bwrangler\s|\bnpm\s|\bgit\s(push|commit)|\bSELECT\s|\bCREATE\s+(TABLE|FUNCTION))', re.I)
fail = []
def rd(p): return open(p, encoding='utf-8').read()
files = []
for d, _, fs in os.walk(ROOT):
    for f in fs:
        if f.endswith('.md'): files.append(os.path.join(d, f))
if not files: fail.append('ไม่พบไฟล์แผนใน docs/plan'); 
for p in files:
    t = rd(p); rel = os.path.relpath(p, ROOT)
    if EMOJI.search(t): fail.append(f'{rel}: มีอิโมจิ')
    if '\u2014' in t: fail.append(f'{rel}: มี em dash')
    if SECRET.search(t): fail.append(f'{rel}: พบรูปแบบความลับ')
    for m in re.finditer(r'\]\(([^)#]+\.md)\)', t):
        tgt = os.path.normpath(os.path.join(os.path.dirname(p), m.group(1)))
        if not os.path.exists(tgt): fail.append(f'{rel}: ลิงก์หัก -> {m.group(1)}')
mp = os.path.join(ROOT, 'MASTER-PLAN.md')
if os.path.exists(mp):
    t = rd(mp)
    if HOWTO.search(t): fail.append('MASTER-PLAN.md: มีวิธีทำ/โค้ด (ผิดกฎของแผนหลัก)')
    if len(t) > 6000: fail.append(f'MASTER-PLAN.md: ยาวเกิน 6000 ตัวอักษร ({len(t)})')
    rows = re.findall(r'^\| (S\d+) \|.*?\]\((steps/[^)]+)\)', t, re.M)
    if len(rows) < 2: fail.append('MASTER-PLAN.md: ไม่พบแถวขั้น S*')
    # ทุกแถวขั้นต้องมี 7 ช่อง (รหัส ชื่อ เป้าหมาย ผลลัพธ์ ช่วง สถานะ ไฟล์ลึก) กันตารางเพี้ยนเงียบๆ
    for ln in [l for l in t.split('\n') if re.match(r'^\| S\d \|', l)]:
        cells = [c for c in ln.strip().strip('|').split('|')]
        if len(cells) != 7: fail.append(f'MASTER-PLAN.md: แถว {cells[0].strip()} มี {len(cells)} ช่อง ต้องเป็น 7')
        elif cells[4].strip() not in ('ผ่านแล้ว', 'ใกล้', 'กลาง', 'ไกล'): fail.append(f'MASTER-PLAN.md: แถว {cells[0].strip()} ช่องช่วงไม่ถูกต้อง ({cells[4].strip()})')
    for sid, link in rows:
        if not os.path.exists(os.path.join(ROOT, link)): fail.append(f'{sid}: ไม่มีไฟล์ลึก {link}')
else: fail.append('ไม่มี MASTER-PLAN.md')
print('ตรวจ', len(files), 'ไฟล์ |', 'ผ่านทั้งหมด' if not fail else f'พบ {len(fail)} ปัญหา')
for f in fail: print(' -', f)
sys.exit(1 if fail else 0)
