# แผนผังระบบ Evarel (จากกราฟโค้ดจริง)

ที่มา: repo Jeffy2600II/evarel สาขา develop commit d8fd046 (ตรงกับ origin) สร้างกราฟด้วย graphify โหมด AST จากซอร์ส 101 ไฟล์ใน app/src, app/api, app/edge ผลคือ 946 โหนด 1,835 เส้นเชื่อม 64 กลุ่ม ไม่พบวงจร import สร้างกราฟใหม่ได้ด้วย graphify update . ในโฟลเดอร์ซอร์ส (graphify-out/ ไม่ commit)

## ภาพรวม 3 ส่วน

1. หน้าแอป (app/src): ที่ผู้ใช้เห็น
   - core/ (4 ไฟล์: dates, schedule, stats, today): ตรรกะคำนวณบริสุทธิ์ ใช้ร่วม
   - m/ (26 ไฟล์ 00 ถึง 25): เครื่องยนต์เดิม เรียงเลขตามลำดับชั้น ฐาน (00 ถึง 07), UI (09 ถึง 14), บริการ AI/ปฏิทิน/แจ้งเตือน (10, 16, 18, 20), หน้า (13, 17, 19, 21, 22), render (23), actions (25)
   - react/ (17 ไฟล์ jsx): หน้าที่ย้ายเป็น React แล้ว (today, calendar, stats, all, ai, settings, auth, form, detail ฯลฯ)
2. API (app/api/src): Cloudflare Worker ตัวเดียว แบ่งโมดูลภายใน
   - router.ts เป็นประตูเดียว: handleRequest เชื่อม 33 จุด
   - systems/auth (account, สมัคร, ยืนยัน, ลืมรหัส, ลบบัญชี), systems/items (รายการ+log), systems/ai (runAgent, memory, quota), systems/notify (scheduler, sender, due)
3. Edge (app/edge/notify-tick): Supabase Edge Function ที่ pg_cron ยิงทุกนาที เรียกตรรกะส่ง Push จาก api/src/systems/notify

## ทิศทางการไหลของข้อมูล

ผู้ใช้ กดปุ่ม -> m/ (หรือ react/) -> Repo adapter (04-data__repo) -> Worker router.ts -> auth ตรวจ JWT -> items/ai -> Supabase
เวลาถึงกำหนด: pg_cron -> notify-tick -> notify/scheduler (ตัดสินว่าใครเด้ง) -> sender (Web Push) -> sw.js บนเครื่อง

## จุดศูนย์กลาง (god nodes) ที่ต้องระวังเวลาแก้

| จุด | เชื่อม | ผลถ้าแก้ผิด |
|---|---|---|
| handleRequest (router.ts) | 33 | ทุก endpoint ของ API |
| jsonResponse / errorResponse | 29 / 21 | รูปแบบตอบกลับทั้งระบบ |
| extractBearer / verifyJWT | 18 / 14 | การยืนยันตัวตนทุกเส้นทาง |
| isDone, formBody | 14 / 14 | สถานะรายการและฟอร์มทุกหน้า |

## จุดเสี่ยงที่กราฟบอก

1. ฝั่งหน้าแอปเชื่อมกันผ่าน window ไม่ใช่ import: m/ ทุกไฟล์ 26 ไฟล์ยังใช้ Object.assign(window, ...) เป็น shim และมี import จริงรวมเพียง 10 บรรทัดใน 5 ไฟล์ react/ เรียก window.EvarelPages, EvarelComponents, EvarelReact รวมกว่า 120 จุด กราฟมองเส้นเชื่อมแบบนี้ไม่เห็น จึงนับไม่ได้ว่าแก้ m/ ไฟล์หนึ่งกระทบ react/ กี่หน้า ต้องพึ่งชุดทดสอบ 9 ประตูของโปรเจกต์แทนกราฟ
2. API ฝั่ง api:core, auth, items, notify, ai พึ่งกันสูงทุกคู่ (ราว 10 ถึง 21 เส้นต่อคู่) ไม่มีโมดูลใดแยกขาดจริง การ "แยก Worker ทีหลัง" ตามแผนเดิมจะต้องตัดเส้นพวกนี้ก่อน
3. เส้นทางข้ามฝั่ง: กราฟหาเส้นทางตรงจากหน้าแอป (openForm) ไปถึง API (handleRequest) ไม่เจอ เพราะคั่นด้วย HTTP (fetch ผ่าน Repo adapter) เป็นเรื่องปกติของสถาปัตยกรรม ไม่ใช่บั๊ก
4. ฟังก์ชัน scheduled มีสามตัวชื่อซ้ำกัน (core/schedule.ts, m/06-services__schedule.ts, api/src/index.ts) ต้องระบุพาธเสมอตอนค้น กันแก้ผิดตัว
5. edge/notify-tick/index.ts และ api/prototype/push-poc/sw.js กราฟอ่านสัญลักษณ์ไม่ออก (0 โหนด) ส่วนนี้ต้องอ่านโค้ดตรง

## กราฟสำหรับ agent และคนอื่น

ไฟล์กราฟอยู่ที่ docs/graph/ (graph.json, GRAPH_REPORT.md, graph.html) สร้างจากซอร์ส app/src, app/api, app/edge พาธในกราฟเป็นพาธสัมพัทธ์จาก app/ เช่น src/m/23-render.ts, api/src/router.ts

วิธีใช้:
1. อ่าน docs/graph/GRAPH_REPORT.md ก่อน (จุดศูนย์กลาง กลุ่ม ความเชื่อมแปลก)
2. เปิด docs/graph/graph.html ในเบราว์เซอร์เพื่อดูเป็นภาพ
3. ถามเชิงลึกด้วย CLI: pip install graphifyy แล้ว cd app && graphify update . จะได้ graphify-out/ ใหม่ จากนั้น graphify explain "ชื่อฟังก์ชัน" หรือ graphify path "A" "B" (ถ้ามีชื่อซ้ำให้ระบุ path::symbol)

กราฟเป็นภาพ ณ commit ที่ระบุในรายงาน หลังแก้โค้ดให้สร้างใหม่แล้วแทนที่ไฟล์ใน docs/graph/ (แก้ไฟล์เดิม ไม่สร้างสำเนาซ้อน)

## ข้อจำกัดของแผนผังนี้

- เป็นการวิเคราะห์ static: การโหลดไฟล์แบบ dynamic, การ route ด้วยสตริง, ค่าตั้งตอนรัน ไม่อยู่ในกราฟ
- เส้นเชื่อมแบบ INFERRED มี 274 เส้น (15%) ความมั่นใจเฉลี่ย 0.85 ควรเช็กโค้ดจริงก่อนอาศัยเส้นเหล่านั้นตัดสินใจ
- กฎธุรกิจและเหตุผลการออกแบบอยู่ในโน้ต Evarel ไม่ได้อยู่ในกราฟ
- ส่วน build/ และโฟลเดอร์สำรอง app-ts* ถูกตัดออกจากกราฟโดยตั้งใจ

สกิลที่ใช้: graphify
