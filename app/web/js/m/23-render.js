"use strict";
/* ===== MODULE: render ===== */
function countUp(el) { const to = +el.dataset.count, t0 = performance.now(), dur = 700; const f = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1)
    requestAnimationFrame(f); }; requestAnimationFrame(f); }
function setBar(el, v) { const k = el.dataset.kind; if (k === 'arc')
    el.style.strokeDashoffset = ARC_C * (1 - v / 100);
else if (k === 'col')
    el.style.transform = `scaleY(${v / 100})`;
else if (el.closest('.ev-prog'))
    el.style.setProperty('--w', v);
else
    el.style.width = v + '%'; }
function growBars(root, anim) { root.querySelectorAll('[data-to]').forEach(el => { const to = Math.max(0, Math.min(100, +el.dataset.to || 0)), k = el.dataset.k || ''; setBar(el, anim ? 0 : (UI.lastW[k] ?? 0)); UI.lastW[k] = to; requestAnimationFrame(() => requestAnimationFrame(() => setBar(el, to))); }); }
function render() {
    document.body.dataset.auth = UI.auth.status === 'in' ? 'in' : 'out';
    if (UI.auth.status !== 'in') {
        $('app').innerHTML = '';
        $('sheet') && ($('sheet').innerHTML = '');
        renderAuthRoot();
        return;
    }
    $('auth').hidden = true;
    $('auth').dataset.screen = '';
    const root = $('app'), anim = UI.animate && !UI.loading;
    window.EvarelMount?.unmountAll(); /* ปลด React root เดิมก่อนเขียนทับ */
    root.innerHTML = UI.loading ? skeleton() : UI.error ? errorView() : VIEWS[UI.tab]();
    const rm = window.EvarelMount?.commit(root) || false; /* mount จริงต้องเสร็จก่อน countUp/growBars */
    root.classList.toggle('ev-enter', anim);
    [...root.children].forEach((c, i) => c.style.setProperty('--i', i));
    root.querySelectorAll('[data-count]').forEach(el => anim ? countUp(el) : (el.textContent = el.dataset.count));
    growBars(root, anim);
    UI.weekDir = 0;
    if (!rm) {
        if (UI.tab === 'calendar' && !UI.loading && !UI.error)
            mountMain();
        else
            destroyCal('main');
    } /* rm=true: React effect จัดการ FullCalendar เอง */
    UI.animate = false;
    const tabs = TABS.map(([id, l, ic]) => `<li><button data-tab="${id}" ${UI.tab === id ? 'aria-current="page"' : ''}><span class="pill">${icon(ic)}</span>${l}</button></li>`);
    tabs.splice(2, 0, `<li><button class="add" data-act="add" aria-label="เพิ่มรายการ">${icon('plus')}</button></li>`);
    $('nav').innerHTML = tabs.join('');
    updateLive();
    refreshDetail();
    /* แจ้ง store กลางที่ React subscribe ได้ (s4f-store-react): งานสุดท้ายของรอบ ห่อ try เพื่อให้ผู้ฟังพังแล้วไม่ล้ม render | ไม่มีผู้ฟัง/ไม่มี store = ไม่ทำอะไร */
    try {
        window.EvarelStore?.notify();
    }
    catch (e) {
        console.warn('store notify', e);
    }
}
/* ย้ายข้อมูลเดิมครั้งเดียว (v11/v12 เก็บที่คีย์ไม่มี :userId) -> คีย์ของผู้ใช้ที่ล็อกอิน | คัดลอกเท่านั้น ไม่ลบต้นฉบับ (เป็นสำรอง)
   ทำเมื่อ: ผู้ใช้ยังไม่มีข้อมูลของตัวเอง และมีข้อมูลเดิมที่อ่านได้ ; ทำครั้งเดียวต่อเครื่อง (ธง evarel-legacy-claimed) */
function claimLegacyData() {
    try {
        if (!ST.USER || localStorage.getItem('evarel-legacy-claimed'))
            return;
        const own = localStorage.getItem(uk(STORE_KEY)), old = localStorage.getItem(STORE_KEY);
        if (!own && old) {
            const j = JSON.parse(old);
            if (j && Array.isArray(j.items) && j.items.length) {
                localStorage.setItem(uk(STORE_KEY), old);
                [[TIMER_KEY], [CHATS_KEY]].forEach(([k]) => { const v = localStorage.getItem(k); if (v && !localStorage.getItem(uk(k)))
                    localStorage.setItem(uk(k), v); });
                localStorage.setItem('evarel-legacy-claimed', ST.USER.id);
            }
        }
    }
    catch (err) {
        console.warn('claim legacy', err);
    }
}
ST._render = render;
Object.assign(window, { countUp, setBar, growBars, render, claimLegacyData });
