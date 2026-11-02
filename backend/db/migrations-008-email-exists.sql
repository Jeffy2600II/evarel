-- 008: ตรวจ "อีเมลนี้มีบัญชีหรือยัง" แบบชี้แถวเดียว (ใช้ระหว่างกรอกฟอร์มสมัคร)
-- เหตุผล: เดิมต้องรอกดปุ่มสมัครแล้วจึงรู้ และการค้นผ่าน admin users API ต้องไล่อ่านรายการ
-- ฟังก์ชันนี้อ่าน auth.users ตรง ๆ ด้วยดัชนีอีเมล (limit 1) จึงเร็วและกินทรัพยากรน้อย
-- security definer จำเป็นเพราะตาราง auth ไม่อยู่ใน schema ที่ PostgREST เปิดให้อ่าน
create or replace function public.ac_email_exists(p_email text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (select 1 from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1);
$$;

-- ให้เฉพาะ service role เรียกใช้ (Worker ของเราใช้ service key เท่านั้น)
revoke all on function public.ac_email_exists(text) from public;
revoke all on function public.ac_email_exists(text) from anon;
revoke all on function public.ac_email_exists(text) from authenticated;
grant execute on function public.ac_email_exists(text) to service_role;
