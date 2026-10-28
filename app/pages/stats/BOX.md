# บัตรประจำกล่อง: stats

## ส่วนสั้นสำหรับคนอ่าน
- **ชื่อกล่อง**: stats
- **ประเภท**: หน้า (Page Box)
- **โครงสร้าง**: สามชั้น (Page, parts/, tray, style)

<!-- MACHINE-READABLE-CARD-START -->
```json
{
  "name": "stats",
  "pascalName": "Stats",
  "version": "1.0.0",
  "created_by": "tuner",
  "layers": {
    "page": "StatsPage.jsx",
    "parts": ["parts/StatsSummary.jsx","parts/StatsRecords.jsx","parts/StatsChart.jsx","parts/StatsHabits.jsx"],
    "tray": "stats.tray.js",
    "style": "stats.style.css"
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
- [x] บัตรประจำกล่องครบถ้วน (ชั้นหน้า, parts 4 ชิ้น, ถาด, สไตล์)
- [x] ลงทะเบียนในระบบโกดัง: ชื่อไฟล์ผลบิลด์ `stats.js` คงเดิม จึงอยู่ใน `REACT_PAGES` และแคช `sw.js` เดิมโดยไม่แก้
- [x] HTML ที่เรนเดอร์ตรงของเดิมทุกไบต์ (`tests/stats_html_equiv.test.mjs` 6 กรณี) และฉีดความผิดแล้วตัวเทียบตกจริง
- [x] ภาพตรงภาพอ้างอิง F0 ที่ 0 พิกเซล (`tests/baseline_shots.mjs --compare` 30/30 ฉาก errs app 0)
- [ ] ตัดสินเกณฑ์กล่องล้น (รอ Master) | สไตล์ `stats.style.css` ยังเป็นโครงว่าง ท่อบิลด์ยังไม่ต่อสไตล์กล่อง (ขั้น D)
## สนามซ้อม (Sandbox)
สามารถใช้ข้อมูลจำลองจาก `stats.tray.js` เพื่อทดสอบการแสดงผลโดยไม่ต้องเชื่อมต่อของจริง
