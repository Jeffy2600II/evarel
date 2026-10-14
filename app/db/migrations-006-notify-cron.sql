-- migration 006: ให้ฐานข้อมูลปลุก Edge Function notify-tick ทุกนาที (pg_cron + pg_net)
-- สถานะ: ทดลอง (spike evarel-edge-spike) | ยังไม่ใช่ระบบหลัก: Cloudflare cron ที่ทำงานอยู่เป็นระบบสำรอง อย่าเปิดทั้งสองพร้อมกันบนข้อมูลจริง
--         (การจอง notification_log กันแจ้งซ้ำข้ามระบบได้ แต่ยังไม่ได้พิสูจน์สองระบบพร้อมกัน)
--
-- ก่อนรัน ต้องทำนอก SQL ก่อน (ผมทำแทนไม่ได้: ไม่มีโทเคนจัดการโปรเจกต์):
--   1) Dashboard > Edge Functions > Secrets ตั้ง CRON_SECRET (สุ่มยาว >= 32 ตัวอักษร), VAPID_KEYS_JSON, VAPID_CONTACT
--   2) deploy ฟังก์ชัน notify-tick ด้วย --no-verify-jwt (ฟังก์ชันตรวจสิทธิ์เองด้วย header x-cron-secret)
--   3) แก้ 2 บรรทัดที่มีเครื่องหมาย <<< ด้านล่างให้เป็นค่าจริง แล้วรันทั้งไฟล์ใน SQL Editor
--      ห้าม commit ไฟล์ที่ใส่ค่าจริงแล้ว: ค่าลับต้องไม่เข้า git

-- 1) ส่วนขยาย (เปิดซ้ำได้ ไม่ error)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) เก็บค่าใน Vault (ไม่ฝังค่าลับในข้อความของงาน cron เพราะ cron.job เก็บข้อความ SQL ตรงตัว)
--    create_secret ชื่อซ้ำจะ error จึงลบของเดิมก่อนเพื่อให้รันซ้ำได้
delete from vault.secrets where name in ('notify_tick_url', 'notify_tick_secret');
select vault.create_secret('https://vdbmwmmsfrgpaauzspup.supabase.co/functions/v1/notify-tick', 'notify_tick_url');
select vault.create_secret('<<< ใส่ค่าเดียวกับ CRON_SECRET ที่ตั้งใน Edge Function >>>', 'notify_tick_secret');

-- 3) ตั้งงานทุกนาที (cron.schedule ชื่อซ้ำจะทับของเดิม)
select cron.schedule(
  'evarel-notify-tick',
  '* * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'notify_tick_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'notify_tick_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- ตรวจผล (รันแยกหลังผ่านไป 2-3 นาที):
--   select jobid, jobname, schedule, active from cron.job where jobname = 'evarel-notify-tick';
--   select status, return_message, start_time from cron.job_run_details where jobid = (select jobid from cron.job where jobname='evarel-notify-tick') order by start_time desc limit 5;
--   select id, status_code, left(content::text, 120) as body, created from net._http_response order by created desc limit 5;   -- เก็บ 6 ชั่วโมง
--
-- ยกเลิก / ถอยกลับ:
--   select cron.unschedule('evarel-notify-tick');
--   delete from vault.secrets where name in ('notify_tick_url', 'notify_tick_secret');
