# tests/ : ชุดตรวจของรีโป

แบ่งเป็นสองกลุ่มตามแหล่งรัน: ของที่ CI เฝ้าทุก push กับของที่ต้องรันมือเพราะผูกเครื่องหรือความลับจริง

## กลุ่มที่ CI เฝ้าแล้ว (.github/workflows/web.yml)

| ชุด | ตรวจอะไร |
|---|---|
| `aiproposal` `calendar` `core` `settingsviews` `stats_html` `today` (ชื่อไฟล์ `*_equiv.test.mjs`) | เทียบตรรกะ/HTML ปัจจุบันกับตัวอ้างอิงจาก git commit ฐาน (Node ล้วน ไม่เปิดเบราว์เซอร์ ไม่ยิงเน็ต) |
| `m_core_import.test.mjs` | เกตแคช: ทุก import `./core/` ต้องอยู่ใน CORE ของ `web/classic/sw.js` ไม่งั้นออฟไลน์พังเงียบ |
| `build_integrity.test.mjs` `box_build_pipeline.test.mjs` `next_boot.test.mjs` | ความครบของผลบิลด์ บันเดิล Next บูตได้ (อยู่ใน job check / รันมือได้เหมือนกัน) |

ข้อควรระวังของเทสต์ equiv ที่อ่าน git ฐาน:
- ต้องมีประวัติเต็ม (CI ใช้ fetch-depth 0 โคลนตื้นจะหา commit ฐานไม่เจอ)
- พาธใน `git show` เป็นพาธยุค commit ฐาน ห้ามแก้ตามการย้ายโฟลเดอร์ปัจจุบัน เพราะอดีตไม่ย้ายตาม (บทเรียน F6/F7 เปลี่ยนค้างไว้จนเทสต์ตายทั้งชุด พบและแก้รอบ 2026.2.62)

## กลุ่มรันมือ (ไม่เอาเข้า CI)

ชุด equiv ที่เปิดเบราว์เซอร์ (~42 ไฟล์ เช่น form quota timer notify push auth ฯลฯ) และประตูภาพ `scripts/run_shots_gate.sh` ต้องมี:
- `SUPABASE_SERVICE_KEY` ใน `.agents/.env` ที่ราก repo (สร้าง/ลบผู้ใช้ทดสอบผ่าน forge จริง จึงห้ามเอาความลับกับฐานจริงเข้า CI)
- chromium `chromium_headless_shell-1243` (= playwright 1.63.0 พอดี รุ่นอื่น raster ต่าง ผลภาพเพี้ยน)
- `npm i playwright` แยกต่างหาก (แพ็กเกจนี้ไม่ได้ lock ไว้ใน package.json)

รัน: `node tests/<ชื่อ>_equiv.test.mjs` ต่อไฟล์ หรือ `scripts/run_shots_gate.sh` สำหรับประตูภาพ 32 ฉาก (รายละเอียดเกณฑ์อยู่ใน docs/plan/factory-steps/F6-m-layer-order.md)
