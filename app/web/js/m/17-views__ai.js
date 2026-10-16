"use strict";
/* ===== MODULE: views/ai (จำลอง — ของจริงต้องเรียกผ่าน Server เท่านั้น) + ประวัติแชท ===== */
const SUGG = ['สรุปวันนี้ให้หน่อย', 'เพิ่มงาน การบ้านอังกฤษ พรุ่งนี้ 18:00', 'เพิ่มกิจวัตร ยืดเส้น 07:00'], AI_TITLE_MAX = 28, AI_REPLY_MS = 750;
const loadChats = () => { try {
    const j = JSON.parse(localStorage.getItem(uk(CHATS_KEY)));
    if (!(j && Array.isArray(j.list)))
        return { list: [], cur: null };
    for (const ch of j.list)
        for (const m of ch.msgs || [])
            for (const c of m.cards || [])
                if (c.status === 'saving')
                    c.status = 'failed';
    return j;
}
catch (e) {
    console.warn('chat load', e);
    return { list: [], cur: null };
} };
const saveCH = () => { try {
    localStorage.setItem(uk(CHATS_KEY), JSON.stringify(ST.CH));
}
catch (e) {
    console.warn('chat save', e);
} };
const curChat = () => ST.CH.list.find(c => c.id === ST.CH.cur) || null;
function aiReply(t) {
    const m = t.match(/เพิ่ม(งาน|กิจวัตร|กิจกรรม|นัด)\s*(.*)/);
    if (m) {
        const rest = m[2];
        let date = TODAY;
        if (/มะรืน/.test(rest))
            date = ymd(addDays(new Date(), 2));
        else if (/พรุ่งนี้/.test(rest))
            date = ymd(addDays(new Date(), 1));
        const tm = rest.match(/(\d{1,2})[:.](\d{2})/), time = tm && HHMM.test(`${pad(tm[1])}:${tm[2]}`) ? `${pad(tm[1])}:${tm[2]}` : '';
        const title = rest.replace(/มะรืนนี้|มะรืน|พรุ่งนี้|(\d{1,2})[:.](\d{2})/g, '').trim() || 'รายการใหม่', type = m[1] === 'งาน' ? 'task' : m[1] === 'กิจวัตร' ? 'habit' : 'event';
        return { text: 'เข้าใจแล้ว ตรวจรายละเอียดก่อนเพิ่มนะ', card: { status: 'pending', p: { type, title, start: date, time, repeat: type === 'habit' ? daily() : { unit: 'none', every: 1, days: [] }, track: type === 'habit' || type === 'task' ? 'check' : 'none' } } };
    }
    const tr = onDate(TODAY).filter(tracked), done = tr.filter(it => isDone(it, TODAY)).length, nx = onDate(TODAY).find(it => it.time && it.time >= nowHM() && !(tracked(it) && isDone(it, TODAY))), od = overdue().length;
    return { text: `วันนี้ทำแล้ว ${done} จาก ${tr.length} รายการ${od ? `\nมีงานค้าง ${od} งาน ควรเคลียร์ก่อน` : ''}${nx ? `\nถัดไป: ${nx.title} (${nx.time})` : '\nไม่มีรายการเหลือตามเวลาแล้ว'}` };
}
const cardsHTML = (m, i) => (m.cards || []).map((c, k) => {
    const st = c.status, del = c.tool === 'item_delete';
    const mem = isMemTool(c.tool);
    return `<div class="ev-card" data-tone="soft" style="max-width:88%;animation:rise .35s var(--ease)"><b>${esc(c.summary || AI_TOOL_LABEL[c.tool] || c.tool)}</b>${mem && c.sensitive && st === 'pending' ? '<p class="ev-sub" style="margin-top:6px">ข้อมูลนี้ค่อนข้างส่วนตัว การจำไว้จะส่งไปเก็บที่บริการความจำภายนอก</p>' : ''}
 ${st === 'pending' ? `<div class="ev-row" style="margin-top:12px;gap:8px"><button class="${del ? 'ev-btn-solid-danger' : 'ev-btn-primary'} ev-btn-sm" data-act="ai-cok" data-id="${i}:${k}">${mem ? (c.tool === 'memory_save' ? 'จำไว้' : 'ลืม') : 'ยืนยัน'}</button><button class="ev-btn-ghost ev-btn-sm" data-act="ai-cno" data-id="${i}:${k}">ยกเลิก</button></div>` : `<span class="ev-chip" style="display:inline-block;margin-top:8px">${st === 'saving' ? 'กำลังบันทึก...' : st === 'added' ? (mem ? (c.tool === 'memory_save' ? 'จำแล้ว' : 'ลืมแล้ว') : 'ทำแล้ว') : st === 'failed' ? 'ไม่สำเร็จ' : 'ยกเลิกแล้ว'}</span>`}</div>`;
}).join('');
const cardHTML = (m, i) => {
    if (m.cards)
        return cardsHTML(m, i);
    if (!m.card)
        return '';
    const p = m.card.p, st = m.card.status;
    return `<div class="ev-card" data-tone="soft" style="max-width:88%;animation:rise .35s var(--ease)"><b>${esc(p.title)}</b><p class="ev-sub">${TYPES[p.type]} · ${fmtDate(p.start)}${p.time ? ` · ${p.time}` : ''}</p>
 ${st === 'pending' ? `<div class="ev-row" style="margin-top:12px;gap:8px"><button class="ev-btn-primary ev-btn-sm" data-act="ai-ok" data-id="${i}">ยืนยัน</button><button class="ev-btn-ghost ev-btn-sm" data-act="ai-edit" data-id="${i}">แก้ก่อน</button><button class="ev-btn-ghost ev-btn-sm" data-act="ai-no" data-id="${i}">ยกเลิก</button></div>` : `<span class="ev-chip" style="display:inline-block;margin-top:8px">${st === 'added' ? 'เพิ่มแล้ว' : 'ยกเลิกแล้ว'}</span>`}</div>`;
};
const AI_MARK = '<svg class="ev-ai-mark" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="5" fill="currentColor" stroke="none"/></svg>';
function aiBodyHTML() {
    const c = curChat();
    if (!c || !c.msgs.length)
        return `<div class="ev-ai-hello">${AI_MARK}<h3>มีอะไรให้ช่วยวันนี้</h3><div class="ev-sugg">${SUGG.map(s => `<button data-act="sugg" data-id="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`;
    return `<div class="ev-chat">${c.msgs.map((m, i) => m.who === 'u' ? `<div class="ev-bubble-user">${esc(m.text)}</div>` : `<div class="ev-bubble-ai">${esc(m.text)}</div>${cardHTML(m, i)}`).join('')}</div>`;
}
function aiRefresh(smooth) { const sc = $('aiScroll'); if (!sc)
    return; $('aiBody').innerHTML = aiBodyHTML(); $('aiTitle').textContent = curChat()?.title || 'AI'; sc.scrollTo({ top: sc.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); }
function aiRenderDrawer(q = '') {
    const box = $('drawerList');
    if (!box)
        return;
    const k = q.trim().toLowerCase(), list = ST.CH.list.filter(c => !k || c.title.toLowerCase().includes(k) || c.msgs.some(m => m.text.toLowerCase().includes(k))).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.t - a.t);
    if (!list.length) {
        box.innerHTML = `<div class="ev-empty"><p>${k ? 'ไม่พบแชทที่ค้นหา' : 'ยังไม่มีประวัติแชท'}</p></div>`;
        return;
    }
    let last = '', h = '';
    for (const c of list) {
        const g = c.pinned ? 'ปักหมุด' : 'ล่าสุด';
        if (g !== last) {
            h += `<div class="ev-drawer-grp">${g}</div>`;
            last = g;
        }
        h += `<div class="ev-chat-row" data-cur="${c.id === ST.CH.cur}"><button data-act="ai-open" data-id="${c.id}">${icon(c.pinned ? 'pin' : 'chat')}<b>${esc(c.title || 'แชทใหม่')}</b></button><button class="ev-icon-btn" data-flat data-act="ai-opts" data-id="${c.id}" aria-haspopup="menu" aria-expanded="false" aria-label="ตัวเลือกแชท">${icon('more')}</button></div>`;
    }
    box.innerHTML = h;
}
const chatItems = id => { const c = ST.CH.list.find(x => x.id == id); return [{ act: 'ai-pin', id, icon: 'pin', label: c?.pinned ? 'เลิกปักหมุด' : 'ปักหมุด' }, { act: 'ai-rename', id, icon: 'edit', label: 'เปลี่ยนชื่อ' }, '-', { act: 'ai-delask', id, icon: 'trash', label: 'ลบแชท', tone: 'danger' }]; };
const aiPlusItems = [{ act: 'ai-q', id: 'สรุปวันนี้ให้หน่อย', icon: 'chart', label: 'สรุปวันนี้' }, { act: 'ai-q', id: 'เพิ่มงาน ', icon: 'tasks', label: 'เพิ่มงาน' }, { act: 'ai-q', id: 'เพิ่มกิจวัตร ', icon: 'clock', label: 'เพิ่มกิจวัตร' }];
const aiSync = () => { aiRefresh(); aiRenderDrawer($('dSearch')?.value || ''); };
const drawerOpen = on => { const d = $('drawer'); if (!d)
    return; d.dataset.open = String(on); $('dScrim').dataset.open = String(on); if (on)
    aiRenderDrawer($('dSearch').value); };
const aiAutosize = () => { const t = $('aiText'); if (!t)
    return; t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; $('aiForm').querySelector('.ev-send').dataset.empty = String(!t.value.trim()); };
function openAI() {
    openPage(`<div class="ev-page-bar"><button class="ev-icon-btn" data-flat data-act="ai-hist" aria-label="เมนูแชท">${icon('list')}</button><h2 id="aiTitle" class="grow" role="button" tabindex="0" data-act="ai-curopts" aria-haspopup="menu" aria-label="ตัวเลือกแชทนี้">AI</h2><button class="ev-icon-btn" data-flat data-act="ai-new" aria-label="แชทใหม่">${icon('edit')}</button><button class="ev-icon-btn" data-flat data-act="close" aria-label="ปิด">${icon('x')}</button></div>
 <div class="ev-page-scroll" id="aiScroll"><div id="aiBody"></div></div>
 <button type="button" class="ev-qchip" id="aiQuota" data-act="ai-quota" data-state="ok" role="status" aria-live="polite" aria-atomic="true" hidden></button>
 <form class="ev-composer" id="aiForm"><textarea id="aiText" rows="1" placeholder="${AI_PLACEHOLDER}" aria-label="ข้อความถึง AI"></textarea><div class="ev-composer-bar"><button type="button" class="ev-plus" data-act="ai-plus" aria-haspopup="menu" aria-expanded="false" aria-label="ตัวช่วยพิมพ์">${icon('plus')}</button><button class="ev-send" data-empty="true" aria-label="ส่ง">${icon('send')}</button></div></form>
 <div class="ev-drawer-scrim" id="dScrim" data-open="false" data-act="ai-hist"></div>
 <aside class="ev-drawer" id="drawer" data-open="false" aria-label="ประวัติแชท"><div class="ev-drawer-head"><h2>Evarel AI</h2><label class="ev-search">${icon('search')}<input id="dSearch" type="search" placeholder="ค้นหาแชท" aria-label="ค้นหาแชท"></label></div><div class="ev-drawer-list" id="drawerList"></div><div class="ev-drawer-foot"><button class="ev-avatar" data-act="settings" aria-label="ตั้งค่า">${initial()}</button><button class="ev-btn-ink" data-act="ai-new">${icon('plus')}แชทใหม่</button></div></aside>`, () => { clearTimeout(ST.quotaTimer); ST.quotaTimer = 0; ST.quotaTick++; ST.QUOTA = null; });
    aiRefresh();
    quotaPaint();
    quotaRefresh();
}
Object.assign(window, { SUGG, AI_TITLE_MAX, AI_REPLY_MS, loadChats, saveCH, curChat, aiReply, cardsHTML, cardHTML, AI_MARK, aiBodyHTML, aiRefresh, aiRenderDrawer, chatItems, aiPlusItems, aiSync, drawerOpen, aiAutosize, openAI });
