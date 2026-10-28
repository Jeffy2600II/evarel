// เนื้อ sheet โควตา AI เป็น React (S4 s4f-shell-layers-auth ไบต์ 5)
// mount ผ่าน Sheet component เดิม (shared/sheet/SheetPage.jsx): caller ส่ง o.page='quotaBody' + props
// เทียบ template เดิม quotaSheetHTML ใน 16-services__ai-quota ทุกไบต์: ลำดับ attribute ตาม template (className, role, aria-label, aria-valuemin, aria-valuemax, aria-valuenow)
// style="--p:..." React เขียนผ่าน CSSOM (เติมช่องว่าง/; ท้าย) — parity test เทียบค่า semantic ของ style ตามแพทเทิร์น ai_equiv
import { takeQuotaFns } from '../../data/quota.tray.js';
const { h, Fragment } = window.EvarelReact;

function QuotaBar({ u, l, lb }) {
  return h('div', { className: 'ev-qbar', role: 'progressbar', 'aria-label': lb, 'aria-valuemin': '0', 'aria-valuemax': String(l), 'aria-valuenow': String(Math.min(u, l || 0)) },
    h('i', { style: { '--p': l > 0 ? Math.min(1, u / l).toFixed(3) : '0' } }));
}

function QuotaBody(p) {
  const q = p.quota;
  return h(Fragment, null, [
    h('div', { key: 'r1', className: 'ev-qrow' },
      h('div', { className: 'ev-row' }, h('b', null, 'จำนวนครั้ง'), h('span', { className: 'ev-sub' }, `${q.calls.used} / ${q.calls.limit}`)),
      h(QuotaBar, { u: q.calls.used, l: q.calls.limit, lb: 'จำนวนครั้งที่ใช้วันนี้' })),
    '\n ',
    h('div', { key: 'r2', className: 'ev-qrow' },
      h('div', { className: 'ev-row' }, h('b', null, 'ปริมาณการคิด'), h('span', { className: 'ev-sub' }, `${q.tokens.used.toLocaleString('en-US')} / ${q.tokens.limit.toLocaleString('en-US')}`)),
      h(QuotaBar, { u: q.tokens.used, l: q.tokens.limit, lb: 'ปริมาณการคิดที่ใช้วันนี้' })),
    '\n ',
    h('p', { key: 'n', className: 'ev-sub', style: { marginTop: '12px' } },
      `${q.blocked ? 'ตอนนี้ใช้ครบแล้ว ' : ''}รีเซ็ตเวลา ${takeQuotaFns().resetClock(q.resetAt)} น. (${takeQuotaFns().resetIn(q.resetAt)})`),
  ]);
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.quotaBody = (props) => window.EvarelReact.renderToStaticMarkup(h(QuotaBody, props));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.quotaBody = QuotaBody;
