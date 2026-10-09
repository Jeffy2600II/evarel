/* Path: app/js/ui/form.js | split mechanically from app.js (no logic edits) */
import { ST } from '../core/state.js';
import { MAX_REMINDERS, REM_OPTS, TRACK_OPTS, TYPES, UNIT_TH, WEEK_OPTS, cleanReminders, remText } from '../core/constants.js';
import { TODAY, esc, parse } from '../core/dates.js';
import { sheetEl } from '../core/dom.js';
import { find } from '../core/store.js';
import { target } from '../services/schedule.js';
import { closeMenu } from './menu.js';
import { icon } from './primitives.js';
import { openSheet } from './sheet.js';

export const newDraft = type => ({ type, title: '', subject: '', start: TODAY, end: '', endMode: 'never', time: '', timeEnd: '', unit: type === 'habit' ? 'day' : 'none', every: 1, days: [], track: 'check', target: 1, unitName: '', reminders: [], remTime: '', remMode: 'before', _modePicked: false, remNum: '', remUnit: 1, remDays: 1, editId: null });
export const seg = (act, opts, cur) => `<div class="ev-seg">${opts.map(([k, l]) => `<button type="button" aria-pressed="${cur === k}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
export const chips = (act, opts, arr) => `<div class="ev-filters" data-wrap="true" data-type="${act}">${opts.map(([k, l]) => `<button type="button" aria-pressed="${arr.includes(k)}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
export const field = (l, h) => h.startsWith('<div class="ev-seg"') || h.startsWith('<div class="ev-filters"') ? `<div class="ev-field" role="group"><span>${l}</span>${h}</div>` : `<label class="ev-field"><span>${l}</span>${h}</label>`;
export const inp = (n, t, ph = '') => `<input class="ev-input" name="${n}" type="${t}" value="${esc(ST.D[n])}" placeholder="${ph}">`;
export const row2 = (a, b) => `<div class="ev-row2">${a}${b}</div>`;
export const rangeBlock = () => field('สิ้นสุด', seg('dend', [['never', 'ไม่สิ้นสุด'], ['date', 'ถึงวันที่']], ST.D.endMode)) + (ST.D.endMode === 'date' ? field('วันสิ้นสุด', inp('end', 'date')) : '');
export const repeatBlock = () => field('ทำซ้ำ', seg('dunit', [['none', 'ไม่ซ้ำ'], ['day', 'ทุกวัน'], ['week', 'ทุกสัปดาห์'], ['month', 'ทุกเดือน']], ST.D.unit))
  + (ST.D.unit === 'none'
    ? field(ST.D.type === 'event' ? 'วันที่จัด' : 'วันที่', inp('start', 'date'))
    : (ST.D.unit === 'week' ? field('เลือกวัน', chips('dday', WEEK_OPTS, ST.D.days)) : '')
      + row2(field(`ทุกกี่${UNIT_TH[ST.D.unit]}`, inp('every', 'number')), field('เริ่มวันที่', inp('start', 'date'))) + rangeBlock());
/* ---------- ส่วนเตือนในฟอร์ม: เวลาเจาะจงหลายเวลา + เตือนล่วงหน้า ---------- */
/* การเตือน: เลือกจากรายการสำเร็จรูปแบบปฏิทิน + "กำหนดเอง" (ศัพท์เดียวกับช่องเวลาในฟอร์ม) */
export function remBlock() {
  const T = ST.D.type, hasTime = !!ST.D.time, lab = timeLabel(T);
  const tags = ST.D.reminders.map((r, i) => `<span class="ev-rem-tag">${remText(r)}<button type="button" data-act="rrem" data-id="${i}" aria-label="ลบการเตือน ${remText(r)}">${icon('x')}</button></span>`).join('');
  const modes = [['before', hasTime ? `ก่อน${lab}` : null], ['at', 'ตามนาฬิกา']];
  if (T === 'task') modes.push(['day', 'ก่อนวันส่ง']);
  const avail = modes.filter(m => m[1]);
  /* โหมดที่เลือกอยู่ต้องมีให้เลือกจริง ถ้าไม่มี (เช่น ยังไม่ใส่เวลา) ให้ใช้ตัวแรกที่มี
     และถ้าผู้ใช้ยังไม่เคยเลือกเอง พอมีเวลาแล้วให้เป็น "ก่อน…" เสมอ เพื่อให้ปุ่มด่วนกับช่องกรอกเป็นชุดเดียวกัน */
  if (!avail.some(m => m[0] === ST.D.remMode) || (!ST.D._modePicked && hasTime && ST.D.remMode !== 'before')) ST.D.remMode = avail[0][0];
  const mode = ST.D.remMode;
  const quick = hasTime && mode === 'before'
    ? REM_OPTS.map(([m, l]) => `<button type="button" aria-pressed="${ST.D.reminders.some(r => r.k === 'before' && r.m === m)}" data-act="rquick" data-id="${m}">${m === 0 ? `ตรง${lab}` : l}</button>`).join('')
    : '';
  let custom = '';
  if (mode === 'before') custom = `<div class="ev-rem-add"><input class="ev-input" type="number" inputmode="numeric" min="1" max="999" name="remNum" value="${esc(ST.D.remNum)}" placeholder="กำหนดเอง" aria-label="จำนวนที่ต้องการเตือนก่อน"><select class="ev-input ev-select" name="remUnit" aria-label="หน่วย"><option value="1" ${ST.D.remUnit == 1 ? 'selected' : ''}>นาที</option><option value="60" ${ST.D.remUnit == 60 ? 'selected' : ''}>ชั่วโมง</option><option value="1440" ${ST.D.remUnit == 1440 ? 'selected' : ''}>วัน</option></select><button type="button" class="ev-mini ev-mini-wide" data-act="rcustom">เพิ่ม</button></div>`;
  else if (mode === 'at') custom = `<div class="ev-rem-add"><input class="ev-input" type="time" name="remTime" value="${esc(ST.D.remTime)}" aria-label="เวลานาฬิกาที่ต้องการให้เตือน"><button type="button" class="ev-mini ev-mini-wide" data-act="radd">เพิ่ม</button></div>`;
  else custom = `<div class="ev-rem-add"><input class="ev-input" type="number" inputmode="numeric" min="1" max="30" name="remDays" value="${esc(ST.D.remDays)}" aria-label="จำนวนวันก่อนวันส่ง" placeholder="กี่วัน"><span class="ev-sub">วันก่อนวันส่ง เวลา</span><input class="ev-input" type="time" name="remTime" value="${esc(ST.D.remTime || '18:00')}" aria-label="เวลานาฬิกาที่เตือน"><button type="button" class="ev-mini ev-mini-wide" data-act="rday">เพิ่ม</button></div>`;
  const hint = mode === 'before' && !hasTime ? '' : mode === 'before' ? `เตือนก่อนถึง${lab} ${esc(ST.D.time)} น.` : mode === 'at' ? 'เตือนตามเวลานาฬิกา ไม่ขึ้นกับเวลาของรายการ เช่น 07:00' : 'เตือนก่อนถึงวันที่ส่ง ใช้ได้แม้ไม่ได้ใส่เวลาส่ง';
  return `<fieldset class="ev-field ev-rem" id="remBlock"><legend>เตือนล่วงหน้า ${ST.D.reminders.length ? `<span class="ev-opt">${ST.D.reminders.length}/${MAX_REMINDERS}</span>` : '<span class="ev-opt">ไม่บังคับ</span>'}</legend>
    ${tags ? `<div class="ev-rem-list">${tags}</div>` : ''}
    ${quick ? `<div class="ev-filters" data-wrap="true" data-type="rquick">${quick}</div>` : (avail.length && !hasTime && T !== 'task' ? `<p class="ev-rem-hint" data-tone="warn">ใส่<b>${lab}</b>ด้านบนก่อน ถึงจะเตือนก่อนเวลานั้นได้ หรือเลือก “ตามนาฬิกา” แทน</p>` : '')}
    ${avail.length > 1 ? seg('rmode', avail, mode) : ''}
    ${hint ? `<p class="ev-rem-hint">${hint}</p>` : ''}${custom}</fieldset>`;
}
export const timeLabel = T => T === 'task' ? 'เวลาส่ง' : T === 'habit' ? 'เวลาที่ทำ' : 'เวลาเริ่ม';
export function formHTML() {
  const T = ST.D.type, multi = ST.D.track !== 'check';
  const opt = '<span class="ev-opt">ไม่บังคับ</span>';
  let h = seg('dtype', Object.entries(TYPES), T) + field(T === 'class' ? 'ชื่อวิชา' : 'ชื่อ', inp('title', 'text', T === 'habit' ? 'เช่น ดื่มน้ำ' : T === 'task' ? 'เช่น การบ้านคณิตศาสตร์' : T === 'class' ? 'เช่น ฟิสิกส์' : 'เช่น ประชุมชมรม'));
  if (T === 'task') h += field(`หมวดวิชา ${opt}`, inp('subject', 'text', 'เช่น คณิต')) + row2(field('วันที่ส่ง', inp('start', 'date')), field(`เวลาส่ง ${opt}`, inp('time', 'time')));
  if (T === 'habit') h += field(`เวลาที่ทำ ${opt}`, inp('time', 'time')) + field('นับผลแบบไหน', seg('dtrack', TRACK_OPTS, ST.D.track))
    + (multi ? row2(field('เป้าหมายต่อวัน', inp('target', 'number')), field('หน่วย', inp('unitName', 'text', 'เช่น แก้ว'))) : '') + repeatBlock();
  if (T === 'event') h += row2(field('เวลาเริ่ม', inp('time', 'time')), field(`เวลาจบ ${opt}`, inp('timeEnd', 'time'))) + repeatBlock();
  if (T === 'class') h += field('เรียนวันไหน', chips('dday', WEEK_OPTS, ST.D.days)) + row2(field('เวลาเริ่ม', inp('time', 'time')), field('เวลาจบ', inp('timeEnd', 'time'))) + field('เริ่มเรียนวันที่', inp('start', 'date')) + rangeBlock();
  return `<form class="ev-form" id="addForm" novalidate>${h}${remBlock()}<p class="ev-form-err" id="formErr" role="alert" hidden></p><button class="ev-btn-primary ev-btn-block" type="submit">${ST.D.editId ? 'บันทึกการแก้ไข' : 'บันทึก'}</button></form>`;
}
export function renderForm() { const y = sheetEl.scrollTop; openSheet(ST.D.editId ? 'แก้ไข' : 'เพิ่มใหม่', formHTML()); sheetEl.scrollTop = y; }
export function buildItem() {
  const T = ST.D.type, week = T === 'class' || ST.D.unit === 'week';
  const days = week ? (ST.D.days.length ? ST.D.days : [parse(ST.D.start).getDay()]) : [];
  const repeat = T === 'task' ? { unit: 'none', every: 1, days: [] } : { unit: T === 'class' ? 'week' : ST.D.unit, every: Math.max(1, +ST.D.every || 1), days };
  const multi = T === 'habit' && ST.D.track !== 'check';
  return { id: ST.D.editId || Date.now(), type: T, title: ST.D.title.trim(), subject: ST.D.subject, start: ST.D.start, end: ST.D.endMode === 'date' && repeat.unit !== 'none' ? ST.D.end : '', time: ST.D.time, timeEnd: ST.D.timeEnd,
    reminders: cleanReminders(ST.D.reminders), repeat, track: T === 'habit' ? ST.D.track : T === 'task' ? 'check' : 'none', target: multi ? Math.max(1, +ST.D.target || 1) : 1, unitName: multi ? ST.D.unitName : '', log: {} };
}
/* โหลดรายการเดิมเข้า draft แล้วเปิดฟอร์มเดิมในโหมดแก้ไข */
export function openEdit(id) {
  const it = find(id); if (!it) return;
  closeMenu(true);
  ST.D = { type: it.type, title: it.title, subject: it.subject || '', start: it.start, end: it.end || '', endMode: it.end ? 'date' : 'never', time: it.time || '', timeEnd: it.timeEnd || '',
    unit: it.repeat.unit, every: it.repeat.every, days: [...it.repeat.days], track: it.track === 'none' ? 'check' : it.track, target: it.target, unitName: it.unitName || '',
    reminders: it.reminders.map(r => ({ ...r })), remTime: '', remMode: 'before', _modePicked: false, remNum: '', remUnit: 1, remDays: 1, editId: it.id };
  renderForm();
}
export const openAdd = type => { ST.D = newDraft(type); renderForm(); setTimeout(() => document.querySelector('#addForm input[name="title"]')?.focus({ preventScroll: true }), 60); };
export const toggle = (arr, v) => { const i = arr.indexOf(v); if (i < 0) arr.push(v); else arr.splice(i, 1); };
