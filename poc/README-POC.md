# Evarel PoC — ขั้นตอนทดสอบ (README)

วันที่เตรียม: 9 ต.ค. 2026 | ประกอบด้วย: schema.sql, worker.js, push-test.html, sw.js, manifest.json

## สิ่งที่ต้องเตรียมก่อนทดสอบ

1. Supabase โปรเจกต์ใหม่ `evarel` — รัน schema.sql ใน SQL Editor ให้ครบทุกคำสั่ง
2. API key ของ Groq (console.groq.com → API Keys)
3. Cloudflare Workers + Pages: deploy worker.js ขึ้นไป แล้ว host ไฟล์นิ่ง (push-test.html, sw.js, manifest.json, icon) บน Pages โดเมนเดียวกัน

## การตั้ง secrets ของ Workers (ห้ามวางในโค้ด/แชท)

wrangler secret put ตามรายการ:
- GROQ_API_KEY
- SUPABASE_URL (เช่น https://xxxx.supabase.co)
- SUPABASE_SERVICE_KEY (service_role จาก Settings → API)
- VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (สร้างครั้งเดียวด้วยคำสั่ง generate ของ webpush-webcrypto)
- GROQ_MODEL (ไม่บังคับ — ค่าตั้งต้น llama-3.3-70b-versatile)

## ขั้นตอนทดสอบบนมือถือ Android ของ Master

1. เปิดลิงก์หน้า push-test ผ่าน Chrome (ต้องเป็น HTTPS — *.pages.dev ผ่านอยู่แล้ว)
2. กดปุ่ม "ขอสิทธิ์แจ้งเตือน + สมัครรับ" — ยอมรับสิทธิ์เมื่อเครื่องถาม
3. กดปุ่ม "ทดสอบรับแจ้งเตือน" — แถบแจ้งเตือนของเครื่องต้องเด้งขึ้นจริง
4. กดปุ่ม "ทดสอบ AI เพิ่มงาน" — ตรวจว่ามี tool_calls ชื่อ add_task กลับมาพร้อมวันเวลาถูกต้อง
5. ทดสอบติดตั้ง PWA: เมนู Chrome → เพิ่มหน้าจอหลัก (ต้องมีไอคอน 192/512 ก่อน)

## เกณฑ์ผ่าน PoC

- ข้อ 1-4 ครบถ้วนบนเครื่องจริงของ Master (ไม่ใช่เครื่องจำลอง)
- ยืนยันแล้วว่า Tiger Cloud service ที่ใช้เป็น Free plan ยอด $0
- ไม่มีคีย์ใดหลุดอยู่ในโค้ดหรือหน้าเว็บ (ตรวจด้วยการ view-source ที่หน้า push-test ได้)

## หากติดขัด

- ไลบรารี webpush-webcrypto ใช้ไม่ได้จริงบน account ของเรา → ทางเลือก: ส่งผ่าน VAPID ด้วยไลบรารีอื่นที่รองรับ Workers หรือใช้ Cloudflare Web Gateway
- Groq โมเดลที่เลือกไม่รองรับ tool use → สลับเป็นโมเดลที่รองรับ (ดูหมวด Tool Use ของเอกสาร Groq)
