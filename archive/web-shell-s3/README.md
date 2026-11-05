# archive/web-shell-s3 — เปลือก Next.js ขั้น S3 (ปลดระวาง 5 พ.ย. 2026)

ของเดิมของ `web/shell` ยุค S3: ใช้ Next.js เป็นตัวส่งออกไฟล์สถิตเท่านั้น (output export)
ปล่อยไฟล์แอปทั้งหมดจาก `web/classic` ผ่านโฟลเดอร์ public ตรงทุกไบต์ ไม่มีหน้าของ Next เอง

สิ้นสุดลงเมื่อ S4 (next-pages ไบต์ N4): หน้าจริงสร้างโดย Next ที่ `web/next/src/app`
แล้ว `web/shell` ถูกยุบรวมเข้า `web/next` (ติดตั้ง react/react-dom ที่เดียว ไม่ต้อง symlink
node_modules ข้ามโฟลเดอร์อีก) ตัวตรวจยุคนั้นคือ `tests/history/s3_next_wrap.test.mjs`
คู่เทียบที่ใช้อยู่ปัจจุบันคือ `tests/next_boot.test.mjs`

ไฟล์ในนี้เก็บไว้เป็นหลักฐานโครงสร้างยุค S3 อ่านอย่างเดียว ห้ามรัน/ห้ามนำกลับมาใช้
