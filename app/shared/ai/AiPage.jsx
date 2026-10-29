/**
 * หน้า "ผู้ช่วย AI" ของ Evarel (ชั้นที่ 1 ของกล่อง ai โซน shared เพราะ mount ผ่าน EvarelMount.mountAt ที่ #aiBody): เนื้อแชท — หน้าทักทายหรือบทสนทนาพร้อมการ์ด
 * ผลิตเฉพาะเนื้อข้างใน #aiBody กัน wrapper เพิ่ม | เปลือกหน้า (page bar, composer, drawer, ชิปโควตา) เป็นของกล่อง aiShell | รับของดิบ: chat (ออบเจ็กต์แชทปัจจุบันหรือ null)
 * ลงทะเบียน Pages.ai (สตริง) และ Components.ai (mount) ฟังก์ชันเดียวกันตามบัตร register | ข้อมูลทั้งหมดมาจากถาด ai.tray.js (ถาดร่วมกับ aiShell อยู่ที่ app/data/) กล่องนี้ไม่แตะ window
 * h/Fragment บิลด์ฉีดให้ (scripts/build-react.mjs)
 */
import { takeAi } from './ai.tray.js';
import { AiHello } from './parts/AiHello.jsx';
import { AiNotice } from './parts/AiNotice.jsx';
import { AiToolCard, AiItemCard } from './parts/AiCards.jsx';
import { MsgActions } from './parts/MsgActions.jsx';

export function AiContent(p) {
  const D = takeAi();
  const c = p.chat;
  if (!c || !c.msgs.length) return [h(AiHello, { key: 'h' }), h(AiNotice, { key: 'n' })];
  const ms = c.msgs, lastA = ms.map(m => m.who).lastIndexOf('a'), typing = D.AI && D.AI.typing;
  const out = ms.map((m, i) => m.who === 'u'
    ? h('div', { key: 'm' + i, className: 'ev-bubble-user', 'data-key': 'm' + i }, m.text)
    : [
        h('div', { key: 'b' + i, className: 'ev-bubble-ai ev-md', 'data-key': 'm' + i, dangerouslySetInnerHTML: { __html: D.mdToHtml(m.text) } }),
        m.cards && m.cards.length ? m.cards.map((c2, k) => h(AiToolCard, { key: 'c' + i + '_' + k, c: c2, i, k }))
          : m.card ? h(AiItemCard, { key: 'ic' + i, m, i }) : null,
        h(MsgActions, { key: 'ma' + i, m, i }),
        i === lastA && !typing ? h('p', { key: 'disc' + i, className: 'ev-disc' }, 'AI อาจผิดพลาดได้ ตรวจสอบคำตอบอีกครั้ง') : null,
      ]);
  if (typing) out.push(h('div', { key: 'typing', className: 'ev-bubble-ai ev-typing', 'data-key': 'typing' }, [h('i', { key: '1' }), h('i', { key: '2' }), h('i', { key: '3' })]));
  return [h('div', { key: 'chat', className: 'ev-chat' }, out), h(AiNotice, { key: 'n' })];
}

export default AiContent;
