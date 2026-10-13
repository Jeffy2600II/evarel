-- migration 004: รหัส 6 หลักของ Evarel เอง (evarel-email-own) แทนการให้ Supabase ส่งเมล
-- วิธีรัน: Supabase > SQL Editor > Run (ปลอดภัย รันซ้ำได้)
-- ย้อนกลับ: drop function if exists public.ac_issue(text,text,text,text,int); drop function if exists public.ac_check(text,text,text,int); drop function if exists public.ac_cleanup(); drop table if exists public.auth_codes;
-- หลักการ: เก็บเฉพาะแฮชของรหัส (ไม่เก็บรหัสจริง) | รหัสผิดนับก่อนเทียบเสมอ (กันยิงขนานข้ามเพดาน) | ใช้ได้ครั้งเดียวแบบอะตอมิก
--          ผู้ใช้ทั่วไป (anon/authenticated) เรียกและอ่านตรงไม่ได้ เฉพาะ service_role (Worker)

create table if not exists public.auth_codes (
  id          bigint generated always as identity primary key,
  email_hash  text        not null,                          -- แฮชของอีเมล (ไม่เก็บอีเมลดิบในตารางนี้)
  purpose     text        not null check (purpose in ('signup','recovery')),
  code_hash   text        not null,                          -- แฮช(รหัส+เกลือ+purpose+อีเมล) คำนวณฝั่ง Worker
  salt        text        not null,
  attempts    int         not null default 0 check (attempts >= 0),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists auth_codes_lookup on public.auth_codes (email_hash, purpose, created_at desc);
alter table public.auth_codes enable row level security;     -- ไม่มี policy = ผู้ใช้ทั่วไปอ่าน/เขียนตรงไม่ได้

-- ออกรหัสใหม่: ทำให้รหัสเก่าที่ยังไม่ใช้ของ (email,purpose) เดียวกันใช้ไม่ได้ทันที แล้วเพิ่มแถวใหม่
create or replace function public.ac_issue(p_email_hash text, p_purpose text, p_code_hash text, p_salt text, p_ttl_sec int)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if p_email_hash is null or p_code_hash is null or p_salt is null or p_purpose not in ('signup','recovery')
     or p_ttl_sec is null or p_ttl_sec < 30 or p_ttl_sec > 3600 then
    raise exception 'bad_args';
  end if;
  update public.auth_codes set used_at = now()
    where email_hash = p_email_hash and purpose = p_purpose and used_at is null;
  insert into public.auth_codes(email_hash, purpose, code_hash, salt, expires_at)
    values (p_email_hash, p_purpose, p_code_hash, p_salt, now() + make_interval(secs => p_ttl_sec))
    returning id into v_id;
  return v_id;
end $$;

-- ตรวจรหัส (อะตอมิก): ล็อกแถวล่าสุดที่ยังไม่ใช้ -> เพิ่มตัวนับก่อน -> เทียบแฮช -> ถ้าถูกค่อยตั้ง used_at
-- คืน result: ok | invalid | expired | locked | none   (ไม่แยกสาเหตุ "ไม่มีรหัส" ออกจาก "ผิด" ที่ฝั่งตอบ client)
create or replace function public.ac_check(p_email_hash text, p_purpose text, p_code_hash_try text, p_max_attempts int)
returns text language plpgsql security definer set search_path = public as $$
declare r public.auth_codes%rowtype;
begin
  if p_email_hash is null or p_code_hash_try is null or p_purpose not in ('signup','recovery') or p_max_attempts is null or p_max_attempts < 1 then
    raise exception 'bad_args';
  end if;
  select * into r from public.auth_codes
    where email_hash = p_email_hash and purpose = p_purpose and used_at is null
    order by created_at desc, id desc limit 1 for update;
  if not found then return 'none'; end if;
  if r.expires_at <= now() then
    update public.auth_codes set used_at = now() where id = r.id;
    return 'expired';
  end if;
  if r.attempts >= p_max_attempts then
    update public.auth_codes set used_at = now() where id = r.id;
    return 'locked';
  end if;
  update public.auth_codes set attempts = attempts + 1 where id = r.id;          -- นับก่อนเทียบเสมอ
  if r.code_hash = p_code_hash_try then
    update public.auth_codes set used_at = now() where id = r.id;
    return 'ok';
  end if;
  if r.attempts + 1 >= p_max_attempts then
    update public.auth_codes set used_at = now() where id = r.id;                -- ผิดครั้งสุดท้าย -> ทำลายรหัส
    return 'locked';
  end if;
  return 'invalid';
end $$;

-- ดึงเกลือของรหัสล่าสุดที่ยังใช้ได้ (Worker ต้องใช้เกลือคำนวณแฮชของรหัสที่ผู้ใช้พิมพ์) ไม่คืน code_hash
create or replace function public.ac_salt(p_email_hash text, p_purpose text)
returns text language sql security definer set search_path = public stable as $$
  select salt from public.auth_codes
   where email_hash = p_email_hash and purpose = p_purpose and used_at is null and expires_at > now()
   order by created_at desc, id desc limit 1
$$;

create or replace function public.ac_cleanup() returns int language plpgsql security definer set search_path = public as $$
declare n int; begin delete from public.auth_codes where created_at < now() - interval '1 day'; get diagnostics n = row_count; return n; end $$;

revoke all on function public.ac_issue(text,text,text,text,int) from public, anon, authenticated;
revoke all on function public.ac_check(text,text,text,int) from public, anon, authenticated;
revoke all on function public.ac_salt(text,text) from public, anon, authenticated;
revoke all on function public.ac_cleanup() from public, anon, authenticated;
grant execute on function public.ac_issue(text,text,text,text,int) to service_role;
grant execute on function public.ac_check(text,text,text,int) to service_role;
grant execute on function public.ac_salt(text,text) to service_role;
grant execute on function public.ac_cleanup() to service_role;
