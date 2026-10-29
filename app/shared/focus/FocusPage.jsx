/**
 * หน้าจับเวลา (focus) ของ Evarel (ชั้นที่ 1 ของกล่อง focus โซน shared เพราะ mount ผ่าน EvarelMount.mountAt) — Fragment ระดับบน ไม่มี wrapper กันบั๊กเลย์เอาต์ flex ของ #page
 * รับ {id} อ่านสถานะจาก ST ตอน render ทุกครั้ง: rerender ทุก tick ผ่าน EvarelMount.rerender (root เดิม) ลงทะเบียน Pages.focus (สตริง) และ Components.focus (mount) ฟังก์ชันเดียวกันตามบัตร register
 * children ต้องตรง template เดิม focusBody ทุกไบต์ รวมข้อความ '\n ' ระหว่างส่วน | ข้อมูลทั้งหมดมาจากถาด focus.tray.js ที่เดียว กล่องนี้ไม่แตะ window | h/Fragment บิลด์ฉีดให้
 */
import { val } from '../../src/core/schedule.ts';
import { takeFocusFns, takeFocusLive } from './focus.tray.js';
import { FocusBtn } from './parts/FocusBtn.jsx';
import { FocusBar } from './parts/FocusBar.jsx';
import { FocusDial } from './parts/FocusDial.jsx';

export function FocusContent(p) {
  const F = takeFocusFns();
  const L = takeFocusLive();
  const it = F.find(p.id);
  if (!it) return null;
  const tm = L.tm(), fdate = L.fdate();
  const mine = tm && tm.id == it.id, run = mine && !!tm.startedAt, ms = mine ? L.tmMs() : 0;
  const goal = it.target * 60000, base = val(it, mine ? tm.date : fdate) * 60000, pct = Math.min(100, (base + ms) / goal * 100);
  const acts = !mine
    ? h(FocusBtn, { key: 's', a: 'tstart', ic: 'play', l: 'เริ่ม', big: true, id: it.id })
    : run
      ? [h(FocusBtn, { key: 'p', a: 'tpause', ic: 'pause', l: 'หยุดชั่วคราว', big: true, id: it.id }), h(FocusBtn, { key: 'f', a: 'tfinish', ic: 'stop', l: 'จบและบันทึก', id: it.id })]
      : [h(FocusBtn, { key: 'r', a: 'tresume', ic: 'play', l: 'ต่อ', big: true, id: it.id }), h(FocusBtn, { key: 'f', a: 'tfinish', ic: 'stop', l: 'จบและบันทึก', id: it.id })];
  return h(Fragment, null, [
    h(FocusBar, { key: 'bar', F, mine }),
    '\n ',
    h('div', { key: 'scroll', className: 'ev-page-scroll', style: { textAlign: 'center' } }, [
      h('div', { key: 'h1' }, [
        h('p', { key: 't', className: 'ev-title', role: 'heading', 'aria-level': 3, style: { padding: '0' } }, it.title),
        h('p', { key: 'p', className: 'ev-sub' }, `เป้าหมาย ${it.target} ${it.unitName || 'นาที'} · ${F.dayLab(fdate)}ทำแล้ว ${val(it, fdate)}`),
      ]),
      '\n ',
      h(FocusDial, { key: 'dial', run, mine, pct, ms }),
      h('div', { key: 'act', className: 'ev-focus-actions' }, acts),
      '\n ',
      h('p', { key: 'note', className: 'ev-sub' }, 'ปิดแอปแล้วเวลายังเดินต่อ เพราะเก็บเวลาเริ่มไว้ ไม่ได้นับวินาทีในหน้านี้'),
    ]),
  ]);
}

export default FocusContent;
