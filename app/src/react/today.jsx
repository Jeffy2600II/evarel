// หน้า "วันนี้" ของ Evarel เขียนเป็น React (S4 s4f-route-today-calendar หน่วยแรก)
// ผลิตเฉพาะ <main> ให้ VIEWS.today ส่งกลับเป็น string (แพทเทิร์นเดียวกับ stats: header กับ weekbar/week โค้ดเดิมต่อ string เอง ไม่ให้ React ต้องห่อ element เพิ่มที่ทำให้ DOM ต่างจากเดิม)
// คำนวณทั้งหมดที่นี่จาก core/today.buildTodayProps (รับ items/ui/today/now ดิบ ไม่อ่าน global เอง)
// แถวรายการยังฝังผล itemRow เดิมตรงๆ (dangerouslySetInnerHTML) เพราะหน่วยนี้ยังไม่ย้าย itemRow เป็น React — ผลตรงเดิมทุกไบต์ ย้ายในหน่วยถัดไป
import { buildTodayProps } from '../core/today';
import { takeDates } from '../../data/dates.tray.js';
import { takeTodayFns } from '../../data/today.tray.js';
const { h, Fragment } = window.EvarelReact;
const ItemRow = () => window.EvarelComponents.itemRow;
const W = () => window;

function TodayMain(p) {
  /* string path: ห่อ <main> ตาม template เดิม (mount path ไม่ใช้ตัวนี้) */
  return h('main', { key: 'main', className: 'ev-main', id: 'main' }, h(TodayContent, { key: 'content', ...p }));
}
/* เนื้อข้างใน main ล้วน — EvarelComponents.today ใช้ตัวนี้เพราะ mount target คือ <main> ที่ VIEWS สร้างแล้ว (กัน main ซ้อนสองชั้น) */
function TodayContent(p) {
  const { items, ui, today, now } = p;
  const w = W();
  const P = buildTodayProps(items, ui, today, now, {
    fmtDate: takeDates().fmtDate, dayLab: w.dayLab, WD: takeDates().WD, TH_MONTH: takeDates().TH_MONTH, pad: takeDates().pad, hello: () => '',
  });
  const raw = (html) => ({ __html: html });
  /* children ต้องตรง template เดิมทุกไบต์ รวม '\n  ' ระหว่าง section (ต้นฉบับจัด indent ใน template) React พิมพ์ text child ตรงๆ และข้าม null */
  return h(Fragment, null, [
    h('section', { key: 'sum', className: 'ev-card ev-sum', 'data-tone': 'ink' }, [
      h('div', { key: 'top', className: 'ev-sum-top' }, [
        h('div', { key: 'l' }, [
          h('div', { key: 'num', className: 'ev-sum-num' }, h('span', { 'data-count': String(P.done) }, '0'), h('small', null, `/${P.trackedTotal}`)),
          h('div', { key: 'lab', className: 'ev-sum-lab' }, P.trackedTotal ? (P.done === P.trackedTotal ? 'ครบทุกอย่างแล้ว' : 'ทำแล้ววันนี้') : 'วันนี้ไม่มีสิ่งต้องติ๊ก'),
        ]),
        h('div', { key: 'r', className: 'ev-sum-lab' }, `${P.pct}%`),
      ]),
      h('div', { key: 'prog', className: 'ev-prog' }, h('i', { 'data-k': 'p-today', 'data-to': String(P.pct) })),
      P.nextItem ? h('div', { key: 'nx', className: 'ev-next' }, h('span', { className: 'ev-chip' }, 'ถัดไป'), `${P.nextItem.time} · ${w.esc(P.nextItem.title)}`) : null,
    ]),
    '\n  ',
    P.overdue.length ? h('section', { key: 'od', className: 'ev-card', 'data-tone': 'warn' },
      h('b', null, `ค้างอยู่ ${P.overdue.length} งาน`),
      h('ul', null, P.overdue.map((r, k) => h(ItemRow(), { key: 'od' + k, it: r.it, ds: r.late ? r.it.start : ui.date, i: r.idx ?? k, late: r.late })))) : null,
    '\n  ',
    P.groups.length
      ? h('section', { key: 'g', className: 'ev-card' }, P.groups.map((g) => [
          h('h3', { key: g.name, className: 'ev-group' }, g.name),
          h('ul', { key: g.name + 'u' }, g.rows.map((r, k) => h(ItemRow(), { key: 'g' + k, it: r.it, ds: ui.date, i: r.idx ?? k, next: r.next }))),
        ]))
      : h('section', { key: 'ge', className: 'ev-card', dangerouslySetInnerHTML: raw(takeTodayFns().empty('inbox', 'วันนี้ยังว่างอยู่', 'กดปุ่ม + เพื่อเพิ่มสิ่งที่อยากทำ')) }),
  ]);
}
window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.today = (p) => window.EvarelReact.renderToStaticMarkup(h(TodayMain, p));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.today = TodayContent;
