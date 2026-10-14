// ตัวห่อ Edge Function ของ Supabase: pg_cron -> pg_net -> ฟังก์ชันนี้ -> runScheduler (ตรรกะเดียวกับ Worker ที่พิสูจน์แล้ว)
// ความปลอดภัย: ฟังก์ชันนี้ถือ service key (ข้าม RLS) จึงต้องมี x-cron-secret ตรงกับ CRON_SECRET ทุกครั้ง ไม่ตั้งค่า = ปฏิเสธ ไม่เปิดโล่ง
import { runScheduler, type SchedResult } from "../../api/src/systems/notify/scheduler.ts";
import { makeSender } from "../../api/src/systems/notify/sender.ts";

export type EdgeEnv = { CRON_SECRET?: string; SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; VAPID_KEYS_JSON?: string; VAPID_CONTACT?: string };
export type Deps = { run: (env: any, now: Date, d: { send: any }) => Promise<SchedResult>; sender: (env: any) => any; now: () => Date };
export const realDeps: Deps = { run: runScheduler as any, sender: makeSender as any, now: () => new Date() };

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

/** เทียบสตริงแบบเวลาคงที่ (ไม่เผยความยาวหรือตำแหน่งที่ต่างผ่านเวลาตอบ) ความยาวต่างกันก็วนครบความยาวที่ยาวกว่า */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

export async function handle(req: Request, env: EdgeEnv, deps: Deps = realDeps): Promise<Response> {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const expected = env.CRON_SECRET ?? "";
  if (!expected) return json({ error: "not configured" }, 503);                 // ลืมตั้งค่า = ปิด ไม่ใช่เปิดโล่ง
  const got = req.headers.get("x-cron-secret") ?? "";
  if (!safeEqual(got, expected)) return json({ error: "unauthorized" }, 401);
  if (!env.VAPID_KEYS_JSON) return json({ skipped: "no vapid" });               // cron ต้องไม่ล้มซ้ำ (ถูกระงับ)
  try {
    const schedEnv = { SUPABASE_URL: env.SUPABASE_URL ?? "", SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ?? "", VAPID_KEYS_JSON: env.VAPID_KEYS_JSON, VAPID_CONTACT: env.VAPID_CONTACT };
    const r = await deps.run(schedEnv, deps.now(), { send: deps.sender(schedEnv) });
    return json(r);
  } catch {
    return json({ error: "scheduler failed" }, 500);                            // ข้อความกลาง ไม่รั่วรายละเอียด/ค่าลับ
  }
}
