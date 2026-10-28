# บัตรประจำกล่อง: all

## ส่วนสั้นสำหรับคนอ่าน
- **ชื่อกล่อง**: all
- **ประเภท**: หน้า (Page Box)
- **โครงสร้าง**: สามชั้น (Page, parts/, tray, style)

<!-- MACHINE-READABLE-CARD-START -->
```json
{
  "name": "all",
  "pascalName": "All",
  "version": "1.0.0",
  "created_by": "tuner",
  "layers": {
    "page": "AllPage.jsx",
    "parts": ["parts/AllSectionHead.jsx","parts/AllRow.jsx"],
    "tray": "all.tray.js",
    "style": "all.style.css"
  },
  "register": {
    "pages": [{ "name": "all" }]
  },
  "rules": {
    "max_file_lines": 300,
    "max_file_kb": 15,
    "allow_direct_window": false
  }
}
```
<!-- MACHINE-READABLE-CARD-END -->

## แผ่นตรวจรับประจำกล่อง (Acceptance Checklist)
- [x] ผ่านการตรวจกติกาจากเครื่องตรวจ (`node app/tools/checker.mjs`) กล่องไม่แตะ `window` (BOX-05)
- [x] บัตรประจำกล่องครบถ้วน (ชั้นหน้า, parts 2 ชิ้น, ถาด, สไตล์)
- [x] ลงทะเบียนในแอป: ชื่อ `all` อยู่ใน `REACT_PAGES_BASE` (หน้าเดิม คงลำดับเดิม) และ `sw.js` CORE เดิม บัตรประกาศ `register` ให้บิลด์ตรวจ ถ้าชื่อใหม่ บิลด์เติมรายการหน้าและแคชให้เอง (`tests/box_build_pipeline.test.mjs`)
- [x] HTML ที่เรนเดอร์ตรงของเดิมทุกไบต์ (`tests/stats_html_equiv.test.mjs` ส่วน all 4 กรณี) และฉีดความผิดแล้วตัวเทียบตกจริง
- [x] ภาพตรงภาพอ้างอิง F0 ที่ 0 พิกเซล (`tests/baseline_shots.mjs --compare` 30/30 ฉาก errs app 0)
- [ ] ตัดสินเกณฑ์กล่องล้น (รอ Master) | สไตล์ `all.style.css` ยังเป็นโครงว่าง ท่อบิลด์ยังไม่ต่อสไตล์กล่อง (ขั้น D)
## สนามซ้อม (Sandbox)
สามารถใช้ข้อมูลจำลองจาก `all.tray.js` เพื่อทดสอบการแสดงผลโดยไม่ต้องเชื่อมต่อของจริง
