/**
 * แถบปุ่มข้อความ AI (ตาม msgActions ของเดโม): คัดลอก · โหวตชอบ/ไม่ชอบ | โครง DOM ตรงไฟล์เดิมทุกไบต์ | ไอคอนมาจาก D.icon
 */
import { takeAi } from '../ai.tray.js';

/* แถบปุ่มข้อความ AI (ตาม msgActions ของเดโม): คัดลอก · โหวตชอบ/ไม่ชอบ */
export function MsgActions({ m, i }) {
  const D = takeAi();
  const ic = (n) => ({ dangerouslySetInnerHTML: { __html: D.icon(n) } });
  return h('div', { className: 'ev-msg-actions' }, [
    h('button', { key: 'c', 'data-act': 'ai-copy', 'data-id': String(i), 'aria-label': 'คัดลอก', ...ic('copy') }),
    h('button', { key: 'u', 'data-act': 'ai-vote', 'data-id': i + ':up', 'aria-pressed': String(m.vote === 'up'), 'aria-label': 'ชอบ', ...ic('thumbup') }),
    h('button', { key: 'd', 'data-act': 'ai-vote', 'data-id': i + ':down', 'aria-pressed': String(m.vote === 'down'), 'aria-label': 'ไม่ชอบ', ...ic('thumbdown') }),
  ]);
}
