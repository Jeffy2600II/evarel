# tools/migration/ — เครื่องมือรีแฟกเตอร์ครั้งเดียวของยุคก่อนหน้า

ไฟล์ในโฟลเดอร์นี้เป็นเครื่องมือที่ใช้ทำการย้าย/จัดระเบียบโค้ดเป็นครั้ง ๆ (ยุค F6/F7 และ ts-1* ยุค js/m)
ไม่ได้อยู่ในสายพานตรวจประจำ ไม่ผูกกับ CI เก็บไว้เพื่ออ้างวิธีคิดและใช้ซ้ำได้ถ้าโครงสร้างเปลี่ยนรอบใหม่

| ไฟล์ | ทำอะไร (จากหัวไฟล์ของตัวเอง) |
|---|---|
| `move_defs.mjs` | ย้ายนิยามฟังก์ชันข้ามโมดูลตามตาราง (ยุค ts-1f) |
| `reorder_modules.mjs` | จัดลำดับโมดูลยุค js/m |
| `state_wrap.mjs` / `state_wrap_verify.mjs` | ห่อ state แล้วตรวจผลหลังห่อ |
| `state_centralize.mjs` / `state_centralize_verify.mjs` | รวม state กระจัดกระจายเข้าศูนย์กลางแล้วตรวจ |
| `sim_move.mjs` | จำลองการย้ายไฟล์ก่อนย้ายจริง |
| `hook_calls.mjs` | สแกนจุดเรียก hook ยุคทำ React migration |
| `undef_names.mjs` | หาชื่อที่ถูกอ้างแต่ไม่มีนิยาม (ตรวจหลังย้าย) |
| `docs_drift.mjs` | หาเอกสารที่ค้างกับโค้ดจริง |
| `sort-tests.mjs` | จำแนกไฟล์ tests/ เป็นกลุ่มตาม dependency (ใช้ตอนจัดระเบียบ 5 พ.ย. 2026) |

เครื่องมือที่ยังมีชีวิตอยู่ที่ tools/ ราก: `typecheck.mjs` (+baseline), `plan_check.py`, `dep_manifest.mjs`, `dep_symbols.mjs` และ `factory/`
