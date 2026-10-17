// หน้าสถิติของ Evarel เขียนเป็น React (ชั้น 4 หน่วยที่สอง)
// ผลิตเฉพาะ <main> ให้ VIEWS.stats ส่งกลับเป็น string: React ไม่ถือ DOM ของหน้านี้ จึงไม่ชนกับ root.innerHTML ใน 23-render
// header กับแถบเลือกช่วงเวลา (HTML สำเร็จรูป) และลูกศร chev โค้ดเดิมต่อ string เอง เพื่อไม่ให้ React ต้องห่อ element เพิ่มที่ทำให้ DOM ต่างจากเดิม
// สถิติทุกตัวคำนวณที่นี่จาก core/stats.buildStatsProps (รับ items/period/today ดิบ ไม่อ่าน global เอง) data-count data-to data-k ต้องตรงเป๊ะเพราะ growBars/countUp อ่านจาก DOM
import { buildStatsProps } from '../core/stats';
const { h, Fragment } = window.EvarelReact;

function StatsPage(p) {
  const { isM, period, rate, arcC, K, T, best, tdDone, tdTotal, cols, rows } = p;
  return h(Fragment, null, [
    h('main', { key: 'main', className: 'ev-main' }, [
      h('section', { key: 'sum', className: 'ev-card ev-sum ev-sum-row', 'data-tone': 'ink' },
        h('div', { className: 'ev-ringbox' },
          h('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' },
            h('circle', { className: 'ev-arc-bg', cx: '50', cy: '50', r: '42' }),
            h('circle', { className: 'ev-arc', 'data-kind': 'arc', 'data-k': `ring-${period}`, 'data-to': String(rate), cx: '50', cy: '50', r: '42', strokeDasharray: String(arcC), strokeDashoffset: String(arcC) })),
          h('div', { className: 'ev-ringnum' }, h('span', null, h('span', { 'data-count': String(rate) }, '0'), h('small', null, '%')))),
        h('div', null,
          h('div', { style: { fontSize: '18px', fontWeight: 600, lineHeight: 1.35 } }, `ทำแล้ว ${K} จาก ${T} ครั้ง`),
          h('div', { className: 'ev-sum-lab', style: { marginTop: '4px' } }, `ที่ตั้งไว้ใน${isM ? ' 4 สัปดาห์' : ' 7 วัน'}ที่ผ่านมา`))),
      h('div', { key: 'r2', className: 'ev-row2' }, [
        h('section', { key: 'a', className: 'ev-card' }, h('div', { className: 'ev-sub' }, 'ต่อเนื่องสูงสุด'), h('div', { className: 'ev-big' }, h('span', { 'data-count': String(best) }, '0'), h('small', null, ' วัน'))),
        h('section', { key: 'b', className: 'ev-card' }, h('div', { className: 'ev-sub' }, 'วันนี้ทำแล้ว'), h('div', { className: 'ev-big' }, h('span', { 'data-count': String(tdDone) }, '0'), h('small', null, ` / ${tdTotal}`))),
      ]),
      h('section', { key: 'chart', className: 'ev-card' },
        h('h3', { className: 'ev-group', style: { paddingTop: '0' } }, isM ? 'รายสัปดาห์' : 'รายวัน'),
        h('p', { className: 'ev-sub' }, `ความสูง = % ที่ทำสำเร็จ${isM ? 'ในสัปดาห์นั้น (เริ่มวันที่ใต้แท่ง)' : 'ในวันนั้น'}`),
        h('div', { className: 'ev-chart' }, cols.map((c, i) =>
          h('div', { key: i, className: 'ev-col', 'data-today': String(c.today), 'data-empty': String(!c.t) },
            h('span', { className: 'ev-col-v' }, c.t ? c.pct + '%' : '–'),
            h('div', { className: 'ev-col-track' }, h('i', { 'data-kind': 'col', 'data-k': `col-${period}-${i}`, 'data-to': String(c.pct) })),
            h('span', { className: 'ev-col-l' }, c.label))))),
      h('section', { key: 'list', className: 'ev-card' },
        h('h3', { className: 'ev-group', style: { paddingTop: '0' } }, 'รายกิจวัตร · แตะเพื่อดูปฏิทิน'),
        h('ul', null, rows.map((r) =>
          h('li', { key: r.id, className: 'ev-list-item' },
            h('div', { className: 'grow', role: 'button', tabIndex: 0, 'data-act': 'detail', 'data-id': String(r.id) },
              h('b', null, r.title),
              h('span', { className: 'ev-sub' }, r.sub),
              h('div', { className: 'ev-bar' }, h('i', { 'data-full': String(r.full), 'data-k': `sb-${r.id}-${period}`, 'data-to': String(r.pct) }))),
            h('span', { className: 'ev-pct', 'data-lv': r.lv }, r.pctText))))),
    ]),
  ]);
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.stats = (raw) => window.EvarelReact.renderToStaticMarkup(h(StatsPage, buildStatsProps(raw.items, raw.period, raw.today)));
