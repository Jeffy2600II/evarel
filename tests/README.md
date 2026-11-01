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

ชุด equiv ที่เปิดเบราว์เซอร์ (ประมาณ 42 ไฟล์ เช่น form quota timer notify push auth ฯลฯ) และประตูภาพ `scripts/run_shots_gate.sh` ต้องมี:
- `SUPABASE_SERVICE_KEY` ใน `.agents/.env` ที่ราก repo (สร้าง/ลบผู้ใช้ทดสอบผ่าน forge จริง จึงห้ามเอาความลับกับฐานจริงเข้า CI)
- chromium `chromium_headless_shell-1243` (= playwright 1.63.0 พอดี รุ่นอื่น raster ต่าง ผลภาพเพี้ยน)
- `npm i playwright` แยกต่างหาก (แพ็กเกจนี้ไม่ได้ lock ไว้ใน package.json)

รัน: `node tests/<ชื่อ>_equiv.test.mjs` ต่อไฟล์ หรือ `scripts/run_shots_gate.sh` สำหรับประตูภาพ 32 ฉาก (รายละเอียดเกณฑ์อยู่ใน docs/plan/factory-steps/F6-m-layer-order.md)

## ไฟล์อ้างอิงของเทสต์เทียบ (`/tmp/*.js`) - สร้างใหม่ได้เสมอ

เทสต์เทียบ 8 ชุด (avatar undo push popover form timer quota calstats) เทียบ "ไฟล์ก่อนย้ายตรรกะออก" กับ "ไฟล์ปัจจุบัน (ห่อบาง + core)"
ไฟล์ฝั่งอดีตถูกอ่านจาก `/tmp` ตามค่าเริ่มต้นในเทสต์ ซึ่ง**หายเมื่อรีสตาร์ทเครื่องหรือย้ายเครื่อง** แล้วเทสต์จะตายทั้งชุดด้วย `ENOENT`
ทั้งที่โค้ดไม่ได้ผิด (เกิดจริง 1 พ.ย. 2026 แปดชุดพร้อมกัน) ห้ามสร้างด้วยมือและห้าม commit ไฟล์พวกนี้

สร้างใหม่ทั้งหมด (ผลลัพธ์คงที่ทุกเครื่อง เพราะมาจากประวัติ git ในรีโป):

```
node scripts/gen-equiv-refs.mjs            # เขียนที่ /tmp ตามตารางใน tests/refs.lock.json
node scripts/gen-equiv-refs.mjs --run      # สร้างแล้วรันเทสต์ทั้งชุดให้ด้วย (ต้องมี playwright + chromium)
node scripts/gen-equiv-refs.mjs --check    # ตรวจว่า lock ยังใช้ได้ ไม่เขียนอะไร
node scripts/gen-equiv-refs.mjs --verify   # หา commit ฐานใหม่ที่เทสต์ผ่านจริง แล้วเขียน lock (ช้า, ทำเมื่อย้ายตรรกะเพิ่ม)
```

`tests/refs.lock.json` เก็บว่าเทสต์ไหนใช้ไฟล์จาก commit ไหน **ตัวที่บันทึกคือตัวที่เทสต์ผ่านจริง** ไม่ใช่ตัวที่เดาว่าใช่
เพราะแต่ละโมดูลถูกย้ายหลายรอบ (F6/F7) เลข commit ที่ถูกต้องจึงพิสูจน์ได้ด้วยการรันเทสต์เท่านั้น
ถ้าอนาคตย้ายตรรกะออกจากโมดูลอีก ให้รัน `--verify` ครั้งเดียวแล้ว commit lock ที่ได้

ข้อควรรู้: ตัวสร้างเลือกไฟล์ที่ **ต่างจากไฟล์ปัจจุบัน** เสมอ ถ้าเผลอชี้ไฟล์ปัจจุบัน เทสต์จะเทียบกับตัวเองแล้วผ่านลวง
