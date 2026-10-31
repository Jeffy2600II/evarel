import { QUOTA_LOW, resetMs, quotaState as quotaStateOf, quotaShort as quotaShortOf, resetClock as resetClockOf, resetInAt, QUOTA_UNKNOWN, quotaFetchOf, aiLockInfoOf, limitBannerOf, quotaFromChatState, quotaSheetHTMLOf } from './core/quota.js';
/* ===== MODULE: services/ai-quota (ชิปโควตา + ล็อกช่องพิมพ์ : evarel-quota-ui) =====
   - ล็อกฝั่งแอปเป็นแค่ UX: ด่านจริงคือ 429 ที่ Worker (ห้ามถอด) | อ่านไม่ได้ = fail-open (ไม่ล็อก ซ่อนชิป)
   - สถานะ: ok (เหลือมาก) | low (<=20%) | out (หมด) | null (ไม่ทราบ/โหมด Mock -> ไม่มีชิป)
   ตรรกะส่วนที่เหลือ (quotaFetch/aiLockInfo/limitBanner/quotaFromChat/quotaSheetHTML) อยู่ที่ core/quota.ts แล้ว
   ที่นี่เหลือตัวห่อส่ง deps/พารามิเตอร์ + ส่วนผูก DOM/ST/timer (quotaPaint quotaRefresh quotaSheet) คงชื่อบน window เดิมทุกชื่อ */
const QUOTA_POLL_MAX = 600000;
const quotaState = quotaStateOf, quotaShort = quotaShortOf, resetClock = resetClockOf;
function resetIn(iso) { return resetInAt(iso, Date.now()); }
const quotaEnabled = () => AI_LIVE();
const quotaFetch = quotaFetchOf({ enabled: quotaEnabled, api: () => SUPA_API, token: () => ST.Repo.token() });
const aiLockInfo = () => aiLockInfoOf(ST.AI.notice, ST.QUOTA);
const limitBanner = () => limitBannerOf(aiLockInfo(), icon, Date.now());
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
/* ใช้ค่าที่ /chat คืน (สำเร็จหรือ 429) อัปเดตชิปโดยไม่ยิงเพิ่ม — คำนวณสถานะใหม่ที่ core/quota แล้วแตะ ST ที่นี่ทีเดียว ลำดับเดิม: qc ใช้ไม่ได้ = จบก่อนแตะ quotaTick */
function quotaFromChat(qc, hit429) { const st = quotaFromChatState(qc, hit429, ST.QUOTA, Date.now()); if (st === undefined)
    return; ST.quotaTick++; ST.QUOTA = st; quotaPaint(); }
const quotaSheetHTML = () => quotaSheetHTMLOf(ST.QUOTA, Date.now());
function quotaSheet() {
    if (!ST.QUOTA || ST.QUOTA.unknown)
        return;
    openSheet('โควตา AI วันนี้', quotaSheetHTML(), { page: 'quotaBody', props: { quota: ST.QUOTA } });
}
Object.assign(window, { limitBanner, aiLockInfo, QUOTA_LOW, QUOTA_POLL_MAX, QUOTA_UNKNOWN, quotaEnabled, quotaState, quotaShort, resetMs, resetClock, resetIn, quotaFetch, quotaPaint, quotaRefresh, quotaFromChat, quotaSheet, quotaSheetHTML });
