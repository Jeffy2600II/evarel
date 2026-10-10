/* Agent loop (03-ai-agent.md §2): สูงสุด 3 รอบ LLM ต่อข้อความ | เครื่องมือเขียน = คืน "ข้อเสนอ" ไม่เขียนฐานข้อมูล */
import { TOOL_DEFS, WRITE_TOOLS, validate, runQuery, Item } from './tools';
import { callLLM, Msg } from './llm';

export const MAX_ROUNDS = 3;
const HIST_MAX = 8;

export type Proposal = { tool: string; args: Record<string, any>; summary: string };
export type AgentOut = { text: string; proposals: Proposal[]; rounds: number; tokens: number; provider: string; limited?: boolean };

const TH_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
export function bangkokNow(now = new Date()) {
  const b = new Date(+now + 7 * 3600000);
  const date = b.toISOString().slice(0, 10);
  return { date, hhmm: b.toISOString().slice(11, 16), dow: TH_DAYS[b.getUTCDay()] };
}

export function systemPrompt(now = new Date()) {
  const n = bangkokNow(now);
  return [
    'คุณคือผู้ช่วยในแอป Evarel ช่วยจัดการงาน กิจวัตร นัด และตารางเรียนของผู้ใช้ ตอบภาษาไทย สั้น กระชับ เป็นกันเอง',
    `ตอนนี้คือวัน${n.dow}ที่ ${n.date} เวลา ${n.hhmm} (Asia/Bangkok) ใช้เป็นฐานคำนวณ "พรุ่งนี้" "วันจันทร์หน้า" ฯลฯ`,
    'ใช้เครื่องมือเมื่อผู้ใช้สั่งเพิ่ม/แก้/ลบ/บันทึก ห้ามเดา id ให้เรียก item_query ก่อน ห้ามบอกว่าทำเสร็จแล้ว เพราะเครื่องมือเขียนเป็นเพียงข้อเสนอที่ผู้ใช้ต้องกดยืนยัน',
    'ลงมือทำทันทีเมื่อมีชื่อรายการ: เวลา วิชา จำนวนครั้ง เป็นช่องเสริมที่เว้นว่างได้ ห้ามถามถึงสิ่งเหล่านี้ ถามกลับได้เฉพาะเมื่อไม่รู้ว่าผู้ใช้ต้องการทำอะไรกับรายการไหนจริงๆ (เช่น ชื่อตรงกับหลายรายการ) และถามสั้นข้อเดียว',
    'เมื่อผู้ใช้อ้างถึงรายการด้วยชื่อ (แก้/ลบ/บันทึก) ให้เรียก item_query ด้วย name เท่านั้น ไม่ใส่ date ถ้าผลว่างให้ลองชื่อสั้นลงอีกครั้งก่อนบอกว่าไม่พบ',
    'ถ้า item_query เจอรายการเดียวที่ชื่อตรงกับที่ผู้ใช้พูดถึง ให้ใช้ id นั้นเลย ไม่ต้องถามยืนยันชื่อซ้ำ (ผู้ใช้จะได้กดยืนยันที่การ์ดอยู่แล้ว)',
    'เวลาบอกวันที่ ให้ใช้วันที่ตามที่ระบบให้มาเท่านั้น ห้ามเดาปีเอง',
    'คุณไม่มีข้อมูลอากาศ ข่าว หรืออินเทอร์เน็ต ห้ามแต่งข้อมูลเหล่านั้น ตอบเฉพาะสิ่งที่รู้จากข้อมูลของผู้ใช้ในแอปนี้',
  ].join('\n');
}

export function summarize(tool: string, a: Record<string, any>, items: Item[]): string {
  const name = (id: number) => items.find((x) => Number(x.id) === id)?.title ?? `#${id}`;
  switch (tool) {
    case 'item_create': return `เพิ่ม "${a.title}"${a.time ? ` เวลา ${a.time}` : ''}${a.start ? ` วันที่ ${a.start}` : ''}`;
    case 'item_update': return `แก้ "${name(a.id)}"`;
    case 'item_delete': return `ลบ "${name(a.id)}"`;
    case 'log_set': return `บันทึก "${name(a.id)}" วันที่ ${a.date} = ${a.value}`;
    case 'skip_set': return `ข้าม "${name(a.id)}" วันที่ ${a.date}`;
    case 'reminder_set': return `ตั้งเตือน "${name(a.id)}" ล่วงหน้า ${a.rem.join(', ')} นาที`;
  }
  return tool;
}

export async function runAgent(env: any, userText: string, history: { who: 'u' | 'a'; text: string }[], items: Item[], now = new Date()): Promise<AgentOut> {
  const msgs: Msg[] = [{ role: 'system', content: systemPrompt(now) }];
  for (const h of history.slice(-HIST_MAX)) if (h.text) msgs.push({ role: h.who === 'u' ? 'user' : 'assistant', content: String(h.text).slice(0, 600) });
  msgs.push({ role: 'user', content: userText });

  const proposals: Proposal[] = [];
  let tokens = 0, rounds = 0, provider = 'groq';
  for (; rounds < MAX_ROUNDS;) {
    rounds++;
    const r = await callLLM(env, msgs, TOOL_DEFS);
    tokens += r.tokens; provider = r.provider;
    const calls: any[] = r.message.tool_calls || [];
    if (!calls.length) return { text: String(r.message.content || '').trim() || 'ขออภัย ผมตอบไม่ได้ ลองพิมพ์ใหม่อีกครั้ง', proposals, rounds, tokens, provider };

    msgs.push({ role: 'assistant', content: r.message.content ?? null, tool_calls: calls });
    let needAnother = false;
    for (const c of calls.slice(0, 4)) {
      const name = c.function?.name as string;
      let raw: any = {};
      try { raw = JSON.parse(c.function?.arguments || '{}'); } catch { /* ว่าง = ไม่ผ่านตรวจ */ }
      const v = validate(name, raw, items);
      if (env.AI_DEBUG) console.log('TOOLCALL', name, JSON.stringify(raw), v.ok ? 'ok' : v.error);
      let result: any;
      if (!v.ok) { result = { error: v.error }; needAnother = true; }
      else if (name === 'item_query') { result = { items: runQuery(v.args, items) }; needAnother = true; }
      else if (WRITE_TOOLS.has(name)) { proposals.push({ tool: name, args: v.args, summary: summarize(name, v.args, items) }); result = { status: 'proposed', note: 'รอผู้ใช้ยืนยัน' }; }
      msgs.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(result) });
    }
    if (!needAnother) {
      // ข้อเสนอครบแล้ว ไม่ต้องเรียก LLM อีกรอบ — ประหยัดโทเคน ตอบด้วยโค้ด
      return { text: proposals.length === 1 ? 'เตรียมไว้ให้แล้ว กดยืนยันด้านล่างได้เลย' : `เตรียมไว้ให้ ${proposals.length} อย่าง กดยืนยันได้เลย`, proposals, rounds, tokens, provider };
    }
  }
  return { text: proposals.length ? 'ผมเตรียมได้เท่านี้ก่อน ตรวจการ์ดด้านล่างแล้วกดยืนยันได้เลย' : 'เรื่องนี้ต้องใช้หลายขั้นเกินกว่าที่ผมทำรอบเดียวได้ ลองบอกให้เจาะจงขึ้นอีกนิดนะ', proposals, rounds, tokens, provider, limited: true };
}
