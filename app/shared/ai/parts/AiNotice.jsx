/**
 * การแจ้งเหตุการณ์ของ AI (ตาม noticeHTML ของเดโม): ข้อผิดพลาดการส่ง หรือโควตาเต็ม พร้อมปุ่มตามสถานะ | โครง DOM ตรงไฟล์เดิมทุกไบต์
 * D.AI เป็นสถานะสด ห้ามแคช | D.whenText มี guard เดิม (ไม่มีก็ได้สตริงว่าง)
 */
import { takeAi } from '../ai.tray.js';

/* การแจ้งเหตุการณ์ของ AI (ตาม noticeHTML ของเดโม) — ข้อผิดพลาดหรือโควตาเต็ม พร้อมปุ่มตามสถานะ */
export function AiNotice() {
  const D = takeAi();
  const n = D.AI && D.AI.notice;
  if (!n) return null;
  if (n.kind === 'error') return h('div', { className: 'ev-notice', 'data-key': 'notice' }, [
    h('b', { key: 'b' }, 'ส่งข้อความไม่สำเร็จ'),
    h('span', { key: 's' }, 'ตรวจสอบการเชื่อมต่อแล้วลองใหม่ ข้อความของคุณยังอยู่ในช่องพิมพ์'),
    h('div', { key: 'r' }, h('button', { key: 'rt', className: 'ev-btn-primary ev-btn-sm', 'data-act': 'ai-retry' }, 'ส่งอีกครั้ง')),
  ]);
  const g = n.reason === 'global';
  return h('div', { className: 'ev-notice', 'data-key': 'notice' }, [
    h('b', { key: 'b' }, 'ข้อความนี้ยังไม่ได้ส่ง'),
    h('span', { key: 's' }, g ? 'ระบบเต็มชั่วคราว ข้อความของคุณยังอยู่ในช่องพิมพ์ ลองส่งใหม่ในอีกสักครู่'
      : `ถึงขีดจำกัดการใช้งานแล้ว ข้อความของคุณยังอยู่ในช่องพิมพ์ ส่งได้อีกครั้ง${D.whenText ? D.whenText(n.resetAt) : ''}`),
    h('div', { key: 'r', className: 'ev-row', style: { gap: '8px', 'flex-wrap': 'wrap' } }, [
      h('button', { key: 'ad', className: 'ev-btn-ghost ev-btn-sm', 'data-act': 'add' }, 'เพิ่มรายการเอง'),
      h('button', { key: 'us', className: 'ev-btn-ghost ev-btn-sm', 'data-act': 'ai-usage' }, 'ดูการใช้งาน'),
    ]),
  ]);
}
