# 01 Backend Architecture Plan (Evarel)

แผนสถาปัตยกรรมสืบเนื่องจาก v11 Local/HttpAdapter และ PoC Worker/Supabase รองรับ Multi-user, Security (RLS) และ Free-Tier Limits

---

## 1. Single Cloudflare Worker Module Architecture

ใช้ Cloudflare Worker ตัวเดียว จัดการ API ทั้งหมด โดยแบ่งโครงสร้างภายในเป็น System Modules

### Exact Folder Tree
```
src/
├── index.ts                # Main Fetch & Scheduled entrypoint
├── router.ts               # Tiny Router Contract (<20 lines)
├── shared/ (auth.ts, supabase.ts, types.ts)
└── systems/
    ├── items/ (routes.ts, service.ts, types.ts, manifest.ts)
    ├── logs/ (routes.ts, service.ts, types.ts, manifest.ts)
    ├── push/ (routes.ts, service.ts, types.ts, manifest.ts)
    ├── chat/ (routes.ts, service.ts, types.ts, manifest.ts)
    └── settings/ (routes.ts, service.ts, types.ts, manifest.ts)
```

### Tiny Router Contract
```typescript
export interface RouteHandler {
  (req: Request, env: Env, ctx: ExecutionContext, user: AuthUser): Promise<Response>;
}
export interface SystemManifest {
  name: string;
  routes: Array<{ method: string; path: RegExp; handler: RouteHandler; authRequired?: boolean }>;
}
```

---

## 2. Supabase Schema & RLS Policies (SQL)

ออกแบบตรงตาม v11 `item` fields และแยก `item_logs` + `push_subscriptions` + `chat` + `settings` ทุกตารางมี `user_id` + RLS

```sql
-- 1) Items Table (Matching v11 item fields: id,type,title,subject,time,timeEnd,track,target,unitName,repeat,start,end,skip,rem)
CREATE TABLE public.items (
  id BIGINT NOT NULL,  -- แอปสร้างด้วย Date.now() (เลข) ไม่ใช่ข้อความ; ซ้ำข้ามผู้ใช้ได้ จึงใช้คีย์ประกอบ
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, id),
  type TEXT NOT NULL DEFAULT 'habit' CHECK (type IN ('habit','task','event','class')), title TEXT NOT NULL, subject TEXT DEFAULT '',
  time TEXT DEFAULT '', timeEnd TEXT DEFAULT '', track TEXT NOT NULL DEFAULT 'check' CHECK (track IN ('check','count','timer')),
  target NUMERIC DEFAULT 1, unitName TEXT DEFAULT '',
  repeat JSONB NOT NULL DEFAULT '{"unit":"none","every":1,"days":[]}'::jsonb,
  start TEXT DEFAULT '', "end" TEXT DEFAULT '', skip JSONB DEFAULT '{}'::jsonb, rem JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Item Logs Table
CREATE TABLE public.item_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL, date DATE NOT NULL, value NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id, item_id, date),
  FOREIGN KEY (user_id, item_id) REFERENCES public.items(user_id, id) ON DELETE CASCADE  -- ลบรายการแล้ว log ไม่ค้าง
);

-- 3) Push Subscriptions Table
CREATE TABLE public.push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Chat Tables
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT, tool_calls JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5) Settings Table
CREATE TABLE public.settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6) Notification dedupe
CREATE TABLE public.notification_log (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL, sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (user_id, key)
);
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User notif access" ON public.notification_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User items access" ON public.items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User logs access" ON public.item_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User push access" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User chats access" ON public.chats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User messages access" ON public.messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User settings access" ON public.settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## 3. Auth, JWT Verification & Endpoint List

### JWT Verification (CPU <= 10ms)
- **ข้อเท็จจริง PoC:** PoC ใช้ `SUPABASE_SERVICE_KEY` (ข้าม RLS ทั้งหมด) และยังไม่มีการตรวจผู้ใช้ — ระบบล็อกอินเป็นของใหม่ทั้งหมด
- **ต้องยืนยันก่อนล็อก (เฟส 1 งานแรก):** โปรเจกต์ Supabase ของ Master ใช้กุญแจเซ็น JWT แบบใด (HS256 secret ร่วม หรือกุญแจไม่สมมาตรผ่าน JWKS) เปิดดูที่ Project Settings > JWT/API Keys ห้ามเดา
- **ทางเลือก:** (ก) HS256: `crypto.subtle.verify` กับ secret (ไม่มี network) (ข) JWKS/ES256: ดึง JWKS มาแคชใน Worker แล้วตรวจด้วย WebCrypto (ค) ฝากให้ Supabase ตรวจผ่าน `GET /auth/v1/user` (นับ 1 subrequest ต่อคำขอ)
- **กฎเหล็ก:** Worker ต้องใช้ JWT ของผู้ใช้เรียก Supabase REST (ให้ RLS ทำงาน) ส่วน service key ใช้เฉพาะ cron/แอดมิน และห้ามส่งไปฝั่งเบราว์เซอร์

### Endpoints (Matching HttpAdapter & PoC)
- `GET /api/items` : โหลดรายการ items ทั้งหมดของผู้ใช้ (`HttpAdapter.load()`)
- `PUT /api/items/:id` : สร้าง/อัปเดต item (`HttpAdapter.apply()` upserts)
- `DELETE /api/items/:id` : ลบ item (`HttpAdapter.apply()` removes)
- `GET /api/logs` & `POST /api/logs` : อ่าน/บันทึกประวัติ `item_logs`
- `GET /api/push/key`, `POST /api/push/subscribe`, `POST /api/push/send` : Web Push API
- `POST /api/ai/chat` : AI Agent Chat Loop (ข้อความ + Tool Calls)
- `GET /api/settings` & `PUT /api/settings` : อ่าน/อัปเดตการตั้งค่าผู้ใช้

---

## 4. Free-Limit Budget Table

| ทรัพยากร / ข้อจำกัด | โควตาฟรี (Free Tier) | การใช้งานจริงของ Evarel (Estimated) |
|---|---|---|
| **Worker CPU Time** | 10 ms / request | ~1-3 ms (JWT verify <1ms, Router/JSON ~1ms, I/O wait ไม่คิด) |
| **Worker Subrequests** | 50 subrequests / request | 1-2 subrequests (Supabase REST API / Web Push Endpoints) |
| **Worker Cron Triggers** | 5 triggers / account | 1 ตัวรันทุก 5 นาที (`*/5 * * * *`) ตรวจ "ใครถึงเวลาเตือน" ทั้ง 6 แบบ — ตัวเดียวเหลือ 4 ว่าง (ดูข้อ 5) |
| **Worker Daily Requests** | 100,000 requests / day | ~500 - 2,000 requests / day (การใช้งานทั่วไป) |
| **Supabase DB Storage** | 500 MB | ~10-50 MB (ข้อมูลและข้อความของผู้ใช้) |

---

## 5. Push Notification & Cron Design Inside Free Limits

แจ้งเตือน 6 แบบ (กิจวัตรตามเวลา, ก่อน deadline, สรุปเช้า AI, นอน 22:00, สรุปสิ้นวัน, ตารางเรียน) ต้องยิงในเวลาต่างกันต่อผู้ใช้ จึงใช้ cron เวลาคงที่ 2 ตัวไม่ได้

1. **Cron ตัวเดียว `*/5 * * * *`**: `scheduled()` ดึงรายการที่ "ถึงเวลา" ในหน้าต่าง 5 นาทีที่ผ่านมา (คำนวณจาก `items.time`, `items.rem`, `settings`) ด้วยการคิวรีเดียวต่อรอบ
2. **ข้อจำกัดต้องวัดจริงก่อนล็อก**: 288 รอบ/วัน x (1 คิวรี + N การส่ง push) — แต่ละรอบเป็นคำขอแยกที่มี subrequest 50 และ CPU 10ms ของตัวเอง; ต้องวัด CPU ของการเข้ารหัส push ต่อ 1 ข้อความใน Worker จริง (ห้ามสมมติ <3ms)
3. **ส่งเป็นชุด**: ไม่เกิน ~40 push ต่อรอบ ที่เหลือเลื่อนไปรอบถัดไปโดยเรียงตามเวลาที่ครบกำหนด (กันเกิน 50 subrequests); ลบ endpoint ที่หมดอายุ (410/404) ทุกครั้ง
4. **ไม่ซ้ำ**: ตาราง `notification_log(user_id, key, sent_at)` กันส่งซ้ำเมื่อ cron รันซ้อน/รีเทรย์
5. **สรุป AI เช้าวันละครั้ง** เรียก LLM ได้เฉพาะรอบที่ตรงเวลาของผู้ใช้นั้นและมีโควตา (ดู 03-ai-agent) ไม่เรียก LLM ในทุกรอบ cron
6. **Keep-alive**: cron ทุก 5 นาทีที่แตะ Supabase ทุกวันตอบข้อกังวลเรื่องโปรเจกต์ฟรีถูก pause 7 วัน

## 6. Open Risks

1. **JWT ยังไม่ยืนยัน**: ชนิดกุญแจของโปรเจกต์ Supabase ยังไม่ได้ตรวจ — งานแรกของเฟส 1 (ดูข้อ 3)
2. **Cron ทุก 5 นาที**: ต้องวัด CPU/subrequest จริงของ `scheduled()` กับผู้ใช้หลายคน; ถ้ามีผู้ใช้เกิน ~40 คนที่ครบกำหนดพร้อมกัน ต้องมีคิวเลื่อนส่ง (ยังไม่มีบริการคิวใน free plan ที่ยืนยันแล้ว)
3. **การย้ายข้อมูลเดิม**: ข้อมูลของ Master อยู่ใน localStorage (`evarel-demo-v3`) — ต้องมีขั้นนำเข้าครั้งเดียวผ่าน `PUT /items/:id` และต้องไม่ทำให้ข้อมูลหาย (id เป็น `Date.now()` ซ้ำข้ามผู้ใช้ได้ จึงใช้คีย์ `(user_id, id)`)
4. **โควตา request ร่วมกัน**: 100,000/วันรวมทุกผู้ใช้ รวม cron 288 รอบ — ถ้าเปิดสาธารณะต้องมีโควตาต่อผู้ใช้
5. **service key**: อยู่เฉพาะ Worker secret ห้ามส่งไปเบราว์เซอร์; ใช้เฉพาะ cron
