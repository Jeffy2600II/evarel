# บัตรประจำกล่อง: aiShell

## ส่วนสั้นสำหรับคนอ่าน
- **ชื่อกล่อง**: aiShell
- **ประเภท**: หน้า (Page Box)
- **โครงสร้าง**: สามชั้น (Page, parts/, tray)

<!-- MACHINE-READABLE-CARD-START -->
```json
{
  "name": "aiShell",
  "pascalName": "AiShell",
  "version": "1.0.0",
  "created_by": "tuner",
  "layers": {
    "page": "AiShellPage.jsx",
    "parts": [
      "parts/AiBar.jsx",
      "parts/AiDock.jsx",
      "parts/AiDrawer.jsx"
    ],
    "tray": "aiShell.tray.js",
    "style": "aiShell.style.css"
  },
  "register": {
    "pages": [
      {
        "name": "aiShell",
        "export": "AiShellContent"
      }
    ],
    "components": [
      {
        "name": "aiShell",
        "export": "AiShellContent"
      }
    ]
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
ติ๊ก [x] เฉพาะข้อที่พิสูจน์แล้วจริง พร้อมหลักฐานต่อท้ายข้อ (เบ้าจูนไม่ติ๊กให้ล่วงหน้า)
- [ ] ผ่านการตรวจกติกาจากเครื่องตรวจ (`node app/tools/checker.mjs`)
- [ ] บัตรประจำกล่องตรงไฟล์จริง (`layers` และ `register`)
- [ ] ลงทะเบียนในแอปแล้ว (บิลด์เติมรายการหน้าและแคช sw.js ให้เอง ตรวจด้วย `node scripts/build-react.mjs --check`)
- [ ] HTML ที่เรนเดอร์ตรงของเดิม และภาพตรงภาพอ้างอิง (ถ้าเป็นหน้าที่ย้ายมาจากของเดิม)

## สนามซ้อม (Sandbox)
สามารถใช้ข้อมูลจำลองจาก `aiShell.tray.js` เพื่อทดสอบการแสดงผลโดยไม่ต้องเชื่อมต่อของจริง
