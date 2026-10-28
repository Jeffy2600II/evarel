// หน้าจับเวลา (focus) เป็น React จริง (S4 ไบต์ 6) — Fragment ระดับบน (ไม่มี wrapper กันบั๊กเลย์เอาต์ flex ของ #page)
// รับ {id} อ่านสถานะจาก ST ตอน render ทุกครั้ง: rerender ทุก tick ผ่าน EvarelMount.rerender (root เดิม) ตัวเลข/สถานะใหม่
// เทียบ template เดิม focusBody ใน 15-core__timer ทุกไบต์ (style --p เทียบค่า semantic ตามแพทเทิร์น ai_equiv)
import { fmtClock } from '../core/dates.ts';
import { val } from '../core/schedule.ts';
import { takeFocusFns } from '../../data/focus.tray.js';
const { h, Fragment } = window.EvarelReact;
const W = () => window;

function FocusBtn({ a, ic, l, big, id }) {
  const F = takeFocusFns();
  return h('div', { style: { display: 'grid', gap: '6px', justifyItems: 'center' } }, [
    h('button', { key: 'b', className: 'ev-round', ...(big ? { 'data-big': 'true' } : {}), 'data-act': a, 'data-id': String(id), 'aria-label': l, dangerouslySetInnerHTML: { __html: F.icon(ic) } }),
    h('span', { key: 'l', className: 'ev-sub' }, l),
  ]);
}

function FocusContent(p) {
  const w = W();
  const F = takeFocusFns();
  const it = F.find(p.id);
  if (!it) return null;
  const mine = w.ST.TM && w.ST.TM.id == it.id, run = mine && !!w.ST.TM.startedAt, ms = mine ? w.tmMs() : 0;
  const goal = it.target * 60000, base = val(it, mine ? w.ST.TM.date : w.UI.fdate) * 60000, pct = Math.min(100, (base + ms) / goal * 100);
  const acts = !mine
    ? h(FocusBtn, { key: 's', a: 'tstart', ic: 'play', l: 'เริ่ม', big: true, id: it.id })
    : run
      ? [h(FocusBtn, { key: 'p', a: 'tpause', ic: 'pause', l: 'หยุดชั่วคราว', big: true, id: it.id }), h(FocusBtn, { key: 'f', a: 'tfinish', ic: 'stop', l: 'จบและบันทึก', id: it.id })]
      : [h(FocusBtn, { key: 'r', a: 'tresume', ic: 'play', l: 'ต่อ', big: true, id: it.id }), h(FocusBtn, { key: 'f', a: 'tfinish', ic: 'stop', l: 'จบและบันทึก', id: it.id })];
  return h(Fragment, null, [
    h('div', { key: 'bar', className: 'ev-page-bar' }, [
      h('button', { key: 'bk', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'close', 'aria-label': 'กลับ', dangerouslySetInnerHTML: { __html: F.icon('back') } }),
      h('h2', { key: 'h' }, 'จับเวลา'),
      ...(mine ? [h('button', { key: 'cx', className: 'ev-btn-danger ev-btn-sm', 'data-act': 'tcancel' }, 'ยกเลิก')] : []),
    ]),
    '\n ',
    h('div', { key: 'scroll', className: 'ev-page-scroll', style: { textAlign: 'center' } }, [
      h('div', { key: 'h1' }, [
        h('p', { key: 't', className: 'ev-title', role: 'heading', 'aria-level': 3, style: { padding: '0' } }, it.title),
        h('p', { key: 'p', className: 'ev-sub' }, `เป้าหมาย ${it.target} ${it.unitName || 'นาที'} · ${F.dayLab(w.UI.fdate)}ทำแล้ว ${val(it, w.UI.fdate)}`),
      ]),
      '\n ',
      h('div', { key: 'dial', className: 'ev-dial', id: 'dial', 'data-run': String(run), style: { '--p': String(pct) } },
        h('div', { key: 'face', className: 'ev-dial-face' }, [
          h('div', { key: 'dg', className: 'ev-digits', id: 'digits' }, fmtClock(ms)),
          h('span', { key: 'st', className: 'ev-sub' }, !mine ? 'พร้อมเริ่ม' : run ? 'กำลังจับเวลา' : 'หยุดชั่วคราว'),
        ])),
      h('div', { key: 'act', className: 'ev-focus-actions' }, acts),
      '\n ',
      h('p', { key: 'note', className: 'ev-sub' }, 'ปิดแอปแล้วเวลายังเดินต่อ เพราะเก็บเวลาเริ่มไว้ ไม่ได้นับวินาทีในหน้านี้'),
    ]),
  ]);
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.focus = (props) => window.EvarelReact.renderToStaticMarkup(h(FocusContent, props));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.focus = FocusContent;
