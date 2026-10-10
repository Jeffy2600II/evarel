# 05 Sub-agent Briefs for Evarel Backend & Frontend Build

ข้อกำหนดภารกิจย่อย (Sub-agent Task Briefs) สำหรับการสร้างระบบ Evarel ตามแผนเอกสาร 01-04
กฎการ Sizing: (1) Budget <=12 tool calls (2) แยก Implement และ Verify โดย Coordinator รัน Gate (3) Mechanical Script ตัดโค้ด (4) เอกสาร <=150 บรรทัด/ไฟล์ (5) Brief <=3KB (6) 1 Deliverable/Task (7) ใช้ conflict_key ร่วมกัน

---

## 1. Tasks Only Coordinator / Owner Can Do (งานเฉพาะ Coordinator/Owner)
- **Supabase Cloud Setup**: สร้าง Project, ออก Anon/Service Key, ตรวจ JWT Signing Method (HS256 vs JWKS) ใน Settings
- **Secrets Management**: ตั้งค่า wrangler secret put (SUPABASE_URL, SUPABASE_SERVICE_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, MEMORYLAKE_API_KEY)
- **Deployment & Git**: คำสั่ง wrangler deploy และ git push ไปยัง Remote Repository
- **Verification Gates Execution**: รัน 3 Gates หลังจบ Sub-phase (v11parity.mjs, Route 22 + Feature 13 tests, Offline check)

---

## 2. Sub-agent Task Briefs

### Phase 1: Database, Auth & Core Worker API
- **B-P1-00** [P1] Goal: ยืนยัน Supabase JWT signing method (HS256 vs JWKS) และวัด CPU/subrequests ของ scheduled() cron
  In: 01-backend-architecture.md | Out: docs/backend/p1-decisions.json | Budget: <=8 | Conflict: p1_decisions | Dep: - | Check: test -f docs/backend/p1-decisions.json && jq .jwt_method docs/backend/p1-decisions.json | Salvage: สรุปเท่าที่มี Default เป็น HS256
- **B-P1-01** [P1] Goal: สร้าง Supabase DDL SQL Schema และ RLS Policies ทุกตาราง (items, logs, push, chats, messages, settings)
  In: 01-backend-architecture.md | Out: supabase/schema.sql | Budget: <=10 | Conflict: db_schema | Dep: - | Check: grep -i "ROW LEVEL SECURITY" supabase/schema.sql | Salvage: บันทึก DDL เท่าที่สร้างเสร็จ
- **B-P1-02** [P1] Goal: พัฒนา Cloudflare Worker Skeleton และ JWT Auth Verification Middleware
  In: 01-backend-architecture.md, docs/backend/p1-decisions.json | Out: src/shared/auth.ts | Budget: <=12 | Conflict: worker_core | Dep: B-P1-00 | Check: npx tsc --noEmit src/shared/auth.ts | Salvage: เซฟ verifyJWT เท่าที่เสร็จและ stub ที่เหลือ
- **B-P1-03** [P1] Goal: พัฒนา REST API Endpoints สำหรับ items และ item_logs
  In: 01-backend-architecture.md, src/shared/auth.ts | Out: src/systems/items/routes.ts | Budget: <=12 | Conflict: items_system | Dep: B-P1-01, B-P1-02 | Check: npx tsc --noEmit src/systems/items/routes.ts | Salvage: คงเฉพาะ GET/PUT routes ที่ผ่าน typecheck
- **B-P1-04** [P1] Goal: เชื่อม HttpAdapter เข้ากับ Worker API และเขียน LocalStorage Import Tool (จาก evarel-demo-v3)
  In: 01-backend-architecture.md, src/systems/items/routes.ts | Out: src/shared/import-localstorage.ts | Budget: <=10 | Conflict: adapter_import | Dep: B-P1-03 | Check: npx tsc --noEmit src/shared/import-localstorage.ts | Salvage: เซฟฟังก์ชันแปลง JSON
- **B-P1-05** [P1] Goal: จัดทำ Backend Manifests และเอกสารประจำระบบตามข้อกำหนด
  In: 01-backend-architecture.md, 04-docs-system.md | Out: src/systems/items/manifest.json | Budget: <=8 | Conflict: backend_docs | Dep: B-P1-03 | Check: jq .name src/systems/items/manifest.json | Salvage: เขียน manifest เฉพาะ routes ที่เสร็จ

### Phase 2: TS & Next.js Conversion (ตาม sub-phases ของ 02 ตรงทุกประการ)
- **B-P2-01a** [P2] Goal: Mechanical cut โมดูล 1.1a Core (constants, dates, store, state, bus, undo, timer)
  In: app.js, 02-ts-nextjs-conversion.md | Out: src/core/index.ts | Budget: <=12 | Conflict: ts_core | Dep: - | Check: python3 scripts/verify_statements.py core | Salvage: Git checkout คืนและเซฟสคริปต์สกัด
- **B-P2-01b** [P2] Goal: Mechanical cut โมดูล 1.1b Services (schedule, stats, calendar, repo)
  In: app.js, src/core/index.ts | Out: src/services/index.ts | Budget: <=12 | Conflict: ts_services | Dep: B-P2-01a | Check: python3 scripts/verify_statements.py services | Salvage: บันทึกฟังก์ชันที่สกัดสำเร็จลง src/services/
- **B-P2-01c** [P2] Goal: Mechanical cut โมดูล 1.1c UI (primitives, layers, popover, form)
  In: app.js, src/core/index.ts | Out: src/ui/index.ts | Budget: <=12 | Conflict: ts_ui | Dep: B-P2-01a | Check: python3 scripts/verify_statements.py ui | Salvage: คง UI primitives ที่ตัดเสร็จ
- **B-P2-01d** [P2] Goal: Mechanical cut โมดูล 1.1d Views, Actions และ Main
  In: app.js, src/ui/index.ts | Out: src/main.ts | Budget: <=12 | Conflict: ts_main | Dep: B-P2-01b, B-P2-01c | Check: python3 scripts/verify_statements.py main | Salvage: คืนไฟล์เดิมและเซฟสคริปต์ตัด
- **B-P2-02** [P2] Goal: แปลง 1.2 Route & Boot เป็น Systems Router และ Boot
  In: js/route.js, js/boot.js | Out: src/systems/router/index.ts | Budget: <=10 | Conflict: ts_boot | Dep: B-P2-01d | Check: npx tsc --noEmit src/systems/router/index.ts | Salvage: ออก stub TS router interface
- **B-P2-03** [P2] Goal: ตั้งค่า Next.js 15 Static Export และ Template-String Wrapper Page (2.1)
  In: 02-ts-nextjs-conversion.md, src/main.ts | Out: app/page.tsx | Budget: <=12 | Conflict: next_setup | Dep: B-P2-02 | Check: test -f app/page.tsx && npx tsc --noEmit app/page.tsx | Salvage: เซฟ next.config.js และ app/page.tsx
- **B-P2-04** [P2] Goal: เชื่อมต่อ PWA, SW และ Vendor Static Files ใน Next.js (2.2)
  In: sw.js, manifest.webmanifest | Out: public/sw.js | Budget: <=10 | Conflict: next_pwa | Dep: B-P2-03 | Check: test -f public/sw.js && test -f public/vendor/fullcalendar.min.js | Salvage: ย้าย static assets เท่าที่ได้
- **B-P2-05a** [P2] Goal: แปลง 3.1a Today Tab เป็น React Component
  In: src/views/today.ts | Out: app/components/TodayTab.tsx | Budget: <=12 | Conflict: react_today | Dep: B-P2-04 | Check: npx tsc --noEmit app/components/TodayTab.tsx | Salvage: คง JSX ย่อยเท่าที่เปลี่ยนแล้ว
- **B-P2-05b** [P2] Goal: แปลง 3.1b All Tab เป็น React Component
  In: src/views/all.ts | Out: app/components/AllTab.tsx | Budget: <=12 | Conflict: react_all | Dep: B-P2-04 | Check: npx tsc --noEmit app/components/AllTab.tsx | Salvage: คง JSX ย่อยเท่าที่เสร็จ
- **B-P2-05c** [P2] Goal: แปลง 3.1c Calendar Tab เป็น React Component
  In: src/views/calendar.ts | Out: app/components/CalendarTab.tsx | Budget: <=12 | Conflict: react_calendar | Dep: B-P2-04 | Check: npx tsc --noEmit app/components/CalendarTab.tsx | Salvage: เซฟ wrapper FullCalendar
- **B-P2-05d** [P2] Goal: แปลง 3.1d Stats Tab เป็น React Component
  In: src/views/stats.ts | Out: app/components/StatsTab.tsx | Budget: <=12 | Conflict: react_stats | Dep: B-P2-04 | Check: npx tsc --noEmit app/components/StatsTab.tsx | Salvage: คง component สถิติที่เสร็จ
- **B-P2-06** [P2] Goal: แปลง 3.2 Layers, Dialogs และ Actions เป็น React Components
  In: src/ui/layers.ts, src/ui/popover.ts | Out: app/components/LayersModal.tsx | Budget: <=12 | Conflict: react_layers | Dep: B-P2-05a,b,c,d | Check: npx tsc --noEmit app/components/LayersModal.tsx | Salvage: สลับ layer คืน template string
- **B-P2-07** [P2] Goal: พัฒนา Drift Test Script และ Frontend System Manifests
  In: 04-docs-system.md | Out: scripts/test-drift.mjs | Budget: <=10 | Conflict: docs_drift | Dep: B-P2-02 | Check: node scripts/test-drift.mjs | Salvage: เซฟ drift test และ mock manifests

### Phase 3: AI Agent System
- **B-P3-00** [P3] Goal: วัด Thai Token Cost บน Groq และเขียน Data-Level Tool Manifests (item_create/update/delete/query, log_set, skip_set, reminder_set)
  In: 03-ai-agent.md, 04-docs-system.md | Out: src/systems/ai/manifest.json | Budget: <=10 | Conflict: ai_manifest | Dep: B-P1-05 | Check: jq .actions src/systems/ai/manifest.json | grep item_create | Salvage: บันทึก 7 tool actions ลง manifest
- **B-P3-01** [P3] Goal: พัฒนา Deterministic Intent Parser และ Code-First Tools Engine
  In: 03-ai-agent.md, src/systems/ai/manifest.json | Out: src/systems/ai/intent-parser.ts | Budget: <=12 | Conflict: ai_intent | Dep: B-P3-00 | Check: npx tsc --noEmit src/systems/ai/intent-parser.ts | Salvage: คอมมิต regex parser & stub runner
- **B-P3-02** [P3] Goal: สร้าง Agent Loop State Machine, Failover (Groq->OpenRouter) & Token Budget Counter
  In: 03-ai-agent.md, src/systems/ai/intent-parser.ts | Out: src/systems/ai/agent-loop.ts | Budget: <=12 | Conflict: ai_agent_loop | Dep: B-P3-01 | Check: npx tsc --noEmit src/systems/ai/agent-loop.ts | Salvage: คง failover logic & token counter
- **B-P3-03** [P3] Goal: สร้าง MemoryLake REST Provider และ Sensitive Fact Filter
  In: 03-ai-agent.md | Out: src/systems/ai/memorylake.ts | Budget: <=12 | Conflict: ai_memory | Dep: B-P3-00 | Check: npx tsc --noEmit src/systems/ai/memorylake.ts | Salvage: เซฟตัวกรองความจำอ่อนไหว & fetch wrapper
- **B-P3-04** [P3] Goal: สร้าง Chat Store Supabase Adapter และ Cron Push Engine
  In: 01-backend-architecture.md, 03-ai-agent.md | Out: src/systems/ai/chat-store.ts | Budget: <=12 | Conflict: ai_chat_push | Dep: B-P1-03, B-P3-02 | Check: npx tsc --noEmit src/systems/ai/chat-store.ts | Salvage: คอมมิตการอ่าน/บันทึก chats & messages

---

## 3. Sizing Table & Task Split Analysis

| Brief ID | Est. Edits / Files | Budget | Risk | Status & Action |
|---|---|---|---|---|
| B-P1-00 | 2 files / ~50 lines | <=8 | Low | OK |
| B-P1-01 | 1 file / ~120 lines | <=10 | Low | OK |
| B-P1-02 | 3 files / ~200 lines | <=12 | Medium | OK |
| B-P1-03 | 4 files / ~250 lines | <=12 | Medium | OK |
| B-P1-04 | 2 files / ~150 lines | <=10 | Low | OK |
| B-P1-05 | 2 files / ~100 lines | <=8 | Low | OK |
| B-P2-01a | 7 files / ~400 lines | <=12 | High | **TOO BIG (MUST SPLIT)**: แยกเป็น 01a1 (constants/dates/store) & 01a2 (state/bus/undo/timer) |
| B-P2-01b | 5 files / ~350 lines | <=12 | High | **TOO BIG (MUST SPLIT)**: แยกเป็น 01b1 (sched/stats) & 01b2 (calendar/repo) |
| B-P2-01c | 4 files / ~300 lines | <=12 | High | **TOO BIG (MUST SPLIT)**: แยกเป็น 01c1 (primitives/form) & 01c2 (layers/popover) |
| B-P2-01d | 4 files / ~350 lines | <=12 | High | **TOO BIG (MUST SPLIT)**: แยกเป็น 01d1 (views/actions) & 01d2 (main entry) |
| B-P2-02 | 3 files / ~150 lines | <=10 | Low | OK |
| B-P2-03 | 3 files / ~180 lines | <=12 | Medium | OK |
| B-P2-04 | 3 files / ~100 lines | <=10 | Low | OK |
| B-P2-05a | 2 files / ~250 lines | <=12 | High | OK (1 tab per task) |
| B-P2-05b | 2 files / ~250 lines | <=12 | High | OK (1 tab per task) |
| B-P2-05c | 2 files / ~280 lines | <=12 | High | OK (1 tab per task) |
| B-P2-05d | 2 files / ~220 lines | <=12 | High | OK (1 tab per task) |
| B-P2-06 | 4 files / ~350 lines | <=12 | High | **TOO BIG (MUST SPLIT)**: แยกเป็น 06a (Dialogs/Sheet) & 06b (Full-screen Layers) |
| B-P2-07 | 2 files / ~150 lines | <=10 | Low | OK |
| B-P3-00 | 2 files / ~120 lines | <=10 | Low | OK |
| B-P3-01 | 3 files / ~200 lines | <=12 | Medium | OK |
| B-P3-02 | 3 files / ~250 lines | <=12 | High | OK |
| B-P3-03 | 2 files / ~180 lines | <=12 | Medium | OK |
| B-P3-04 | 3 files / ~220 lines | <=12 | Medium | OK |

**สรุปการแบ่งภารกิจ (Split Actions)**:
1. `B-P2-01a..d` ตัดโค้ดด้วย Mechanical Script ครอบคลุมหลายโมดูลเกินไป (เสี่ยงเกิน 12 tool calls) ต้อง split ครึ่งก่อนสั่งรันจริง
2. `B-P2-06` แปลง JSX ทั้ง Layers, Sheets และ Dialogs ยาวเกิน 350+ บรรทัด ต้อง split เป็น 06a (Dialogs) และ 06b (Layers)


---

## 4. การแก้ไขโดย Coordinator (หลังตรวจ — มีผลเหนือส่วนก่อนหน้าเมื่อขัดกัน)

### 4.1 ตัวตรวจต้องมีก่อนงานที่พึ่งมัน (ปัญหา: `verify_statements.py` ถูกอ้าง 4 ครั้งแต่ยังไม่มีไฟล์)
- **C-P2-00 (Coordinator เขียนเอง ไม่มอบ worker)**: `scripts/verify_statements.py` เปรียบเทียบ "เนื้อ statement ระดับบนสุดของ app.js ต้นฉบับ" กับโมดูลที่ตัดแล้ว หลังย้อนการเขียนซ้ำเชิงกลไก (`ST.x`→`x`, ตัด `export`/`import`) ต้องตรงกัน 100% และ storage key ทั้ง 4 ต้องไม่เปลี่ยน; ทดสอบตัวตรวจกับไฟล์ที่ตั้งใจให้ผิดและต้องล้มก่อนใช้งานจริง
- ทุก brief เฟส 2 (B-P2-01*) ขึ้นกับ C-P2-00

### 4.2 Brief ที่ต้องแยกก่อนสั่งรัน (บังคับ ไม่ใช่ข้อแนะนำ)
| เดิม | แยกเป็น | หมายเหตุ |
|---|---|---|
| B-P2-01a | 01a1 constants·dates·store · 01a2 state·bus·undo·timer | 01a2 มีตัวแปร global 10 ตัว → `ST` |
| B-P2-01b | 01b1 schedule·stats · 01b2 calendar·repo | repo ต้องคง contract LocalAdapter/HttpAdapter |
| B-P2-01c | 01c1 primitives·form · 01c2 layers·popover | |
| B-P2-01d | 01d1 views·actions · 01d2 main entry | `ACTIONS` 65 รายการ ห้ามเปลี่ยนชื่อ |
| B-P2-06 | 06a dialogs·sheet · 06b full-screen layers | |
| B-P3-04 | 04a chat-store (Supabase) · (cron push ย้ายไป P1) | cron push เป็น B-P1-06 ตามแผน 01 §5 |

### 4.3 Brief ที่เพิ่ม
- **B-P1-06** [P1] Goal: `scheduled()` cron `*/5 * * * *` ตรวจแจ้งเตือน 6 แบบ + `notification_log` กันซ้ำ | In: 01-backend-architecture.md §5, src/shared/auth.ts | Out: src/systems/push/cron.ts | Budget: <=12 | Conflict: push_cron | Dep: B-P1-03 | Check: `npx tsc --noEmit` + coordinator วัด CPU/subrequest จริงตอน deploy | Salvage: เซฟตัวคำนวณ "ถึงเวลา" ที่ผ่าน unit test
- **B-P3-05** [P3] Goal: นับโทเคนต่อผู้ใช้ `ai_usage(user_id, day, tokens)` + เพดาน 3 รอบ/ข้อความ | In: 03-ai-agent.md §5 | Out: src/systems/ai/usage.ts | Budget: <=10 | Conflict: ai_usage | Dep: B-P3-02 | Check: `npx tsc --noEmit` | Salvage: เซฟตัวนับ

### 4.4 ชื่ออินพุตที่เป็น "ผลลัพธ์ของ brief ก่อนหน้า" (ไม่ใช่ไฟล์ที่มีอยู่ตอนเริ่ม)
`src/views/{today,all,calendar,stats}.ts` = ผลของ B-P2-01d1 · `src/ui/{layers,popover}.ts` = ผลของ B-P2-01c2 · `docs/backend/p1-decisions.json` = ผลของ B-P1-00 · `src/core/index.ts` = ผลของ B-P2-01a1/a2 — worker ต้องตรวจว่าไฟล์เหล่านี้มีอยู่ก่อนเริ่ม ถ้าไม่มีให้หยุดและรายงาน ห้ามสร้างขึ้นเอง

### 4.5 ใครรัน Gate
| งาน | ผู้รัน | วิธี |
|---|---|---|
| Pixel parity ต่อเฟสย่อย | Coordinator | `v11parity.mjs` (ต้องต่าง 0 พิกเซล) |
| Route 22 + Feature 13 | Coordinator | ชุดทดสอบใน `tests/` |
| Offline + FullCalendar | Coordinator | เบราว์เซอร์จริง ปิดเครือข่าย |
| `verify_statements.py` | Coordinator | หลังทุก brief B-P2-01* |
| Typecheck ต่อไฟล์ | Worker ได้ | `npx tsc --noEmit` เป็นเพียงข้อมูลประกอบ ไม่ใช่หลักฐานว่าผ่าน |

### 4.6 กฎการเริ่มงานจริง (ห้ามข้าม)
1. ไม่เริ่ม build ใดๆ จนกว่า Master อนุมัติแผน 01-05
2. เฟสเรียงตามที่ Master สั่ง: P1 (ฐานข้อมูล+ล็อกอิน) → P2 (TS→Next.js) → P3 (AI)
3. B-P1-00 (ยืนยัน JWT) เป็นงานแรกสุด และต้องมี Supabase project จริงจาก Owner ก่อน
4. ถ้า worker ใดหมดเวลา: ตรวจไฟล์ที่เขียนไว้ก่อน (salvage) แล้วแบ่งงานเหลือครึ่งหนึ่ง ห้ามสั่งซ้ำด้วย prompt เดิม
5. ขนาด brief จริงตอนส่งให้ worker ต้อง ≤ 3 KB ต่อฉบับ (ฉบับในไฟล์นี้ใหญ่สุด 448 ไบต์ จึงผ่าน)
