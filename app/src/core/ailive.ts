/* ชั้นฐาน (ES module จริง): ตัวเรียก AI จริงผ่าน Worker — aiAsk (แชท + รับข้อเสนอ) และ memCall (ความจำระยะยาว MemoryLake)
   ตรรกะชุดเดียว: โมดูลเดิม 18-services__ai-live เรียกใช้ที่นี่ผ่านตัวห่อที่ส่ง deps เข้ามา (api token quotaFromChat อ่าน resetAt) คงพฤติกรรมตรงตัวทุกจุด
   เซิร์ฟเวอร์คืน "ข้อเสนอ" ไม่เขียนฐานข้อมูล -> แอปแสดงการ์ดยืนยัน -> กดยืนยันแล้วเขียนผ่าน commit() เดิม (undo + sync + realtime ฟรี)
   ความจำระยะยาวไม่ใช่ข้อมูลใน S.items จึงไม่ผ่าน commit() — เรียกเครือข่ายหลังผู้ใช้กดยืนยันเท่านั้น */

export type AiAskDeps = { api: string; token: () => Promise<string>; quotaFromChat: (qc: any, hit429: boolean) => void; quotaResetAt: () => any };

export function aiAskOf(deps: AiAskDeps) {
  return async (text: string, history: any) => {
    const t = await deps.token(), ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 45000);
    try { const r = await fetch(`${deps.api}/ai/chat`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ text, history }) });
      let j: any = {}; try { j = await r.json() } catch (e) {}
      if (r.status === 503) return { text: '', cards: [], notice: { kind: 'limit', reason: 'global' } };
      if (r.status === 401) throw new Error('auth');
      if (r.status === 429) { deps.quotaFromChat(j.quota, true); return { text: '', cards: [], notice: { kind: 'limit', reason: 'user', ...(deps.quotaResetAt() ? { resetAt: deps.quotaResetAt() } : {}) } } }
      if (!r.ok) return { text: '', cards: [], notice: { kind: 'error' } };
      deps.quotaFromChat(j.quota, false); return { text: j.text || '', cards: (j.proposals || []).map((p: any) => ({ status: 'pending', tool: p.tool, args: p.args, summary: p.summary, ...(p.sensitive ? { sensitive: true } : {}) })) } }
    catch (e) { return { text: '', cards: [], notice: { kind: 'error' } } }
    finally { clearTimeout(tm) } };
}

export function memCallOf(deps: { api: string; token: () => Promise<string> }) {
  return async (c: any) => { const t = await deps.token(), ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15000);
    try { const a = c.args || {}, body = c.tool === 'memory_save' ? { op: 'save', fact: a.fact, ...(c.sensitive ? { confirmSensitive: true } : {}) } : { op: 'forget', id: a.id };
      const r = await fetch(`${deps.api}/ai/memory`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body) });
      let j: any = {}; try { j = await r.json() } catch (e) {} return r.ok && j.ok !== false }
    catch (e) { return false } finally { clearTimeout(tm) } };
}
