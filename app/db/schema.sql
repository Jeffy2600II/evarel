-- Evarel schema v1 | แผน docs/backend-plan/01 (แก้หลังตรวจเทียบ app-v11 และฐานข้อมูลจริง 10 ต.ค. 2026)
-- วิธีใช้: วางทั้งไฟล์ใน Supabase > SQL Editor > Run ครั้งเดียว (รันซ้ำได้ ไม่ error)
-- ความปลอดภัยของข้อมูล: ไม่ลบ/ไม่แก้ตาราง PoC เดิม (tasks, routine_defs, schedules, class_periods,
--   sleep_logs, routine_events) | push_subscriptions เดิมมี 1 แถวของเครื่อง Master => คงไว้ ไม่แตะแถว

-- ============ 1) items : โมเดลเดียว 4 ชนิด (habit/task/event/class) ตรงกับ app-v11 ============
create table if not exists public.items (
  id        bigint not null,                       -- แอปสร้างด้วย Date.now() (เลข) ซ้ำข้ามผู้ใช้ได้ => คีย์ประกอบ
  user_id   uuid   not null references auth.users(id) on delete cascade,
  primary key (user_id, id),
  type      text   not null default 'habit' check (type in ('habit','task','event','class')),
  title     text   not null,
  subject   text   not null default '',
  time      text   not null default '',
  "timeEnd" text   not null default '',
  track     text   not null default 'check' check (track in ('check','count','timer','none')),
  target    numeric not null default 1,
  "unitName" text  not null default '',
  repeat    jsonb  not null default '{"unit":"day","every":1,"days":[]}'::jsonb,
  start     text   not null default '',
  "end"     text   not null default '',
  skip      jsonb  not null default '{}'::jsonb,
  rem       jsonb  not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ 2) item_logs : ค่ารายวัน (ลบรายการแล้ว log หายตาม) ============
create table if not exists public.item_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid   not null references auth.users(id) on delete cascade,
  item_id   bigint not null,
  date      date   not null,
  value     numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, item_id, date),
  foreign key (user_id, item_id) references public.items(user_id, id) on delete cascade
);

-- ============ 3) chats / messages : ประวัติแชท AI ฉบับเต็ม ============
create table if not exists public.chats (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  title     text not null default 'แชทใหม่',
  created_at timestamptz not null default now()
);
create table if not exists public.messages (
  id        uuid primary key default gen_random_uuid(),
  chat_id   uuid not null references public.chats(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null check (role in ('user','assistant','system','tool')),
  content   text,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

-- ============ 4) notification_log : กันแจ้งเตือนซ้ำ ============
create table if not exists public.notification_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  key     text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- ============ 5) ตารางที่ PoC สร้างไว้แล้ว: เติมของที่ขาด ไม่ลบอะไร ============
-- settings (PoC เป็นคอลัมน์แยก ไม่มีข้อมูล): เพิ่ม data jsonb สำหรับค่าอื่นของแอป
alter table public.settings add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.settings add column if not exists updated_at timestamptz not null default now();
-- push_subscriptions: คงแถวเดิม; user_id ยัง null ได้จนกว่าเครื่องนั้นล็อกอิน แล้วค่อยบังคับ not null (ทำทีหลัง ไม่ใช่ตอนนี้)

-- ============ 6) RLS : ทุกตารางเห็นเฉพาะของตัวเอง ============
alter table public.items            enable row level security;
alter table public.item_logs        enable row level security;
alter table public.chats            enable row level security;
alter table public.messages         enable row level security;
alter table public.notification_log enable row level security;
alter table public.settings         enable row level security;
alter table public.push_subscriptions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['items','item_logs','chats','messages','notification_log'] loop
    execute format('drop policy if exists "own %1$s" on public.%1$s', t);
    execute format('create policy "own %1$s" on public.%1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
-- settings / push_subscriptions มีนโยบาย "own ..." จาก PoC อยู่แล้ว (ตรวจแล้วใน poc/schema.sql)

-- ============ 7) index ที่ใช้จริง ============
create index if not exists item_logs_user_date on public.item_logs (user_id, date);
create index if not exists messages_chat_time  on public.messages (chat_id, created_at);
