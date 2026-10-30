import { TODAY } from './02-core__dates.js';
import { remFrom, applyProposalTo } from './core/aiproposal.js';
/* ===== MODULE: services/ai-live (AI จริง: เฉพาะโหมด Supabase) =====
   เซิร์ฟเวอร์คืน "ข้อเสนอ" ไม่เขียนฐานข้อมูล -> แอปแสดงการ์ดยืนยัน -> กดยืนยันแล้วเขียนผ่าน commit() เดิม (undo + sync + realtime ฟรี) */
/* ตรรกะแปลงข้อเสนอ AI เป็นการเปลี่ยนรายการอยู่ที่ core/aiproposal.ts แล้ว (รับ items/today/id เป็นอาร์กิวเมนต์ แก้ items ในที่เหมือนเดิม)
   ที่นี่เหลือตัวห่อบางที่ส่ง S.items, TODAY และ id สุ่ม (Date.now()+random) เข้าไป คงลายเซ็นเดิม: remFrom applyProposal */
export { remFrom };
const applyProposal = (c) => applyProposalTo(S.items, c, { today: TODAY, id: Date.now() + Math.floor(Math.random() * 1000) });
async function aiAsk(text, history) {
    const t = await ST.Repo.token(), ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 45000);
    try {
        const r = await fetch(`${SUPA_API}/ai/chat`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ text, history }) });
        let j = {};
        try {
            j = await r.json();
        }
        catch (e) { }
        if (r.status === 503)
            return { text: '', cards: [], notice: { kind: 'limit', reason: 'global' } };
        if (r.status === 401)
            throw new Error('auth');
        if (r.status === 429) {
            quotaFromChat(j.quota, true);
            return { text: '', cards: [], notice: { kind: 'limit', reason: 'user', ...(ST.QUOTA?.resetAt ? { resetAt: ST.QUOTA.resetAt } : {}) } };
        }
        if (!r.ok)
            return { text: '', cards: [], notice: { kind: 'error' } };
        quotaFromChat(j.quota, false);
        return { text: j.text || '', cards: (j.proposals || []).map(p => ({ status: 'pending', tool: p.tool, args: p.args, summary: p.summary, ...(p.sensitive ? { sensitive: true } : {}) })) };
    }
    catch (e) {
        return { text: '', cards: [], notice: { kind: 'error' } };
    }
    finally {
        clearTimeout(tm);
    }
}
/* ความจำระยะยาว (MemoryLake ผ่าน Worker): ไม่ใช่ข้อมูลใน S.items จึงไม่ผ่าน commit() — เรียกเครือข่ายหลังผู้ใช้กดยืนยันเท่านั้น */
async function memCall(c) {
    const t = await ST.Repo.token(), ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15000);
    try {
        const a = c.args || {}, body = c.tool === 'memory_save' ? { op: 'save', fact: a.fact, ...(c.sensitive ? { confirmSensitive: true } : {}) } : { op: 'forget', id: a.id };
        const r = await fetch(`${SUPA_API}/ai/memory`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body) });
        let j = {};
        try {
            j = await r.json();
        }
        catch (e) { }
        return r.ok && j.ok !== false;
    }
    catch (e) {
        return false;
    }
    finally {
        clearTimeout(tm);
    }
}
Object.assign(window, { aiAsk, remFrom, memCall, applyProposal });
