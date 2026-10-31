/**
 * เปลือกหน้าผู้ช่วย AI ของ Evarel (ชั้นที่ 1 ของกล่อง aiShell โซน shared เพราะ mount ผ่าน EvarelMount.mountAt): page bar + composer + drawer + ชิปโควตา
 * Fragment ระดับบนสุด (ไม่มี wrapper) เพราะ #page เป็น flex column และ .ev-page-scroll ใช้ flex:1 — ใส่ wrapper จะบั๊กเลย์เอาต์ทันที
 * ลงทะเบียน Pages.aiShell (สตริง) และ Components.aiShell (mount) ฟังก์ชันเดียวกันตามบัตร register | children ต้องตรง template เดิม aiShellHTML ทุกไบต์ รวมข้อความ '\n ' ระหว่างบล็อก
 * ข้อมูลทั้งหมดมาจากถาด aiShell.tray.js ที่เดียว (ต่อจากถาดร่วม ai ที่หน้า ai ใช้ด้วย) กล่องนี้ไม่แตะ window | h/Fragment บิลด์ฉีดให้
 */
import { takeAi } from './aiShell.tray.js';
import { AiBar } from './parts/AiBar.jsx';
import { AiDock } from './parts/AiDock.jsx';
import { AiDrawer } from './parts/AiDrawer.jsx';

export function AiShellContent(p) {
  const D = takeAi();
  return h(Fragment, null, [
    h(AiBar, { key: 'bar', D }),
    '\n ',
    h('div', { key: 'scroll', className: 'ev-page-scroll', id: 'aiScroll' }, h('div', { id: 'aiBody' })),
    '\n ',
    h(AiDock, { key: 'dock', D, placeholder: p.placeholder }),
    '\n ',
    h('div', { key: 'dsc', className: 'ev-drawer-scrim', id: 'dScrim', 'data-open': 'false', 'data-act': 'ai-hist' }),
    '\n ',
    h(AiDrawer, { key: 'dr', D, avatarBg: p.avatarBg, avatarText: p.avatarText, userName: p.userName }),
  ]);
}

export default AiShellContent;
