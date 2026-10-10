-- migration 003: ตัวนับ rate limit แบบ atomic (ADR 0003: กันคนหัวหมอ)
-- วิธีรัน: Supabase > SQL Editor > Run (ปลอดภัย รันซ้ำได้)
-- ย้อนกลับ: drop function if exists public.rl_hit(text,text,int,int); drop table if exists public.rate_hits;
-- หลักการ: fixed window ต่อ (bucket,key) คืนค่า ok=false เมื่อเกินเพดาน + retry_after วินาที
--          ผู้ใช้ทั่วไป (anon/authenticated) เรียกไม่ได้ เฉพาะ service_role (Worker) เท่านั้น

create table if not exists public.rate_hits (
  bucket       text        not null,
  key          text        not null,
  window_start timestamptz not null,
  hits         int         not null default 0 check (hits >= 0),
  primary key (bucket, key)
);
alter table public.rate_hits enable row level security;  -- ไม่มี policy = ผู้ใช้ทั่วไปอ่าน/เขียนตรงไม่ได้

create or replace function public.rl_hit(p_bucket text, p_key text, p_limit int, p_window_sec int)
returns table(ok boolean, hits int, retry_after int)
language plpgsql security definer set search_path = public as $$
declare v_hits int; v_start timestamptz; v_now timestamptz := now();
begin
  if p_limit is null or p_limit < 1 or p_window_sec is null or p_window_sec < 1 or p_bucket is null or p_key is null then
    raise exception 'bad_args';
  end if;
  if length(p_key) > 200 then p_key := left(p_key, 200); end if;
  insert into public.rate_hits(bucket, key, window_start, hits) values (p_bucket, p_key, v_now, 0)
    on conflict (bucket, key) do nothing;
  select r.window_start, r.hits into v_start, v_hits from public.rate_hits r where r.bucket = p_bucket and r.key = p_key for update;
  if v_now >= v_start + make_interval(secs => p_window_sec) then   -- หน้าต่างเก่าหมดอายุ -> เริ่มใหม่
    update public.rate_hits r set window_start = v_now, hits = 0 where r.bucket = p_bucket and r.key = p_key;
    v_start := v_now; v_hits := 0;
  end if;
  if v_hits >= p_limit then
    return query select false, v_hits, greatest(1, ceil(extract(epoch from (v_start + make_interval(secs => p_window_sec) - v_now)))::int);
    return;
  end if;
  update public.rate_hits r set hits = r.hits + 1 where r.bucket = p_bucket and r.key = p_key returning r.hits into v_hits;
  return query select true, v_hits, 0;
end $$;

-- ปิดสิทธิ์ผู้ใช้ทั่วไป: เรียกได้เฉพาะ service_role (บทเรียนจาก 002: ต้อง revoke จาก public/anon/authenticated)
revoke all on function public.rl_hit(text,text,int,int) from public, anon, authenticated;
grant execute on function public.rl_hit(text,text,int,int) to service_role;

-- เก็บกวาดแถวเก่า (เรียกเองเป็นครั้งคราว หรือ Worker เรียกเป็นระยะ): ลบหน้าต่างที่หมดอายุเกิน 1 วัน
create or replace function public.rl_cleanup() returns int language plpgsql security definer set search_path = public as $$
declare n int; begin delete from public.rate_hits where window_start < now() - interval '1 day'; get diagnostics n = row_count; return n; end $$;
revoke all on function public.rl_cleanup() from public, anon, authenticated;
grant execute on function public.rl_cleanup() to service_role;
