"use strict";
/* ===== MODULE: ui/form (เพิ่ม/แก้ไข) — ขั้นที่ 1 เลือกประเภท, ขั้นที่ 2 กรอกเฉพาะที่จำเป็น ตัวเลือกขั้นสูงพับเก็บ ===== */
const TYPE_INFO = { habit: ['clock', 'ทำซ้ำเป็นประจำ เช่น ดื่มน้ำ อ่านหนังสือ'], task: ['tasks', 'มีวันส่ง เช่น การบ้าน รายงาน'], event: ['bell', 'นัดหมายที่มีเวลาเริ่มและจบ'], class: ['cal', 'คาบเรียนประจำสัปดาห์'] };
const startBase = () => { const d = UI.tab === 'calendar' ? UI.calSel : UI.date; return d >= TODAY ? d : TODAY; };
const newDraft = t => ({ id: null, step: 'form', open: '', type: t, title: '', subject: '', start: startBase(), end: '', endMode: 'never', time: '', timeEnd: '', unit: t === 'habit' ? 'day' : 'none', every: 1, days: [], track: 'check', target: 1, unitName: '', rem: [{ k: 'before', m: 0 }], err: '' });
const draftFrom = it => ({ id: it.id, step: 'form', open: '', type: it.type, title: it.title, subject: it.subject, start: it.start, end: it.end, endMode: it.end ? 'date' : 'never', time: it.time, timeEnd: it.timeEnd, unit: it.repeat.unit, every: it.repeat.every, days: [...it.repeat.days], track: it.track === 'none' ? 'check' : it.track, target: it.target, unitName: it.unitName, rem: it.rem.map(r => ({ ...r })), err: '' });
const chips = (act, o, arr) => `<div class="ev-filters ev-wrap">${o.map(([k, l]) => `<button type="button" aria-pressed="${arr.includes(k)}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
const SR = (l, v, k) => `<button type="button" class="ev-set-row" data-act="dopen" data-id="${k}" aria-expanded="${ST.D.open === k}"><span>${l}</span><small>${v}${icon('chev')}</small></button>`;
const PN = (k, h) => `<div class="ev-panel" data-key="${k}" data-open="${ST.D.open === k}"><div><div class="ev-panel-in">${h}</div></div></div>`;
const IR = (l, h) => `<div class="ev-set-row"><span>${l}</span>${h}</div>`;
const ri = (n, t) => `<input class="ev-row-input" aria-label="${n}" type="${t}" value="${esc(ST.D[n] ?? '')}" name="${n}">`; /* S4: ลำดับ attribute ตรง React DOM (type,value,name ท้าย) */
const stepper = (l, act, v, u) => `<div class="ev-stepper"><span>${l}</span><div class="ev-step"><button type="button" data-act="${act}" data-id="-1" aria-label="ลด" ${v <= 1 ? 'disabled' : ''}>−</button><b>${v}</b><button type="button" data-act="${act}" data-id="1" aria-label="เพิ่ม">+</button></div>${u}</div>`;
const everyTxt = () => ST.D.every > 1 ? `ทุก ${ST.D.every} ` : 'ทุก';
const repSum = () => ST.D.unit === 'none' ? 'ไม่ซ้ำ' : ST.D.unit === 'week' ? `${everyTxt()}สัปดาห์${ST.D.days.length ? ` · ${[...ST.D.days].sort().map(d => WD[d]).join(' ')}` : ''}` : `${everyTxt()}${UNIT_TH[ST.D.unit]}`;
const remSum = () => { const s = notifyState(ST.D.rem, true), p = [...(s.onTime ? ['ตรงเวลา'] : []), ...s.ahead.map(m => remText({ k: 'before', m })), ...s.at.map(x => remText({ k: 'at', t: x }))]; return p.length ? p.slice(0, 2).join(', ') + (p.length > 2 ? ` +${p.length - 2}` : '') : 'ปิด'; };
const rangeSum = () => `${ST.D.start === TODAY ? 'เริ่มวันนี้' : `เริ่ม ${ST.D.start}`} · ${ST.D.endMode === 'date' && ST.D.end ? `ถึง ${ST.D.end}` : 'ไม่สิ้นสุด'}`;
const repPanel = () => seg('dunit', [['none', 'ไม่ซ้ำ'], ['day', 'วัน'], ['week', 'สัปดาห์'], ['month', 'เดือน']], ST.D.unit) + (ST.D.unit === 'none' ? '' : stepper('ทุก ๆ', 'devery', ST.D.every, `<span>${UNIT_TH[ST.D.unit]}</span>`)) + (ST.D.unit === 'week' ? chips('dday', WEEK_OPTS, ST.D.days) : '');
const rangePanel = lab => `<div class="ev-stepper"><span>${lab}</span>${ri('start', 'date')}</div><div class="ev-stepper"><span>มีวันสิ้นสุด</span><button type="button" class="ev-switch" role="switch" aria-checked="${ST.D.endMode === 'date'}" data-act="dend" aria-label="มีวันสิ้นสุด"></button></div>${ST.D.endMode === 'date' ? `<div class="ev-stepper"><span>สิ้นสุดวันที่</span>${ri('end', 'date')}</div>` : ''}`;
const remPanel = () => {
    const s = notifyState(ST.D.rem, true), at = ST.D.rem.filter(r => r.k === 'at');
    return `<div class="ev-stepper"><span>แจ้งเตือนตรงเวลา</span><button type="button" class="ev-switch" role="switch" aria-checked="${s.onTime}" data-act="dontime" aria-label="แจ้งเตือนตรงเวลา"></button></div><span class="ev-cap">เตือนล่วงหน้า</span>` + chips('drem', AHEAD_PRESETS.map(m => [m, remText({ k: 'before', m })]), s.ahead)
        + (at.length ? `<div class="ev-rem">${at.map(r => `<span class="ev-rem-tag">${r.t} น.<button type="button" data-act="remdel" data-id="${r.t}" aria-label="ลบการแจ้งเตือน ${r.t}">${icon('x')}</button></span>`).join('')}</div>` : '')
        + `<div class="ev-stepper"><span>แจ้งเตือนตามเวลา</span><div class="ev-row" style="gap: 8px;"><input class="ev-row-input" id="remTime" aria-label="เวลาแจ้งเตือน" type="time"><button type="button" class="ev-btn-ghost ev-btn-sm" data-act="remadd">เพิ่ม</button></div></div>`;
};
const SET = h => `<div class="ev-set">${h}</div>`;
/* notifyIssue + ปุ่มปิดแจ้งเตือน ตามเดโม v24: เตือนเมื่อตั้งแจ้งก่อนถึงเวลาแต่ไม่มีเวลาทำรายการ */
const notifyIssue = () => ST.D.rem.some(r => r.k === 'before' && r.m >= 0) && !ST.D.time ? 'ต้องใส่เวลา จึงจะแจ้งเตือนได้ ถ้าไม่ต้องการแจ้งเตือน ให้ปิดแจ้งเตือน' : '';
const remRow = () => SR('แจ้งเตือน', remSum(), 'rem') + PN('rem', remPanel()) + (notifyIssue() ? `<div class="ev-field-err" data-tone="hint" style="padding: 6px 14px 12px;">${icon('alert')}<span>${notifyIssue()}</span><button type="button" data-act="rem-off">ปิดแจ้งเตือน</button></div>` : '');
function formBody() {
    const T = ST.D.type, multi = ST.D.track !== 'check', ph = { habit: 'เช่น ดื่มน้ำ', task: 'เช่น การบ้านคณิต', event: 'เช่น ประชุมชมรม', class: 'ชื่อวิชา' }[T];
    let h = `<input class="ev-title-input" placeholder="${ph}" maxlength="80" aria-label="ชื่อ" value="${esc(ST.D.title)}" name="title">${ST.D.err ? `<div class="ev-form-err" role="alert">${esc(ST.D.err)}</div>` : ''}`;
    if (T === 'habit')
        h += `<div class="ev-block"><span class="ev-cap">ติดตามผลแบบ</span>${seg('dtrack', TRACK_OPTS, ST.D.track)}${multi ? stepper('เป้าหมายต่อวัน', 'dtarget', ST.D.target, `<input class="ev-unit" placeholder="${ST.D.track === 'timer' ? 'นาที' : 'หน่วย'}" maxlength="12" aria-label="หน่วย" value="${esc(ST.D.unitName)}" name="unitName">`) : ''}</div>`
            + SET(IR('เวลา', ri('time', 'time')) + SR('ทำซ้ำ', repSum(), 'rep') + PN('rep', repPanel()) + SR('ช่วงเวลา', rangeSum(), 'range') + PN('range', rangePanel('เริ่มวันที่'))) + SET(remRow());
    if (T === 'task')
        h += SET(IR('กำหนดส่ง', ri('start', 'date')) + IR('เวลา', ri('time', 'time')) + IR('วิชา/หมวด', `<input class="ev-row-input" placeholder="ไม่บังคับ" maxlength="30" aria-label="วิชา" value="${esc(ST.D.subject)}" name="subject">`)) + SET(remRow());
    if (T === 'event')
        h += SET(IR('วันที่', ri('start', 'date')) + IR('เริ่ม', ri('time', 'time')) + IR('จบ', ri('timeEnd', 'time')) + SR('ทำซ้ำ', repSum(), 'rep') + PN('rep', repPanel()) + (ST.D.unit !== 'none' ? SR('ช่วงเวลา', rangeSum(), 'range') + PN('range', rangePanel('เริ่มวันที่')) : '')) + SET(remRow());
    if (T === 'class')
        h += `<div class="ev-block"><span class="ev-cap">วันที่เรียน</span>${chips('dday', WEEK_OPTS, ST.D.days)}</div>` + SET(IR('เริ่ม', ri('time', 'time')) + IR('จบ', ri('timeEnd', 'time')) + SR('ภาคเรียน', rangeSum(), 'range') + PN('range', rangePanel('เปิดเทอม'))) + SET(remRow());
    return h;
}
const typeBody = () => `<div class="ev-types">${Object.entries(TYPE_INFO).map(([k, [ic, d]]) => `<button class="ev-type" data-act="dtype" data-id="${k}"><span class="orb">${icon(ic)}</span><b>${TYPES[k]}</b><span class="d">${d}</span></button>`).join('')}</div>`;
function renderForm() {
    ST.sheetMode = 'form';
    const y = $('sheetBody')?.scrollTop || 0, isType = ST.D.step === 'type';
    const title = isType ? 'เพิ่มอะไรดี' : `${ST.D.id ? 'แก้ไข' : 'เพิ่ม'}${TYPES[ST.D.type]}`, body = isType ? typeBody() : `<form class="ev-form" id="addForm" novalidate>${formBody()}</form>`;
    const o = { back: !isType && !ST.D.id && ST.D.fromType, foot: isType ? '' : `<button class="ev-btn-primary ev-btn-block" type="submit" form="addForm">${ST.D.id ? 'บันทึก' : `เพิ่ม${TYPES[ST.D.type]}`}</button>` };
    /* S4: เนื้อฟอร์มเป็น React จริงเมื่อพร้อม (page เขียนทับ html ใน setSheet) ไม่พร้อมใช้ string เดิม */
    const MT = window.EvarelMount;
    if (MT?.ready('sheet') && MT.ready(isType ? 'typeBody' : 'formBody')) {
        o.page = isType ? 'typeBody' : 'formBody';
    }
    if (LAYERS.some(l => l.el === sheet)) {
        setSheet(title, body, o);
        $('sheetBody').scrollTop = y;
    }
    else
        openSheet(title, body, o);
}
const openForm = (type, it) => { ST.D = it ? draftFrom(it) : type ? newDraft(type) : { ...newDraft('habit'), step: 'type' }; renderForm(); };
function validate() {
    const T = ST.D.type;
    if (!ST.D.title.trim())
        return 'กรุณาใส่ชื่อรายการ';
    if (!ST.D.start)
        return 'กรุณาเลือกวันที่';
    if (ST.D.time && ST.D.timeEnd && ST.D.timeEnd <= ST.D.time)
        return 'เวลาจบต้องหลังเวลาเริ่ม';
    if (ST.D.endMode === 'date' && (!ST.D.end || ST.D.end < ST.D.start))
        return 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม';
    {
        const ne = checkNotify(ST.D.rem, ST.D.time);
        if (ne)
            return ne;
    }
    if (T === 'class' && !ST.D.days.length)
        return 'เลือกวันที่เรียนอย่างน้อย 1 วัน';
    return '';
}
function buildItem() {
    const T = ST.D.type, old = ST.D.id ? find(ST.D.id) : null, week = T === 'class' || ST.D.unit === 'week', days = week ? (ST.D.days.length ? [...ST.D.days] : [parse(ST.D.start).getDay()]) : [];
    const unit = T === 'task' ? 'none' : T === 'class' ? 'week' : ST.D.unit, multi = T === 'habit' && ST.D.track !== 'check';
    return mk({ id: ST.D.id || Date.now(), type: T, title: ST.D.title.trim(), subject: (ST.D.subject || '').trim(), start: ST.D.start, end: ST.D.endMode === 'date' && unit !== 'none' ? ST.D.end : '', time: ST.D.time, timeEnd: T === 'task' || T === 'habit' ? '' : ST.D.timeEnd,
        rem: ST.D.rem.slice(0, MAX_REM).map(r => ({ ...r })), repeat: { unit, every: Math.max(1, Math.round(+ST.D.every || 1)), days }, track: T === 'habit' ? ST.D.track : T === 'task' ? 'check' : 'none', target: multi ? Math.max(1, Math.round(+ST.D.target || 1)) : 1, unitName: multi ? (ST.D.unitName || '').trim() : '', log: old ? old.log : {}, skip: old ? old.skip : {} });
}
Object.assign(window, { TYPE_INFO, startBase, newDraft, draftFrom, chips, SR, PN, IR, ri, stepper, everyTxt, repSum, remSum, rangeSum, repPanel, rangePanel, remPanel, SET, notifyIssue, remRow, formBody, typeBody, renderForm, openForm, validate, buildItem });
