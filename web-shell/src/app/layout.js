/* เปลือก Next.js ขั้น S3: ไม่มีหน้าใดของ Next ไฟล์แอปทั้งหมดมาจาก app/web ผ่านโฟลเดอร์ public ตรงทุกไบต์
   ห้ามเพิ่ม page.js ใดๆ ในโฟลเดอร์นี้ ไม่งั้น index.html ของแอปจะถูกเขียนทับ (มีตัวตรวจใน scripts/build-web.mjs และ tests/s3_next_wrap.test.mjs)
   โฟลเดอร์ web-shell แยกจากรากรีโปโดยตั้งใจ: Next เลือก ./app ที่รากก่อน ./src/app เสมอ และรากรีโปมี app/ (api, edge, db, web) อยู่แล้ว */
export default function Root({ children }) { return children; }
