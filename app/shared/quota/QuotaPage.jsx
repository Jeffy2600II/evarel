/**
 * การ์ดโควตา AI ของ Evarel (ชั้นที่ 1 ของกล่อง quota โซน shared เพราะ mount ผ่าน Sheet component: caller ส่ง o.page='quotaBody' + props)
 * ลงทะเบียนทั้งฟังก์ชันหน้า (สตริง) และ component ในชื่อ quotaBody | ข้อมูล (resetClock, resetIn) มาจากถาด quota.tray.js ที่เดียว กล่องนี้ไม่แตะ window
 * เทียบ template เดิม quotaSheetHTML ใน 16-services__ai-quota ทุกไบต์ | style="--p:..." React เขียนผ่าน CSSOM (parity test เทียบค่า semantic)
 * h/Fragment บิลด์ฉีดให้ (scripts/build-react.mjs)
 */
import { takeQuotaFns } from './quota.tray.js';
import { QuotaBar } from './parts/QuotaBar.jsx';

export default function QuotaBody(p) {
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
