# tests/ : ตรวจก่อน push ทุกครั้ง

ต้องมี: `npm i playwright pillow` (Python: pillow) และ Chromium

| ไฟล์ | ตรวจอะไร | ผ่านเมื่อ |
|---|---|---|
| visual-parity.mjs | ถ่ายภาพ 4 หน้า x 2 โหมด เทียบ `design/master-demo-v2.html` กับ `app/index.html` | โหมดสว่างต่าง 0 พิกเซล (โหมดมืดต่างได้เฉพาะสีที่ตั้งใจปรับ) |
| xss-guard.mjs | ใส่ชื่ออันตราย 3 แบบ + ผ่านแชท AI | injected_elements=0, alerts_fired=[] |

หมายเหตุ: ปิดแอนิเมชันก่อนถ่ายภาพ (skeleton วิ่งทำให้พิกเซลเพี้ยน)
