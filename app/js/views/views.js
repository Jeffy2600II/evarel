/* Path: app/js/views/views.js | split mechanically from app.js (no logic edits) */
import { ST } from '../core/state.js';
import { STAT_DAYS, TYPES, WD } from '../core/constants.js';
import { TODAY, addDays, esc, parse, ymd } from '../core/dates.js';
import { UI } from '../core/store.js';
import { daysSince, isDone, occursOn, onDate, rate, repeatText, streak, tracked } from '../services/schedule.js';
import { TYPE_ICON, chipsRow, empty, header, icon, itemRow, kebab, overdueList, summaryHead, summarySub } from '../ui/primitives.js';
import { settingsBody } from './settings.js';

/* ---------- Feature views ---------- */
export const VIEWS = {
  today() {
    const list = onDate(UI.date), tr = list.filter(tracked), done = tr.filter(it => isDone(it, UI.date)).length, p = tr.length ? Math.round(100 * done / tr.length) : 0;
    const start = addDays(new Date(), -new Date().getDay());
    const week = Array.from({ length: 7 }, (_, i) => ymd(addDays(start, i)));
    return `${header(new Date(parse(UI.date)).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }), 'วันนี้')}
    <div class="ev-week" role="group" aria-label="เลือกวัน">${week.map(d => `<button aria-pressed="${UI.date === d}" data-today="${d === TODAY}" data-act="date" data-id="${d}">${WD[parse(d).getDay()]}<b>${parse(d).getDate()}</b></button>`).join('')}</div>
    <main class="ev-main"><section class="ev-card ev-row" data-tone="accent"><div class="ev-ring" style="--p:${p}"><span>${p}%</span></div>
      <div class="grow"><b>${summaryHead(tr, done)}</b><p class="ev-lead">${summarySub(list, tr, done)}</p></div></section>
    ${UI.date === TODAY && overdueList().length ? `<section class="ev-card" data-tone="alert"><b>ค้างอยู่ ${overdueList().length} งาน</b><ul class="ev-plain-list">${overdueList().map(it => `<li class="ev-list-item"><button class="ev-check" role="checkbox" aria-checked="false" aria-label="ทำแล้ว" data-act="checkdue" data-id="${it.id}">${icon('check')}</button><div class="grow"><b>${esc(it.title)}</b><span class="ev-sub">กำหนด ${it.start}${it.subject ? ' · ' + esc(it.subject) : ''}</span></div><span class="ev-chip" data-state="late">เลยกำหนด</span></li>`).join('')}</ul></section>` : ''}
    <section class="ev-card">${list.length ? `<ul class="ev-plain-list">${list.map(it => itemRow(it, UI.date)).join('')}</ul>` : empty('วันนี้ว่าง', 'กดปุ่ม + เพื่อเพิ่มสิ่งที่อยากทำ')}</section></main>`;
  },
  all() {
    const list = ST.S.items.filter(it => UI.type === 'all' || it.type === UI.type);
    const row = it => `<li class="ev-list-item"><span class="ev-type" data-type="${it.type}" title="${TYPES[it.type]}" role="img" aria-label="${TYPES[it.type]}">${icon(TYPE_ICON[it.type])}</span><div class="grow"><b>${esc(it.title)}</b><span class="ev-sub">${repeatText(it)}${it.reminders.length ? ` · ${icon('bell').replace('class="ev-icon"', 'class="ev-icon ev-icon-inline"')}${it.reminders.length}` : ''}</span></div>${kebab(it)}</li>`;
    return `${header('ทุกอย่างที่ตั้งไว้', 'รายการ')}${chipsRow('type', [['all', 'ทั้งหมด'], ...Object.entries(TYPES)], UI.type)}
    <main class="ev-main"><section class="ev-card">${list.length ? `<ul class="ev-plain-list">${list.map(row).join('')}</ul>` : empty('ยังไม่มีรายการ', 'กดปุ่ม + เพื่อสร้าง')}</section></main>`;
  },
  schedule() {
    /* ตารางเรียนเป็นแม่แบบรายสัปดาห์: เลือก "ครั้งถัดไป" ของวันนั้น (วันนี้นับด้วย) เพื่อไม่ให้ว่างเพราะวันเริ่มอยู่หลังวันในอดีต */
    const nextOf = i => { const diff = (i - new Date().getDay() + 7) % 7; return ymd(addDays(new Date(), diff)); };
    const date = nextOf(UI.cday), list = onDate(date).filter(it => it.type === 'class');
    const dayName = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][UI.cday];
    const sub = date === TODAY ? 'วันนี้' : parse(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' });
    return `${header('คาบเรียนแต่ละวัน', 'ตารางเรียน')}<div class="ev-week" role="group" aria-label="เลือกวันเรียน">${[1, 2, 3, 4, 5].map(i => `<button aria-pressed="${UI.cday === i}" data-act="cday" data-id="${i}">${WD[i]}</button>`).join('')}</div>
    <main class="ev-main"><section class="ev-card">${list.length ? `<p class="ev-sub ev-sched-day">วัน${dayName} · ${sub} · ${list.length} คาบ</p>` + list.map(it => `<div class="ev-list-item ev-period"><span class="ev-period-time"><b>${it.time}</b><span>${it.timeEnd}</span></span><div class="grow"><b>${esc(it.title)}</b></div></div>`).join('') : empty(`วัน${dayName}ไม่มีคาบเรียน`, 'กด + แล้วเลือก “คาบเรียน”')}</section></main>`;
  },
  stats() {
    const habits = ST.S.items.filter(it => it.type === 'habit');
    const card = it => { const bars = Array.from({ length: 7 }, (_, i) => { const ds = ymd(addDays(new Date(), i - 6)); return `<i data-state="${occursOn(it, ds) && isDone(it, ds) ? 'hit' : 'miss'}" style="height:${occursOn(it, ds) ? 100 : 15}%"></i>`; }).join('');
      return `<section class="ev-card"><div class="ev-stat"><div><b>${esc(it.title)}</b><p class="ev-sub">${daysSince(it) < 3 ? `เพิ่งเริ่ม · ทำมา ${Math.max(1, daysSince(it))} วัน (ยังไม่มีข้อมูลพอสรุป)` : `ทำสำเร็จ ${rate(it)}% ใน ${Math.min(STAT_DAYS, daysSince(it))} วันที่ผ่านมา`}</p></div><div class="ev-streak">${streak(it) ? `${streak(it)}<span class="ev-sub"> วันติดต่อกัน</span>` : '<span class="ev-sub">เริ่มใหม่ได้เลย</span>'}</div></div><div class="ev-bars ev-gap-top">${bars}</div></section>`; };
    return `${header('ความต่อเนื่องของคุณ', 'สถิติ')}<main class="ev-main">${habits.length ? habits.map(card).join('') : empty('ยังไม่มีกิจวัตร', 'สร้างกิจวัตรเพื่อดูสถิติ')}</main>`;
  },
  settings() {
    return `<header class="ev-header"><button class="ev-icon-btn" data-act="close" aria-label="ย้อนกลับ">${icon('left')}</button><span class="ev-sub"></span><div></div></header><h1 class="ev-title">ตั้งค่า</h1>${settingsBody()}`;
  }
};
