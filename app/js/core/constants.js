/* Path: app/js/core/constants.js | split mechanically from app.js (no logic edits) */

/* Path: app/js/app.js | Purpose: โมเดลรายการเดียว 4 ชนิด + กฎซ้ำ + ติดตามผล + สถิติ (ต้นแบบจากเดโมของ Master)
   Used by: app/index.html | Layer: Data(store) -> Service(occursOn/streak) -> Feature(views/form) -> UI */
/* ---------- Constants ---------- */
export const UNDO_MS = 5000, TIMER_KEY = 'evarel-timer-v1', MAX_UNDO = 20;
export const STORE_KEY = 'evarel-demo-v2', SKELETON_MS = 450, DAY_MS = 86400000, STREAK_LOOKBACK = 365, STAT_DAYS = 30, TIMER_STEP = 5;
export const TYPES = { habit: 'กิจวัตร', task: 'งาน', event: 'กิจกรรม', class: 'คาบเรียน' };
export const TABS = [['today', 'วันนี้', 'home'], ['all', 'รายการ', 'tasks'], ['schedule', 'ตารางเรียน', 'cal'], ['stats', 'สถิติ', 'chart']];
export const WD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'], WEEK_OPTS = WD.map((l, i) => [i, l]);
export const TH_MON = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
export const TH_DAY = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสฯ','ศุกร์','เสาร์'];
export const UNIT_TH = { day: 'วัน', week: 'สัปดาห์', month: 'เดือน' };
export const REM_OPTS = [[0, 'ตรงเวลา'], [5, '5 นาที'], [10, '10 นาที'], [30, '30 นาที'], [60, '1 ชม.'], [180, '3 ชม.'], [1440, '1 วัน']];
export const MAX_REMINDERS = 8;
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
/* ข้อความอ่านง่ายของการเตือนหนึ่งรายการ */
export const fmtLead = m => m === 0 ? 'ตรงเวลา' : m % 1440 === 0 ? `ก่อน ${m / 1440} วัน` : m % 60 === 0 ? `ก่อน ${m / 60} ชม.` : m > 60 ? `ก่อน ${Math.floor(m / 60)} ชม. ${m % 60} นาที` : `ก่อน ${m} นาที`;
export const remText = r => r.k === 'at' ? `เวลา ${r.t} น.` : r.k === 'day' ? `ก่อนวันส่ง ${r.d} วัน · ${r.t} น.` : fmtLead(r.m);
/* ทำให้ reminders สะอาด: ตัดค่าเสีย/ซ้ำ จำกัดจำนวน เรียงตามเวลา */
export function cleanReminders(list) {
  const seen = new Set(), out = [];
  for (const r of Array.isArray(list) ? list : []) {
    let n = null;
    if (r && r.k === 'at' && HHMM.test(r.t)) n = { k: 'at', t: r.t };
    else if (r && r.k === 'day' && Number.isFinite(+r.d) && +r.d >= 1 && +r.d <= 30 && HHMM.test(r.t)) n = { k: 'day', d: Math.round(+r.d), t: r.t };
    else if (r && r.k === 'before' && Number.isFinite(+r.m) && +r.m >= 0 && +r.m <= 10080) n = { k: 'before', m: Math.round(+r.m) };
    if (!n) continue;
    const key = n.k + (n.d || '') + (n.t || n.m); if (seen.has(key)) continue; seen.add(key); out.push(n);
  }
  const rank = { at: 0, day: 1, before: 2 };
  out.sort((a, b) => a.k !== b.k ? rank[a.k] - rank[b.k] : a.k === 'at' ? a.t.localeCompare(b.t) : a.k === 'day' ? (b.d - a.d) || a.t.localeCompare(b.t) : a.m - b.m);
  return out.slice(0, MAX_REMINDERS);
}
export const TRACK_OPTS = [['check', 'ติ๊ก'], ['count', 'นับเป้า'], ['timer', 'ระยะเวลา']];
export const ICONS = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', tasks: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', chart: 'M5 20V10M12 20V4M19 20v-7', spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12l5 5 9-10', play: 'M7 4l13 8-13 8z', pause: 'M8 5v14M16 5v14', more: 'M12 5.5v.01M12 12v.01M12 18.5v.01', edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', copy: 'M9 9h11v11H9zM5 15V5h10', skip: 'M5 5l10 7-10 7zM19 5v14', reset: 'M4 12a8 8 0 1 0 3-6.2M4 4v5h5', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4', stop: 'M6 6h12v12H6z', down: 'M6 9l6 6 6-6', repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3', task: 'M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9', event: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z', menu: 'M4 7h16M4 12h10M4 17h16', search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5', up: 'M12 19V5M5 12l7-7 7 7', newchat: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', chat: 'M4 5h16v11H9l-5 4z', clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3 2', left: 'M19 12H5M12 19l-7-7 7-7',
};
/* ---------- AI mock (การ์ดยืนยันก่อนเพิ่ม) ---------- */

/* ============================================================
   AI: แยกเป็น 3 ชั้นที่ถอดเปลี่ยนได้ (ออกแบบให้ต่อยอดง่าย)
   1) ChatStore      เก็บห้องแชท/ข้อความ  -> ตอนนี้ในเครื่อง, ภายหลังย้ายไป Supabase
   2) MemoryProvider ความจำระยะยาวของ AI   -> ตอนนี้ไม่มี,      ภายหลังสลับเป็น MemoryLake
   3) AIClient       ตัวเรียกโมเดล         -> ตอนนี้จำลอง,      ภายหลังเรียก Worker -> Groq
   หน้าตา (UI) คุยผ่านสามชั้นนี้เท่านั้น จึงเปลี่ยนข้างหลังได้โดยไม่แตะหน้าจอ
   ============================================================ */
export const CHAT_KEY = 'evarel-chats-v1', MAX_CHATS = 200, MAX_MSGS = 400;
