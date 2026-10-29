/**
 * การ์ดในบทสนทนา AI: การ์ดเครื่องมือ (m.cards) และการ์ดเพิ่มรายการเดี่ยว (m.card) | โครง DOM ตรงไฟล์เดิมทุกไบต์ รวมข้อความ '\n ' ก่อนปุ่ม
 * style ใช้ kebab-case ในอ็อบเจ็กต์ ('margin-top') คงตามต้นฉบับเพื่อไม่เปลี่ยนโดยไม่จำเป็น (ทดสอบแล้วว่า EvarelReact พิมพ์ kebab-case กับ camelCase ได้ HTML เหมือนกันทุกไบต์ จึงไม่ใช่ข้อบังคับ)
 */
import { takeAi } from '../ai.tray.js';

/* การ์ดเครื่องมือ (m.cards) — เทียบ cardsHTML: ข้อความ sensitive, ปุ่ม pending (cok/cno), ชิปสถานะที่เหลือ */
export function AiToolCard({ c, i, k }) {
  const D = takeAi();
  const st = c.status, del = c.tool === 'item_delete', mem = D.isMemTool(c.tool);
  return h('div', { key: 'c' + k, className: 'ev-card', 'data-tone': 'soft', style: { 'max-width': '88%', animation: 'rise .35s var(--ease)' } }, [
    h('b', { key: 'b' }, c.summary || D.AI_TOOL_LABEL[c.tool] || c.tool),
    mem && c.sensitive && st === 'pending'
      ? h('p', { key: 'p', className: 'ev-sub', style: { 'margin-top': '6px' } }, 'ข้อมูลนี้ค่อนข้างส่วนตัว การจำไว้จะส่งไปเก็บที่บริการความจำภายนอก')
      : null,
    '\n ',
    st === 'pending'
      ? h('div', { key: 'r', className: 'ev-row', style: { 'margin-top': '12px', gap: '8px' } }, [
          h('button', { key: 'ok', className: (del ? 'ev-btn-solid-danger' : 'ev-btn-primary') + ' ev-btn-sm', 'data-act': 'ai-cok', 'data-id': i + ':' + k }, mem ? (c.tool === 'memory_save' ? 'จำไว้' : 'ลืม') : 'ยืนยัน'),
          h('button', { key: 'no', className: 'ev-btn-ghost ev-btn-sm', 'data-act': 'ai-cno', 'data-id': i + ':' + k }, 'ยกเลิก'),
        ])
      : h('span', { key: 's', className: 'ev-chip', style: { display: 'inline-block', 'margin-top': '8px' } },
          st === 'saving' ? 'กำลังบันทึก...' : st === 'added' ? (mem ? (c.tool === 'memory_save' ? 'จำแล้ว' : 'ลืมแล้ว') : 'ทำแล้ว') : st === 'failed' ? 'ไม่สำเร็จ' : 'ยกเลิกแล้ว'),
  ]);
}

/* การ์ดเดี่ยว (m.card จาก aiReply เพิ่มรายการ) — เทียบ cardHTML */
export function AiItemCard({ m, i }) {
  const D = takeAi();
  const p = m.card.p, st = m.card.status;
  return h('div', { key: 'card', className: 'ev-card', 'data-tone': 'soft', style: { 'max-width': '88%', animation: 'rise .35s var(--ease)' } }, [
    h('b', { key: 'b' }, p.title),
    h('p', { key: 'p', className: 'ev-sub' }, `${D.TYPES[p.type]} · ${D.fmtDate(p.start)}${p.time ? ` · ${p.time}` : ''}`),
    '\n ',
    st === 'pending'
      ? h('div', { key: 'r', className: 'ev-row', style: { 'margin-top': '12px', gap: '8px' } }, [
          h('button', { key: 'ok', className: 'ev-btn-primary ev-btn-sm', 'data-act': 'ai-ok', 'data-id': String(i) }, 'ยืนยัน'),
          h('button', { key: 'ed', className: 'ev-btn-ghost ev-btn-sm', 'data-act': 'ai-edit', 'data-id': String(i) }, 'แก้ก่อน'),
          h('button', { key: 'no', className: 'ev-btn-ghost ev-btn-sm', 'data-act': 'ai-no', 'data-id': String(i) }, 'ยกเลิก'),
        ])
      : h('span', { key: 's', className: 'ev-chip', style: { display: 'inline-block', 'margin-top': '8px' } }, st === 'added' ? 'เพิ่มแล้ว' : 'ยกเลิกแล้ว'),
  ]);
}
