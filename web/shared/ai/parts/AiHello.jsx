/**
 * หน้าทักทายของผู้ช่วย AI (ยังไม่มีข้อความ): ตราสัญลักษณ์ AI คำทักทายตามชื่อผู้ใช้ และปุ่มคำถามแนะนำ | โครง DOM และลำดับ attribute ตรงไฟล์เดิมทุกไบต์
 * AiMark ลำดับ attribute ตาม AI_MARK เดิม (SSR พิมพ์ตามลำดับ prop) | ชื่อผู้ใช้มาจาก D.profileOf (guard เดิม: ถ้าชั้น m ยังไม่ตั้งจะได้สตริงว่าง)
 */
import { takeAi } from '../ai.tray.js';

export function AiMark() {
  /* ลำดับ attribute ตาม AI_MARK เดิม (SSR พิมพ์ตามลำดับ prop) */
  return h('svg', { className: 'ev-ai-mark', viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'aria-hidden': 'true' },
    h('circle', { cx: '24', cy: '24', r: '17' }),
    h('circle', { cx: '24', cy: '24', r: '5', fill: 'currentColor', stroke: 'none' }));
}

export function AiHello() {
  const D = takeAi();
  const fn = (D.profileOf ? (D.profileOf().name || '') : '').trim().split(/\s+/)[0];
  return h('div', { className: 'ev-ai-hello', 'data-key': 'hello' }, [
    h(AiMark, { key: 'm' }),
    h('h3', { key: 'h' }, fn ? `สวัสดี ${fn}` : 'สวัสดี'),
    h('p', { key: 'p', className: 'ev-sub', style: { 'margin-top': '-6px' } }, 'มีอะไรให้ช่วยวันนี้'),
    h('div', { key: 's', className: 'ev-sugg' }, D.SUGG.map((s, i) => h('button', { key: i, type: 'button', 'data-act': 'sugg', 'data-id': String(i) }, s))),
  ]);
}
