-- migration 002: โควตา AI รายผู้ใช้ (เพิ่มตารางใหม่ล้วน ไม่แตะตารางเดิม)
-- วิธีใช้: วางทั้งไฟล์ใน Supabase > SQL Editor > Run ครั้งเดียว (รันซ้ำได้ ไม่ error)
-- ย้อนกลับ: drop function if exists public.ai_usage_take(uuid,date,int,int,int); drop function if exists public.ai_usage_settle(uuid,date,int); drop table if exists public.ai_usage;

create table if not exists public.ai_usage (
  user_id uuid not null,
  day     date not null,            -- นับตามวันที่ Asia/Bangkok (Worker ส่งมา)
  calls   int  not null default 0 check (calls >= 0),
  tokens  int  not null default 0 check (tokens >= 0),
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
-- ผู้ใช้อ่านของตัวเองได้ เขียนไม่ได้เลย (ตัวนับแก้ได้เฉพาะผ่านฟังก์ชันด้านล่างโดย service role)
drop policy if exists "own ai_usage read" on public.ai_usage;
create policy "own ai_usage read" on public.ai_usage for select using (auth.uid() = user_id);

-- จอง 1 ครั้งแบบ atomic: คำสั่งเดียวนับและตรวจ ยิงขนานกี่ครั้งก็ผ่านได้ไม่เกินเพดาน
-- คืน ok=true ถ้าจองได้, ok=false ถ้าเต็ม พร้อมจำนวนปัจจุบัน
-- p_global_calls = เพดานรวมทุกคนต่อวัน (กันโควตา Groq รวมหมด) 0 = ไม่ใช้
create or replace function public.ai_usage_take(p_user uuid, p_day date, p_calls_limit int, p_tokens_limit int, p_global_calls int)
returns table(ok boolean, reason text, calls int, tokens int)
language plpgsql security definer set search_path = public as $$
declare v_calls int; v_tokens int; v_global bigint;
begin
  if p_calls_limit is null or p_calls_limit < 1 or p_tokens_limit is null or p_tokens_limit < 1 then
    raise exception 'bad_limits';
  end if;
  -- ล็อกแถวของผู้ใช้ (สร้างถ้ายังไม่มี) -> ขนานกันต้องต่อคิว
  insert into public.ai_usage(user_id, day) values (p_user, p_day) on conflict (user_id, day) do nothing;
  select u.calls, u.tokens into v_calls, v_tokens from public.ai_usage u where u.user_id = p_user and u.day = p_day for update;
  if p_global_calls > 0 then
    select coalesce(sum(u.calls),0) into v_global from public.ai_usage u where u.day = p_day;
    if v_global >= p_global_calls then return query select false, 'global'::text, v_calls, v_tokens; return; end if;
  end if;
  if v_calls >= p_calls_limit then return query select false, 'calls'::text, v_calls, v_tokens; return; end if;
  if v_tokens >= p_tokens_limit then return query select false, 'tokens'::text, v_calls, v_tokens; return; end if;
  update public.ai_usage u set calls = u.calls + 1 where u.user_id = p_user and u.day = p_day returning u.calls, u.tokens into v_calls, v_tokens;
  return query select true, 'ok'::text, v_calls, v_tokens;
end $$;

-- คืนโควตา 1 ครั้งเมื่อ LLM ล่ม (ไม่ให้ผู้ใช้เสียสิทธิ์จากความผิดของระบบ) และตัดโทเคนจริงเมื่อสำเร็จ
create or replace function public.ai_usage_settle(p_user uuid, p_day date, p_add_tokens int, p_refund boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_refund then
    update public.ai_usage set calls = greatest(calls - 1, 0) where user_id = p_user and day = p_day;
  else
    update public.ai_usage set tokens = tokens + greatest(coalesce(p_add_tokens,0),0) where user_id = p_user and day = p_day;
  end if;
end $$;

-- ผู้ใช้ทั่วไปเรียกฟังก์ชันตรงผ่าน REST ไม่ได้ (กันตั้งตัวนับเอง/คืนโควตาเอง) เฉพาะ service role
revoke all on function public.ai_usage_take(uuid,date,int,int,int) from public, anon, authenticated;
revoke all on function public.ai_usage_settle(uuid,date,int,boolean) from public, anon, authenticated;
grant execute on function public.ai_usage_take(uuid,date,int,int,int) to service_role;
grant execute on function public.ai_usage_settle(uuid,date,int,boolean) to service_role;
