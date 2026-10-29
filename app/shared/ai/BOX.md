# บัตรประจำกล่อง: ai

## ส่วนสั้นสำหรับคนอ่าน
- **ชื่อกล่อง**: ai
- **ประเภท**: หน้า (Page Box)
- **โครงสร้าง**: สามชั้น (Page, parts/, tray)

<!-- MACHINE-READABLE-CARD-START -->
```json
{
  "name": "ai",
  "pascalName": "Ai",
  "version": "1.0.0",
  "created_by": "tuner",
  "layers": {
    "page": "AiPage.jsx",
    "parts": [
      "parts/AiHello.jsx",
      "parts/AiNotice.jsx",
      "parts/AiCards.jsx",
      "parts/MsgActions.jsx"
    ],
    "tray": "ai.tray.js",
    "style": "ai.style.css"
  },
  "register": {
    "pages": [
      {
        "name": "ai",
        "export": "AiContent"
      }
    ],
    "components": [
      {
        "name": "ai",
        "export": "AiContent"
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
สามารถใช้ข้อมูลจำลองจาก `ai.tray.js` เพื่อทดสอบการแสดงผลโดยไม่ต้องเชื่อมต่อของจริง
