/* Path: app/js/views/ai.js | split mechanically from app.js (no logic edits) */
import { TODAY, addDays, esc, parse, ymd } from '../core/dates.js';
import { syncLayer } from '../core/history.js';
import { AIUI } from '../core/state-ui.js';
import { ChatStore } from '../services/chat-store.js';
import { closeMenu } from '../ui/menu.js';
import { icon } from '../ui/primitives.js';
import { closeSheet } from '../ui/sheet.js';

/* ความจำระยะยาว: อินเทอร์เฟซเดียว (recall/remember) ตอนนี้เป็น no-op จนกว่าจะต่อ MemoryLake */
export const MemoryProvider = {
  name: 'none', ready: false,
  async recall(_query) { return []; },
  async remember(_chatId, _msgs) { return false; },
};
/* ตัวเรียกโมเดล: ตอนนี้จำลองอย่างซื่อสัตย์ ภายหลังเรียก Worker /api/ai/chat */
export const AIClient = {
  live: false,
  async reply(text, { memories = [] } = {}) {
    await new Promise(r => setTimeout(r, 450));
    const t = text.trim();
    const m = t.match(/^(?:เพิ่มงาน|เพิ่ม\s*งาน)\s*(.*)$/);
    if (m) {
      /* แยกวันที่ออกจากชื่อ: รองรับ วันนี้ / พรุ่งนี้ / มะรืนนี้ / วัน(จันทร์-อาทิตย์) ถ้าไม่ระบุ = วันนี้ */
      let title = m[1].trim(), due = TODAY, said = '';
      const days = { 'อาทิตย์': 0, 'จันทร์': 1, 'อังคาร': 2, 'พุธ': 3, 'พฤหัสบดี': 4, 'พฤหัส': 4, 'ศุกร์': 5, 'เสาร์': 6 };
      const rel = title.match(/\s*(วันนี้|พรุ่งนี้|มะรืนนี้|มะรืน)\s*$/);
      const wd = title.match(/\s*(?:ภายใน|ก่อน|ส่ง)?\s*วัน(อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัสบดี|พฤหัส|ศุกร์|เสาร์)\s*$/);
      if (rel) { due = ymd(addDays(new Date(), { 'วันนี้': 0, 'พรุ่งนี้': 1, 'มะรืนนี้': 2, 'มะรืน': 2 }[rel[1]])); said = rel[1]; title = title.slice(0, rel.index).trim(); }
      else if (wd) { const diff = (days[wd[1]] - new Date().getDay() + 7) % 7 || 7; due = ymd(addDays(new Date(), diff)); said = 'วัน' + wd[1]; title = title.slice(0, wd.index).trim(); }
      if (!title) return { kind: 'text', text: 'อยากให้เพิ่มงานอะไรครับ ลองพิมพ์ เช่น “เพิ่มงาน การบ้านอังกฤษ พรุ่งนี้”' };
      const when = said ? `ส่ง${said} (${parse(due).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })})` : 'ส่งวันนี้ (ยังไม่ได้ระบุวัน)';
      return { kind: 'confirm-task', title, due, text: `เพิ่มงาน “${title}” ${when} ใช่ไหม?` };
    }
    return { kind: 'text', text: 'ตอนนี้ AI ยังเป็นแบบทดลอง ยังไม่ได้เชื่อมกับโมเดลจริง จึงตอบอิสระยังไม่ได้ ลองพิมพ์ว่า “เพิ่มงาน การบ้านอังกฤษ” เพื่อดูการสั่งงานในแอป' };
  },
};
export const SUGGESTIONS = ['เพิ่มงาน การบ้านอังกฤษ', 'วันนี้มีอะไรบ้าง', 'ช่วยวางแผนอ่านหนังสือสอบ'];
export const aiEl = document.getElementById('aiPage');
export const drawerScrim = document.createElement('div');
export const drawerEl = document.createElement('aside');
export const chatTitle = c => c.title || 'แชทใหม่';
export function groupChats(list) {
  const day = 86400000, now = Date.now(), start = new Date(); start.setHours(0, 0, 0, 0);
  const g = { 'ปักหมุด': [], 'วันนี้': [], '7 วันที่ผ่านมา': [], 'เก่ากว่านั้น': [] };
  for (const c of list) {
    if (c.pinned) g['ปักหมุด'].push(c);
    else if (c.updated >= start.getTime()) g['วันนี้'].push(c);
    else if (now - c.updated < 7 * day) g['7 วันที่ผ่านมา'].push(c);
    else g['เก่ากว่านั้น'].push(c);
  }
  return Object.entries(g).filter(([, v]) => v.length);
}
export function msgHTML(m) {
  if (m.role === 'user') return `<div class="ev-bubble-user">${esc(m.text)}</div>`;
  if (m.kind === 'confirm-task') return `<div class="ev-card" data-tone="soft"><b>${esc(m.text)}</b>${m.done ? `<p class="ev-sub">${m.done === 'ok' ? 'ยืนยันแล้ว เปิดฟอร์มให้ตรวจก่อนบันทึก' : 'ยกเลิกแล้ว'}</p>` : `<div class="ev-row ev-gap-top-sm"><button class="ev-btn-primary" data-act="ai-ok" data-id="${encodeURIComponent(m.title)}" data-due="${esc(m.due || '')}">ยืนยัน</button><button class="ev-btn-ghost" data-act="ai-no">ยกเลิก</button></div>`}</div>`;
  return `<div class="ev-bubble-ai">${esc(m.text)}</div>`;
}
export function aiBody(chat) {
  const msgs = chat?.msgs || [];
  if (!msgs.length) return `<div class="ev-ai-hello"><span class="ev-spark">${icon('spark')}</span><h2>วันนี้ให้ช่วยอะไรดี</h2><p>สั่งงาน ตั้งกิจวัตร หรือถามเรื่องตารางได้เลย</p>
    <div class="ev-ai-sugg">${SUGGESTIONS.map(s => `<button type="button" data-act="ai-sugg" data-id="${encodeURIComponent(s)}">${esc(s)}</button>`).join('')}</div></div>`;
  return `<div class="ev-ai-msgs" id="aiMsgs">${msgs.map(msgHTML).join('')}${AIUI.busy ? '<div class="ev-bubble-ai" aria-live="polite">กำลังคิด…</div>' : ''}</div>`;
}
export function renderAI(keepDraft = true) {
  const chat = ChatStore.get(ChatStore.current());
  const draft = keepDraft ? (document.getElementById('aiText')?.value || '') : '';
  aiEl.innerHTML = `<div class="ev-ai-bar"><button class="ev-icon-btn" data-act="aidrawer" aria-label="เปิดประวัติแชท" aria-expanded="${AIUI.drawer}">${icon('menu')}</button>
      <div class="ev-ai-title">${chat ? esc(chatTitle(chat)) : 'ผู้ช่วย AI'}</div><button class="ev-icon-btn" data-act="aiclose" aria-label="ปิดผู้ช่วย AI">${icon('x')}</button></div>
    <div class="ev-ai-scroll" id="aiScroll">${aiBody(chat)}</div>
    <form class="ev-ai-compose" id="aiForm"><div class="ev-ai-box"><textarea id="aiText" rows="1" placeholder="พิมพ์ข้อความถึงผู้ช่วย…" aria-label="ข้อความ" maxlength="2000"></textarea>
      <button class="ev-ai-send" type="submit" aria-label="ส่ง" id="aiSend" disabled>${icon('up')}</button></div>
      <p class="ev-ai-note">${AIClient.live ? 'ผู้ช่วย AI อาจผิดพลาดได้ ตรวจสอบก่อนยืนยัน' : 'โหมดทดลอง · ยังไม่เชื่อมโมเดลจริง · ประวัติแชทเก็บในเครื่องนี้'}</p></form>`;
  const ta = document.getElementById('aiText'); ta.value = draft; autosize(ta); document.getElementById('aiSend').disabled = !ta.value.trim() || AIUI.busy;
  const sc = document.getElementById('aiScroll'); sc.scrollTop = sc.scrollHeight;
  renderDrawer();
}
export function autosize(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; }
export function renderDrawer() {
  const cur = ChatStore.current(), q = AIUI.q.trim().toLowerCase();
  let list = ChatStore.all();
  if (q) list = list.filter(c => chatTitle(c).toLowerCase().includes(q) || c.msgs.some(m => m.text?.toLowerCase().includes(q)));
  const groups = groupChats(list);
  drawerEl.innerHTML = `<h3>ผู้ช่วย AI</h3><button class="ev-drawer-new" data-act="ainew">${icon('newchat')}แชทใหม่</button>
    <div class="ev-drawer-search"><input class="ev-input" id="aiSearch" type="search" placeholder="ค้นหาแชท" value="${esc(AIUI.q)}" aria-label="ค้นหาแชท"></div>
    <div class="ev-drawer-list">${groups.length ? groups.map(([name, arr]) => `<div class="ev-drawer-group">${name}</div>${arr.map(c => `<div class="ev-chat-row" ${c.id === cur ? 'aria-current="true"' : ''}><button class="ev-chat-open" data-act="aiopen" data-id="${c.id}">${esc(chatTitle(c))}</button><button class="ev-kebab" data-act="aimenu" data-id="${c.id}" aria-label="ตัวเลือกของแชท ${esc(chatTitle(c))}" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button></div>`).join('')}`).join('') : `<div class="ev-drawer-empty">${q ? 'ไม่พบแชทที่ค้นหา' : 'ยังไม่มีประวัติแชท เริ่มคุยได้เลย'}</div>`}</div>
    <div class="ev-drawer-foot">${MemoryProvider.ready ? 'ความจำ: ' + MemoryProvider.name : 'ความจำระยะยาว: ยังไม่เปิดใช้'}</div>`;
  drawerEl.dataset.open = String(AIUI.drawer); drawerScrim.dataset.open = String(AIUI.drawer);
  const btn = aiEl.querySelector('[data-act="aidrawer"]'); if (btn) btn.setAttribute('aria-expanded', String(AIUI.drawer));
}
export function openAI() {
  closeMenu(true); closeSheet(); AIUI.open = true; AIUI.drawer = false; AIUI.q = '';
  if (!ChatStore.get(ChatStore.current())) ChatStore.setCurrent(null);
  aiEl.hidden = false; syncLayer(); renderAI(false);
  requestAnimationFrame(() => { aiEl.dataset.open = 'true'; });
}
export function closeAI() { AIUI.open = false; syncLayer(); AIUI.drawer = false; aiEl.dataset.open = 'false'; drawerEl.dataset.open = 'false'; drawerScrim.dataset.open = 'false'; setTimeout(() => { if (!AIUI.open) { aiEl.hidden = true; aiEl.innerHTML = ''; } }, 300); }
export async function aiSend(text) {
  text = (text ?? document.getElementById('aiText')?.value ?? '').trim(); if (!text || AIUI.busy) return;
  let chat = ChatStore.get(ChatStore.current()) || ChatStore.create();
  ChatStore.add(chat.id, { role: 'user', text }); AIUI.busy = true; renderAI(false);
  let res;
  try { const mem = await MemoryProvider.recall(text).catch(() => []); res = await AIClient.reply(text, { memories: mem }); }
  catch (e) { res = { kind: 'text', text: 'ขอโทษ ตอบไม่สำเร็จ ลองใหม่อีกครั้งนะ' }; }
  AIUI.busy = false;
  if (!ChatStore.get(chat.id)) return; /* ห้องถูกลบระหว่างรอ */
  ChatStore.add(chat.id, { role: 'ai', ...res });
  MemoryProvider.remember(chat.id, ChatStore.get(chat.id).msgs).catch(() => {});
  if (AIUI.open && ChatStore.current() === chat.id) renderAI(false);
}
