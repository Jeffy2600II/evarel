import { QUOTA_LOW, resetMs, quotaState as quotaStateOf, quotaShort as quotaShortOf, resetClock as resetClockOf, resetInAt } from './core/quota.js';
/* ===== MODULE: services/ai-quota (ชิปโควตา + ล็อกช่องพิมพ์ : evarel-quota-ui) =====
   - ล็อกฝั่งแอปเป็นแค่ UX: ด่านจริงคือ 429 ที่ Worker (ห้ามถอด) | อ่านไม่ได้ = fail-open (ไม่ล็อก ซ่อนชิป)
   - สถานะ: ok (เหลือมาก) | low (<=20%) | out (หมด) | null (ไม่ทราบ/โหมด Mock -> ไม่มีชิป) */
const QUOTA_POLL_MAX = 600000;
const quotaState = quotaStateOf, quotaShort = quotaShortOf, resetClock = resetClockOf;
function resetIn(iso) { return resetInAt(iso, Date.now()); }
/* ค่า "อ่านโควตาไม่ได้" ใช้ร่วมทุกจุด fail-open (ห้ามล็อกผู้ใช้เพราะเราอ่านพลาด) */
const QUOTA_UNKNOWN = Object.freeze({ unknown: true, blocked: false });
const quotaEnabled = () => AI_LIVE();
/* ชิปพูดเป็น "ครั้ง" เสมอ (หน่วยที่ผู้ใช้เข้าใจ) ถ้า "โทเคน" ใกล้หมดก่อนจะเตือนตรงๆ ไม่ใช่โชว์เลขครั้งที่ดูเหมือนเหลือเยอะ */
async function quotaFetch() {
    if (!quotaEnabled())
        return null;
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 6000);
    try {
        const t = await ST.Repo.token(), r = await fetch(`${SUPA_API}/ai/quota`, { signal: ctl.signal, headers: { Authorization: 'Bearer ' + t } });
        if (!r.ok)
            return QUOTA_UNKNOWN;
        const j = await r.json();
        if (j && j.unknown)
            return QUOTA_UNKNOWN;
        if (!j || typeof j !== 'object' || !j.calls || !j.tokens || !(j.calls.limit > 0) || !(j.tokens.limit > 0))
            return QUOTA_UNKNOWN;
        return j;
    }
    catch (e) {
        return QUOTA_UNKNOWN;
    }
    finally {
        clearTimeout(tm);
    }
}
/* limitBanner ตามเดโม v24: แถบเตือนเมื่อถึงขีดจำกัด (notice kind limit หรือโควตา out) วาดใน slot #aiLimit ของ composer */
function aiLockInfo() { if (ST.AI.notice && ST.AI.notice.kind === 'limit')
    return ST.AI.notice; const v = ST.QUOTA; return quotaState(v) === 'out' ? { reason: (v && v.reason) || 'calls', resetAt: v && v.resetAt } : null; }
function limitBanner() {
    const L = aiLockInfo();
    if (!L)
        return '';
    const g = L.reason === 'global';
    const title = g ? 'ตอนนี้มีผู้ใช้จำนวนมาก' : L.reason === 'tokens' ? 'บทสนทนายาวถึงขีดจำกัดของวันนี้แล้ว' : 'ถึงขีดจำกัดการถามของวันนี้แล้ว';
    const sub = g ? 'ระบบเต็มชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่' : `ใช้ได้อีกครั้ง ${resetIn(L.resetAt)} (${resetClock(L.resetAt)} น.)`;
    return `<div class="ev-limit" role="status" data-key="limit"><span class="ev-limit-ic">${icon('clock')}</span><div class="grow"><b>${title}</b><span>${sub}</span></div>${g ? '<button type="button" class="ev-btn-ghost ev-btn-sm" data-act="ai-retry-global">ลองใหม่</button>' : '<button type="button" class="ev-btn-ghost ev-btn-sm" data-act="ai-usage">รายละเอียด</button>'}</div>`;
}
/* วาดชิป + สถานะช่องพิมพ์จาก QUOTA (จุดเดียวที่แตะ DOM ของโควตา) */
function quotaPaint() {
    const form = $('aiForm'), ta = $('aiText'), send = form?.querySelector('.ev-send'), chip = $('aiQuota');
    if (!form || !ta || !send)
        return;
    const lim = $('aiLimit');
    if (lim) {
        const bh = limitBanner();
        lim.hidden = !bh;
        lim.innerHTML = bh;
    }
    const st = quotaState(ST.QUOTA), out = st === 'out', wasLocked = form.dataset.locked === 'true';
    if (chip) {
        if (!st) {
            chip.hidden = true;
            chip.textContent = '';
            delete chip.dataset.state;
        }
        else {
            chip.hidden = false;
            chip.dataset.state = st;
            chip.textContent = out ? (resetClock(ST.QUOTA.resetAt) ? `โควตาหมด · รีเซ็ต ${resetClock(ST.QUOTA.resetAt)} น.` : 'โควตาหมด') : quotaShort(ST.QUOTA);
        }
    }
    ta.disabled = out;
    send.disabled = out;
    form.dataset.locked = out ? 'true' : 'false';
    if (out) {
        send.setAttribute('aria-disabled', 'true');
        ta.placeholder = resetClock(ST.QUOTA.resetAt) ? `โควตาหมด รีเซ็ต ${resetClock(ST.QUOTA.resetAt)} น. (${resetIn(ST.QUOTA.resetAt)})` : 'โควตาหมดสำหรับวันนี้';
        ta.value = '';
    }
    else {
        send.removeAttribute('aria-disabled');
        ta.placeholder = AI_PLACEHOLDER;
        if (wasLocked && document.activeElement === document.body)
            ta.focus({ preventScroll: true });
    }
    clearTimeout(ST.quotaTimer);
    ST.quotaTimer = 0;
    if (out) {
        const ms = resetMs(ST.QUOTA.resetAt) - Date.now(), wait = Number.isFinite(ms) ? Math.min(Math.max(ms + 1500, 3000), QUOTA_POLL_MAX) : QUOTA_POLL_MAX;
        ST.quotaTimer = setTimeout(quotaRefresh, wait);
    }
}
async function quotaRefresh() {
    if (!$('aiForm'))
        return;
    const my = ++ST.quotaTick, q = await quotaFetch();
    if (my !== ST.quotaTick || !$('aiForm'))
        return;
    /* ไม่ทราบ: คงค่าเดิมถ้าเคยล็อกอยู่และยังไม่ถึงเวลารีเซ็ต (กันปลดล็อกผิดเพราะเน็ตสะดุด) มิฉะนั้นปล่อย (fail-open) */
    if (q && q.unknown && ST.QUOTA && ST.QUOTA.blocked && +new Date(ST.QUOTA.resetAt) > Date.now()) {
        quotaPaint();
        return;
    }
    ST.QUOTA = q;
    quotaPaint();
}
/* ใช้ค่าที่ /chat คืน (สำเร็จหรือ 429) อัปเดตชิปโดยไม่ยิงเพิ่ม */
function quotaFromChat(qc, hit429) {
    if (!qc || !(qc.limit > 0))
        return;
    ST.quotaTick++;
    const tl = qc.tokens && qc.tokens.limit > 0 ? qc.tokens : { used: 0, limit: (ST.QUOTA && ST.QUOTA.tokens?.limit) || 60000 };
    const out = hit429 || qc.used >= qc.limit || tl.used >= tl.limit;
    ST.QUOTA = { day: '', resetAt: qc.resetAt || ST.QUOTA?.resetAt || new Date(Date.now() + 3600000).toISOString(), blocked: out, ...(out ? { reason: qc.reason || (qc.used >= qc.limit ? 'calls' : 'tokens') } : {}),
        calls: { used: qc.used, limit: qc.limit, remaining: Math.max(0, qc.limit - qc.used) }, tokens: { used: tl.used, limit: tl.limit, remaining: Math.max(0, tl.limit - tl.used) } };
    quotaPaint();
}
function quotaSheetHTML() {
    if (!ST.QUOTA || ST.QUOTA.unknown)
        return '';
    const q = ST.QUOTA, bar = (u, l, lb) => `<div class="ev-qbar" role="progressbar" aria-label="${lb}" aria-valuemin="0" aria-valuemax="${l}" aria-valuenow="${Math.min(u, l || 0)}"><i style="--p:${l > 0 ? Math.min(1, u / l).toFixed(3) : '0'}"></i></div>`;
    return `<div class="ev-qrow"><div class="ev-row"><b>จำนวนครั้ง</b><span class="ev-sub">${q.calls.used} / ${q.calls.limit}</span></div>${bar(q.calls.used, q.calls.limit, 'จำนวนครั้งที่ใช้วันนี้')}</div>
 <div class="ev-qrow"><div class="ev-row"><b>ปริมาณการคิด</b><span class="ev-sub">${q.tokens.used.toLocaleString('en-US')} / ${q.tokens.limit.toLocaleString('en-US')}</span></div>${bar(q.tokens.used, q.tokens.limit, 'ปริมาณการคิดที่ใช้วันนี้')}</div>
 <p class="ev-sub" style="margin-top:12px">${q.blocked ? 'ตอนนี้ใช้ครบแล้ว ' : ''}รีเซ็ตเวลา ${resetClock(q.resetAt)} น. (${resetIn(q.resetAt)})</p>`;
}
function quotaSheet() {
    if (!ST.QUOTA || ST.QUOTA.unknown)
        return;
    openSheet('โควตา AI วันนี้', quotaSheetHTML(), { page: 'quotaBody', props: { quota: ST.QUOTA } });
}
Object.assign(window, { limitBanner, aiLockInfo, QUOTA_LOW, QUOTA_POLL_MAX, QUOTA_UNKNOWN, quotaEnabled, quotaState, quotaShort, resetMs, resetClock, resetIn, quotaFetch, quotaPaint, quotaRefresh, quotaFromChat, quotaSheet, quotaSheetHTML });
