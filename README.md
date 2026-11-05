# Ordivel

PWA ส่วนตัวสำหรับจัดการชีวิต (งาน กิจวัตร ปฏิทิน ผู้ช่วย AI) ใช้งานบน Android เป้าหมายพร้อมใช้งานภายใน 2 พ.ย. 2026
ใช้ Cloudflare (Workers และ Static Assets) กับ Supabase ภายใต้งบ 0 บาท

สาขา `develop` คือสาขาพัฒนา ยังไม่ใช่ชุดสาธารณะ สาขา `main` คือชุดทางการ

## โครงสร้าง

จัดใหม่ตามคำสั่ง Master 31 ต.ค. 2026 (F7): เว็บคือเว็บ แอปคือแอป ตรรกะแชร์อยู่ที่เดียว ของเก่าเก็บใน archive
(จัดระเบียบเอกสาร/เทสต์/เครื่องมือรอบใหม่ 5 พ.ย. 2026: เอกสารรวมที่ docs/ เทสต์แยกกลุ่ม equiv/manual/history)

```
AGENTS.md           กฎเหล็กสำหรับผู้พัฒนาและ AI agent (อ่านก่อนแตะโค้ดเสมอ)
README.md           ไฟล์นี้ (แผนที่รีโป + วิธี build/deploy)
docs/               เอกสารทั้งหมดของระบบ
  PRD.md              ขอบเขตผลิตภัณฑ์ + เกณฑ์ตรวจรับ (คงที่ ห้ามแก้ตามใจ)
  DESIGN.md           ระบบดีไซน์ (โทเคน สี รัศมี ท่าที่ห้าม)
  SITEMAP.md / USER-FLOW.md   หน้าจอและลำดับใช้งานที่ต้องคงไว้
  ARCHITECTURE.md / DATA-MODEL.md   ชั้นโค้ดและรูปแบบข้อมูล
  UPDATE-NOTES.md     บันทึกการปรับหน้าตาแอปยุคเดโม (ประวัติศาสตร์)
  plan/               แผนหลัก (MASTER-PLAN.md) + แผนรายขั้น (steps/, factory-steps/) + ภาพฐาน
  versioning.md       กติกาเลขรุ่น
  adr/                บันทึกการตัดสินใจทางเทคนิค
  assessment/         การประเมินโรงงาน (FACTORY-SCORECARD.md)
  ops/                คู่มือปฏิบัติการ (เช่น DOMAIN-MIGRATION.md)
  system-map.md / system-logic.md / FACTORY-MAP.md   แผนที่ระบบและโรงงาน (FACTORY-MAP ห้ามแก้มือ)
web/                ทุกอย่างของฝั่งเว็บ (PWA)
  classic/          รันไทม์ที่เสิร์ฟจริง + ผลคอมไพล์ที่ commit ไว้ (index.html, sw.js, js/, styles/, vendor/, icons/)
  next/             Next.js (TypeScript + React) เส้นทางเสิร์ฟจริง บิลด์ออก build/web
  shell/            เปลือก Next ขั้น S3 และที่อยู่ node_modules ของ react/react-dom ที่สคริปต์บิลด์อ้าง
  src/              ซอร์สของเว็บ: engine/ (เครื่องยนต์ 27 โมดูล) และ react/ (รันไทม์)
  pages/ shared/ data/ styles/   โซนโรงงาน: กล่องหน้า ชิ้นร่วม ถาดข้อมูล แม่พิมพ์กลาง
app/                สงวนไว้สำหรับแอปมือถือ (React Native ตามขั้น S7) ยังไม่มีโค้ด มีแต่ README
core/               ตรรกะบริสุทธิ์ที่เว็บและแอปใช้ร่วม (TypeScript 23 ไฟล์)
backend/            หลังบ้านใช้ร่วมทุกแพลตฟอร์ม
  api/              Cloudflare Worker (TypeScript) บัญชี งาน/กิจวัตร AI โควตา ป้องกันการใช้ผิด
    src/              โค้ดและชุดทดสอบของ Worker
    prototype/        ต้นแบบ Push รอบแรก เก็บไว้เป็นต้นแบบอ้างอิงจนกว่า S2 จะย้ายเข้า src
  db/               สคริปต์ฐานข้อมูล Supabase (schema และ migrations ตามลำดับเลข)
  edge/             Edge Function แจ้งเตือน (pg_cron ยิงทุกนาที)
tests/              ชุดตรวจ แยกกลุ่มตาม tests/README.md (CI เฝ้าที่ราก, equiv/ = เทียบเบราว์เซอร์, manual/ = รันมือ, history/ = ยุคเก่า)
tools/              เครื่องมือ: factory/ (ตรวจกติกาโรงงาน) typecheck plan_check dep_* และ migration/ (เครื่องมือรีแฟกเตอร์ยุคก่อน)
scripts/            สคริปต์ build, deploy, ตรวจโน้ตรุ่น, สร้างไฟล์อ้างอิงเทียบ
brand/              ชุดล็อโก้ทางการ (ต้นฉบับนักออกแบบ ห้ามแก้ไข ดู brand/README.md)
archive/            ของเก่าที่ย้ายเก็บไม่ลบ: app-v13/ (เดโมฐาน S0) design/ (เดโมออกแบบของเจ้าของ)
releases/           ข้อมูลรุ่นปัจจุบัน (current.json เป็นแหล่งความจริงเดียว)
types/              ชนิด TS กลาง (dom, globals, st)
```

## ชุดสภาพแวดล้อม

| ชุด | ส่วนหน้า | API | ใช้เมื่อ |
|---|---|---|---|
| forge | ordivel-app-forge | ordivel-api-forge | พัฒนาและทดลอง (สาขา develop) |
| production | ordivel-app | ordivel-api | ชุดทางการ (สาขา main) |

ไฟล์ตั้งค่าอยู่ที่ `backend/api/wrangler.toml` และ `web/classic/wrangler.toml` แยกชุดด้วย `--env forge` หรือ `--env production`

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

ตัวแปรที่ไม่ใช่ความลับ (ALLOWED_ORIGIN, REQUIRE_EMAIL_VERIFICATION) อยู่ใน `backend/api/wrangler.toml`

## สถานะเทสต์ (บอกตามจริง)

- ชุดทดสอบ Worker (`backend/api/src`) ผ่าน 225 ข้อ ไม่ผูกกับเครื่องใด (F7 แก้การผูก esbuild กับ /tmp/evarel-deploy ของเครื่องเก่า จึงรันได้ทุกเครื่อง)
- เทสต์ฝั่งแอปใน `tests/` อ่านแอปจาก `web/classic` ทั้งชุดแล้ว (F7 ตัดการผูกกับ /tmp/evarel-repo) ประตูภาพ 32 ฉากใช้ .agents/.env (SUPABASE_SERVICE_KEY) และ chromium ที่ pin ไว้ (ดู tests/README และหัวไฟล์ทดสอบ)
- ยังไม่ได้ deploy Worker ชุดทางการ ไฟล์ตั้งค่าผ่านการจำลอง deploy แล้วเท่านั้น ส่วนเว็บและ Worker ชุด forge deploy อัตโนมัติทุก push ที่ develop

## ลำดับพัฒนา

แผนหลักอยู่ที่ `docs/plan/MASTER-PLAN.md` แก้ไฟล์รายขั้นใน `docs/plan/steps/` กับแถวเดียวในแผนหลักเมื่อแผนเปลี่ยน
