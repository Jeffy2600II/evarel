"use strict";
/* ===== MODULE: core/timer (ทนรีเฟรช: เก็บ timestamp) ===== */
const loadTM = () => { try {
    return JSON.parse(localStorage.getItem(uk(TIMER_KEY)));
}
catch (e) {
    console.warn('timer load', e);
    return null;
} };
const saveTM = () => { try {
    ST.TM ? localStorage.setItem(uk(TIMER_KEY), JSON.stringify(ST.TM)) : localStorage.removeItem(uk(TIMER_KEY));
}
catch (e) {
    console.warn('timer save', e);
} };
const tmMs = () => ST.TM ? ST.TM.acc + (ST.TM.startedAt ? Date.now() - ST.TM.startedAt : 0) : 0;
function focusBody(it) {
    const mine = ST.TM && ST.TM.id == it.id, run = mine && !!ST.TM.startedAt, ms = mine ? tmMs() : 0, goal = it.target * 60000, base = val(it, mine ? ST.TM.date : UI.fdate) * 60000, p = Math.min(100, (base + ms) / goal * 100);
    const btn = (a, ic, l, big) => `<div style="display:grid;gap:6px;justify-items:center"><button class="ev-round" ${big ? 'data-big="true"' : ''} data-act="${a}" data-id="${it.id}" aria-label="${l}">${icon(ic)}</button><span class="ev-sub">${l}</span></div>`;
    const acts = !mine ? btn('tstart', 'play', 'เริ่ม', true) : run ? btn('tpause', 'pause', 'หยุดชั่วคราว', true) + btn('tfinish', 'stop', 'จบและบันทึก') : btn('tresume', 'play', 'ต่อ', true) + btn('tfinish', 'stop', 'จบและบันทึก');
    return `<div class="ev-page-bar"><button class="ev-icon-btn" data-flat data-act="close" aria-label="กลับ">${icon('back')}</button><h2>จับเวลา</h2>${mine ? `<button class="ev-btn-danger ev-btn-sm" data-act="tcancel">ยกเลิก</button>` : ''}</div>
 <div class="ev-page-scroll" style="text-align:center"><div><h1 class="ev-title" style="padding:0px">${esc(it.title)}</h1><p class="ev-sub">เป้าหมาย ${it.target} ${esc(it.unitName || 'นาที')} · ${dayLab(UI.fdate)}ทำแล้ว ${val(it, UI.fdate)}</p></div>
 <div class="ev-dial" id="dial" data-run="${run}" style="--p:${p}"><div class="ev-dial-face"><div class="ev-digits" id="digits">${fmtClock(ms)}</div><span class="ev-sub">${!mine ? 'พร้อมเริ่ม' : run ? 'กำลังจับเวลา' : 'หยุดชั่วคราว'}</span></div></div><div class="ev-focus-actions">${acts}</div>
 <p class="ev-sub">ปิดแอปแล้วเวลายังเดินต่อ เพราะเก็บเวลาเริ่มไว้ ไม่ได้นับวินาทีในหน้านี้</p></div>`;
}
function openFocus(id) {
    const it = find(id);
    if (!it)
        return;
    if (ST.TM && ST.TM.id != id) {
        toast('มีตัวจับเวลาอื่นทำงานอยู่ ต้องจบก่อน');
        return openFocus(ST.TM.id);
    }
    const MT = window.EvarelMount, onClose = () => { ST.focusId = null; updateLive(); window.EvarelMount?.unmountOne?.('focus'); };
    if (ST.focusId !== null) {
        if (MT?.ready('focus') && MT.rerender('focus', { id: it.id }))
            return;
        page.innerHTML = focusBody(it);
        return;
    }
    ST.focusId = id;
    if (MT?.ready('focus')) {
        MT.unmountOne('focus');
        openPage('', onClose);
        page.innerHTML = '';
        MT.mountAt(page, 'focus', { id: it.id });
        return;
    }
    openPage(focusBody(it), onClose);
}
const refreshFocus = () => {
    const it = find(ST.focusId);
    if (!it)
        return;
    const MT = window.EvarelMount;
    if (MT?.ready('focus') && MT.rerender('focus', { id: it.id }))
        return;
    page.innerHTML = focusBody(it);
};
function updateLive() {
    const l = $('live'), it = ST.TM && find(ST.TM.id);
    if (!it || ST.focusId !== null) {
        l.dataset.show = 'false';
        return;
    }
    l.dataset.show = 'true';
    l.dataset.run = String(!!ST.TM.startedAt);
    l.dataset.id = it.id;
    l.innerHTML = `<i></i><span>${ST.TM.startedAt ? 'กำลังจับเวลา' : 'หยุดชั่วคราว'} · ${esc(it.title)}</span><b>${fmtClock(tmMs())}</b>`;
}
function tick() {
    if (!ST.TM)
        return;
    const it = find(ST.TM.id);
    if (!it) {
        ST.TM = null;
        saveTM();
        return updateLive();
    }
    const d = $('digits');
    if (d && ST.focusId !== null) {
        d.textContent = fmtClock(tmMs());
        $('dial').style.setProperty('--p', Math.min(100, (val(it, ST.TM.date) * 60000 + tmMs()) / (it.target * 60000) * 100));
    }
    else
        updateLive();
}
setInterval(tick, 1000);
function tmFinish() {
    const it = find(ST.TM.id), mins = Math.round(tmMs() / 60000), date = ST.TM.date;
    ST.TM = null;
    saveTM();
    if (!it)
        return;
    if (mins < 1) {
        toast('สั้นกว่า 1 นาที จึงไม่บันทึก');
        refreshFocus();
        return;
    }
    commit(`บันทึก ${mins} นาที: ${it.title}`, () => { it.log[date] = val(it, date) + mins; });
    refreshFocus();
}
Object.assign(window, { loadTM, saveTM, tmMs, focusBody, openFocus, refreshFocus, updateLive, tick, tmFinish });
