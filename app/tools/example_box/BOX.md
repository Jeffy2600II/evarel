# บัตรประจำกล่อง: example

## ส่วนสั้นสำหรับคนอ่าน
- **ชื่อกล่อง**: example
- **ประเภท**: กล่องตัวอย่างอ้างอิง (Reference Box)
- **โครงสร้าง**: สามชั้นครบถ้วน (ExamplePage, parts/ExampleHeader, example.tray.js, example.style.css)

<!-- MACHINE-READABLE-CARD-START -->
```json
{
  "name": "example",
  "pascalName": "Example",
  "version": "1.0.0",
  "created_by": "manual",
  "layers": {
    "page": "ExamplePage.jsx",
    "parts": "parts/ExampleHeader.jsx",
    "tray": "example.tray.js",
    "style": "example.style.css"
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
- [x] ผ่านการตรวจกติกาจากเครื่องตรวจ (`node app/tools/checker.mjs`)
- [x] บัตรประจำกล่องครบถ้วน
- [x] ลงทะเบียนในระบบโกดังเรียบร้อย

## สนามซ้อม (Sandbox)
กล่องตัวอย่างสามารถใช้ทดสอบระบบตรวจและลอกรูปแบบโครงสร้างสามชั้นได้ทันที
