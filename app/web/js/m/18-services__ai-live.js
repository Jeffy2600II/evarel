"use strict";
/* ===== MODULE: services/ai-live (AI จริง: เฉพาะโหมด Supabase) =====
   เซิร์ฟเวอร์คืน "ข้อเสนอ" ไม่เขียนฐานข้อมูล -> แอปแสดงการ์ดยืนยัน -> กดยืนยันแล้วเขียนผ่าน commit() เดิม (undo + sync + realtime ฟรี) */
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
/* รูปแบบ rem ของแอปคือ [{k:'before',m:นาที}] ส่วนเซิร์ฟเวอร์ส่งเป็นตัวเลขนาที -> แปลงที่นี่ที่เดียว */
const remFrom = a => (Array.isArray(a) ? a : []).map(Number).filter(m => m >= 0).map(m => ({ k: 'before', m }));
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
function applyProposal(c) {
    const a = c.args || {};
    switch (c.tool) {
        case 'item_create': {
            const o = { ...a, id: Date.now() + Math.floor(Math.random() * 1000) };
            if (a.rem)
                o.rem = remFrom(a.rem);
            if (!o.start)
                o.start = TODAY;
            if (!o.track)
                o.track = (o.type === 'habit' || o.type === 'task') ? 'check' : 'none';
            if (o.type === 'habit' && !a.repeat)
                o.repeat = daily();
            S.items.push(mk(o));
            return true;
        }
        case 'item_update': {
            const it = find(a.id);
            if (!it)
                return false;
            const { id, rem, ...rest } = a;
            Object.assign(it, rest);
            if (rem)
                it.rem = remFrom(rem);
            return true;
        }
        case 'item_delete': {
            const i = S.items.findIndex(x => x.id == a.id);
            if (i < 0)
                return false;
            S.items.splice(i, 1);
            return true;
        }
        case 'log_set': {
            const it = find(a.id);
            if (!it)
                return false;
            it.log[a.date] = a.value;
            return true;
        }
        case 'skip_set': {
            const it = find(a.id);
            if (!it)
                return false;
            it.skip[a.date] = true;
            return true;
        }
        case 'reminder_set': {
            const it = find(a.id);
            if (!it)
                return false;
            it.rem = remFrom(a.rem);
            return true;
        }
    }
    return false;
}
Object.assign(window, { aiAsk, remFrom, memCall, applyProposal });
