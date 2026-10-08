-- Evarel PoC schema — Supabase (สร้างใน SQL Editor ของโปรเจกต์ใหม่)
-- หมายเหตุ: ออกแบบตามแผนเฟส 1 หัวข้อ 2 | ปรับในเฟส 3 ได้ตามผล PoC

-- 1) งาน + deadline
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  detail text,
  due_at timestamptz,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) นิยามกิจวัตร
create table if not exists public.routine_defs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  remind_times jsonb not null default '[]',  -- เช่น ["06:30","21:30"]
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) ตารางเรียน (รองรับหลายชุด + ล้างทั้งตาราง)
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,            -- เช่น "M.5 เทอม 2"
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.class_periods (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),  -- 0=อาทิตย์
  period_no int not null check (period_no between 1 and 8),
  subject text not null,
  room text,
  unique (schedule_id, day_of_week, period_no)
);

-- 4) การนอน-ตื่น
create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sleep_at timestamptz,
  wake_at timestamptz,
  unique (user_id, date)
);

-- 5) การเช็กกิจวัตร (ฉบับ Supabase — จะย้ายไป Tiger Cloud เมื่อยืนยัน Free plan)
create table if not exists public.routine_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_def_id uuid references public.routine_defs(id) on delete set null,
  routine_name text not null,
  checked_at timestamptz not null default now()
);
create index if not exists routine_events_user_time_idx
  on public.routine_events (user_id, checked_at desc);

-- 6) push subscription (PoC: user_id อนุญาต null ได้ เพราะยังไม่มีระบบล็อกอิน
--    เมื่อเฟส 4 มี auth จริง ค่อยคืนสถานะ NOT NULL)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- 7) ตั้งค่าแจ้งเตือน
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  morning_summary_time text not null default '06:00',
  evening_summary_time text not null default '21:30',
  deadline_lead_days int not null default 1,
  sleep_target text not null default '22:00',
  wake_target text not null default '05:30'
);

-- RLS: ทุกตารางผูกกับเจ้าของข้อมูล
alter table public.tasks enable row level security;
alter table public.routine_defs enable row level security;
alter table public.schedules enable row level security;
alter table public.class_periods enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.routine_events enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.settings enable row level security;

create policy "own tasks" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own routine_defs" on public.routine_defs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own schedules" on public.schedules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own class_periods" on public.class_periods for all
  using (exists (select 1 from public.schedules s where s.id = schedule_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.schedules s where s.id = schedule_id and s.user_id = auth.uid()));
create policy "own sleep_logs" on public.sleep_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own routine_events" on public.routine_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own push_subscriptions" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings" on public.settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- แพตช์สำหรับผู้ที่รัน schema เดิมไปแล้ว (รันใน SQL Editor ครั้งเดียว)
alter table public.push_subscriptions alter column user_id drop not null;
