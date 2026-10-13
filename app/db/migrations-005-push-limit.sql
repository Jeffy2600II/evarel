-- migration 005: เพดานเครื่องต่อผู้ใช้ของ Push บังคับที่ฐานข้อมูล (evarel-s2-scheduler)
-- วิธีรัน: Supabase > SQL Editor > Run (ปลอดภัย รันซ้ำได้ ไม่ลบข้อมูล ไม่แตะแถวเดิม)
-- ย้อนกลับ: drop trigger if exists push_subscriptions_limit on public.push_subscriptions; drop function if exists public.push_subscriptions_enforce_limit();
-- เหตุผล: ด่านใน Worker "อ่านจำนวน -> ตรวจ -> เขียน" ไม่ atomic ยิง 12 คำขอขนานแล้วเข้าได้ 11 แถวทั้งที่เพดานคือ 5
--         (พิสูจน์ใน app/api/src/systems/notify/push-routes.test.mjs) จึงต้องนับและเขียนในก้อนเดียวที่ฐานข้อมูล
-- หลักการ: ล็อกต่อผู้ใช้ (advisory lock ระดับธุรกรรม) ก่อนนับ คนละผู้ใช้ไม่รอกัน | แถวที่ user_id เป็น null (เครื่องจาก PoC)
--          ไม่ถูกนับและไม่ถูกแตะ | ข้อความผิดพลาดคงที่ push_subscriptions_limit ให้ Worker แปลงเป็น 403 ไม่รั่วรายละเอียด

create or replace function public.push_subscriptions_enforce_limit()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  max_per_user constant int := 5;   -- ต้องตรงกับ MAX_SUBS_PER_USER ใน app/api/src/systems/notify/push-routes.ts
  n int;
begin
  if new.user_id is null then
    return new;                     -- แถวจาก PoC: ไม่นับ ไม่กั้น (Worker ใหม่ไม่เคยเขียน user_id เป็น null)
  end if;
  perform pg_advisory_xact_lock(hashtextextended('push_subscriptions:' || new.user_id::text, 0));
  select count(*) into n from public.push_subscriptions where user_id = new.user_id;
  if n >= max_per_user then
    raise exception 'push_subscriptions_limit' using errcode = 'P0001';
  end if;
  return new;
end
$$;

drop trigger if exists push_subscriptions_limit on public.push_subscriptions;
create trigger push_subscriptions_limit
  before insert on public.push_subscriptions
  for each row execute function public.push_subscriptions_enforce_limit();

-- RLS: ผู้ใช้เห็น/เพิ่ม/ลบได้เฉพาะแถวของตัวเอง (สร้างใหม่แบบเดียวกับตารางอื่นใน schema.sql แทนการพึ่งนโยบายเก่าจาก PoC ที่ตรวจไม่ได้)
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push_subscriptions" on public.push_subscriptions;
create policy "own push_subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ตัวจัดเวลาอ่านทุกผู้ใช้ด้วย service_role ซึ่งข้าม RLS โดยธรรมชาติ ไม่ต้องมี policy เพิ่ม
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
