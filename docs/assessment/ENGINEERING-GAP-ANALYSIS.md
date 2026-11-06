# ชำแหละวิศวกรรม Ordivel — บันทึกผลตรวจ (Engineering Gap Analysis)

| Field | Value |
|---|---|
| Document | `ENGINEERING-GAP-ANALYSIS.md` — ผลการชำแหละวิศวกรรมทั้งระบบ เทียบกับมาตรฐานแพลตฟอร์มขนาดใหญ่ |
| Scope | backend/api (Worker) · backend/edge · backend/db · web/ (PWA) · CI/CD · observability · AI system |
| Method | ตรวจอ่านโค้ดจริงทุกไฟล์หลัก (อ้าง file:line) + วิจัยแนวปฏิบัติอุตสาหกรรม (OWASP Secure Headers, API gateway patterns, structured logging, distributed rate limiting) |
| Date | 2026-11-06 |
| Companion | `docs/plan/PLATFORM-UPGRADE-PLAN.md` — แผนการทำงานแบ่งระยะที่อ้างเอกสารนี้ |

---

## 0. บทสรุปผู้บริหาร

ระบบปัจจุบัน **มีวินัยวิศวกรรมสูงกว่าโปรเจกต์ทั่วไปในระดับเดียวกันอย่างชัดเจน** — rate limiting แบบ atomic ใน Postgres พร้อมเหตุผล fail-open/fail-closed บันทึกไว้ใน ADR, JWT verify เข้มงวด (pin ES256 + JWKS), RLS ทุกตาราง, AI เขียนข้อมูลได้ผ่าน proposal-gate เท่านั้น, ระบบแจ้งเตือนมี exactly-once claim protocol, ชุดทดสอบ ~225 เคส

แต่เมื่อเทียบกับ "แพลตฟอร์มที่ออกแบบให้รองรับผู้ใช้จำนวนมาก" ตามที่ตั้งเป้า ยังมีช่องว่างเป็นระบบใน 4 โดเมนใหญ่:

1. **แนวป้องกันด้านความปลอดภัยของเว็บ (Web Security Perimeter)** — ไม่มี security headers / CSP แม้แต่จุดเดียว ทั้งที่แอปเก็บ refresh token ใน localStorage และใช้ innerHTML templating เป็นหลัก (XSS จุดเดียว = บัญชีถูกยึดทั้งบัญชี)
2. **ความสามารถในการสังเกต (Observability)** — ไม่มี request ID, ไม่มี log แบบมีโครงสร้าง, ไม่มี metrics/alerting, ฝั่ง production ไม่ได้เปิด observability, ไม่มี error reporting จากหน้าเว็บ — เวลาพังจริงจะมองไม่เห็นอะไรเลย
3. **การคุ้มครองของเกตเวย์ (Gateway Coverage)** — rate limit ครอบเฉพาะ auth เท่านั้น; `/api/items`, `/api/ai/chat` (นอกโควตา), `/api/ai/memory`, `/api/push/subscribe` ไม่มีขอบเขตการเรียก; ไม่มี API versioning; ไม่มี error envelope เดียวกันทั้งระบบ
4. **ความทนทานของระบบ (Reliability of the Data Plane)** — fetch ไม่มี timeout (ค้าง skeleton ตลอดไป), อ่านรายการไม่มี limit (เสี่ยงถูกตัดเงียบ), เขียน item+log ไม่ atomic, Promise.all ล้มบางส่วนแล้วย้อนทั้งก้อนทั้งที่เซิร์ฟเวอร์บันทึกไปแล้วครึ่งหนึ่ง, PWA เปิดออฟไลน์ได้แต่ไม่มีข้อมูล

พร้อมนี้พบ **บั๊กการทำงานจริง 1 ตัว**: ระบบ AI มองไม่เห็นสถานะ "ทำแล้ว/ยังไม่ทำ" ของรายการ (backend ส่ง `log: {}` ว่างเสมอ — `backend/api/src/systems/ai/routes.ts:49`) ทำให้คำตอบ AI เกี่ยวกับความคืบหน้าผิดเสมอ

---

## 1. สิ่งที่มีอยู่แล้ว (ให้เครดิตตามจริง — ห้ามทำซ้ำ)

| โดเมน | สิ่งที่มี | หลักฐาน |
|---|---|---|
| Rate limiting | RPC `rl_hit` fixed-window atomic + กฎ 9 ชุด, login ใช้ key IP+hash(email) กัน lockout เหยื่อ, 429 มี Retry-After, gate อ่าน body ภายใต้ cap 2KB | `backend/api/src/shared/ratelimit.ts`, migrations-003, ADR 0003 |
| Auth | Supabase ES256 JWT, verify ในเครื่อง (pin algorithm, exp/iss/aud/sub, JWKS cache 10 นาที), OTP 6 หลักเก็บแต่ hash+salt, atomic issue/verify/lock, anti-enumeration บน forgot/resend, ลบบัญชีต้อง re-auth รหัสผ่าน | `shared/auth.ts`, `systems/auth/*`, migrations-004 |
| ข้อมูล | RLS ทุกตาราง (`auth.uid()=user_id`), RPC เป็น security definer + revoke จาก public/anon/authenticated, trigger ใน DB บังคับ 5 อุปกรณ์/ผู้ใช้ (ปิด TOCTOU) | `backend/db/schema.sql:79-95`, migrations-005 |
| AI | โควตา reserve/settle แบบ atomic (migration-002), failover Groq→OpenRouter มีเทสต์, เครื่องมือทุกตัว validate ในโค้ด, เขียนได้เฉพาะผ่าน proposal + ผู้ใช้ยืนยัน, กรองข้อมูลอ่อนไหวก่อนจำ, memory แยก actor ต่อผู้ใช้ | `systems/ai/*`, ADR 0002 |
| แจ้งเตือน | exactly-once ต่ออุปกรณ์ผ่าน notification_log claim (409=ข้าม), แยกประเภท error ถาวร/ชั่วคราว, SSRF allow-list ปลายทาง push, edge function ตรวจ secret แบบ constant-time | `systems/notify/scheduler.ts`, `push-routes.ts:14-25` |
| หน้าเว็บ | SW versioning ผูก content hash (`?v=`), network-first สำหรับ navigation, escape-by-construction ใน markdown renderer, จำกัด URL ลิงก์, realtime sync ผ่าน WebSocket + fingerprint + backoff | `web/runtime/sw.js`, `core/markdown.ts`, `22-views__live-sync.ts` |
| กระบวนการ | CI มี gate โน้ตรุ่น/compiled-drift/equiv 6 ชุด/build integrity/factory rules, deploy แยก forge/production พร้อมคำสั่งยืนยัน | `.github/workflows/web.yml`, `scripts/deploy.mjs` |

---

## 2. ช่องว่างตามโดเมน (พร้อมหลักฐานและเป้าหมาย)

### 2.1 Web Security Perimeter — ระดับแดง (P0)

| # | ช่องว่าง | หลักฐาน | มาตรฐานที่อ้าง |
|---|---|---|---|
| S1 | **ไม่มี CSP/HSTS/X-Content-Type-Options/Referrer-Policy/Permissions-Policy ทั้งระบบ** ทั้ง Worker API, static assets Worker, Next export | grep ทั้ง repo ไม่พบ; `web/next/next.config.mjs` ไม่ตั้ง headers; ไม่มีไฟล์ `_headers` | OWASP Secure Headers; CSP เป็นแนวป้องกันชั้นที่สองของ XSS โดยตรง |
| S2 | **Token อยู่ใน localStorage** (access+refresh+OAuth park) — XSS จุดเดียว = ยึดบัญชีถาวร | `core/authclient.ts:10,39` | ทางออกระยะสั้น: CSP เข้ม + ทางออกระยะยาว: httpOnly cookie (แผนเดิมบันทึกไว้ที่ `docs/backend-plan/07-auth-plan.md:52`) |
| S3 | **ไม่มี error boundary ใน router** — exception ใดๆ หลุดออกไปเป็น 500 ไม่มี CORS headers → เบราว์เซอร์เห็น opaque error, แอปแยก network กับ server failure ไม่ได้ | `backend/api/src/router.ts:20-108` ไม่มี try/catch รอบ dispatch | มาตรฐาน API gateway: error envelope เดียว + ไม่รั่วรายละเอียดภายใน |
| S4 | **รายละเอียดภายในรั่วใน error**: 401 ส่ง `err.message` ดิบๆ (มี Supabase URL, kid), 5xx ฝัง upstream statusText | `shared/auth.ts:157-158,176`; `items/routes.ts:81,89,224,245,290` | OWASP Error Handling |
| S5 | **JWKS fetch ไม่มี timeout + kid-miss ไม่ refresh** — Supabase หมุนคีย์ = 401 ทั้งระบบนานสูงสุด 10 นาที | `shared/auth.ts:93` (ไม่มี AbortController), `:174-177` (throw แทน refetch) | มาตรฐาน JWKS client ทุกตัว (jose ฯลฯ) มี kid-miss refetch |
| S6 | เซสชันไม่มีการเพิกถอนฝั่งเซิร์ฟเวอร์ — โทเค็นที่ถูกขโมยรอดการเปลี่ยนรหัสผ่าน, ไม่มีรายการอุปกรณ์/logout ทุกเครื่อง | สถาปัตยกรรมปัจจุบัน (client-side logout) | Session management มาตรฐาน (logout-all, rotation on password change) |

### 2.2 Observability — ระดับแดง (P0-P1)

| # | ช่องว่าง | หลักฐาน | มาตรฐานที่อ้าง |
|---|---|---|---|
| O1 | ไม่มี request ID / correlation ID ใดๆ; ไม่มี access log ต่อ request | ไม่พบใน router.ts | Structured logging: ทุก log line ต้องมี correlation ID ที่แพร่ผ่านทั้ง chain |
| O2 | ไม่มี metrics (429 rate, LLM latency, failover ความถี่, push success), ไม่มี dashboard, ไม่มี alerting (ไม่มีใครเฝ้า `/api/health`) | ทั้งระบบ | SRE basics: SLI/SLO + alert |
| O3 | **production ไม่ได้เปิด observability** (แค่ forge เปิด) + คอมเมนต์กังวลราคา Cloudflare ธ.ค. 2026 | `backend/api/wrangler.toml:19-21` vs `:26-30` | |
| O4 | หน้าเว็บไม่มี error reporting — `window.onerror`/`unhandledrejection` ไม่มี sink, ทุกอย่างจบใน console.warn | grep ไม่พบ; `boot.ts:78` โหลดโมดูลล้ม = warn แล้วตายเงียบ | Frontend telemetry ขั้นต่ำ |
| O5 | `/api/health` ตื้น (ยิง rl_hit อย่างเดียว) + **เป็น write amplification โดยไม่มี rate limit** (INSERT+UPDATE ต่อ request จากคนแปลกหน้าได้ไม่จำกัด) | `router.ts:37`, `ratelimit.ts:64-78` | Health check ต้องอ่านถูก/ถูกเรียกถี่ไม่ลง DB |

### 2.3 Gateway Coverage — ระดับเหลือง (P1)

| # | ช่องว่าง | หลักฐาน | มาตรฐานที่อ้าง |
|---|---|---|---|
| G1 | **Rate limit ไม่ครอบ**: `GET/PUT/DELETE /api/items`, `/api/logs`, `POST /api/ai/chat` (นอกโควตา AI), `POST /api/ai/memory` (เขียนไปบริการภายนอก!), `POST /api/push/subscribe` — ผู้ใช้ที่ล็อกอินแล้วยิงได้ไม่จำกัด | กฎใน `ratelimit.ts:8-17` มีแค่ auth/refresh/check-email/quota | Gateway ต้องมี per-user rate ทุก path ที่แพง (DB subrequest / external call) |
| G2 | ไม่มี API versioning (`/api/v1/...`) — เปลี่ยน contract = breaking ทันที | router.ts | `/v1` + deprecation policy |
| G3 | Error envelope ไม่เป็นเอกภาพ: `{error}` vs `{code}` ผสมกัน | items vs auth routes | เอกภาพ `{code, message, retry?}` + สถานะไทยฝั่ง client |
| G4 | ไม่มี concurrency/backpressure — ไม่จำกัด in-flight ต่อผู้ใช้, LLM call ไม่มีคิว | สถาปัตยกรรมปัจจุบัน | Load shedding ที่ edge |
| G5 | Timeout ไม่ครบชุด: items/ai data fetch, JWKS ไม่มี AbortController | `items/routes.ts:79,87`, `ai/routes.ts:44`, `shared/auth.ts:93` | ทุก upstream call ต้องมี deadline |

### 2.4 Data Plane Reliability — ระดับเหลือง-แดง (P1-P2)

| # | ช่องว่าง | หลักฐาน | ผลกระทบ |
|---|---|---|---|
| D1 | **AI มองไม่เห็น completion** — ส่ง `log: {}` เปล่าเสมอ | `ai/routes.ts:49` → `tools.ts:170` อ่านได้แต่ 0 | คำตอบ AI ผิดเกี่ยวกับความคืบหน้าผู้ใช้ทุกครั้ง (บั๊กของจริง) |
| D2 | **อ่านไม่จำกัด limit**: `GET /items` `select=*` ไม่มี limit; PostgREST max-rows (default 1000) ตัดเงียบๆ | `items/routes.ts:78,86`, `routes.ts:316-318` | ผู้ใช้ระยะยาว sync ข้อมูลไม่ครบโดยไม่รู้ตัว |
| D3 | **เขียน item+log ไม่ atomic** — 2 REST calls ต่อเนื่อง ล้มกลางทาง = item บันทึกแล้ว log หาย | `items/routes.ts:214-247` | ข้อมูลเพี้ยนถาวรเงียบๆ |
| D4 | **Promise.all ล้มบางส่วน → ย้อนทั้งก้อน** ทั้งที่เซิร์ฟเวอร์รับไปแล้ว N−1 รายการ แล้วบอกผู้ใช้ว่า "บันทึกไม่สำเร็จ" | `core/authclient.ts:83` + `08-core__undo.ts:8,13` | UX โกหกผู้ใช้ + สถานะคลาดชั่วคราว |
| D5 | **ไม่มี timeout บน data plane** — `SupaCore.raw`/`SupaAdapter.call` fetch เปล่า | `core/authclient.ts:15,81` | GET /items ค้าง = skeleton ค้างตลอดไป |
| D6 | **PWA ออฟไลน์ไม่มีข้อมูล** — เปลือกออฟไลน์ได้ แต่ S.items ไม่เคย cache | สถาปัตยกรรม store ปัจจุบัน | แอป habit tracker ที่เปิดที่ยิม (ไม่มีเน็ต) ใช้ไม่ได้เลย — ช่องว่างระดับ product |
| D7 | Conflict = last-write-wins ทั้ง item, ไม่มี version/updated_at; fingerprint sync ครอบเฉพาะ field ที่ hardcode | `authclient.ts:83`, `22-views__live-sync.ts:6` | สองเครื่องแก้ต่าง field = ข้อมูลหายข้างเดียวเงียบๆ |
| D8 | แจ้งเตือนเพดานต่ำ: Worker path ส่งได้ 2 ครั้ง/นาที (CPU 10ms), Edge path ไม่เคยวัด; กระจุกเวลา 08:00 เกินหน้าต่าง 5 นาทีแล้ว**ตัดทิ้ง** | `scheduler.ts:6-8`, `reminders.ts:14,55` | การแจ้งเตือนหลักของ product ไม่น่าเชื่อถือเมื่อผู้ใช้เพิ่ม |
| D9 | Scheduler N+1 รายเดือนละ... ทุกนาที: subscriptions ไม่แบ่งหน้า + items ต่อผู้ใช้ทีละคน | `scheduler.ts:45,57` | DB chatter โตเชิงเส้น |
| D10 | ไม่มี migration tooling (คัดลอกมือผ่าน SQL Editor, ไม่มีตารางเวอร์ชัน, CI ไม่ตรวจ schema ตรงของจริง), ไม่มีแผนสำรอง/กู้คืน, schema ตาย (`chats`/`messages`) | `backend/db/` headers, migrations-007 note 3 | ความเสี่ยงปฏิบัติการระยะยาว |

### 2.5 AI Engineering — ระดับเหลือง (P1-P2)

| # | ช่องว่าง | หลักฐาน | มาตรฐานที่อ้าง |
|---|---|---|---|
| A1 | ไม่มี streaming — ตอบเป็นก้อนเดียว, client กด AbortController 45 วินาที + ปลอมพิมพ์ | `ai/routes.ts`, `core/ailive.ts:12-13` | SSE streaming เป็นมาตรฐาน UX ของ assistant ทุกตัว |
| A2 | ประวัติที่ client ส่งมาเชื่อ role แต่ไม่ยืนยันความจริง (ปลอม assistant turn ได้) — ลดความเสี่ยงด้วย proposal-gate แล้วแต่ช่องยังเปิด | `ai/routes.ts:26-28` | Server-authoritative history |
| A3 | ไม่มี output safety layer (moderation/กรองผลลัพธ์ฝั่งเซิร์ฟเวอร์) — พึ่ง escape ฝั่ง client ทั้งหมด | สถาปัตยกรรมปัจจุบัน | Defense in depth |
| A4 | `AI_DEBUG` พิมพ์ข้อมูลผู้ใช้ดิบๆ — พึ่งวินัยมนุษย์ไม่ให้เปิดบน production | `agent.ts:71` | Enforce ในโค้ด (เช่น ปิดใน env production) |
| A5 | ไม่มี eval harness สำหรับเปลี่ยน prompt/model (ชุดเคส golden ภาษาไทย) | — | Regression ของพฤติกรรม AI ตรวจไม่ได้ |
| A6 | โควตานับ call ไม่นับ fan-out (3 รอบ × 4 เครื่องมือ = 1 call); refund บน error path ทิ้ง token ที่ใช้ไปแล้ว | `agent.ts:57-60`, `ai/routes.ts:56-59` | ปรับให้สะท้อนต้นทุนจริง |

### 2.6 กระบวนการ (CI/CD) — ระดับแดง (P0 เพราะปิดเกตที่มีอยู่ให้ทำงาน)

| # | ช่องว่าง | ผลกระทบ |
|---|---|---|
| C1 | **CI ไม่รันเทสต์ backend เลย** (ไม่มี npm test / test:notify / Deno edge tests / db tests ใน web.yml) | ชุดทดสอบ 225 เคสมีอยู่จริงแต่ไม่มีใครบังคับรัน — ถอยหลังเงียบๆ ได้ |
| C2 | **API Worker ไม่มี CI deploy** (deploy มือเท่านั้น) | โค้ดใน repo กับโค้ดที่รันจริงเฉี่ยวกันได้ |
| C3 | ไม่มี dependency audit (npm audit / osv) และ secret scanning (gitleaks) ใน CI | มาตรฐาน supply-chain พื้นฐาน |
| C4 | ไฟล์คอมไพล์ `backend/api/src/shared/auth.js` ไม่มีตัว generate (compile-ts ไม่รวม backend) — เทสต์ทดสอบสำเนาที่ล้าสมัยได้ | `auth.test.mjs:3` import สำเนา |
| C5 | ผล typecheck นอก baseline 107 จุด (ล้าสมัยมาแต่ก่อนงาน restructure) — เกตนี้ตายแล้วโดยพฤตินัย | `tools/typecheck.baseline.json` |

### 2. ความเสี่ยงเล็กที่พบ (แก้ตามโอกาส)

- theme-color ไม่ตรงกันสามจุด: `web/runtime/index.html:6` (#4F46E5) vs `manifest.webmanifest:12` + `layout.tsx:19` (#181142)
- ข้อความ SW `update-ready` ไม่มีผู้ฟังแล้ว (boot.js ปัจจุบันไม่มี listener) — ฟีเจอร์ตายกับเอกสารที่ยังอ้างถึง
- `EVAREL_API=''` ใน classic index.html ทำให้เปลือก classic บูตไม่ได้ (dead artifact ใน serve path เก่า)
- `tests/manual/xss-guard.mjs:7` ชี้ absolute path เก่า — รันไม่ได้ตามที่เขียน
- คอมเมนต์ `LIVE_MS` ใน `22-views__live-sync.ts:3` อ้าง polling ที่ไม่มีแล้ว
- ADR 0002 บอก `REQUIRE_EMAIL_VERIFICATION` ปิด แต่ wrangler.toml เปิดจริงทั้งสอง env — เอกสารล้าสมัย
- `popItemsHTML` (`core/popover.ts:13`) interpolate label โดยไม่ escape ที่ sink — ปลอดภัยเพราะ caller ทุกตัวปัจจุบัน escape เอง (convention ไม่ใช่ structural)

---

## 3. หลักการออกแบบเป้าหมาย (อ้างมาตรฐานอุตสาหกรรม)

1. **Zero-trust perimeter**: ทุก response ผ่านชุด security headers เดียวกัน; CSP เข้มแบบ hash/nonce สำหรับ inline script ที่จำเป็น (boot script แรกของหน้า)
2. **Gateway-in-a-Worker**: router กลาง = จุดเดียวที่ทำ request ID → auth → rate limit (ต่อ path + ต่อผู้ใช้) → dispatch → error envelope → log ปิดท้าย; ทุก upstream call มี deadline
3. **สังเกตได้ตั้งแต่วันแรก**: log JSON บรรทัดเดียวต่อ request (request_id, route, status, duration, user?, ratelimited?) — งูพอกิน: ไม่เก็บ PII, ปิดได้ตาม env, ป้อน Analytics Engine เมื่อพร้อม
4. **ข้อมูลถูกต้องก่อนความเร็ว**: อ่านมี limit + แจ้ง truncation, เขียนหลายตารางผ่าน RPC เดียว (atomic), conflict มี version
5. **ออฟไลน์คือ first-class**: cache ข้อมูลรอบสุดท้าย (CacheStorage/IndexedDB) + เขียนเข้าคิวเมื่อออฟไลน์ + sync ตอนกลับมา
6. **AI แบบมีวินัย**: streaming SSE, history ฝั่งเซิร์ฟเวอร์เป็นความจริง, eval set ภาษาไทยเข้า CI, debug log ปิดบังคับบน production
7. **เกตต้องรันจริง**: backend tests + API deploy เข้า CI, schema มี version table, typecheck baseline รีเซ็ตเป็นศูนย์ใหม่

## 4. อ้างอิงมาตรฐาน

- OWASP Secure Headers Project — https://owasp.org/projects/secure-headers-project
- OWASP CSP Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- Structured logging + correlation IDs — https://www.grepr.ai/blog/structured-logging-best-practices, https://www.honeycomb.io/blog/engineers-checklist-logging-best-practices
- API gateway patterns & distributed rate limiting (atomicity, fail-open vs fail-closed, X-RateLimit headers) — https://blog.openreplay.com/api-gateway-patterns-and-practices, https://apiscout.dev/guides/best-rate-limiting-api-gateway-2026
- Cloudflare Workers rate limiting binding + observability — https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit
