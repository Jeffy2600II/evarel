# ตารางถาม-ตอบกลาง (QA & Action Guide)

คู่มือค้นหาเครื่องมือและการดำเนินการเมื่อต้องการแก้ไขระบบ Frontend Factory

---

| สิ่งที่คุณต้องการทำ | ตำแหน่ง / เครื่องมือที่ต้องใช้ | คำสั่งหรือแนวทางดำเนินการ |
|---|---|---|
| **ต้องการแก้ไขเฉพาะหน้าใดหน้าหนึ่ง** | กล่องนั้นใน `web/pages/<ชื่อหน้า>/` | แก้ไขไฟล์ในกล่องนั้น (ห้ามแตะกล่องอื่น) |
| **ต้องการแก้ปุ่ม / คอมโพเนนต์ที่ใช้ร่วมหลายหน้า** | โซน `web/shared/` | แก้จุดเดียวใน shared ทุกหน้าจะเปลี่ยนพร้อมกัน |
| **ต้องการปรับเปลี่ยนสี ฟอนต์ หรือระยะห่างกลาง** | ตารางแม่พิมพ์ `web/styles/MOLD-TABLE.md` / `web/runtime/styles/design.css` | แก้ตัวแปร CSS ใน design.css หรือ extra.css แล้วรัน `node scripts/build-css.mjs` |
| **ต้องการเพิ่มหน้าใหม่** | เบ้าจูน (`tools/factory/tuner.mjs`) | สั่ง `node tools/factory/tuner.mjs <ชื่อหน้า>` เพื่อสร้างกล่อง 3 ชั้นใหม่ |
| **ต้องการจัดการข้อมูล / API** | ถาดข้อมูลประจำกล่อง (`.tray.js`) หรือ `web/data/` | เพิ่ม/แก้ไข ฟังก์ชันเสิร์ฟข้อมูลในถาด |
| **ต้องการตรวจความถูกต้องของกล่องตามกฎ** | เครื่องตรวจ (`tools/factory/checker.mjs`) | สั่ง `node tools/factory/checker.mjs <path-กล่อง>` หรือ `--all` |
| **ต้องการสแกนความสมบูรณ์เฉพาะหน้าเดียว** | X-ray รายหน้า (`tools/factory/xray.mjs`) | สั่ง `node tools/factory/xray.mjs <ชื่อหน้า>` |
| **ต้องการอัปเดตแผนที่โครงสร้างโรงงาน** | ตัววาดแผนที่ (`tools/factory/mapper.mjs`) | สั่ง `node tools/factory/mapper.mjs` เพื่อวาด `docs/FACTORY-MAP.md` |
| **ต้องการประเมินผลกระทบก่อนแก้ไขไฟล์** | ทะเบียนใครใช้ใคร (`tools/factory/dep_matrix.mjs`) | สั่ง `node tools/factory/dep_matrix.mjs <ชื่อไฟล์/โมดูล>` |
| **ต้องการคืนค่า/แก้ย้อนกล่องที่พัง** | แก้ย้อนรายกล่อง (`tools/factory/rollback.mjs`) | สั่ง `node tools/factory/rollback.mjs <ชื่อหน้า>` |
