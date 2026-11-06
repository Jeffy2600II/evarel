# แผนอัปเกรดวิศวกรรมสู่ระดับแพลตฟอร์ม (PLATFORM-UPGRADE-PLAN)

| Field | Value |
|---|---|
| Document | `PLATFORM-UPGRADE-PLAN.md`: ลำดับงานอัปเกรดวิศวกรรม อ้างช่องว่างจาก `docs/assessment/ENGINEERING-GAP-ANALYSIS.md` (รหัส S/O/G/D/A/C ในแผนนี้อ้างถึงตารางในเอกสารนั้น) |
| เป้าหมายใหญ่ | ผู้ใช้ใช้งานเหมือนเดิมทุกประการ แต่โครงสร้างใต้ผิวเป็นมาตรฐานแพลตฟอร์มรองรับการโต ตามคำสั่ง Master 6 พ.ย. 2026 |
| กติกา | ทุกระยะจบ = เกตทั้งหมดเขียว + deploy forge + โน้ตรุ่น (ถ้ากระทบผู้ใช้) + commit/push | 

---

## หลักการจัดลำดับ

1. เกตที่ "มีอยู่แต่ไม่ได้รัน" (C1, C5) ก่อนของใหม่ทั้งหมด: มิฉะนั้นงานใหม่ไม่มีตาข่าย
2. ของที่ "พังเงียบๆ ได้วันนี้" (S3, S5, G1, G5, O5, D1) ก่อนของที่ "จำเป็นเมื่อโต"
3. ทุกงานต้องมีเกตตรวจรับทดสอบได้ใน CI หรือด้วยคำสั่งเดียว: งานที่ตรวจไม่ได้ถือว่ายังไม่เสร็จ

---

## ระยะ 0: ปิดหน้าต่างที่พังได้ทันที (P0)

| งาน | รหัสช่องว่าง | สิ่งที่ทำ | เกตตรวจรับ |
|---|---|---|---|
| 0.1 Error boundary + request ID + error envelope เดียว | S3, S4, O1 | router.ts: ห่อ dispatch ด้วย try/catch → ตอบ `{code:'internal', request_id}` พร้อม CORS เสมอ; สร้าง `request_id` (crypto random 12 หลัก) ต่อ request, ส่งกลับ header `X-Request-Id`, ไหลเข้า log; 401/5xx เลิกส่ง `err.message` ดิบ ใช้ code มาตรฐาน (`auth_invalid` ฯลฯ) | เทสต์ใหม่: ยิง handler ที่ throw ต้องได้ 500 + CORS + X-Request-Id; เทสต์เดิม 225 เคสผ่านครบ |
| 0.2 Rate limit ครอบทุก path ที่แพง | G1 | เพิ่มกฎ: `items_write_user` 120/นาที, `items_read_user` 240/นาที, `ai_chat_user` 30/นาที (ต่อเนื่องกับโควตาประจำวัน), `ai_memory_user` 20/นาที, `push_write_user` 20/นาที: ทุกชุดใช้ user_id เป็น key (JWT แล้ว) | เทสต์: เกิน limit ได้ 429 + Retry-After; `/api/health` รายงาน rate_limit: active |
| 0.3 Timeout ครอบทุก upstream fetch | G5 | `shared/auth.ts` JWKS ใส่ AbortController 5 วินาที; items/ai data fetch ใส่ deadline 8 วินาที (ค่าเดียวกันเป็นค่าคงที่ของระบบ) | code review + เทสต์ unit จับ fetch ที่ค้าง (mock ไม่ตอบ) ต้องได้ error ตาม deadline |
| 0.4 JWKS kid-miss refetch | S5 | เมื่อ `kid` ไม่เจอใน cache → force refetch ครั้งเดียวก่อน throw (สลายหน้าต่าง 10 นาทีเหลือ ~1 request) | เทสต์: mock JWKS รอบแรกไม่มี kid, รอบสองมี → verify ผ่าน |
| 0.5 Health ไม่เขียน DB | O5 | ยกเลิก `rl_hit('health')` ต่อ request; สลับเป็นอ่านตัวแปร in-isolate + ยิง rl_hit แบบสุ่ม 1/50 (แบบเดียวกับ cleanup) หรือใช้ Cache API กันความถี่ | `/api/health` ตอบ < 10ms และไม่เพิ่ม write ต่อ request (ตรวจจากเทสต์ unit) |
| 0.6 Backend tests เข้า CI + API deploy เข้า CI | C1, C2 | web.yml เพิ่ม job `backend`: npm test + test:notify + (deno test เมื่อ runner มี) + `wrangler deploy` forge ด้วย CF_API_TOKEN; คู่ขนาน job `check` ปัจจุบัน | push แล้ว job เขียวทั้งสอง; Worker forge รุ่นใหม่ตอบ `/api/health` |
| 0.7 แก้ AI ตาบอด completion | D1 | `ai/routes.ts:49` ดึง item_logs จริงมาใส่ `log` (ขอบเขต: 90 วันล่าสุด พอสำหรับบริบท agent) | เทสต์ unit: items มี log → tool `item_query` ตอบ done ตรงค่าจริง; โน้ตรุ่น "improve" |
| 0.8 รีเซ็ต typecheck baseline | C5 | อัปเดต `tools/typecheck.baseline.json` ให้ตรงสถานะปัจจุบัน (107 จุดที่ยอมรับ) แล้วเพิ่มเกต "ไม่เพิ่ม" เข้า CI | baseline เท่ากันสองรอบรันติด; CI ตรวจ |

## ระยะ 1: Security perimeter (P1)

| งาน | รหัส | สิ่งที่ทำ | เกตตรวจรับ |
|---|---|---|---|
| 1.1 Security headers ทุก response ของ API Worker | S1 | `jsonResponse` กลาง + router ปิดท้ายด้วย: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` (มีแล้วบาง path ให้เป็นทุก path), `X-Frame-Options: DENY` | เทสต์ header ครบทุก route |
| 1.2 Security headers ของ static site | S1 | ไฟล์ `_headers` สำหรับ assets Worker: nosniff, Referrer-Policy, Permissions-Policy (vibrate=self ฯลฯ), HSTS เมื่อโดเมนจริงมี HTTPS เต็ม | ตรวจ header จาก URL forge จริง |
| 1.3 CSP แบบ stepwise | S1, S2 | รอบแรก: `Content-Security-Policy-Report-Only` (default-src 'self'; script-src 'self' + hash ของ inline boot script; connect-src โดเมน API/Supabase; img-src 'self' data:) รอบสอง: enforce หลังผ่านการใช้งานจริง 7 วันไม่มี report | ไม่มี violation บน forge 7 วัน (เก็บ report ผ่าน log) |
| 1.4 Supply chain ใน CI | C3 | เพิ่ม job: `npm audit --omit=dev` (fail เฉพาะ high+) + gitleaks scan repo | job เขียว; แสดงผล audit ใน summary |
| 1.5 ปิดช่อง AI_DEBUG บน production | A4 | agent.ts อ่าน flag ผ่าน env เท่านั้น + เทสต์ยืนยันว่า env production ไม่ได้ตั้ง | grep ไม่พบการตั้ง AI_DEBUG ใน production config |

## ระยะ 2: Observability (P1)

| งาน | รหัส | สิ่งที่ทำ | เกตตรวจรับ |
|---|---|---|---|
| 2.1 Request log บรรทัดเดียว (JSON) | O1 | router ปิดท้าย: `console.log(JSON.stringify({t, request_id, method, path, status, dur_ms, user_id?, rl:?}))`: ไม่มี PII (ไม่มี email/โทเค็น/ชื่อรายการ); เปิด observability ทั้ง forge + production | log เห็นใน dashboard forge; ตรวจฟิลด์ครบด้วยเทสต์ unit |
| 2.2 Frontend error sink | O4 | `window.onerror` + `unhandledrejection` ใน boot แรกของหน้า → POST `/api/client-error` (rate limit 10/นาที/ผู้ใช้, ไม่มี body ข้อมูลผู้ใช้ เก็บแค่ message/stack หั้น 500 ตัวอักษร/เวอร์ชัน) → ไหลเข้า log เดียวกัน 2.1 | เทสต์ e2e: เรียก throw ในหน้า → พบ record |
| 2.3 Metrics พื้นฐาน | O2 | Workers Analytics Engine: นับ request ต่อ route/status + LLM latency + failover count (เพิ่ม data point ใน llm.ts/quota.ts): ชุดเดียวกันทั้งสอง env | SQL สอบถามได้ค่าจาก dashboard |
| 2.4 เฝ้าสุขภาพภายนอก + alert | O2 | cron ภายนอก (GitHub Action ทุก 5 นาที) ยิง `/api/health` ทั้ง forge+production, ล้ม 3 ครั้งติด = เปิด issue อัตโนมัติ | ทดสอบด้วยการหยุด worker ชั่วคราวบน forge |

## ระยะ 3: Data plane ที่ถูกต้องก่อนเร็ว (P1-P2)

| งาน | รหัส | สิ่งที่ทำ | เกตตรวจรับ |
|---|---|---|---|
| 3.1 อ่านมี limit + สัญญา truncation | D2 | `GET /items`/`GET /logs` ส่ง `limit` สูงสุดตามจริง (items 500, logs 4000) + ตอบ `{items, truncated: bool}`; client แสดงสถานะเมื่อ truncated | เทสต์ unit + e2e ผู้ใช้ 1,200 รายการได้ข้อมูลครบ (แบ่งหน้า) |
| 3.2 RPC atomic สำหรับเขียน item+log | D3 | migration-009: `upsert_item_with_logs(payload)` security definer ใช้ตารางเดียวใน transaction เดียว; worker เรียก RPC แทน 2 REST calls | เทสต์ pg: บังคับ log ผิดรูปกลางทาง → item ต้องไม่ถูกบันทึก |
| 3.3 แก้ partial-write revert | D4 | `SupaAdapter.apply` เปลี่ยน Promise.all → allSettled + รายงานต่อรายการ; syncFail ย้อนเฉพาะรายการที่ล้มจริง | เทสต์ browser: mock PUT ล้ม 1 จาก 3 → รายการนั้นเด้งกลับ อีก 2 คงอยู่ |
| 3.4 Timeout บน data plane ฝั่งหน้าเว็บ | D5 | `SupaCore.raw`/`SupaAdapter.call` ใส่ AbortController 10 วินาที + retry 1 ครั้งบน network error | เทสต์ e2e: จำลอง hang ได้ error view "ลองใหม่" แทน skeleton ค้าง |
| 3.5 Offline-first ขั้นที่ 1 | D6 | cache `GET /items` รอบล่าสุดใน CacheStorage (เข้ารหัสกุญแจเดียวกับผู้ใช้ ไม่ก็เก็บเฉพาะเมื่อ origin ปลอดภัย); เปิดออฟไลน์ = โหลดจาก cache + ป้าย "ข้อมูล ณ เวลา X" + ปิดการเขียนพร้อมคิวเขียน (ขั้น 2) | e2e ออฟไลน์: เปิดแอปเห็นรายการ + ป้ายเวลา |
| 3.6 Offline ขั้นที่ 2: คิวเขียน | D6 | syncChanges ตรวจออนไลน์: ออฟไลน์ = เก็บ diff ใน IndexedDB + สถานะ UI "รอส่ง"; กลับมาออนไลน์ = ไล่ส่งตามลำดับ + ตรวจ version ก่อนเขียน | e2e: ติ๊กรายการขณะออฟไลน์ → ปลุกเน็ต → ค่าขึ้นเซิร์ฟเวอร์ |
| 3.7 Version/conflict field | D7 | items เพิ่ม `updated_at` + client ส่ง `if_version` ใน PUT; ชนกัน = 409 + client เสนอ refresh (last-write-wins เฉพาะเมื่อผู้ใช้ยืนยัน) | เทสต์สอง client แก้ต่าง field → ไม่มีข้างไหนหายเงียบๆ |
| 3.8 แจ้งเตือนทนโหลดได้ | D8, D9 | วัด Edge ceiling จริงก่อน (งานวัดล้วน); แล้ว: เพิ่ม MAX_SENDS_PER_RUN ตามที่วัดได้, ยืด WINDOW_MIN 5→15 นาที (ยอมส่งช้าแทนตัดทิ้ง), scheduler ดึง subscriptions แบบมี cursor | ทดสอบ: จำลองผู้ใช้ 50 คนเวลาเดียวกัน ได้รับครบทุกเครื่อง |

## ระยะ 4: AI platform (P2)

| งาน | รหัส | สิ่งที่ทำ | เกตตรวจรับ |
|---|---|---|---|
| 4.1 SSE streaming | A1 | Worker สตรีมคำตอบผ่าน ReadableStream (text/event-stream), client ai-live ปรับเป็นอ่านสตรีมจริง (เลิกปลอมพิมพ์); ยังคง proposal-gate เหมือนเดิม | e2e: เวลาถึงตัวอักษรแรก < 2 วินาที บน forge |
| 4.2 History ฝั่งเซิร์ฟเวอร์ | A2 | เก็บประวัติแชตในตาราง messages (schema มีแล้ว ปัจจุบันเป็น schema ตาย): client ส่งเฉพาะข้อความใหม่, เซิร์ฟเวอร์ประกอบบริบทเอง | ปลอม assistant turn ไม่ส่งผลต่อบริบทอีก (เทสต์) |
| 4.3 Eval harness ภาษาไทย | A5 | ชุดเคส golden 30 เคส (ทักทาย/ถามความคืบหน้า/ขอเพิ่มรายการ/ขอลบ/คำถามนอกเรื่อง/พยายามฉีดคำสั่ง) รันกับ LLM จริงเมื่อ AI_EVAL=1 ใน CI manual dispatch | รายงานผ่าน/ตกต่อเคส พร้อม diff เมื่อเปลี่ยน prompt |
| 4.4 Output guard | A3 | เก็บร่าง (ไล่ตัดอักษรพิเศษ/ความยาว) ก่อนส่งออก + บล็อกรูปแบบที่ฝังโค้ด HTML ดิบ | ชุดเคส injection ไม่รอด |
| 4.5 โควตาสะท้อน fan-out | A6 | นับทุก LLM round เป็น token รวมเมื่อ settle (มีแล้วบางส่วน) + เลิก refund call เมื่อผ่านรอบแรกสำเร็จแล้ว | เทสต์ตัวเลขโควตาตรง usage จริง |

## ระยะ 5: Platform hardening (ตามความพร้อม)

| งาน | รหัส | สิ่งที่ทำ | เกตตรวจรับ |
|---|---|---|---|
| 5.1 API versioning | G2 | เพิ่ม prefix `/api/v1/...` โดย `/api/...` เดิมเป็น alias ตลอดไปสำหรับ client ปัจจุบัน + บันทึกนโยบาย deprecation ใน ADR ใหม่ | เทสต์ route ครบทั้งสองรูป |
| 5.2 Session revocation | S6 | ตาราง `sessions` (user_id, refresh_token_hash, device_label, last_seen) + endpoint ดูรายการ/เพิกถอย + เพิกถอยทั้งหมดเมื่อเปลี่ยนรหัสผ่าน/ลบบัญชี | เพิกถอยแล้ว refresh ต้อง 401 |
| 5.3 Migration tooling + schema ตรวจใน CI | C4, D10 | ใช้ `supabase db` (หรือตาราง `schema_migrations` เขียนเอง) + CI ตรวจว่า git กับ DB ตรงกัน (pg_dump hash); ตัดสินใจเรื่องตารางตาย `chats`/`messages` ตาม 4.2 | CI job `schema` เขียว; ลืมย้าย DB = เกตแดง |
| 5.4 httpOnly cookie session (ตัดสินใจใหม่) | S2 | ADR ใหม่เทียบต้นทุน/ประโยชน์: httpOnly cookie + CSRF token vs CSP เข้ม + token สั้นอายุใน localStorage: ตัดสินตามหลักฐานจาก 1.3 | ADR เขียนจบ + ลงมือตามข้อสรุป |
| 5.5 สำรอง/ส่งออกข้อมูลผู้ใช้ | D10 | endpoint export JSON ทั้งบัญชี (ก่อนลบบัญชี แนะนำดาวน์โหลด) + ตั้งเวลาสำรอง Supabase ตามแผนระดับ | ดาวน์โหลดได้ไฟล์ครบ items+logs |

---

## สิ่งที่ตั้งใจ **ไม่** ทำ (และเหตุผล)

- **ไม่เปลี่ยนแปลง UX/หน้าตา/พฤติกรรมผู้ใช้**: ทุกงานข้างต้นอยู่ใต้ผิว ยกเว้นโน้ตรุ่นที่จำเป็น (0.7, 3.x)
- **ไม่เพิ่ม framework/gateway ภายนอก** (Kong/Upstash ฯลฯ): Worker + Postgres RPC ที่มีอยู่ทำหน้าที่ gateway ได้ในระดับนี้ ประหยัดงบศูนย์บาทตามข้อจำกัดโครงการ
- **ไม่เก็บ log ที่มี PII**: โดยหลัก design (structured log ไม่มี email/ชื่อ/เนื้อหารายการ)

## ความคืบหน้า

- [x] **ระยะ 0 เสร็จทั้งหมด (6 พ.ย. 2026)**: 0.1 boundary+request id+envelope | 0.2 ด่านต่อผู้ใช้ 5 ชุดใหม่ | 0.3 timeout ครบทุก fetch ข้อมูล+JWKS | 0.4 kid-miss refetch | 0.5 health แคช 1 นาที/isolate | 0.6 CI job `backend` (เทสต์ 232 เคส + deploy API forge + ตรวจ health หลัง deploy) | 0.7 AI เห็น completion (โน้ตรุ่น 2026.9.1) | 0.8 baseline รีเซ็ต 273 จุด | เทสต์ผ่าน 232/0
- [ ] ระยะ 1: security headers/CSP/supply-chain (ถัดไป)
- [ ] ระยะ 2: observability
- [ ] ระยะ 3: data plane
- [ ] ระยะ 4: AI platform
- [ ] ระยะ 5: hardening
