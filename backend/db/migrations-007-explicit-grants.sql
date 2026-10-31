-- migration 007: ให้สิทธิ์ Data API แบบเจาะจง (Explicit Grants) แก่ role service_role และ authenticated
-- มีผลรองรับมาตรการ Supabase ปิด Auto Data API Grant ตั้งแต่ 30 ต.ค. 2026
-- วิธีรัน: Supabase > SQL Editor > Run (ปลอดภัย รันซ้ำได้ ไม่กระทบสิทธิ์เดิมในฐานข้อมูลจริง)

-- ============ 1) items ============
-- service_role: ใช้ใน REST API จัดการรายการสิ่งต้องทำ/นิสัย/ตารางเรียน
--   - app/api/src/systems/items/routes.ts:78, 185, 188 (SELECT), 214 (INSERT/UPDATE/UPSERT), 284 (DELETE)
--   - app/api/src/systems/notify/scheduler.ts:57 (SELECT)
-- authenticated: ใช้ใน AI Route ดึงข้อมูลรายการไปประมวลผล (มี RLS กั้นข้อมูลเฉพาะของผู้ใช้)
--   - app/api/src/systems/ai/routes.ts:44 (SELECT)
grant select, insert, update, delete on table public.items to service_role;
grant select on table public.items to authenticated;

-- ============ 2) item_logs ============
-- service_role: ใช้ใน REST API บันทึกผลรายวันและติดตามความคืบหน้า
--   - app/api/src/systems/items/routes.ts:86, 316 (SELECT), 235, 380 (INSERT/UPDATE/UPSERT)
grant select, insert, update, delete on table public.item_logs to service_role;

-- ============ 3) push_subscriptions ============
-- service_role: ใช้ใน Scheduler อ่านและลบโทเคนพุชที่ไม่ใช้งาน
--   - app/api/src/systems/notify/scheduler.ts:45 (SELECT), 78 (DELETE)
-- authenticated: ใช้ใน Push Route ลงทะเบียน ดู และลบพุชโทเคนของผู้ใช้เอง (มี RLS กั้นข้อมูล)
--   - app/api/src/systems/notify/push-routes.ts:56 (SELECT), 62 (INSERT), 87 (DELETE)
grant select, insert, update, delete on table public.push_subscriptions to service_role;
grant select, insert, delete on table public.push_subscriptions to authenticated;

-- ============ 4) notification_log ============
-- service_role: ใช้ใน Scheduler บันทึกและตรวจสอบการแจ้งเตือนเพื่อกันแจ้งซ้ำ
--   - app/api/src/systems/notify/scheduler.ts:69 (INSERT), 82 (DELETE)
grant select, insert, update, delete on table public.notification_log to service_role;

-- ============ 5) ai_usage ============
-- service_role: ใช้ใน AI Quota ตรวจสอบและบันทึกการใช้งานโควตา AI
--   - app/api/src/systems/ai/quota.ts:95 (SELECT)
grant select, insert, update, delete on table public.ai_usage to service_role;

-- ============ หมายเหตุการตัดสินใจเกี่ยวกับ RPC และตารางที่ไม่ใช้ ============
-- 1. rate_hits (migrations-003) และ auth_codes (migrations-004):
--    ฟังก์ชัน RPC ทั้งหมด (rl_hit, rl_cleanup, ac_issue, ac_check, ac_salt, ac_cleanup) ถูกสร้างแบบ SECURITY DEFINER
--    จึงทำงานด้วยสิทธิ์ของผู้สร้าง (owner) และเรียกใช้งานผ่าน RPC จาก service_role ไม่มีการเข้าถึงตารางตรงผ่าน REST API
--    จึงไม่ต้อง GRANT สิทธิ์บนตาราง rate_hits และ auth_codes เพิ่มเติม
-- 2. anon role:
--    ไม่ให้ GRANT ใดๆ เนื่องจากแอปไม่ได้เปิดให้ผู้ใช้อื่นเข้าถึง REST API โดยไม่ผ่านการพิสูจน์ตัวตน
-- 3. ตารางที่ไม่ได้ใช้งาน:
--    settings, tasks, class_periods, routine_defs, routine_events, schedules, sleep_logs, chats, messages
--    ไม่มีโค้ดในแอปเรียกใช้งานผ่าน REST API จึงไม่ใส่ GRANT และไม่เพิ่ม CREATE TABLE
