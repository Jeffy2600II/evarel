/* Path: src/systems/items/validate.ts | Purpose: ตรวจรูปร่างและขนาดข้อมูล item ก่อนถึงฐานข้อมูล (ADR 0003: กันการยัดข้อมูล)
   หลักการ: เพดานทุกตัวต้อง "สูงกว่าที่ UI และคนจริงทำได้หลายเท่า" (ที่มา: app-v13/js/app.js MAX_REM=8, maxlength 12-80, REM_PRESETS 5 ค่า)
   ฟังก์ชันบริสุทธิ์ ไม่มี I/O: คืนข้อความ error หรือ null เมื่อผ่าน */
export const LIMITS = {
  BODY_BYTES: 64 * 1024,   // item จริง ~260B; skip เต็มเพดาน 2,000 คีย์ ~34KB
  TITLE: 200, SHORT_TEXT: 100, TIME: 10, DATE: 10,
  REM_MAX: 16,             // UI MAX_REM = 8
  DAYS_MAX: 7, EVERY_MAX: 999,
  SKIP_KEYS: 2000,         // 1 คีย์/วันที่ข้าม ~5.5 ปีต่อ item
  LOG_KEYS: 4000,
  ITEMS_PER_USER: 500,     // คนจริงสูงสุดวัดได้ 15
  TARGET_MAX: 1_000_000,
} as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const isStr = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
const isPlainObj = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);

export function validateItemShape(b: any): string | null {
  if (!isStr(b.title, LIMITS.TITLE)) return `title must be string <= ${LIMITS.TITLE} chars`;
  for (const k of ['subject', 'unitName'] as const) {
    if (b[k] !== undefined && !isStr(b[k], LIMITS.SHORT_TEXT)) return `${k} must be string <= ${LIMITS.SHORT_TEXT} chars`;
  }
  for (const k of ['time', 'timeEnd'] as const) {
    if (b[k] !== undefined && !(typeof b[k] === 'string' && (b[k] === '' || TIME_RE.test(b[k])))) return `${k} must be HH:MM or empty`;
  }
  for (const k of ['start', 'end'] as const) {
    if (b[k] !== undefined && !(typeof b[k] === 'string' && (b[k] === '' || DATE_RE.test(b[k])))) return `${k} must be YYYY-MM-DD or empty`;
  }
  if (b.target !== undefined && !(typeof b.target === 'number' && Number.isFinite(b.target) && b.target >= 0 && b.target <= LIMITS.TARGET_MAX)) return 'target out of range';
  if (b.repeat !== undefined) {
    const r = b.repeat;
    if (!isPlainObj(r)) return 'repeat must be object';
    if (r.unit !== undefined && !['day', 'week', 'none'].includes(r.unit)) return 'repeat.unit invalid';
    if (r.every !== undefined && !(Number.isInteger(r.every) && r.every >= 1 && r.every <= LIMITS.EVERY_MAX)) return 'repeat.every out of range';
    if (r.days !== undefined) {
      if (!Array.isArray(r.days) || r.days.length > LIMITS.DAYS_MAX) return `repeat.days must be array <= ${LIMITS.DAYS_MAX}`;
      if (!r.days.every((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)) return 'repeat.days values must be 0-6';
    }
    if (Object.keys(r).some(k => !['unit', 'every', 'days'].includes(k))) return 'repeat has unknown field';
  }
  if (b.skip !== undefined) {
    if (!isPlainObj(b.skip)) return 'skip must be object';
    const ks = Object.keys(b.skip);
    if (ks.length > LIMITS.SKIP_KEYS) return `skip has too many entries (max ${LIMITS.SKIP_KEYS})`;
    if (!ks.every(k => DATE_RE.test(k) && b.skip[k] === true)) return 'skip keys must be YYYY-MM-DD with value true';
  }
  if (b.rem !== undefined) {
    if (!Array.isArray(b.rem) || b.rem.length > LIMITS.REM_MAX) return `rem must be array <= ${LIMITS.REM_MAX}`;
    for (const r of b.rem) {
      if (!isPlainObj(r) || !['before', 'at'].includes((r as any).k)) return 'rem entry invalid';
      if (Object.keys(r).some(k => !['k', 'm', 't'].includes(k))) return 'rem entry has unknown field';
      if ((r as any).m !== undefined && !(Number.isInteger((r as any).m) && (r as any).m >= 0 && (r as any).m <= 100000)) return 'rem.m out of range';
      if ((r as any).t !== undefined && !(typeof (r as any).t === 'string' && TIME_RE.test((r as any).t))) return 'rem.t must be HH:MM';
    }
  }
  return null;
}

/* อ่าน body แบบมีเพดานก่อน parse: เช็ก Content-Length (เร็ว) แล้วเช็กความยาวจริงของข้อความ (กันโกหก header) */
export async function readJsonLimited(request: Request, maxBytes: number = LIMITS.BODY_BYTES): Promise<{ ok: true; body: any } | { ok: false; status: number; msg: string }> {
  const cl = Number(request.headers.get('content-length') || 0);
  if (cl > maxBytes) return { ok: false, status: 413, msg: 'Payload too large' };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, status: 413, msg: 'Payload too large' };
  try { return { ok: true, body: JSON.parse(text) }; } catch { return { ok: false, status: 400, msg: 'Invalid JSON' }; }
}
