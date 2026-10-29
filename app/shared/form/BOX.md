# บัตรประจำกล่อง: form

## ส่วนสั้นสำหรับคนอ่าน
- **ชื่อกล่อง**: form
- **ประเภท**: หน้า (Page Box)
- **โครงสร้าง**: สามชั้น (Page, parts/, tray)

<!-- MACHINE-READABLE-CARD-START -->
```json
{
  "name": "form",
  "pascalName": "Form",
  "version": "1.0.0",
  "created_by": "tuner",
  "layers": {
    "page": "FormPage.jsx",
    "parts": [
      "parts/FormAtoms.jsx",
      "parts/FormPanels.jsx",
      "parts/TypeBody.jsx",
      "parts/FormFields.jsx"
    ],
    "tray": "form.tray.js",
    "style": "form.style.css"
  },
  "register": {
    "pages": [
      {
        "name": "typeBody",
        "export": "TypeBody"
      },
      {
        "name": "formBody",
        "export": "FormBody"
      }
    ],
    "components": [
      {
        "name": "typeBody",
        "export": "TypeBody"
      },
      {
        "name": "formBody",
        "export": "FormBody"
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
สามารถใช้ข้อมูลจำลองจาก `form.tray.js` เพื่อทดสอบการแสดงผลโดยไม่ต้องเชื่อมต่อของจริง
