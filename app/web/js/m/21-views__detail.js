"use strict";
/* ===== MODULE: views/detail (ปฏิทินรายเดือน + แก้สถานะย้อนหลัง · เพิ่มประเภทใหม่ = เพิ่มใน DETAIL_BY_TYPE) ===== */
const HIST_STEP_TIMER = 5;
function refreshDetail() {
    if (ST.DETAIL == null)
        return;
    const it = find(ST.DETAIL);
    if (!it) {
        ST.DETAIL = null;
        if (LAYERS.some(l => l.el === page))
            closeTop();
        return;
    }
    const y = page.querySelector('.ev-page-scroll')?.scrollTop || 0;
    const MT = window.EvarelMount;
    /* S4: เป็น React อยู่ (root detail ที่ page) = remount ใหม่ คงตำแหน่งเลื่อนเหมือนเดิม */
    if (MT?.ready('detail') && MT.els?.detail === page) {
        MT.mountAt(page, 'detail', { id: it.id });
        const sc = page.querySelector('.ev-page-scroll');
        if (sc)
            sc.scrollTop = y;
        mountHabit();
        return;
    }
    page.innerHTML = detailHTML(it);
    const sc = page.querySelector('.ev-page-scroll');
    if (sc)
        sc.scrollTop = y;
    mountHabit();
}
const dvStep = it => it.track === 'timer' ? HIST_STEP_TIMER : 1;
const dvHTML = it => `<h3>${esc(it.title)}</h3><p class="ev-sub">${fmtDate(ST.DV.ds)}</p><div class="ev-stepper" style="margin:14px 0 4px;justify-content:center;gap:22px"><div class="ev-step"><button data-act="dv-add" data-id="${-dvStep(it)}" aria-label="ลด">−</button></div><b id="dvNum" style="font-size:34px;min-width:64px">${ST.DV.v}</b><div class="ev-step"><button data-act="dv-add" data-id="${dvStep(it)}" aria-label="เพิ่ม">+</button></div></div><p class="ev-sub" style="text-align:center">${esc(it.unitName)} · เป้า ${it.target}</p><div class="ev-dlg-actions"><button class="ev-btn-ghost" data-act="close">ยกเลิก</button><button class="ev-btn-primary" data-act="dv-save">บันทึก</button></div>`;
const hApply = (fn) => { const it = find(ST.DETAIL); if (it)
    commit('', () => fn(it), true); return NR; };
const calMove = n => { const c = UI.cal, d = new Date(c.y, c.m + n, 1); UI.cal = { y: d.getFullYear(), m: d.getMonth() }; refreshDetail(); return NR; };
Object.assign(window, { HIST_STEP_TIMER, refreshDetail, dvStep, dvHTML, hApply, calMove });
