"use strict";
/* ===== MODULE: views/ai (หน้าจอ AI: เรียกใช้บริการจริงผ่าน services/ai-live เมื่อล็อกอิน Supabase) + ประวัติแชท ===== */
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
/* ตามเดโม v24 จริง: สวัสดี+ชื่อ, ev-sub, ปุ่มแนะนำใช้ index, notice, ปุ่มข้อความ, ev-disc, typing — AI state อ่านจาก window (ของจริงเขียนโดย services) */
const firstName = () => (window.profileOf?.().name || '').trim().split(/\s+/)[0];
const msgActions = (m, i) => `<div class="ev-msg-actions"><button data-act="ai-copy" data-id="${i}" aria-label="คัดลอก">${icon('copy')}</button><button data-act="ai-vote" data-id="${i}:up" aria-pressed="${m.vote === 'up'}" aria-label="ชอบ">${icon('thumbup')}</button><button data-act="ai-vote" data-id="${i}:down" aria-pressed="${m.vote === 'down'}" aria-label="ไม่ชอบ">${icon('thumbdown')}</button></div>`;
const noticeHTML = () => {
    const n = window.AI?.notice;
    if (!n)
        return '';
    if (n.kind === 'error')
        return `<div class="ev-notice" data-key="notice"><b>ส่งข้อความไม่สำเร็จ</b><span>ตรวจสอบการเชื่อมต่อแล้วลองใหม่ ข้อความของคุณยังอยู่ในช่องพิมพ์</span><div><button class="ev-btn-primary ev-btn-sm" data-act="ai-retry">ส่งอีกครั้ง</button></div></div>`;
    const g = n.reason === 'global';
    return `<div class="ev-notice" data-key="notice"><b>ข้อความนี้ยังไม่ได้ส่ง</b><span>${g ? 'ระบบเต็มชั่วคราว ข้อความของคุณยังอยู่ในช่องพิมพ์ ลองส่งใหม่ในอีกสักครู่' : `ถึงขีดจำกัดการใช้งานแล้ว ข้อความของคุณยังอยู่ในช่องพิมพ์ ส่งได้อีกครั้ง${window.whenText?.(n.resetAt) || ''}`}</span><div class="ev-row" style="gap:8px;flex-wrap:wrap"><button class="ev-btn-ghost ev-btn-sm" data-act="add">เพิ่มรายการเอง</button><button class="ev-btn-ghost ev-btn-sm" data-act="ai-usage">ดูการใช้งาน</button></div></div>`;
};
function aiBodyHTML() {
    const c = curChat();
    const A = window.AI || {};
    if ((!c || !c.msgs.length) && !A.typing)
        return `<div class="ev-ai-hello" data-key="hello">${AI_MARK}<h3>${firstName() ? `สวัสดี ${esc(firstName())}` : 'สวัสดี'}</h3><p class="ev-sub" style="margin-top:-6px">มีอะไรให้ช่วยวันนี้</p><div class="ev-sugg">${SUGG.map((s, i) => `<button type="button" data-act="sugg" data-id="${i}">${esc(s)}</button>`).join('')}</div></div>${noticeHTML()}`;
    const ms = c ? c.msgs : [], lastA = ms.map((m) => m.who).lastIndexOf('a');
    return `<div class="ev-chat">${ms.map((m, i) => m.who === 'u' ? `<div class="ev-bubble-user" data-key="m${i}">${esc(m.text)}</div>` : `<div class="ev-bubble-ai" data-key="m${i}">${esc(m.text)}</div>${cardHTML(m, i)}${msgActions(m, i)}${i === lastA && !A.typing ? '<p class="ev-disc">AI อาจผิดพลาดได้ ตรวจสอบคำตอบอีกครั้ง</p>' : ''}`).join('')}${A.typing ? '<div class="ev-bubble-ai ev-typing" data-key="typing"><i></i><i></i><i></i></div>' : ''}${noticeHTML()}</div>`;
}
function aiRefresh(smooth) {
    const sc = $('aiScroll');
    if (!sc)
        return;
    const MT = window.EvarelMount;
    /* S4: พร้อมแล้ว mount React จริงลง #aiBody (ไม่มี wrapper เพิ่ม) ไม่พร้อมใช้ string เดิม
       v24 ตาม patch ของเดโม: มี root อยู่แล้วให้ rerender (React reconcile คง bubble เดิมไว้ — ของเดิมไม่ขยับ เฉพาะข้อความใหม่ที่เพิ่ม) ไม่มี root = mount ใหม่ */
    const props = { chat: curChat() };
    if (MT?.ready('ai')) {
        const b = document.getElementById('aiBody');
        if (!(b && MT.els?.ai === b && MT.roots?.ai && MT.rerender('ai', props))) {
            MT.unmountOne('ai');
            $('aiBody').innerHTML = '';
            MT.mountAt($('aiBody'), 'ai', props);
        }
    }
    else
        $('aiBody').innerHTML = aiBodyHTML();
    $('aiTitle').textContent = curChat()?.title || 'AI';
    sc.scrollTo({ top: sc.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}
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
function fillComposer(text) {
    const t = $('aiText');
    if (!t || t.disabled)
        return;
    window.AI && (window.AI.draft = text);
    t.value = text;
    aiAutosize();
    requestAnimationFrame(() => { const n = $('aiText'); if (!n)
        return; n.focus({ preventScroll: true }); n.setSelectionRange?.(n.value.length, n.value.length); });
}
const aiSync = () => { aiRefresh(); aiRenderDrawer($('dSearch')?.value || ''); };
/* ปัดปิด/เปิดแถบข้าง (ตรงเดโม v24 บรรทัด 1148): ใช้เอนจิน attachGesture ตัวเดียวกับ bottom sheet เพียงเปลี่ยน axis เป็น x
   ปัดใน drawer ไปทางซ้าย = ปิด · ปัดจากขอบซ้ายจอ (22px) ไปทางขวา = เปิด — กฎเลื่อนซ้อน (เนื้อในยังเลื่อนกลับได้ = เลื่อนเนื้อ) ใช้ของเอนจินเดิม */
const DRAWER_EDGE_PX = 22;
function attachDrawerGestures(root) {
    const d = (root || document).querySelector('#drawer'), sc = (root || document).querySelector('#dScrim'), edge = root || document, size = () => d.offsetWidth, colLeft = () => Math.max(0, (innerWidth - 480) / 2);
    if (!d || !sc || d.dataset.gestureBound)
        return;
    d.dataset.gestureBound = 'true';
    const start = () => { d.dataset.drag = 'true'; sc.style.transition = 'none'; }, fin = open => { d.dataset.drag = 'false'; sc.style.transition = ''; drawerOpen(open); d.style.transform = ''; sc.style.opacity = ''; };
    attachGesture(d, { axis: 'x', dir: -1, scroll: true, mouseAny: true, mover: d, size, canStart: () => d.dataset.open === 'true', onStart: start, onMove: (x, r) => { d.style.transform = `translateX(${-x}px)`; sc.style.opacity = String(1 - r); }, onEnd: c => fin(!c) });
    attachGesture(edge, { axis: 'x', dir: 1, mouseAny: true, mover: d, size, canStart: p => d.dataset.open !== 'true' && p.x >= colLeft() && p.x - colLeft() <= DRAWER_EDGE_PX, onStart: start, onMove: (x, r) => { d.style.transform = `translateX(${-size() + x}px)`; sc.style.opacity = String(r); }, onEnd: c => fin(c) });
}
const drawerOpen = on => { const d = $('drawer'); if (!d)
    return; d.dataset.open = String(on); $('dScrim').dataset.open = String(on); if (on)
    aiRenderDrawer($('dSearch').value); };
const aiAutosize = () => { const t = $('aiText'); if (!t)
    return; t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; $('aiForm').querySelector('.ev-send').dataset.empty = String(!t.value.trim()); };
function aiShellHTML(placeholder, avatarText) {
    return `<div class="ev-aibar"><button class="ev-backpill" data-act="close" aria-label="กลับหน้าหลัก">${icon('back')}กลับ</button><button class="ev-roundbtn" data-act="ai-hist" aria-label="เมนูแชท">${icon('list')}</button><h2 id="aiTitle" class="ev-aititle">AI</h2><div class="ev-capsule"><button data-act="ai-new" aria-label="แชทใหม่">${icon('edit')}</button><button data-act="ai-more" aria-haspopup="menu" aria-expanded="false" aria-label="ตัวเลือกเพิ่มเติม">${icon('more')}</button></div></div>
 <div class="ev-page-scroll" id="aiScroll"><div id="aiBody"></div></div>
 <div class="ev-aidock"><form class="ev-composer" id="aiForm"><div id="aiLimit" hidden=""></div><textarea id="aiText" rows="1" placeholder="${AI_PLACEHOLDER}" aria-label="ข้อความถึง AI"></textarea><div class="ev-composer-bar"><button type="button" class="ev-plus" data-act="ai-plus" aria-haspopup="menu" aria-expanded="false" aria-label="ตัวช่วยพิมพ์">${icon('plus')}</button><button class="ev-send" data-empty="true" aria-label="ส่ง">${icon('send')}</button></div></form></div>
 <div class="ev-drawer-scrim" id="dScrim" data-open="false" data-act="ai-hist"></div>
 <aside class="ev-drawer" id="drawer" data-open="false" aria-label="เมนูแชท"><div class="ev-drawer-head"><div class="ev-drawer-top"><h2>Evarel AI</h2><button class="ev-icon-btn" data-flat data-act="ai-hist" aria-label="ปิดเมนูแชท">${icon('x')}</button></div><button class="ev-navrow" data-tone="primary" data-act="ai-new">${icon('edit')}<span>แชทใหม่</span></button><button class="ev-navrow" data-act="ai-search">${icon('search')}<span>ค้นหาแชท</span></button><label class="ev-search" id="dSearchWrap" hidden>${icon('search')}<input id="dSearch" type="search" placeholder="ค้นหาแชท" aria-label="ค้นหาแชท"></label></div><div class="ev-drawer-list" id="drawerList"></div><div class="ev-drawer-foot">${avatarHTML({ tag: 'button', size: 38 })}<span class="ev-foot-name">${esc(ST.USER?.name || '')}</span><button class="ev-icon-btn" data-flat data-act="settings" aria-label="ตั้งค่า">${icon('gear')}</button></div></aside>`;
}
function openAI() {
    const MT = window.EvarelMount;
    const onClose = () => { clearTimeout(ST.quotaTimer); ST.quotaTimer = 0; ST.quotaTick++; ST.QUOTA = null; window.EvarelMount?.unmountOne?.('ai'); window.EvarelMount?.unmountOne?.('aiShell'); };
    if (MT?.ready('aiShell')) {
        MT.unmountOne('aiShell');
        const ae = openPage('', onClose, 'ai');
        ae.innerHTML = '';
        MT.mountAt(ae, 'aiShell', { placeholder: AI_PLACEHOLDER, avatarText: initial(), avatarBg: profileOf().bg, userName: ST.USER?.name || '' });
        setTimeout(() => attachDrawerGestures(ae), 0);
    }
    else
        openPage(aiShellHTML(AI_PLACEHOLDER, initial()), onClose, 'ai');
    setTimeout(() => attachDrawerGestures(pageOf('ai')), 0);
    aiRefresh();
    aiRenderDrawer();
    quotaPaint();
    quotaRefresh();
}
Object.assign(window, { aiShellHTML, firstName, noticeHTML, msgActions, SUGG, AI_TITLE_MAX, AI_REPLY_MS, loadChats, saveCH, curChat, aiReply, cardsHTML, cardHTML, AI_MARK, aiBodyHTML, aiRefresh, aiRenderDrawer, chatItems, aiPlusItems, aiSync, drawerOpen, aiAutosize, openAI, fillComposer, attachDrawerGestures });
