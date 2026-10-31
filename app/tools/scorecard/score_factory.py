#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
score_factory.py — ให้คะแนนโรงงาน Frontend Evarel ตามกรอบ 10 ด้าน (ด้านละ 10 คะแนน)
ทุกข้อย่อยอ้างหลักฐานที่วัดจาก factory_stats.json (measure_factory.py) หรือการรันเครื่องมือสด
คะแนนรวม = ผลรวมถ่วงน้ำหนัก (น้ำหนักรวม 100) → เต็ม 10.00 / 100 คะแนน
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, "factory_stats.json"), encoding="utf-8"))

# ตัวเลขย่อจากการวัด (พิมพ์กลับเพื่อให้เห็นที่มา)
b, e, c, r = S["boxes"], S["engine_app"], S["core"], S["react_layer"]
css = S["css"]
hex_out = sum(v["hex_outside_vars"] for v in css.values())
px_out = sum(v["px_outside_vars"] for v in css.values())
var_uses = sum(v["var_uses"] for v in css.values())

# ---------- กรอบประเมิน ----------
# แต่ละด้าน: (ชื่อ, น้ำหนัก %, [(ข้อย่อย, เต็ม, ได้, หลักฐาน/เหตุผล)])
D = [
 ("D1 สถาปัตยกรรมโซน (โกดังแบ่งโซน B1)", 12, [
  ("ครบ 5 โซนตามเอกสาร: pages/ shared/ styles/ data/ tools/ มีจริงและแผนที่วาดครบ", 1.5, 1.5,
   "FACTORY-MAP วาดครบ 5 โซน + โฟลเดอร์มีจริงทั้งหมด"),
  ("ชั้นตรรกะแยกโซน UI ชัด: core/ ตรรกะบริสุทธิ์ + engine เรียงชั้นพึ่งพา วงจร 0", 2.0, 2.0,
   f"core {c['files']} ไฟล์ {c['total_bytes']:,}B | engine 11 ชั้นพึ่งพา วงจรจริง 0 (m_progress)"),
  ("ของชนิดเดียวอยู่โซนเดียวกัน ทุกกล่องจัดอยู่โซนถูกประเภท", 2.0, 2.0,
   f"กล่อง {b['total_boxes']} ใบ (pages {b['zones']['app/pages']} + shared {b['zones']['app/shared']}) หน้าที่ชัด"),
  ("ไม่มีเศษหล่นรากโซน", 1.5, 1.5,
   "ราก shared/ เหลือเฉพาะ tray.js (กลไกถายกลาง) + README"),
  ("เส้นแบน pages/ กับ shared/ ของกล่องระดับหน้าชัดเจน", 3.0, 1.0,
   f"pages/ มี {b['zones']['app/pages']} กล่อง ขณะที่กล่องระดับหน้าอีก 8 ใบ (today, calendar, ai, settings, detail, auth, focus, form) อยู่ใน shared/ — ใช้งานสม่ำเสมอแต่เส้นแบนต่างจากตารางจับคู่ในแผน (ยังไม่ตัดสินเป็นทางการ)"),
 ]),
 ("D2 กล่องฟีเจอร์ 3 ชั้น (B2)", 12, [
  ("ทุกกล่องครบ 3 ชั้น: โครงหน้า + parts/ + ถาย", 2.5, 2.5,
   f"ครบ {b['full_3layer']}/{b['total_boxes']} กล่อง"),
  ("บัตรประจำกล่อง: BOX.md + JSON เครื่องอ่านได้ + แผ่นตรวจรับครบทุกใบ", 2.5, 2.5,
   f"BOX.md {b['with_boxmd']}/{b['total_boxes']} | JSON อ่านได้ {b['with_card_json']} | แผ่นตรวจรับ {b['with_checklist']}"),
  ("กล่องไม่ล้น: ไฟล์ในกล่องเล็กทั้งหมด", 2.5, 2.5,
   f"ไฟล์โค้ดในกล่อง {b['code_files']} ไฟล์ ใหญ่สุด {b['max_lines_file'][1]} บรรทัด / {b['max_lines_file'][2]:,}B | เกิน 300 บรรทัด: {len(b['over_300_lines'])} | เกิน 15KB: {len(b['over_15kb'])}"),
  ("ชื่อถูกรูปแบบ ไม่มีเลขเวอร์ชัน", 1.5, 1.5,
   f"ชื่อผิดกฎ: {b['names_with_version_digits'] or 'ไม่มี'}"),
  ("ผ่านเครื่องตรวจสดทุกใบ", 1.0, 1.0,
   f"checker สด: PASS {S['live_checker']['pass_boxes']} / FAIL {S['live_checker']['fail_boxes']} exit {S['live_checker']['exit']}"),
 ]),
 ("D3 แม่พิมพ์กลาง (design tokens B1/B6)", 12, [
  ("ตารางแม่พิมพ์จุดเดียว วัดจากเบราว์เซอร์จริง", 2.0, 2.0,
   f"MOLD-TABLE {S['mold_table']['vars_rows']} ตัวแปร สร้างด้วย measure_root_vars.mjs สองโหมด"),
  ("ตัวแปรถูกใช้จริงขนาดใหญ่ ไม่ใช่แค่เขียนเก็บ", 2.0, 2.0,
   f"var() ถูกใช้ {var_uses:,} จุด (app.css {css['app.css']['var_uses']} + design.css {css['design.css']['var_uses']} + extra.css {css['extra.css']['var_uses']})"),
  ("เส้นทางแก้ค่าจุดเดียว: แก้ design.css → build-css → ตารางใหม่", 1.5, 1.5,
   "MOLD-TABLE ระบุเส้นทางชัด + scripts/build-css.mjs มีจริง"),
  ("ค่าฝังตรงหลงเหลือใน legacy CSS (กฎ B6 ข้อ 5)", 3.0, 0.5,
   f"hex นอกบรรทัดตัวแปร {hex_out} จุด (14/82/6) | px นอกบรรทัดตัวแปร {px_out:,} จุด (973/936/33) — ทาง A ที่ Master ตัดสินเลื่อนไว้ แต่เป็นหนี้เปิดต่อกฎข้อ 5"),
  ("ตัวตรวจแม่พิมพ์วัดซ้ำได้ทุกครั้ง", 1.5, 1.5,
   "app/tools/audit_css_values.py วัดสดได้ (วัดแล้วในรอบนี้)"),
 ]),
 ("D4 ถายข้อมูลและการไหลทางเดียว (B2 ชั้น 3 / B6 ข้อ 3)", 12, [
  ("ทุกกล่องมีถายประจำกล่อง", 2.0, 2.0,
   f"มี .tray.js ครบ {b['total_boxes']}/{b['total_boxes']} กล่อง"),
  ("ห้าม window นอกถาย — วัดได้ 0 จุด", 2.5, 2.5,
   f"window นอกถาย: {b['window_outside_tray_total']} จุด (ตรวจ BOX-05 + วัดอิสระด้วย Python ตรงกัน)"),
  ("ห้าม import ข้ามกล่อง — วัดได้ 0 จุด", 2.0, 2.0,
   "BOX-06 ตรวจสดผ่านทุกกล่อง (checker exit 0)"),
  ("ถายกลางและกลไกรูปแบบเดียวทั้งโรงงาน", 1.5, 1.5,
   "app/data/ (ai.tray.js, dates.tray.js) + app/shared/tray.js กลไกกลาง"),
  ("ลงทะเบียนอัตโนมัติจากบัตร (บิลด์อ่าน register จาก BOX.md)", 2.0, 2.0,
   "build-react อ่านมานิเฟสต์จากบัตร (tests/box_build_pipeline ข้อ 6)"),
 ]),
 ("D5 เครื่องมือโรงงาน (B3/B5/B7)", 10, [
  ("เบ้าจูน: คำสั่งเดียวได้กล่องครบ 3 ชั้น + โซนกัก + กันชื่อซ้ำ/เลขเวอร์ชัน", 2.0, 2.0,
   "tuner.mjs มี --quarantine และบันทึก F2 ยืนยันปฏิเสธชื่อซ้ำ/ชื่อว่าง/เลขเวอร์ชัน"),
  ("เครื่องตรวจกติกา 6 ข้อ", 1.5, 1.5, "checker.mjs BOX-01..06 (สด 16/16 PASS)"),
  ("ตัววาดแผนที่จากโค้ดจริง", 1.5, 1.5,
   f"mapper.mjs — แผนที่ที่ commit ตรงผลวาดใหม่ทุกไบต์ (วัดสด: {S['live_map']['committed_map_fresh']})"),
  ("X-ray ตรวจรายหน้า", 1.0, 1.0, "xray.mjs รันสดผ่าน (today: 6 ไฟล์ ผ่านครบ)"),
  ("ทะเบียนใครใช้ใคร", 1.0, 1.0, "dep_matrix.mjs + tools/dep_manifest.mjs, dep_symbols.mjs"),
  ("แก้ย้อนรายกล่อง", 1.0, 1.0, "rollback.mjs"),
  ("กลไกเสริม 6 ข้อ: ห้องโชว์แม่พิมพ์ / บัตรกล่อง / แผ่นตรวจรับ / โซนกัก / ถาม-ตอบกลาง / แก้ย้อน", 2.0, 1.5,
   "ครบ 5/6 แบบใช้งานได้จริง — ห้องโชว์แม่พิมพ์ยังเป็นตารางเอกสาร ยังไม่มีหน้า gallery มีชีวิต"),
 ]),
 ("D6 สายพานอัตโนมัติ CI (B5)", 12, [
  ("job factory ทุก push: ตรวจกติกาบังคับ + วาดแผนที่ + กันแผนที่ล้าสมัย + X-ray", 3.0, 3.0,
   f"web.yml job factory {len(S['ci']['factory_gates'])} ขั้น: " + " | ".join(S['ci']['factory_gates'][:4]) + " ..."),
  ("ปล่อยของต้องรอโรงงานผ่าน (deploy gated) + ตรวจหลัง deploy", 2.0, 2.0,
   "deploy-forge needs:[check, factory] + ตรวจ release.json บนเว็บจริงหลัง deploy 6 รอบ"),
  ("job check คุมความสมบูรณ์: โน้ตรุ่น / ไฟล์คอมไพล์ตรงซอร์ส / บิลด์ผ่าน / integrity 32 ฉาก / release↔sw", 3.0, 3.0,
   "web.yml job check 7 ขั้น + tests/build_integrity (GATE=PASS32 ตามบันทึก commit)"),
  ("พิสูจน์ว่าตีกลับจริง ไม่ใช่ตั้งโชว์", 1.5, 1.5,
   "F5 บันทึก PR ทดลองฝ่าฝืน BOX-05: factory ตก deploy ถูกข้าม (ปิด PR แล้ว)"),
  ("เบาพอวิ่งโควตาฟรี", 0.5, 0.5, "factory 14 วินาที ไม่ต้อง npm ci (บันทึก F5)"),
 ]),
 ("D7 กติกาบังคับด้วยเครื่อง (B6/C)", 10, [
  ("กฎแกนน้อยแต่พอดี (5-6 ข้อ ตามแนวคิด C)", 2.5, 2.5, "BOX-01..06 พอดี 6 ข้อ"),
  ("บังคับจริง: ไม่ผ่าน = push ไม่ผ่าน", 2.5, 2.5, "checker exit 1 + CI job factory บล็อก deploy"),
  ("พิสูจน์ว่าเครื่องตรวจไม่เงียบ (เกณฑ์แผนข้อ 7)", 2.5, 2.5,
   "ฉีดผิดจริงใน F5 + tests/box_build_pipeline ข้อ (5)(7) ครอบ BOX-05 และบัตรอ้างไฟล์ผี"),
  ("ตัวตรวจบอกข้อผิด + เหตุผล อ่านแล้วแก้ได้", 1.5, 1.5,
   "ล็อกบอกชัด เช่น [BOX-05] ไฟล์ x เข้าถึง window นอกถาย (บันทึก F5)"),
  ("กฎที่เหลือเป็นคำแนะนำ ตามคำตอบ Q1", 1.0, 1.0, "checker แยก warnings จาก errors"),
 ]),
 ("D8 เอกสารมาตรฐานและการเรียนรู้ (C)", 10, [
  ("ไฟล์กฎของบ้านไฟล์เดียว อ่านจบหนึ่งหน้า", 2.0, 2.0, "HOUSE-RULES.md 36 บรรทัด"),
  ("ตารางถาม-ตอบกลาง: อยากแก้อะไร → ใช้เครื่องไหน", 2.0, 2.0, "QA-GUIDE.md ครบทุก action"),
  ("แผนที่ระบบจากโค้ดจริงและสดใหม่", 1.5, 1.0,
   "FACTORY-MAP สดใหม่ (วัดแล้ว) แต่ system-map.md/graph ยังอ้าง commit เก่า d8fd046 + กราฟ 20 ต.ค. (ก่อน F6 จบ)"),
  ("แผน + บันทึกผลจริงรายขั้น F0-F6", 2.0, 2.0,
   f"FACTORY-PLAN + {S['docs']['factory_step_docs']} ไฟล์ขั้นตอน มีบันทึกผลที่ทำจริง"),
  ("เอกสารภาษาไทยครบวงจร + ADR", 1.5, 1.5, f"md {S['docs']['md_files']} ไฟล์ | ADR {S['docs']['adr']}"),
  ("ระบบเลขรุ่นและโน้ตรุ่นถูก CI บังคับ", 1.0, 1.0, "versioning.md + check-release-notes ใน CI + release 2026.2.60"),
 ]),
 ("D9 ความสมบูรณ์ของการย้าย + หลักฐานไม่ถอย", 5, [
  ("F6 จบ: m/ ว่าง ตรวจด้วยเครื่อง", 3.0, 3.0, "m_progress: ไม่มี app/src/m แล้ว (--check-empty exit 0 ตามบันทึก commit 4ea6d2d)"),
  ("หน้าตา/พฤติกรรมเหมือนเดิม: ชุดเทียบเท่า + ภาพ parity", 3.5, 3.5,
   f"tests {S['tests']['files']} ไฟล์ (equiv {S['tests']['equiv_suites']} ชุด) + GATE=PASS32 (บันทึก commit)"),
  ("หน้าเดิมย้ายออกจากชั้น React เก่าหมด", 1.5, 1.5,
   f"app/src/react เหลือ {r['files']} ไฟล์ (runtime.js, store.js) jsx 0"),
  ("ตรรกะบริสุทธิ์แยกโซน core พร้อมทดสอบกลายพันธุ์", 2.0, 2.0,
   f"core {c['files']} ไฟล์ {c['total_bytes']:,}B + mutation 7/7 รายโมดูล (บันทึก commit)"),
 ]),
 ("D10 ความพร้อมพัฒนาต่อและหนี้ที่เหลือ", 5, [
  ("เพิ่มหน้าใหม่ = คำสั่งเดียว ได้กล่องที่เครื่องตรวจผ่าน (B3)", 3.0, 3.0,
   "tuner + ลงทะเบียนอัตโนมัติ + F4 บันทึกว่ากล่องนำร่องผ่านโดยไม่แก้มือ"),
  ("นโยบายขนาดไฟล์ชั้น engine ยังไม่กำหนด (3 ไฟล์เกิน 15KB)", 1.5, 1.0,
   f"engine 28 ไฟล์ เกิน 15KB: {e['over_15kb']} — กฎขนาดคุมเฉพาะกล่อง ยังไม่มีกฎชั้น engine"),
  ("กราฟโค้ด/แผนผังระบบล้าสมัยหลัง F6", 1.5, 1.0, "GRAPH_REPORT 20 ต.ค. / system-map อ้าง d8fd046"),
  ("quirk ของเครื่องมือที่บันทึกไว้แต่ยังไม่แก้", 1.0, 0.5, "mapper ไม่มี --help (บันทึกใน F5 ว่าเคยทำไฟล์ --help ค้าง)"),
  ("บทเรียนและกล่องตัวอย่างทำให้คน/agent ใหม่เริ่มได้ทันที", 1.5, 1.5,
   "example_box + QA-GUIDE + บัตรสองส่วน (คนอ่าน + เครื่องอ่าน)"),
  ("ทางไป production ยังคุมด้วยกติกา Master แยกต่างหาก", 1.5, 1.0,
   "CI แตะ forge เท่านั้น ปล่อยจริงต้องสั่งเอง — ปลอดภัยแต่ยังไม่มีเช็คลิสต์ปล่อยจริงในเอกสาร"),
 ]),
]

total_w = sum(d[1] for d in D)
rows, total = [], 0.0
for name, w, items in D:
    got = sum(i[2] for i in items)
    full = sum(i[1] for i in items)
    total += got * w / 10
    rows.append((name, w, got, full, got * w / 10))

print("=" * 88)
print(f"{'ด้าน':44s} {'น้ำหนัก':>6s} {'ได้':>6s} {'เต็ม':>5s} {'ถ่วงน้ำหนัก':>10s}")
print("-" * 88)
for name, w, got, full, contrib in rows:
    print(f"{name:44s} {w:>5d}% {got:>6.1f} {full:>5.1f} {contrib:>10.2f}")
print("-" * 88)
print(f"{'รวม':44s} {total_w:>5d}% {'':>6s} {'':>5s} {total:>10.2f}")
print(f"\nคะแนนภาพรวม: {total/10:.2f} / 10  = {total:.1f} / 100")

# headline ตามลำดับแนวคิดที่ Master ยึด (ข้อ 1-4)
head = [("ข้อ 1 กล่องฟีเจอร์", [r2 for r2 in rows if r2[0].startswith("D2")][0]),
        ("ข้อ 2 โกดังแบ่งโซน", [r2 for r2 in rows if r2[0].startswith("D1")][0]),
        ("ข้อ 3 แม่พิมพ์กลาง", [r2 for r2 in rows if r2[0].startswith("D3")][0]),
        ("ข้อ 4 รับส่งผ่านถาย", [r2 for r2 in rows if r2[0].startswith("D4")][0])]
print("\nคะแนนรายแนวคิดหลัก (ตามลำดับที่ Master ยึด):")
for n, (_, _, got, full, _) in head:
    print(f"  {n}: {got:.1f} / {full:.0f}")

# บันทึกผล
out = {"dimensions": [{"name": n, "weight": w, "score": g, "full": f, "weighted": c2,
                       "items": [{"item": it, "max": mx, "got": g2, "evidence": ev} for it, mx, g2, ev in items]}
                      for n, w, items, g, f, c2 in
                      [(d[0], d[1], d[2], sum(i[2] for i in d[2]), sum(i[1] for i in d[2]), sum(i[2] for i in d[2]) * d[1] / 10) for d in D]],
      "overall_10": round(total / 10, 2), "overall_100": round(total, 1),
      "hex_outside_vars": hex_out, "px_outside_vars": px_out, "var_uses": var_uses}
with open(os.path.join(HERE, "factory_scores.json"), "w", encoding="utf-8") as fp:
    json.dump(out, fp, ensure_ascii=False, indent=1)
print("\nบันทึก factory_scores.json แล้ว")
