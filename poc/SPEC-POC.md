# สเปก PoC (เฟส 2 บทพิสูจน์) — ก่อนลงมือเขียนโค้ด

วันที่: 9 ต.ค. 2026 | สถานะ: รอตรวจสอบสมบูรณ์ (grill) ก่อนเขียนโค้ดจริง

## ขอบเขต PoC

PoC ต้องพิสูจน์ 4 ข้อ ตามแผนเฟส 2 ข้อ 2-4:

1. **Push จริง**: PWA บน Android ของ Master ติดตั้งได้ + subscribe สำเร็จ + รับแจ้งเตือนจริงจาก Workers
2. **Proxy AI**: Workers เรียก Groq ผ่าน API ได้ (key ซ่อนใน secret ของ Workers เท่านั้น)
3. **Function calling**: ส่งคำสั่งธรรมดาภาษาไทย ("เพิ่มงานส่งคณิตวันศุกร์") แล้วโมเดลตอบกลับเป็นคำสั่งฟังก์ชันที่ถูกต้อง
4. **Tiger Cloud Free plan**: สร้าง service ฟรีจริง ยอด $0 ไม่มีการผูกบัตร

## องค์ประกอบที่จะสร้าง (ไม่เกินขอบเขต)

| ไฟล์ | หน้าที่ |
|---|---|
| `evarel/poc/schema.sql` | ตารางทั้งหมดของ Supabase + RLS + index |
| `evarel/poc/worker.js` | Workers: /api/ai/chat, /api/push/send, /api/push/subscribe |
| `evarel/poc/push-test.html` | หน้าทดสอบ subscribe + ทดสอบรับแจ้งเตือน |
| `evarel/poc/sw.js` | Service worker รับ push event + แสดง notification |
| `evarel/poc/manifest.json` | ทำให้ติดตั้งเป็น PWA ได้ |
| `evarel/poc/README-POC.md` | ขั้นตอนทดสอบมือถือทีละขั้น |

## ที่ยังไม่ทำใน PoC (กันงานบวม)

- หน้าจอแอปจริงทั้งหมด (เฟส 3-4)
- cron 6 แบบเต็มรูปแบบ (เฟส 5) — ใน PoC ทดสอบแค่ push ครั้งเดียวด้วยปุ่ม
- Tiger Cloud schema จริง (รอยืนยัน Free plan ก่อน)
- ระบบล็อกอินเต็มรูปแบบ (PoC ใช้ anon key + RLS เบื้องต้นพอ)

## จุดเสี่ยงที่ต้องระวัง

- ไลบรารี `webpush-webcrypto` ยังไม่เคยลองจริงบน account ของเรา — ถ้าติดขัดใช้ทางเลือก (เช่น library อื่นที่รองรับ Workers)
- Android ต้องเปิดผ่าน HTTPS เท่านั้น (domain *.pages.dev ผ่านอยู่แล้ว)
- คีย์ทั้งหมดต้องผ่านช่อง secret ของ Cloudflare เท่านั้น ห้ามวางในแชทหรือโค้ด
