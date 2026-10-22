// หน้า "ผู้ช่วย AI" ของ Evarel เป็น React (S4 s4f-route-ai): เนื้อแชทใน #aiBody — หน้าทักทายหรือบทสนทนาพร้อมการ์ด
// ผลิตเฉพาะเนื้อข้างใน #aiBody (EvarelComponents.ai mount ที่ #aiBody โดยตรงผ่าน EvarelMount.mountAt กัน wrapper เพิ่ม)
// เปลือกหน้า (page bar, composer, drawer, ชิปโควตา) เป็นของหน่วยเปลือกแอป | โควตา/ลายเซ็น AI อยู่ที่ 16-ai-quota กับ 18-ai-live ไม่แตะ
// รับของดิบ: chat (ออบเจ็กต์แชทปัจจุบันหรือ null) — helpers ทั้งหมดอ่านจาก window ตอน render (แพทเทิร์นเดียวกับ today)
// เทียบ template เดิม aiBodyHTML/cardsHTML/cardHTML ใน 17-views__ai ทุกไบต์: ลำดับ attribute ตาม template, text node '\n ' คงเดิม
const { h } = window.EvarelReact;
const W = () => window;

function AiMark() {
  /* ลำดับ attribute ตาม AI_MARK เดิม (SSR พิมพ์ตามลำดับ prop) */
  return h('svg', { className: 'ev-ai-mark', viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'aria-hidden': 'true' },
    h('circle', { cx: '24', cy: '24', r: '17' }),
    h('circle', { cx: '24', cy: '24', r: '5', fill: 'currentColor', stroke: 'none' }));
}

function AiHello() {
  const w = W();
  const fn = (w.profileOf ? (w.profileOf().name || '') : '').trim().split(/\s+/)[0];
  return h('div', { className: 'ev-ai-hello', 'data-key': 'hello' }, [
    h(AiMark, { key: 'm' }),
    h('h3', { key: 'h' }, fn ? `สวัสดี ${fn}` : 'สวัสดี'),
    h('p', { key: 'p', className: 'ev-sub', style: { 'margin-top': '-6px' } }, 'มีอะไรให้ช่วยวันนี้'),
    h('div', { key: 's', className: 'ev-sugg' }, w.SUGG.map((s, i) => h('button', { key: i, type: 'button', 'data-act': 'sugg', 'data-id': String(i) }, s))),
  ]);
}

/* การแจ้งเหตุการณ์ของ AI (ตาม noticeHTML ของเดโม) — ข้อผิดพลาดหรือโควตาเต็ม พร้อมปุ่มตามสถานะ */
function AiNotice() {
  const w = W();
  const n = w.AI && w.AI.notice;
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
      : `ถึงขีดจำกัดการใช้งานแล้ว ข้อความของคุณยังอยู่ในช่องพิมพ์ ส่งได้อีกครั้ง${w.whenText ? w.whenText(n.resetAt) : ''}`),
    h('div', { key: 'r', className: 'ev-row', style: { gap: '8px', 'flex-wrap': 'wrap' } }, [
      h('button', { key: 'ad', className: 'ev-btn-ghost ev-btn-sm', 'data-act': 'add' }, 'เพิ่มรายการเอง'),
      h('button', { key: 'us', className: 'ev-btn-ghost ev-btn-sm', 'data-act': 'ai-usage' }, 'ดูการใช้งาน'),
    ]),
  ]);
}

/* แถบปุ่มข้อความ AI (ตาม msgActions ของเดโม): คัดลอก · โหวตชอบ/ไม่ชอบ */
function MsgActions({ m, i }) {
  const w = W();
  const ic = (n) => ({ dangerouslySetInnerHTML: { __html: w.icon(n) } });
  return h('div', { className: 'ev-msg-actions' }, [
    h('button', { key: 'c', 'data-act': 'ai-copy', 'data-id': String(i), 'aria-label': 'คัดลอก', ...ic('copy') }),
    h('button', { key: 'u', 'data-act': 'ai-vote', 'data-id': i + ':up', 'aria-pressed': String(m.vote === 'up'), 'aria-label': 'ชอบ', ...ic('thumbup') }),
    h('button', { key: 'd', 'data-act': 'ai-vote', 'data-id': i + ':down', 'aria-pressed': String(m.vote === 'down'), 'aria-label': 'ไม่ชอบ', ...ic('thumbdown') }),
  ]);
}

/* การ์ดเครื่องมือ (m.cards) — เทียบ cardsHTML: ข้อความ sensitive, ปุ่ม pending (cok/cno), ชิปสถานะที่เหลือ */
function AiToolCard({ c, i, k }) {
  const w = W();
  const st = c.status, del = c.tool === 'item_delete', mem = w.isMemTool(c.tool);
  return h('div', { key: 'c' + k, className: 'ev-card', 'data-tone': 'soft', style: { 'max-width': '88%', animation: 'rise .35s var(--ease)' } }, [
    h('b', { key: 'b' }, c.summary || w.AI_TOOL_LABEL[c.tool] || c.tool),
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
function AiItemCard({ m, i }) {
  const w = W();
  const p = m.card.p, st = m.card.status;
  return h('div', { key: 'card', className: 'ev-card', 'data-tone': 'soft', style: { 'max-width': '88%', animation: 'rise .35s var(--ease)' } }, [
    h('b', { key: 'b' }, p.title),
    h('p', { key: 'p', className: 'ev-sub' }, `${w.TYPES[p.type]} · ${w.fmtDate(p.start)}${p.time ? ` · ${p.time}` : ''}`),
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

function AiContent(p) {
  const w = W();
  const c = p.chat;
  if (!c || !c.msgs.length) return [h(AiHello, { key: 'h' }), h(AiNotice, { key: 'n' })];
  const ms = c.msgs, lastA = ms.map(m => m.who).lastIndexOf('a'), typing = w.AI && w.AI.typing;
  const out = ms.map((m, i) => m.who === 'u'
    ? h('div', { key: 'm' + i, className: 'ev-bubble-user', 'data-key': 'm' + i }, m.text)
    : [
        h('div', { key: 'b' + i, className: 'ev-bubble-ai ev-md', 'data-key': 'm' + i, dangerouslySetInnerHTML: { __html: w.mdToHtml(m.text) } }),
        m.cards && m.cards.length ? m.cards.map((c2, k) => h(AiToolCard, { key: 'c' + i + '_' + k, c: c2, i, k }))
          : m.card ? h(AiItemCard, { key: 'ic' + i, m, i }) : null,
        h(MsgActions, { key: 'ma' + i, m, i }),
        i === lastA && !typing ? h('p', { key: 'disc' + i, className: 'ev-disc' }, 'AI อาจผิดพลาดได้ ตรวจสอบคำตอบอีกครั้ง') : null,
      ]);
  if (typing) out.push(h('div', { key: 'typing', className: 'ev-bubble-ai ev-typing', 'data-key': 'typing' }, [h('i', { key: '1' }), h('i', { key: '2' }), h('i', { key: '3' })]));
  return [h('div', { key: 'chat', className: 'ev-chat' }, out), h(AiNotice, { key: 'n' })];
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.ai = (p) => window.EvarelReact.renderToStaticMarkup(h(AiContent, p));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.ai = AiContent;
