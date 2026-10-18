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
  /* SUGG เป็นค่าคงที่ ปุ่มคำแนะนำ join ไม่มีตัวคั่น เทียบ template หน้าทักทายเดิม */
  return h('div', { className: 'ev-ai-hello' }, [
    h(AiMark, { key: 'm' }),
    h('h3', { key: 'h' }, 'มีอะไรให้ช่วยวันนี้'),
    h('div', { key: 's', className: 'ev-sugg' }, w.SUGG.map((s, k) => h('button', { key: k, 'data-act': 'sugg', 'data-id': s }, s))),
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
  const c = p.chat;
  if (!c || !c.msgs.length) return h(AiHello);
  /* ข้อความเรียงตามลำดับ join ไม่มีตัวคั่น ผู้ใช้=บับเบิลเดียว AI=บับเบิล+การ์ด(หากมี) */
  return h('div', { className: 'ev-chat' }, c.msgs.map((m, i) => m.who === 'u'
    ? h('div', { key: 'm' + i, className: 'ev-bubble-user' }, m.text)
    : [
        h('div', { key: 'b' + i, className: 'ev-bubble-ai' }, m.text),
        m.cards && m.cards.length ? m.cards.map((c2, k) => h(AiToolCard, { key: 'c' + i + '_' + k, c: c2, i, k }))
          : m.card ? h(AiItemCard, { key: 'ic' + i, m, i }) : null,
      ]));
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.ai = (p) => window.EvarelReact.renderToStaticMarkup(h(AiContent, p));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.ai = AiContent;
