// ตัวจัดเวลาแจ้งเตือน (Cloudflare Cron ทุกนาที) | ใช้ service key ข้าม RLS จึงต้องผูก user_id ในทุกคำค้นเอง
// หลักการ: จองก่อนส่ง (insert notification_log ชนคีย์ = มีคนจองแล้ว ข้าม) | จองต่อ "เครื่อง" ไม่ใช่ต่อรายการ
// ส่งล้มชั่วคราวเท่านั้นที่คืนการจอง | ส่งสำเร็จหรือไม่แน่ใจ ห้ามคืน (ส่งซ้ำแย่กว่าไม่ส่ง) | ผู้ใช้เสียหนึ่งคนห้ามกระทบคนอื่น
import { dueReminders, type Item } from './reminders.ts';

/* เพดานการส่งต่อรอบ: วัดจริงบน Cloudflare แผนฟรี (14 ต.ค. 2026) รอบว่าง ~1.4 ms, ส่ง 1 ครั้ง 5.1 ms, ส่ง 5 ครั้ง 16.4 ms
   => ~3 ms ต่อการส่ง; เพดาน CPU แผนฟรี 10 ms จึงปลอดภัยที่ <= 2 ครั้ง (~7 ms) | ส่วนเกินรอรอบถัดไปภายในหน้าต่าง WINDOW_MIN นาที */
export const MAX_SENDS_PER_RUN = 2;
export type SubRow = { id?: number | string; user_id: string | null; endpoint: string; p256dh: string; auth: string; hide_title?: boolean; created_at?: string };
export type SendFn = (sub: SubRow, payload: { title: string; body: string; tag: string }) => Promise<{ status: number }>;
export type SchedResult = { sent: number; deferred: number; removed: number; errors: number; skipped?: string };

type Env = { SUPABASE_URL: string; SUPABASE_SERVICE_KEY: string; VAPID_KEYS_JSON?: string; CUSTOM_FETCH?: any; [k: string]: any };
const BKK_MS = 7 * 3600 * 1000; // ไทย UTC+7 คงที่ ไม่มีเวลาออมแสง

// Date (UTC) -> 'YYYY-MM-DD HH:MM' เวลาไทย (คำนวณจากตัวเลขล้วน ไม่พึ่งเขตเวลาของ Worker)
export function bangkokNow(utc: Date): string {
  const d = new Date(utc.getTime() + BKK_MS), p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const hdr = (env: Env) => ({ apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' });
const base = (env: Env) => env.SUPABASE_URL.replace(/\/+$/, '');
const fx = (env: Env): typeof fetch => env.CUSTOM_FETCH?.fetch ?? env.CUSTOM_FETCH ?? fetch;

/* นาทีสัมบูรณ์เวลาไทย (หน่วยเดียวกับ Due.atAbs = dayNumber*1440 + นาทีของวัน) จาก timestamp ISO | อ่านไม่ได้ = null */
export function absBangkok(iso: unknown): number | null {
  if (typeof iso !== 'string') return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return Math.floor((ms + BKK_MS) / 60000);
}

async function sha8(s: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function runScheduler(env: Env, nowUtc: Date, deps: { send: SendFn }): Promise<SchedResult> {
  const res: SchedResult = { sent: 0, deferred: 0, removed: 0, errors: 0 };
  if (!env.VAPID_KEYS_JSON || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return { ...res, skipped: 'not configured' };
  const f = fx(env); const now = bangkokNow(nowUtc);
  let subs: SubRow[];
  try {
    const r = await f(`${base(env)}/rest/v1/push_subscriptions?select=*`, { headers: hdr(env) });
    if (!r.ok) return { ...res, skipped: 'subscriptions unavailable' };
    subs = ((await r.json()) as SubRow[]).filter((s) => s.user_id); // แถว PoC ที่ user_id เป็น null ไม่ส่ง ไม่แตะ
  } catch { return { ...res, skipped: 'subscriptions unavailable' }; }

  const byUser = new Map<string, SubRow[]>();
  for (const s of subs) byUser.set(s.user_id!, [...(byUser.get(s.user_id!) ?? []), s]); // อ่านรายการเฉพาะผู้ใช้ที่มีเครื่องรับ
  let budget = MAX_SENDS_PER_RUN;

  for (const [uid, devices] of byUser) {
    if (budget <= 0) { res.deferred++; continue; }
    try {
      const ir = await f(`${base(env)}/rest/v1/items?select=*&user_id=eq.${encodeURIComponent(uid)}`, { headers: hdr(env) });
      if (!ir.ok) { res.errors++; continue; }
      const items = (await ir.json()) as (Item & { user_id: string })[];
      const mine = items.filter((i) => i.user_id === uid); // ป้องกันซ้ำชั้นที่สอง: ไม่เชื่อว่าฐานข้อมูลกรองมาถูก
      for (const due of dueReminders(mine, now)) {
        for (const dev of devices) {
          if (budget <= 0) { res.deferred++; continue; }
          /* ห้ามเด้งย้อนหลังให้เครื่องที่เพิ่งสมัคร: เตือนที่ครบกำหนดก่อนเครื่องนี้สมัครไม่ใช่ของเครื่องนี้ (ข้ามโดยไม่จองคีย์)
             อ่านเวลาสมัครไม่ได้ = ไม่กั้น (เอนไปทางส่ง ไม่ใช่เงียบ) | เวลาสมัครที่อยู่ในนาทีเดียวกับเวลาเด้งยังส่ง (>) */
          const joined = absBangkok(dev.created_at);
          if (joined !== null && joined > due.atAbs) continue;
          const key = `${due.key}|${await sha8(dev.endpoint)}`;
          const claim = await f(`${base(env)}/rest/v1/notification_log`, { method: 'POST', headers: { ...hdr(env), Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: uid, key }) });
          if (claim.status === 409) continue;   // มีคนจอง/ส่งไปแล้ว
          if (!claim.ok) continue;              // จองไม่ได้ = ไม่ส่ง (ดีกว่าส่งซ้ำ)
          budget--;
          const payload = { title: 'Evarel', body: dev.hide_title ? 'มีรายการถึงเวลาแล้ว' : due.title || 'มีรายการถึงเวลาแล้ว', tag: due.key, atAbs: due.atAbs }; // atAbs ให้เครื่องบอกได้ว่าเตือนมาช้า (เวลาของรายการ ไม่ใช่ข้อมูลส่วนตัว)
          let status = 0;
          try { status = (await deps.send(dev, payload)).status; } catch { status = 0; }
          if (status >= 200 && status < 300) { res.sent++; continue; }
          if (status === 404 || status === 410) { // เครื่องหมดอายุ: ล้างทิ้ง ไม่ลองใหม่
            await f(`${base(env)}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(dev.endpoint)}&user_id=eq.${encodeURIComponent(uid)}`, { method: 'DELETE', headers: hdr(env) }).catch(() => {});
            res.removed++; continue;
          }
          if (status === 0 || status === 429 || status >= 500) { // ล้มชั่วคราว: คืนการจอง รอบหน้าลองใหม่ (ยังอยู่ในหน้าต่าง)
            await f(`${base(env)}/rest/v1/notification_log?user_id=eq.${encodeURIComponent(uid)}&key=eq.${encodeURIComponent(key)}`, { method: 'DELETE', headers: hdr(env) }).catch(() => {});
            res.errors++; continue;
          }
          res.errors++; // 4xx อื่น: ล้มถาวร ไม่ลองใหม่ (คงการจองไว้)
        }
      }
    } catch { res.errors++; } // ผู้ใช้หนึ่งคนพังต้องไม่ล้มทั้งรอบ
  }
  return res;
}
