"use strict";
/* ===== MODULE: ui/layers (sheet · page · lock · focus trap · history · drag) ===== */
const $ = id => document.getElementById(id), sheet = $('sheet'), scrim = $('scrim'), page = $('page'), dialog = $('dialog'), pop = $('pop');
const LAYERS = [], BEHIND = ['app', 'nav', 'live'];
let scrollY0 = 0;
function lock(on) {
    const b = document.body;
    if (on && b.dataset.lock !== 'true') {
        scrollY0 = scrollY;
        b.style.top = `-${scrollY0}px`;
        b.dataset.lock = 'true';
    }
    else if (!on && b.dataset.lock === 'true') {
        b.dataset.lock = 'false';
        b.style.top = '';
        scrollTo(0, scrollY0);
    }
    BEHIND.forEach(id => { const e = $(id); on ? e.setAttribute('inert', '') : e.removeAttribute('inert'); });
}
function pushLayer(layer) {
    layer.opener = document.activeElement;
    LAYERS.push(layer);
    lock(true);
    try {
        history.pushState({ ev: LAYERS.length }, '');
        layer.pushed = true;
    }
    catch (e) {
        console.warn('history', e);
    }
    layer.el.hidden = false;
    void layer.el.offsetWidth;
    layer.el.dataset.open = 'true';
    if (layer.kind === 'sheet') {
        scrim.dataset.open = 'true';
    }
    setTimeout(() => (layer.el.querySelector('[autofocus],input,button:not(.ev-icon-btn)') || layer.el).focus?.({ preventScroll: true }), 60);
}
function popLayer() {
    const l = LAYERS.pop();
    if (!l)
        return;
    l.el.dataset.open = 'false';
    l.el.style.transform = '';
    l.el.dataset.drag = 'false';
    if (!LAYERS.some(x => x.kind === 'sheet'))
        scrim.dataset.open = 'false';
    setTimeout(() => { if (l.el.dataset.open === 'false')
        l.el.hidden = true; }, LAYER_ANIM_MS);
    if (!LAYERS.length)
        lock(false);
    l.onClose?.();
    l.opener?.focus?.({ preventScroll: true });
}
const CONFIRM = { fn: null };
function sheetGuard() { if (ST.sheetMode === 'form' && ST.D.dirty) {
    confirmDialog({ title: 'ทิ้งการเปลี่ยนแปลง?', msg: 'สิ่งที่กรอกไว้จะหายไป', keep: 'กลับไปแก้', ok: 'ทิ้ง', fn: () => { ST.D.dirty = false; closeTop(); } });
    return true;
} return false; }
function closeTop() { const l = LAYERS[LAYERS.length - 1]; if (!l)
    return; if (l.guard?.())
    return; if (l.pushed) {
    history.back();
}
else
    popLayer(); }
addEventListener('popstate', () => { const l = LAYERS[LAYERS.length - 1]; if (!l)
    return; if (l.guard?.()) {
    try {
        history.pushState({ ev: LAYERS.length }, '');
    }
    catch (e) {
        console.warn('history', e);
    }
    return;
} popLayer(); });
scrim.addEventListener('click', closeTop);
addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (!pop.hidden)
            closePop();
        else
            closeTop();
    }
    if (e.key === 'Tab' && LAYERS.length) {
        const el = LAYERS[LAYERS.length - 1].el, f = [...el.querySelectorAll('button:not([disabled]),input,select,[tabindex="0"]')].filter(x => x.offsetParent);
        if (!f.length)
            return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) {
            e.preventDefault();
            z.focus();
        }
        else if (!e.shiftKey && document.activeElement === z) {
            e.preventDefault();
            a.focus();
        }
    }
});
function setSheet(title, body, o = {}) {
    const MT = window.EvarelMount;
    /* S4: โครง sheet เป็น React จริงเมื่อพร้อม; caller ส่ง o.page = เนื้อเป็น React จริง (ฟอร์ม 14) ไม่ส่ง = html เดิม */
    if (MT?.ready('sheet')) {
        MT.unmountOne('sheet');
        sheet.innerHTML = '';
        MT.mountAt(sheet, 'sheet', { title, back: !!o.back, foot: o.foot || '', html: body, page: o.page || '', props: o.props || {} });
        return;
    }
    sheet.innerHTML = `<div class="ev-grab" data-drag></div><h2 data-drag>${o.back ? `<button class="ev-icon-btn" data-flat data-act="dback" aria-label="ย้อนกลับ">${icon('back')}</button>` : ''}<span id="sheetTitle" class="grow">${esc(title)}</span><button class="ev-icon-btn" data-flat data-act="close" aria-label="ปิด">${icon('x')}</button></h2><div class="ev-sheet-body" id="sheetBody">${body}</div>${o.foot ? `<div class="ev-sheet-foot">${o.foot}</div>` : ''}`;
}
function openSheet(title, body, o = {}) { setSheet(title, body, o); pushLayer({ kind: 'sheet', el: sheet, onClose: () => { ST.sheetMode = ''; o.onClose?.(); }, guard: sheetGuard }); }
function openDialog(html) {
    const MT = window.EvarelMount;
    /* S4: การ์ด dialog เป็น React จริงเมื่อพร้อม เนื้อ html ยัง raw จาก caller */
    if (MT?.ready('dialogCard')) {
        MT.unmountOne('dialogCard');
        dialog.innerHTML = '';
        MT.mountAt(dialog, 'dialogCard', { html });
    }
    else
        dialog.innerHTML = `<div class="ev-dialog-card">${html}</div>`;
    pushLayer({ kind: 'dialog', el: dialog });
}
function confirmDialog(o) {
    CONFIRM.fn = o.fn;
    const MT = window.EvarelMount;
    /* S4: confirm เป็น React จริงเต็มรูปเมื่อพร้อม (title/msg ผ่าน children แทน esc) */
    if (MT?.ready('confirmCard')) {
        MT.unmountOne('dialogCard');
        dialog.innerHTML = '';
        MT.mountAt(dialog, 'confirmCard', { title: o.title, msg: o.msg, keep: o.keep || 'ยกเลิก', ok: o.ok, tone: o.tone });
        pushLayer({ kind: 'dialog', el: dialog });
        return;
    }
    openDialog(`<h3>${o.title}</h3><p class="ev-sub">${o.msg}</p><div class="ev-dlg-actions"><button class="ev-btn-ghost" data-act="close">${o.keep || 'ยกเลิก'}</button><button class="${o.tone === 'primary' ? 'ev-btn-primary' : 'ev-btn-solid-danger'}" data-act="cf-ok">${o.ok}</button></div>`);
}
dialog.addEventListener('click', e => { if (e.target === dialog)
    closeTop(); });
function openPage(html, onClose) { page.innerHTML = html; pushLayer({ kind: 'page', el: page, onClose }); }
/* ลากปิด sheet (pointer events + ความเร็ว) */
sheet.addEventListener('pointerdown', e => { if (!e.target.closest('[data-drag]') || e.target.closest('button'))
    return; ST.drag = { y: e.clientY, t: performance.now(), dy: 0 }; sheet.setPointerCapture(e.pointerId); sheet.dataset.drag = 'true'; });
sheet.addEventListener('pointermove', e => { if (!ST.drag)
    return; ST.drag.dy = Math.max(0, e.clientY - ST.drag.y); sheet.style.transform = `translateY(${ST.drag.dy}px)`; scrim.style.opacity = String(1 - Math.min(1, ST.drag.dy / sheet.offsetHeight)); });
const endDrag = () => { if (!ST.drag)
    return; const v = ST.drag.dy / (performance.now() - ST.drag.t), far = ST.drag.dy > DRAG_CLOSE_PX || v > DRAG_CLOSE_V; ST.drag = null; sheet.dataset.drag = 'false'; scrim.style.opacity = ''; if (far)
    closeTop();
else
    sheet.style.transform = ''; };
sheet.addEventListener('pointerup', endDrag);
sheet.addEventListener('pointercancel', endDrag);
/* moved by move_defs (evarel-ts-1f) */
function closePop() { if (pop.hidden)
    return; pop.dataset.open = 'false'; ST.popBtn?.setAttribute?.('aria-expanded', 'false'); ST.popBtn = null; setTimeout(() => { if (pop.dataset.open === 'false')
    pop.hidden = true; }, 170); }
Object.assign(window, { $, sheet, scrim, page, dialog, pop, LAYERS, BEHIND, scrollY0, lock, pushLayer, popLayer, CONFIRM, sheetGuard, closeTop, setSheet, openSheet, openDialog, confirmDialog, openPage, endDrag, closePop });
