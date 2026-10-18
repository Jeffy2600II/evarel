// หน้ารายละเอียดรายการ (S4 s4f-shell-layers-auth): page bar + เนื้อตามประเภท (habit ปฏิทินเดือน/task/event+class) + การ์ดตั้งค่า
// เทียบ detailHTML เดิมใน 20-services__calendar ทุกไบต์; ปุ่มทุกปุ่มใช้ data-act delegation ของ 25-actions เหมือนเดิม
// ปฏิทินรายเดือน (#fcHabit) ยังเป็น FullCalendar ของเดิม — mount ใน useEffect (หลัง DOM ของ React อยู่จริง) และ destroy ตอนออก
//   ระหว่างเทียบ parity ให้ส่ง noCal=true เพื่อข้าม side-effect นี้ (ฝั่ง classic string ไม่เคย mount ในตัวเทียบ)
const { h } = window.EvarelReact; /* ปฏิทิน #fcHabit mount โดย openDetail/refreshDetail ใน 20/21 (จังหวะเดียวกับ classic) ไม่ใช้ effect ของ React */
const W = () => window;
const raw = (html) => ({ __html: html });

function HabitCard({ it }) {
  const w = W();
  const { y, m } = w.UI.cal;
  const dim = new Date(y, m + 1, 0).getDate();
  const now = new Date();
  const isNow = y === now.getFullYear() && m === now.getMonth();
  let t = 0, ok = 0;
  for (let d = 1; d <= dim; d++) {
    const ds = w.ymd(new Date(y, m, d));
    if (ds <= w.TODAY && w.scheduled(it, ds) && !w.skipped(it, ds)) { t++; if (w.isDone(it, ds)) ok++; }
  }
  return [
    h('section', { key: 'st', className: 'ev-card' }, [
      h('div', { className: 'ev-stats3' }, [
        h('div', { key: 'a' }, [h('b', null, String(w.streak(it))), h('span', null, 'วันต่อเนื่อง')]),
        h('div', { key: 'b' }, [h('b', null, String(w.totalDone(it))), h('span', null, 'ทำแล้วทั้งหมด (ครั้ง)')]),
        h('div', { key: 'c' }, [h('b', null, (t ? Math.round(100 * ok / t) : 0) + '%'), h('span', null, `เดือนนี้ (${ok}/${t})`)]),
      ]),
    ]),
    h('section', { key: 'cal', className: 'ev-card' }, [
      h('div', { className: 'ev-cal-head' }, [
        h('button', { key: 'p', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'cal-prev', 'aria-label': 'เดือนก่อน', dangerouslySetInnerHTML: raw(w.icon('back')) }),
        h('b', { key: 'm' }, `${w.TH_MONTH[m]} ${y + 543}`),
        h('button', { key: 'n', className: 'ev-icon-btn ev-flip', 'data-flat': '', 'data-act': 'cal-next', 'aria-label': 'เดือนถัดไป', ...(isNow ? { disabled: true } : {}), /* disabled เป็น boolean property ต้องใช้ true (ต่างจาก data-flat ที่เป็น attribute '') */ dangerouslySetInnerHTML: raw(w.icon('back')) }),
      ]),
      h('div', { key: 'f', id: 'fcHabit' }),
      h('div', { key: 'l', className: 'ev-legend' }, [
        h('span', { key: '1' }, [h('i', { 'data-state': 'done' }), 'ทำแล้ว']),
        h('span', { key: '2' }, [h('i', { 'data-state': 'part' }), 'ทำบางส่วน']),
        h('span', { key: '3' }, [h('i', null), 'ยังไม่ทำ']),
        h('span', { key: '4' }, [h('i', { 'data-state': 'off' }), 'ไม่มีกำหนด']),
      ]),
      h('p', { key: 's', className: 'ev-sub', style: { marginTop: '12px' } }, `${it.track === 'check' ? 'แตะวันที่เพื่อติ๊ก/เลิกติ๊ก' : 'แตะวันที่เพื่อปรับจำนวน'} · กดค้างเพื่อตัวเลือกอื่น (ข้ามวัน)`),
    ]),
  ];
}

function TaskCard({ it }) {
  const w = W();
  const done = w.isDone(it, it.start), late = !done && it.start < w.TODAY;
  return h('section', { className: 'ev-card' }, [
    h('span', { key: 'c', className: 'ev-cap' }, 'สถานะ'),
    h('div', { key: 's', style: { margin: '10px 0 14px' }, dangerouslySetInnerHTML: raw(w.seg('h-task', [['0', 'ยังไม่เสร็จ'], ['1', 'เสร็จแล้ว']], done ? '1' : '0')) }),
    h('div', { key: 'i', className: 'ev-list-item' }, [
      h('span', { className: 'ev-badge', dangerouslySetInnerHTML: raw(w.icon('cal')) }),
      h('div', { className: 'grow' }, [
        h('b', null, `กำหนดส่ง ${w.fmtDate(it.start)}`),
        h('span', { className: 'ev-sub' }, `${it.time || 'ไม่ระบุเวลา'}${it.subject ? ` · ${it.subject}` : ''}`),
      ]),
      late ? h('span', { className: 'ev-chip', 'data-state': 'late' }, 'เลยกำหนด') : done ? h('span', { className: 'ev-chip', 'data-state': 'done' }, 'เสร็จแล้ว') : null,
    ]),
  ]);
}

function Empty({ ic, t, h: hh }) {
  const w = W();
  return h('div', { className: 'ev-empty' }, [
    h('div', { className: 'orb', dangerouslySetInnerHTML: raw(w.icon(ic)) }),
    h('h3', null, t),
    h('p', null, hh),
  ]);
}
function ScheduleCard({ it }) {
  const w = W();
  const next = [];
  for (let i = 0; i < 90 && next.length < 5; i++) { const ds = w.ymd(w.addDays(new Date(), i)); if (w.occursOn(it, ds)) next.push(ds); }
  return h('section', { className: 'ev-card' }, [
    h('h3', { key: 'h', className: 'ev-group', style: { paddingTop: '0px' } }, 'ครั้งถัดไป'),
    next.length ? h('ul', { key: 'u' }, next.map(ds => h('li', { className: 'ev-list-item', key: ds }, [
      h('span', { className: 'ev-badge', dangerouslySetInnerHTML: raw(w.icon('cal')) }),
      h('div', { className: 'grow' }, [
        h('b', null, w.dayLab(ds)),
        h('span', { className: 'ev-sub' }, `${w.fmtDate(ds)}${it.time ? ` · ${w.timeText(it)}` : ''}`),
      ]),
    ]))) : h(Empty, { key: 'e', ic: 'cal', t: 'ไม่มีครั้งถัดไป', h: 'รายการนี้สิ้นสุดแล้ว' }),
  ]);
}

function MetaCard({ it }) {
  const w = W();
  return h('section', { className: 'ev-card' }, [
    h('h3', { key: 'h', className: 'ev-group', style: { paddingTop: '0px' } }, 'การตั้งค่า'),
    h('div', { key: 'm', className: 'ev-meta' }, [
      h('span', { key: 't', className: 'ev-chip' }, w.TYPES[it.type]),
      h('span', { key: 'r', className: 'ev-chip' }, w.repeatText(it)),
      it.time ? h('span', { key: 'tm', className: 'ev-chip' }, w.timeText(it)) : null,
      ...(it.rem || []).map((r, i) => h('span', { key: 'rm' + i, className: 'ev-chip' }, `เตือน ${w.remText(r)}`)),
    ]),
    h('button', { key: 'e', className: 'ev-btn-ghost ev-btn-block', 'data-act': 'm-edit', 'data-id': String(it.id), style: { marginTop: '14px' } }, 'แก้ไขการตั้งค่า'),
  ]);
}

function DetailContent(p) {
  const w = W();
  const it = w.find(p.id);
  if (!it) return null;
  const body = it.type === 'habit' ? h(HabitCard, { key: 'hb', it }) : it.type === 'task' ? h(TaskCard, { key: 'tk', it }) : h(ScheduleCard, { key: 'sc', it });
  return [
    h('div', { key: 'bar', className: 'ev-page-bar' }, [
      h('button', { key: 'b', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'close', 'aria-label': 'กลับ', dangerouslySetInnerHTML: raw(w.icon('back')) }),
      h('h2', { key: 't' }, it.title),
      h('button', { key: 'm', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'd-more', 'data-id': String(it.id), 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': 'ตัวเลือก', dangerouslySetInnerHTML: raw(w.icon('more')) }),
    ]),
    h('div', { key: 'sc', className: 'ev-page-scroll' }, [body, h(MetaCard, { key: 'mc', it })]),
  ];
}
window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.detail = (p) => {
  const w = W();
  return window.EvarelReact.renderToStaticMarkup(window.EvarelReact.h(DetailContent, p));
};
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.detail = DetailContent;
