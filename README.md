# Evarel

PWA ส่วนตัวสำหรับจัดการชีวิต (งาน กิจวัตร ปฏิทิน ผู้ช่วย AI) ใช้งานบน Android เป้าหมายพร้อมใช้งานภายใน 2 พ.ย. 2026
ใช้ Cloudflare (Workers และ Static Assets) กับ Supabase ภายใต้งบ 0 บาท

สาขา `develop` คือสาขาพัฒนา ยังไม่ใช่ชุดสาธารณะ สาขา `main` คือชุดทางการ

## โครงสร้าง

```
app/
  web/        ส่วนหน้า PWA (JavaScript ES Modules) เสิร์ฟเป็น Static Assets
  api/        Worker (TypeScript) บัญชี งาน/กิจวัตร AI โควตา ป้องกันการใช้ผิด
    src/        โค้ดและชุดทดสอบของ Worker
    prototype/  ต้นแบบ Push รอบแรก เก็บไว้เป็นต้นแบบอ้างอิงจนกว่า S2 จะย้ายเข้า src
  db/         สคริปต์ฐานข้อมูล Supabase (schema และ migrations ตามลำดับเลข)
docs/         แผนหลัก (docs/plan/MASTER-PLAN.md) แผนรายขั้น และ ADR
design/       เดโมต้นฉบับของเจ้าของ ห้ามแก้
tests/        เทสต์ฝั่งแอปและเครื่องมือตรวจ (ดูหัวข้อสถานะเทสต์)
tools/        เครื่องมือตรวจถาวรของโครงการ
scripts/      สคริปต์ build และรันชุดทดสอบ
```

## ชุดสภาพแวดล้อม

| ชุด | ส่วนหน้า | API | ใช้เมื่อ |
|---|---|---|---|
| forge | evarel-app-forge | evarel-api-forge | พัฒนาและทดลอง (สาขา develop) |
| production | evarel-app | evarel-api | ชุดทางการ (สาขา main) |

ไฟล์ตั้งค่าอยู่ที่ `app/api/wrangler.toml` และ `app/web/wrangler.toml` แยกชุดด้วย `--env forge` หรือ `--env production`

## คำสั่ง

ต้องใช้ Node 20 ขึ้นไป

```
node scripts/test-api.mjs          รันชุดทดสอบ Worker ทั้งหมด (เหมือน npm test)
node scripts/build-web.mjs forge   สร้าง build/web สำหรับชุด forge (ฉีดที่อยู่ API ของชุดนั้น)
python3 tools/plan_check.py        ตรวจโครงสร้างแผนใน docs/plan
```

ก่อน deploy ต้องตั้งตัวแปรสภาพแวดล้อม `CLOUDFLARE_ACCOUNT_ID` และเข้าสู่ระบบ wrangler

## Secrets ที่ Worker API ต้องตั้ง

ตั้งผ่าน `wrangler secret put <ชื่อ> --env <ชุด>` ห้ามใส่ลงไฟล์หรือที่เก็บ

SUPABASE_URL, SUPABASE_SERVICE_KEY, SMTP_USER, SMTP_PASS, SMTP_FROM, GROQ_API_KEY, OPENROUTER_API_KEY, MEMORYLAKE_API_KEY

ตัวแปรที่ไม่ใช่ความลับ (ALLOWED_ORIGIN, REQUIRE_EMAIL_VERIFICATION) อยู่ใน `app/api/wrangler.toml`

## สถานะเทสต์ (บอกตามจริง)

- ชุดทดสอบ Worker (`app/api/src`) ผ่าน 225 ข้อ ไม่ผูกกับเครื่องใด
- เทสต์ใน `tests/` ฝั่งแอปยังฝัง path เต็มของเครื่องผู้พัฒนาเดิมและยังชี้แอปรุ่นเก่า ไม่ใช่ `app/web` จึงยังใช้ตรวจแอปปัจจุบันไม่ได้ รอเขียนชุดใหม่ที่ชี้ `app/web`
- ยังไม่ได้ deploy Worker ชุด forge และชุดทางการ ไฟล์ตั้งค่าผ่านการจำลอง deploy แล้วเท่านั้น

## ลำดับพัฒนา

แผนหลักอยู่ที่ `docs/plan/MASTER-PLAN.md` แก้ไฟล์รายขั้นใน `docs/plan/steps/` กับแถวเดียวในแผนหลักเมื่อแผนเปลี่ยน
