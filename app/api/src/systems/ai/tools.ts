/* เครื่องมือของ AI Agent — ตรงกับโมเดล items จริง (habit|task|event|class, track check|count|timer|none)
   กติกา: เครื่องมืออ่าน (item_query) รันทันที | เครื่องมือเขียนไม่แตะฐานข้อมูล แต่คืน "ข้อเสนอ" ให้แอปแสดงการ์ดยืนยัน */

export const TYPES = ['habit', 'task', 'event', 'class'];
export const TRACKS = ['check', 'count', 'timer', 'none'];
export const UNITS = ['none', 'day', 'week', 'month'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const itemProps = {
  type: { type: 'string', enum: TYPES },
  title: { type: 'string' },
  subject: { type: 'string' },
  time: { type: 'string', description: 'HH:MM' },
  timeEnd: { type: 'string', description: 'HH:MM' },
  track: { type: 'string', enum: TRACKS },
  target: { type: 'number' },
  unitName: { type: 'string' },
  repeat: {
    type: 'object',
    properties: {
      unit: { type: 'string', enum: UNITS },
      every: { type: 'number' },
      days: { type: 'array', items: { type: 'number' }, description: '0=อาทิตย์..6=เสาร์' },
    },
  },
  start: { type: 'string', description: 'YYYY-MM-DD' },
  end: { type: 'string', description: 'YYYY-MM-DD' },
  rem: { type: 'array', items: { type: 'number' }, description: 'นาทีที่เตือนล่วงหน้า' },
};

const fn = (name: string, description: string, properties: any, required: string[] = []) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
});

export const TOOL_DEFS = [
  fn('item_create', 'เพิ่มรายการใหม่ (กิจวัตร/งาน/นัด/วิชา)', itemProps, ['title']),
  fn('item_update', 'แก้ไขรายการที่มีอยู่ ระบุ id จากผลของ item_query เท่านั้น', { id: { type: 'number' }, ...itemProps }, ['id']),
  fn('item_delete', 'ลบรายการ ระบุ id จากผลของ item_query เท่านั้น', { id: { type: 'number' } }, ['id']),
  fn('item_query', 'ค้นรายการของผู้ใช้ ถ้าจะหา/แก้/ลบรายการตามชื่อให้ใส่ name เท่านั้น ห้ามใส่ date เพราะรายการอาจอยู่คนละวัน ใส่ date เฉพาะเมื่อผู้ใช้ถามว่าวันนั้นมีอะไร', { name: { type: 'string', description: 'ส่วนหนึ่งของชื่อรายการ' }, date: { type: 'string', description: 'YYYY-MM-DD' }, type: { type: 'string', enum: TYPES } }),
  fn('log_set', 'บันทึกค่ารายวันของกิจวัตร', { id: { type: 'number' }, date: { type: 'string' }, value: { type: 'number' } }, ['id', 'date', 'value']),
  fn('skip_set', 'ข้ามกิจวัตรในวันนั้น', { id: { type: 'number' }, date: { type: 'string' } }, ['id', 'date']),
  fn('reminder_set', 'ตั้งเตือนล่วงหน้าของรายการ (นาที)', { id: { type: 'number' }, rem: { type: 'array', items: { type: 'number' } } }, ['id', 'rem']),
  fn('memory_save', 'จำข้อเท็จจริงถาวรเกี่ยวกับผู้ใช้ข้ามแชท (ความชอบ นิสัย ข้อมูลพื้นฐานที่ไม่เปลี่ยนบ่อย) ใช้เมื่อผู้ใช้สั่งให้จำ หรือบอกข้อเท็จจริงถาวรชัดเจน ห้ามใช้จดงาน/นัด/กิจวัตร (ใช้ item_create) ห้ามจดสิ่งชั่วคราว', { fact: { type: 'string', description: 'ข้อเท็จจริงหนึ่งข้อ ประโยคเดียว ขึ้นต้นด้วย "ผู้ใช้"' } }, ['fact']),
  fn('memory_forget', 'ลืมข้อเท็จจริงที่เคยจำ ใช้เมื่อผู้ใช้สั่งให้ลืม/ลบความจำ ระบุ id จากบล็อก <ความจำเกี่ยวกับผู้ใช้> เท่านั้น ห้ามเดา id', { id: { type: 'string', description: 'id ขึ้นต้นด้วย fact-' } }, ['id']),
];

export const WRITE_TOOLS = new Set(['item_create', 'item_update', 'item_delete', 'log_set', 'skip_set', 'reminder_set', 'memory_save', 'memory_forget']);
export const MEMORY_TOOLS = new Set(['memory_save', 'memory_forget']);

export type Item = Record<string, any>;
export type Check = { ok: true; args: Record<string, any> } | { ok: false; error: string };

/* ตรวจพารามิเตอร์ด้วยโค้ด — ไม่เชื่อ LLM; คืนเฉพาะ key ที่อนุญาต */

/* memory_save ต้องมาจากผู้ใช้ "สั่งให้จำ" หรือ "บอกข้อเท็จจริง" เท่านั้น — คำถามล้วน (ฉันชอบอะไร? ฉันเรียนชั้นไหน?) ห้ามกลายเป็นความจำ
   บั๊กจริงที่เจอ 10 ต.ค. 2026: ไม่มีความจำที่เกี่ยวข้อง -> โมเดลเสนอจำ "ผู้ใช้เรียนระดับไม่ระบุ" ตัดสินในโค้ดไม่ฝากโมเดล */
const REMEMBER_CMD = /จำ(ไว้|ด้วย|เลย|หน่อย|ว่า|เอาไว้)|อย่าลืม(ว่า)?|remember|note that|บันทึก(ไว้)?(ว่า)?ว่า/i;
const QUESTION = /\?|ไหม|มั้ย|หรือเปล่า|หรือไม่|อะไร|ที่ไหน|เมื่อไหร่|เมื่อไร|ยังไง|อย่างไร|กี่(โมง|ครั้ง|วัน|ชั่วโมง|นาที|คน|ชิ้น|อัน)?|ใคร|ทำไม|ไหน|แค่ไหน|เท่าไหร่|เท่าไร|หรอ$|เหรอ$/;
export function memorySaveAllowed(userText: string): boolean {
  const t = String(userText || '').trim();
  if (!t) return false;
  if (REMEMBER_CMD.test(t)) return true; // สั่งจำชัดเจน ผ่านเสมอ
  return !QUESTION.test(t);              // ไม่ใช่คำสั่งจำ: ผ่านเฉพาะที่ไม่ใช่คำถาม (เช่น "ฉันตื่น 5 โมงทุกวัน")
}

export function validate(name: string, raw: any, items: Item[], memFacts: { id: string; fact: string }[] = [], userText?: string): Check {
  const a = raw && typeof raw === 'object' ? raw : {};
  const need = (cond: boolean, msg: string): Check | null => (cond ? null : { ok: false, error: msg });
  const idOk = (): Check | null => {
    const id = Number(a.id);
    if (!Number.isFinite(id)) return { ok: false, error: 'ต้องระบุ id' };
    return items.some((x) => Number(x.id) === id) ? null : { ok: false, error: `ไม่พบรายการ id ${id} (ห้ามเดา id ให้ใช้ item_query ก่อน)` };
  };
  const out: Record<string, any> = {};
  const copyItem = (): Check | null => {
    if (a.type !== undefined) { if (!TYPES.includes(a.type)) return { ok: false, error: 'type ไม่ถูกต้อง' }; out.type = a.type; }
    if (a.title !== undefined) { const t = String(a.title).trim().slice(0, 120); if (!t) return { ok: false, error: 'title ว่าง' }; out.title = t; }
    if (a.subject !== undefined) out.subject = String(a.subject).slice(0, 80);
    for (const k of ['time', 'timeEnd']) if (a[k] !== undefined && a[k] !== '') { if (!HHMM.test(a[k])) return { ok: false, error: `${k} ต้องเป็น HH:MM` }; out[k] = a[k]; }
    for (const k of ['start', 'end']) if (a[k] !== undefined && a[k] !== '') { if (!YMD.test(a[k]) || isNaN(Date.parse(a[k]))) return { ok: false, error: `${k} ต้องเป็น YYYY-MM-DD` }; out[k] = a[k]; }
    if (a.track !== undefined) { if (!TRACKS.includes(a.track)) return { ok: false, error: 'track ไม่ถูกต้อง' }; out.track = a.track; }
    if (a.target !== undefined) { const n = Number(a.target); if (!(n > 0 && n <= 100000)) return { ok: false, error: 'target ต้องเป็นเลขบวก' }; out.target = n; }
    if (a.unitName !== undefined) out.unitName = String(a.unitName).slice(0, 20);
    if (a.repeat !== undefined) {
      const r = a.repeat || {};
      if (!UNITS.includes(r.unit)) return { ok: false, error: 'repeat.unit ไม่ถูกต้อง' };
      const every = Math.max(1, Math.min(365, Math.round(Number(r.every) || 1)));
      const days = Array.isArray(r.days) ? [...new Set(r.days.map(Number).filter((d: number) => d >= 0 && d <= 6))] : [];
      if (r.unit === 'week' && !days.length) return { ok: false, error: 'repeat รายสัปดาห์ต้องระบุ days' };
      out.repeat = { unit: r.unit, every, days };
    }
    if (a.rem !== undefined) {
      if (!Array.isArray(a.rem)) return { ok: false, error: 'rem ต้องเป็น array' };
      out.rem = [...new Set(a.rem.map(Number).filter((m: number) => m >= 0 && m <= 10080))].slice(0, 5);
    }
    return null;
  };

  let e: Check | null = null;
  switch (name) {
    case 'item_create':
      e = need(!!String(a.title ?? '').trim(), 'ต้องระบุ title') || copyItem();
      if (e) return e;
      if (!out.type) out.type = 'task';
      return { ok: true, args: out };
    case 'item_update':
      e = idOk() || copyItem();
      if (e) return e;
      out.id = Number(a.id);
      return { ok: true, args: out };
    case 'item_delete':
      e = idOk();
      return e || { ok: true, args: { id: Number(a.id) } };
    case 'log_set':
      e = idOk() || need(YMD.test(a.date || ''), 'date ต้องเป็น YYYY-MM-DD') || need(Number.isFinite(Number(a.value)) && Number(a.value) >= 0, 'value ต้องเป็นเลข ≥ 0');
      return e || { ok: true, args: { id: Number(a.id), date: a.date, value: Number(a.value) } };
    case 'skip_set':
      e = idOk() || need(YMD.test(a.date || ''), 'date ต้องเป็น YYYY-MM-DD');
      return e || { ok: true, args: { id: Number(a.id), date: a.date } };
    case 'reminder_set':
      e = idOk() || need(Array.isArray(a.rem), 'rem ต้องเป็น array');
      if (e) return e;
      return { ok: true, args: { id: Number(a.id), rem: [...new Set((a.rem as any[]).map(Number).filter((m) => m >= 0 && m <= 10080))].slice(0, 5) } };
    case 'memory_save': {
      if (userText !== undefined && !memorySaveAllowed(userText)) return { ok: false, error: 'ผู้ใช้ถามคำถาม ไม่ได้สั่งให้จำ ห้ามเสนอจำ ให้ตอบคำถามจากข้อมูลที่มี หรือบอกว่าไม่ทราบ' };
      const fact = String(a.fact ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
      if (fact.length < 4) return { ok: false, error: 'fact สั้นเกินไป' };
      return { ok: true, args: { fact } };
    }
    case 'memory_forget': {
      const id = String(a.id ?? '');
      const hit = memFacts.find((m) => m.id === id);
      if (!hit) return { ok: false, error: 'ไม่พบความจำ id นี้ในบล็อกความจำ (ห้ามเดา id)' };
      return { ok: true, args: { id, fact: hit.fact } };
    }
    case 'item_query': {
      if (a.date !== undefined && !YMD.test(a.date)) return { ok: false, error: 'date ต้องเป็น YYYY-MM-DD' };
      if (a.type !== undefined && !TYPES.includes(a.type)) return { ok: false, error: 'type ไม่ถูกต้อง' };
      return { ok: true, args: { ...(a.name ? { name: String(a.name).slice(0, 60) } : {}), ...(a.date && !a.name ? { date: a.date } : {}), ...(a.type ? { type: a.type } : {}) } };
    }
  }
  return { ok: false, error: `ไม่รู้จักเครื่องมือ ${name}` };
}

const parse = (s: string) => new Date(s + 'T00:00:00Z');
const DAY = 86400000;
/* เหมือน occursOn ในแอป — ให้ item_query ตอบด้วยโค้ด ไม่ถาม LLM */
export function occursOn(it: Item, ds: string): boolean {
  const r = it.repeat || { unit: 'none' };
  if (!it.start) return false;
  const d0 = parse(it.start), d = parse(ds);
  if (d < d0 || (it.end && d > parse(it.end))) return false;
  if (r.unit === 'none') return ds === it.start;
  if (r.unit === 'day') return Math.round((+d - +d0) / DAY) % (r.every || 1) === 0;
  if (r.unit === 'week') {
    const ws = new Date(+d0 - d0.getUTCDay() * DAY);
    return (r.days || []).includes(d.getUTCDay()) && Math.floor(Math.round((+d - +ws) / DAY) / 7) % (r.every || 1) === 0;
  }
  return d.getUTCDate() === d0.getUTCDate() && (((d.getUTCFullYear() - d0.getUTCFullYear()) * 12 + d.getUTCMonth() - d0.getUTCMonth()) % (r.every || 1) === 0);
}

export function runQuery(args: any, items: Item[]) {
  const date = args.date || undefined;
  let list = items;
  if (args.name) { const q = String(args.name).toLowerCase(); list = list.filter((i) => String(i.title || '').toLowerCase().includes(q)); }
  if (args.type) list = list.filter((i) => i.type === args.type);
  if (args.date) list = list.filter((i) => occursOn(i, args.date));
  return list.slice(0, 30).map((i) => ({ date, id: i.id, type: i.type, title: i.title, start: i.start, time: i.time || '', subject: i.subject || '', track: i.track, done: args.date ? (i.log?.[args.date] ?? 0) : undefined }));
}
