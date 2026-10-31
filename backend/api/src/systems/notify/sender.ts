// ตัวส่ง Push จริง (webpush-webcrypto) ใช้วิธีเรียกเดียวกับต้นแบบที่ส่งถึง Android ได้เมื่อ 9 ต.ค. 2026
// เพิ่ม timeout ที่ต้นแบบไม่มี: บริการ Push ค้างต้องไม่ทำให้ทั้งรอบค้าง (เพดาน CPU/เวลาของแผนฟรี)
import { ApplicationServerKeys, generatePushHTTPRequest, setWebCrypto } from 'webpush-webcrypto';
import type { SendFn } from './scheduler.ts';

export const SEND_TIMEOUT_MS = 8000;
/* อายุข้อความที่บริการ Push เก็บไว้รอเครื่องที่ออฟไลน์ (15 ชั่วโมง) | นโยบายที่เลือกเอง ไม่ใช่ข้อเท็จจริงของแพลตฟอร์ม ปรับได้ที่ค่าเดียวนี้
   ยาวกว่า 10 นาทีเดิม: เครื่องที่ไม่มีเน็ตเกิน 10 นาทีเคยพลาดเตือนถาวร | สั้นกว่าครึ่งวัน: เตือนที่เก่าเกินไปหมดประโยชน์
   เด้งช้าไม่น่ากลัวเพราะ service worker ต่อท้ายข้อความว่าเลยเวลามากี่นาที (lateNote ใน sw.js) และการจองคีย์ต่อเครื่องกันส่งซ้ำอยู่แล้ว */
export const PUSH_TTL_SECONDS = 15 * 3600;
let keysCache: { src: string; keys: Promise<any> } | null = null;

export function makeSender(env: { VAPID_KEYS_JSON?: string; VAPID_CONTACT?: string }, fetchImpl: typeof fetch = fetch): SendFn {
  setWebCrypto(crypto);
  const raw = String(env.VAPID_KEYS_JSON ?? '');
  if (!keysCache || keysCache.src !== raw) keysCache = { src: raw, keys: ApplicationServerKeys.fromJSON(JSON.parse(raw)) };
  const keys = keysCache.keys;
  return async (sub, payload) => {
    const req = await generatePushHTTPRequest({
      applicationServerKeys: await keys,
      payload: JSON.stringify(payload),
      target: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      adminContact: env.VAPID_CONTACT || 'mailto:evarel.support@gmail.com',
      ttl: PUSH_TTL_SECONDS,
    });
    const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), SEND_TIMEOUT_MS);
    try {
      const res = await fetchImpl(req.endpoint, { method: 'POST', headers: req.headers, body: req.body, signal: ac.signal });
      return { status: res.status };
    } catch { return { status: 0 }; } // ค้าง/เครือข่ายล้ม = ล้มชั่วคราว ให้ตัวจัดเวลาคืนการจองและลองใหม่
    finally { clearTimeout(timer); }
  };
}
