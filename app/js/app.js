/* Path: app/js/app.js | Purpose: โมเดลรายการเดียว 4 ชนิด + กฎซ้ำ + ติดตามผล + สถิติ (ต้นแบบจากเดโมของ Master)
   Used by: app/index.html | Layer: Data(store) -> Service(occursOn/streak) -> Feature(views/form) -> UI */
/* ---------- Constants ---------- */
const UNDO_MS = 5000, TIMER_KEY = 'evarel-timer-v1', MAX_UNDO = 20;
const STORE_KEY = 'evarel-demo-v2', SKELETON_MS = 450, DAY_MS = 86400000, STREAK_LOOKBACK = 365, STAT_DAYS = 30, TIMER_STEP = 5;
const TYPES = { habit: 'กิจวัตร', task: 'งาน', event: 'กิจกรรม', class: 'คาบเรียน' };
const TABS = [['today', 'วันนี้', 'home'], ['all', 'รายการ', 'tasks'], ['schedule', 'ตารางเรียน', 'cal'], ['stats', 'สถิติ', 'chart']];
const WD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'], WEEK_OPTS = WD.map((l, i) => [i, l]);
const UNIT_TH = { day: 'วัน', week: 'สัปดาห์', month: 'เดือน' };
const REM_OPTS = [[0, 'ตรงเวลา'], [5, '5 นาที'], [10, '10 นาที'], [30, '30 นาที'], [60, '1 ชม.'], [180, '3 ชม.'], [1440, '1 วัน']];
const MAX_REMINDERS = 8;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
/* ข้อความอ่านง่ายของการเตือนหนึ่งรายการ */
const remText = r => r.k === 'at' ? `${r.t} น.` : r.m === 0 ? 'ตรงเวลา' : r.m >= 1440 ? `ก่อน ${r.m / 1440} วัน` : r.m >= 60 && r.m % 60 === 0 ? `ก่อน ${r.m / 60} ชม.` : `ก่อน ${r.m} นาที`;
/* ทำให้ reminders สะอาด: ตัดค่าเสีย/ซ้ำ จำกัดจำนวน เรียงตามเวลา */
function cleanReminders(list) {
  const seen = new Set(), out = [];
  for (const r of Array.isArray(list) ? list : []) {
    let n = null;
    if (r && r.k === 'at' && HHMM.test(r.t)) n = { k: 'at', t: r.t };
    else if (r && r.k === 'before' && Number.isFinite(+r.m) && +r.m >= 0 && +r.m <= 10080) n = { k: 'before', m: Math.round(+r.m) };
    if (!n) continue;
    const key = n.k + (n.t || n.m); if (seen.has(key)) continue; seen.add(key); out.push(n);
  }
  out.sort((a, b) => (a.k === b.k ? (a.k === 'at' ? a.t.localeCompare(b.t) : a.m - b.m) : a.k === 'at' ? -1 : 1));
  return out.slice(0, MAX_REMINDERS);
}
const TRACK_OPTS = [['check', 'ติ๊ก'], ['count', 'นับเป้า'], ['timer', 'ระยะเวลา']];
const ICONS = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', tasks: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', chart: 'M5 20V10M12 20V4M19 20v-7', spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12l5 5 9-10', play: 'M7 4l13 8-13 8z', pause: 'M8 5v14M16 5v14', more: 'M12 5.5v.01M12 12v.01M12 18.5v.01', edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4', copy: 'M9 9h11v11H9zM5 15V5h10', skip: 'M5 5l10 7-10 7zM19 5v14', reset: 'M4 12a8 8 0 1 0 3-6.2M4 4v5h5', trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4', stop: 'M6 6h12v12H6z', down: 'M6 9l6 6 6-6', clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3 2',
};

/* ---------- Date helpers ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => new Date(`${s}T00:00:00`);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const TODAY = ymd(new Date());
/* escape ข้อความผู้ใช้ก่อนแทรกลง HTML ทุกครั้ง (กัน XSS) */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Seed ---------- */
const fill = (days, v) => Object.fromEntries(Array.from({ length: days }, (_, i) => [ymd(addDays(new Date(), -i - 1)), v]));
const mkBase = () => ({ subject: '', start: TODAY, end: '', time: '', timeEnd: '', reminders: [], track: 'none', target: 1, unitName: '', log: {}, skips: {} });
const daily = () => ({ unit: 'day', every: 1, days: [] });
const cls = (id, d, time, timeEnd, title) => ({ ...mkBase(), id, type: 'class', title, time, timeEnd, repeat: { unit: 'week', every: 1, days: [d] } });
const SEED = { items: [
  { ...mkBase(), id: 1, type: 'habit', title: 'ดื่มน้ำ', track: 'count', target: 8, unitName: 'แก้ว', repeat: daily(), reminders: [{ k: 'at', t: '09:00' }, { k: 'at', t: '13:00' }, { k: 'at', t: '17:00' }], log: fill(6, 8) },
  { ...mkBase(), id: 2, type: 'habit', title: 'อ่านหนังสือ', time: '19:00', track: 'timer', target: 30, unitName: 'นาที', repeat: daily(), log: { ...fill(3, 30) } },
  { ...mkBase(), id: 3, type: 'habit', title: 'นอนก่อน 22:00', time: '22:00', track: 'check', repeat: daily(), reminders: [{ k: 'at', t: '21:30' }, { k: 'before', m: 0 }], log: fill(4, 1) },
  { ...mkBase(), id: 4, type: 'habit', title: 'วิ่ง', time: '17:00', track: 'check', repeat: { unit: 'week', every: 1, days: [1, 3, 5] } },
  { ...mkBase(), id: 5, type: 'task', title: 'การบ้านคณิตศาสตร์', subject: 'คณิต', time: '16:00', track: 'check', repeat: { unit: 'none', every: 1, days: [] } },
  { ...mkBase(), id: 6, type: 'event', title: 'ประชุมชมรม', time: '16:30', timeEnd: '17:30', reminders: [{ k: 'before', m: 30 }], repeat: { unit: 'week', every: 1, days: [4] } },
  cls(7, 1, '08:30', '09:20', 'คณิตศาสตร์'), cls(8, 1, '09:20', '10:10', 'ภาษาไทย'), cls(9, 2, '08:30', '09:20', 'อังกฤษ'),
  cls(10, 3, '08:30', '09:20', 'วิทยาศาสตร์'), cls(11, 4, '09:20', '10:10', 'ศิลปะ'), cls(12, 5, '08:30', '09:20', 'ชุมนุม'),
] };

/* ---------- Data layer ---------- */
/* ทำความสะอาดข้อมูลที่โหลด: ทุกรายการต้องมี log/rem/repeat ของตัวเอง และค่าไม่สมเหตุสมผลต้องถูกบังคับ */
function normalize(state) {
  const items = Array.isArray(state?.items) ? state.items : [];
  return { items: items.map(it => {
    const m = mkBase();
    const r = it.repeat || {};
    const { rem: _legacy, ...rest } = it;
    return { ...m, ...rest,
      log: { ...(it.log || {}) },
      skips: { ...(it.skips || {}) },
      reminders: cleanReminders(Array.isArray(it.reminders) ? it.reminders : (Array.isArray(it.rem) && it.time ? it.rem.map(m => ({ k: 'before', m })) : [])),
      repeat: { unit: r.unit || 'none', every: Math.max(1, +r.every || 1), days: Array.isArray(r.days) ? [...r.days] : [] },
      target: Math.max(1, +it.target || 1),
    };
  }) };
}

function loadState() {
  try { const raw = localStorage.getItem(STORE_KEY); return raw ? normalize(JSON.parse(raw)) : structuredClone(SEED); }
  catch (err) { console.warn('โหลดข้อมูลไม่สำเร็จ ใช้ข้อมูลตัวอย่าง', err); return structuredClone(SEED); }
}
function saveState() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (err) { console.warn('บันทึกไม่สำเร็จ', err); } }
const S = loadState();
const UI = { tab: 'today', date: TODAY, type: 'all', cday: Math.min(Math.max(new Date().getDay(), 1), 5), loading: true };

/* ---------- Service layer ---------- */
function occursOn(it, ds) {
  const d0 = parse(it.start), d = parse(ds), r = it.repeat;
  if (d < d0 || (it.end && d > parse(it.end))) return false;
  if (r.unit === 'none') return ds === it.start;
  if (r.unit === 'day') return Math.round((d - d0) / DAY_MS) % r.every === 0;
  if (r.unit === 'week') return r.days.includes(d.getDay()) && Math.floor(Math.round((d - addDays(d0, -d0.getDay())) / DAY_MS) / 7) % r.every === 0;
  const months = (d.getFullYear() - d0.getFullYear()) * 12 + d.getMonth() - d0.getMonth();
  return d.getDate() === d0.getDate() && months % r.every === 0;
}
const val = (it, ds) => it.log[ds] || 0;
const target = it => (it.track === 'count' || it.track === 'timer' ? it.target : 1);
const tracked = it => it.track !== 'none';
const isDone = (it, ds) => val(it, ds) >= target(it);
const onDate = ds => S.items.filter(it => occursOn(it, ds)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
function streak(it) {
  let n = 0;
  for (let i = 0; i < STREAK_LOOKBACK; i++) {
    const ds = ymd(addDays(new Date(), -i));
    if (!occursOn(it, ds) || skipped(it, ds)) continue;
    if (isDone(it, ds)) n++; else if (i > 0) break;
  }
  return n;
}
function rate(it) {
  let total = 0, ok = 0;
  for (let i = 0; i < STAT_DAYS; i++) { const ds = ymd(addDays(new Date(), -i)); if (ds < it.start) break; if (occursOn(it, ds) && !skipped(it, ds)) { total++; if (isDone(it, ds)) ok++; } }
  return total ? Math.round(100 * ok / total) : 0;
}
function repeatText(it) {
  const r = it.repeat, tail = it.end ? ` · ถึง ${it.end}` : '';
  if (r.unit === 'none') return `ครั้งเดียว ${it.start}`;
  const every = r.every === 1 ? 'ทุก' : `ทุก ${r.every}`;
  const body = r.unit === 'week' ? `${every} สัปดาห์ (${r.days.map(d => WD[d]).join(' ')})` : `${every} ${UNIT_TH[r.unit]}`;
  return body + tail;
}
const timeText = it => (it.time ? it.time + (it.timeEnd ? `–${it.timeEnd}` : '') : '');


/* ---------- Undo service: จับภาพก่อนแก้ แล้วคืนค่าได้ ---------- */
const UNDO = { stack: [], timer: null };
function pushUndo(entry) {
  UNDO.stack.push(entry); if (UNDO.stack.length > MAX_UNDO) UNDO.stack.shift();
  clearTimeout(UNDO.timer); UNDO.timer = setTimeout(() => { UNDO.last = null; renderToast(); }, UNDO_MS);
  UNDO.last = entry; renderToast();
}
function doUndo() {
  const e = UNDO.stack.pop(); if (!e) return;
  e.restore();
  /* ถอยต่อได้: ถ้ายังมีรายการก่อนหน้า ให้ toast ชี้ไปที่รายการนั้น (กดถอยเป็นขั้นๆ ได้) */
  const prev = UNDO.stack[UNDO.stack.length - 1];
  clearTimeout(UNDO.timer);
  if (prev) { UNDO.last = prev; UNDO.timer = setTimeout(() => { UNDO.last = null; renderToast(); }, UNDO_MS); }
  else UNDO.last = null;
  renderToast();
}
/* บันทึกค่าเดิมของ log วันหนึ่ง แล้วคืนให้ตอนย้อนกลับ */
function withUndo(it, ds, label, change) {
  const had = Object.prototype.hasOwnProperty.call(it.log, ds), old = it.log[ds], id = it.id;
  change();
  pushUndo({ label, restore: () => { const x = find(id); if (!x) return; if (had) x.log[ds] = old; else delete x.log[ds]; } });
}
function renderToast() {
  const el = document.getElementById('toast'); if (!el) return;
  const e = UNDO.last;
  el.dataset.open = e ? 'true' : 'false';
  el.innerHTML = e ? `<span>${esc(e.label)}</span>${e.plain ? '' : '<button class="ev-toast-btn" data-act="undo">ย้อนกลับ</button>'}` : '';
}

/* ---------- Timer service: เก็บเป็น timestamp ทนต่อปิดแอป/รีเฟรช ---------- */
/* โครงสร้าง: { id, date, startedAt|null, acc } acc = มิลลิวินาทีที่สะสมไว้ก่อนหน้า (ตอนหยุดชั่วคราว) */
const loadTimer = () => { try { return JSON.parse(localStorage.getItem(TIMER_KEY)) || null; } catch { return null; } };
const saveTimer = () => { try { TIMER ? localStorage.setItem(TIMER_KEY, JSON.stringify(TIMER)) : localStorage.removeItem(TIMER_KEY); } catch (err) { console.warn('บันทึกตัวจับเวลาไม่สำเร็จ', err); } };
let TIMER = loadTimer();
const timerMs = () => (TIMER ? TIMER.acc + (TIMER.startedAt ? Date.now() - TIMER.startedAt : 0) : 0);
const timerMin = ms => Math.floor(ms / 60000);
const fmtClock = ms => { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`; };
let TICK = null;
function ensureTick() {
  clearInterval(TICK); TICK = null;
  if (TIMER && TIMER.startedAt) TICK = setInterval(() => {
    if (!TIMER) return;
    document.querySelectorAll('[data-clock]').forEach(el => { if (el.dataset.clock == TIMER.id) el.textContent = fmtClock(timerMs()); });
    const dial = document.getElementById('dial'), it = TIMER && find(TIMER.id);
    if (dial && it) dial.style.setProperty('--p', Math.min(100, (val(it, TIMER.date) * 60000 + timerMs()) / (target(it) * 60000) * 100));
  }, 1000);
}

/* ---------- UI primitives ---------- */
const icon = n => `<svg class="ev-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;
const empty = (t, h) => `<div class="ev-empty"><h3>${t}</h3><p>${h}</p></div>`;
const skeleton = () => `<div class="ev-main"><div class="ev-skeleton"></div><div class="ev-skeleton"></div><div class="ev-skeleton"></div></div>`;
const header = (sub, title) => `<header class="ev-header"><span class="ev-sub">${sub}</span><div class="ev-row">
  <button class="ev-icon-btn" data-tone="accent" data-act="ai" aria-label="ผู้ช่วย AI">${icon('spark')}</button>
  <button class="ev-avatar" data-act="settings" aria-label="ตั้งค่า">J</button></div></header><h1 class="ev-title">${title}</h1>`;
const chipsRow = (act, opts, cur) => `<div class="ev-filters" role="group">${opts.map(([k, l]) => `<button aria-pressed="${cur === k}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;


/* ปุ่มควบคุมตัวจับเวลา: เริ่ม / หยุดชั่วคราว+จบ / ต่อ */
function timerControls(it, ds) {
  const mine = TIMER && TIMER.id == it.id && TIMER.date === ds;
  if (mine) return `<button class="ev-mini" data-tone="${TIMER.startedAt ? 'ok' : ''}" data-act="timeropen" data-id="${it.id}" aria-label="เปิดหน้าจับเวลา"><span class="ev-clock" data-clock="${it.id}" style="color:inherit;min-width:0">${fmtClock(timerMs())}</span></button>`;
  return `<button class="ev-mini" data-act="timeropen" data-id="${it.id}" aria-label="เปิดหน้าจับเวลา">${icon('play')}</button>`;
}
/* งานที่ครบกำหนดแล้วแต่ยังไม่เสร็จ */
const overdue = (it, ds) => it.type === 'task' && tracked(it) && it.start < ds && !isDone(it, it.start) && ds === TODAY;
const overdueList = () => S.items.filter(it => it.type === 'task' && tracked(it) && it.repeat.unit === 'none' && it.start < TODAY && !isDone(it, it.start))
  .sort((a, b) => a.start.localeCompare(b.start));

function itemRow(it, ds) {
  const v = val(it, ds), tg = target(it), done = tracked(it) && isDone(it, ds), multi = it.track === 'count' || it.track === 'timer';
  const lead = it.track === 'check'
    ? `<button class="ev-check" role="checkbox" aria-checked="${done}" aria-label="ทำแล้ว" data-act="check" data-id="${it.id}">${icon('check')}</button>`
    : `<span class="ev-chip">${TYPES[it.type]}</span>`;
  const tail = it.track === 'count'
    ? `<div class="ev-step"><button data-act="dec" data-id="${it.id}" aria-label="ลด">−</button><button data-act="inc" data-id="${it.id}" aria-label="เพิ่ม">+</button></div>`
    : it.track === 'timer' ? timerControls(it, ds) : '';
  const sub = [timeText(it), multi ? `${v}/${tg} ${esc(it.unitName)}` : esc(it.subject), it.type === 'task' && overdue(it, ds) ? 'เลยกำหนด' : ''].filter(Boolean).join(' · ');
  return `<li class="ev-list-item" data-state="${done ? 'done' : 'todo'}">${lead}<div class="grow"><b>${esc(it.title)}</b><span class="ev-sub">${sub}</span>
    ${multi ? `<div class="ev-bar"><i style="width:${Math.min(100, v / tg * 100)}%"></i></div>` : ''}</div>${tail}${kebab(it)}</li>`;
}



/* ---------- ตัวคำนวณเวลาเตือน (แกนเดียวกับที่ Worker จะใช้ยิง Push จริงในขั้นต่อไป) ----------
   คืนรายการ { at: 'HH:MM', itemId, title, label } ของวัน ds เรียงตามเวลา
   กฎ: รายการต้องเกิดขึ้นในวันนั้น / ไม่ใช่วันที่ข้าม / ถ้าทำครบแล้ว (เฉพาะที่ติดตามผล) ไม่เตือน / "ล่วงหน้า" ต้องมีเวลาอ้างอิง */
const toMin = hhmm => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3);
const fromMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
function remindersFor(ds, { includeDone = false } = {}) {
  const out = [];
  for (const it of S.items) {
    if (!occursOn(it, ds) || skipped(it, ds)) continue;
    if (!includeDone && tracked(it) && isDone(it, ds)) continue;
    for (const r of it.reminders || []) {
      let m = null;
      if (r.k === 'at') m = toMin(r.t);
      else if (r.k === 'before' && it.time) m = toMin(it.time) - r.m;
      if (m === null || m < 0 || m >= 1440) continue; /* ล่วงหน้าข้ามเที่ยงคืนไปวันก่อน: ไม่รองรับในเวอร์ชันนี้ */
      out.push({ at: fromMin(m), itemId: it.id, title: it.title, label: remText(r) });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at) || a.title.localeCompare(b.title));
}

/* ---------- เมนูสามจุด (dropdown) ---------- */
const kebab = it => `<button class="ev-kebab" data-act="menu" data-id="${it.id}" aria-label="ตัวเลือกของ ${esc(it.title)}" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button>`;
const menuEl = document.getElementById('menu');
let MENU_FOR = null, MENU_BTN = null;
function menuItems(it, ds) {
  const out = [['edit', 'edit', 'แก้ไข']];
  if (it.track === 'timer') out.push(['timeropen', 'clock', 'เปิดหน้าจับเวลา']);
  if (tracked(it) && occursOn(it, ds) && ds <= TODAY) {
    if (val(it, ds) > 0) out.push(['reset', 'reset', 'ล้างบันทึกวันนี้']);
    if (it.type === 'habit' && !isDone(it, ds) && !skipped(it, ds)) out.push(['skip', 'skip', 'ข้ามวันนี้']);
    if (skipped(it, ds)) out.push(['unskip', 'reset', 'ยกเลิกการข้าม']);
  }
  out.push(['dup', 'copy', 'ทำสำเนา'], ['---'], ['del', 'trash', 'ลบ', 'danger']);
  return out;
}
function openMenu(btn, id) {
  const it = find(id); if (!it) return;
  if (MENU_FOR == id) return closeMenu();
  closeMenu(); MENU_FOR = id; MENU_BTN = btn; btn.setAttribute('aria-expanded', 'true');
  menuEl.innerHTML = menuItems(it, UI.date).map(m => m[0] === '---' ? '<hr>' : `<button role="menuitem" data-act="m-${m[0]}" data-id="${id}" ${m[3] ? `data-tone="${m[3]}"` : ''}>${icon(m[1])}${m[2]}</button>`).join('');
  menuEl.hidden = false;
  const r = btn.getBoundingClientRect(), mw = 210, mh = menuEl.scrollHeight || 220;
  const left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw));
  const below = r.bottom + 6 + mh < innerHeight - 8;
  menuEl.style.left = left + 'px'; menuEl.style.top = (below ? r.bottom + 6 : Math.max(8, r.top - mh - 6)) + 'px';
  menuEl.style.transformOrigin = below ? 'top right' : 'bottom right';
  requestAnimationFrame(() => { menuEl.dataset.open = 'true'; menuEl.querySelector('button')?.focus(); });
}
function closeMenu() {
  if (MENU_BTN) { MENU_BTN.setAttribute('aria-expanded', 'false'); try { MENU_BTN.focus({ preventScroll: true }); } catch {} }
  MENU_FOR = null; MENU_BTN = null; menuEl.dataset.open = 'false'; menuEl.hidden = true;
}
/* "ข้าม" = วันนี้ไม่นับเป็นพลาด (เช่น ป่วย/เดินทาง) เก็บเป็น -1 ใน log */
const skipped = (it, ds) => !!(it.skips && it.skips[ds]);

/* ---------- หน้าจับเวลาเต็มจอ ---------- */
const focusEl = document.getElementById('focus');
let FOCUS_ID = null, FOCUS_RET = null;
const liveBar = document.createElement('button');
liveBar.className = 'ev-live'; liveBar.hidden = true; liveBar.dataset.act = 'timeropen'; liveBar.setAttribute('aria-label', 'กลับไปหน้าจับเวลา');
document.body.appendChild(liveBar);
function renderLive() {
  if (!TIMER || FOCUS_ID) { liveBar.hidden = true; return; }
  const it = find(TIMER.id); if (!it) { liveBar.hidden = true; return; }
  liveBar.hidden = false; liveBar.dataset.id = it.id; liveBar.dataset.run = String(!!TIMER.startedAt);
  liveBar.innerHTML = `<i></i><span>${TIMER.startedAt ? 'กำลังจับเวลา' : 'หยุดชั่วคราว'} · ${esc(it.title)}</span><b data-clock="${it.id}">${fmtClock(timerMs())}</b>`;
}
function focusHTML(it) {
  const mine = TIMER && TIMER.id == it.id, run = mine && !!TIMER.startedAt, ms = mine ? timerMs() : 0;
  const goalMs = target(it) * 60000, base = val(it, mine ? TIMER.date : UI.date) * 60000, p = Math.min(100, (base + ms) / goalMs * 100);
  const state = !mine ? 'พร้อมเริ่ม' : run ? 'กำลังจับเวลา' : 'หยุดชั่วคราว';
  const main = !mine
    ? `<div><button class="ev-round" data-big="true" data-act="tstart" data-id="${it.id}" aria-label="เริ่ม">${icon('play')}</button><span class="ev-round-label">เริ่ม</span></div>`
    : `<div><button class="ev-round" data-act="tstop" data-id="${it.id}" aria-label="จบและบันทึก" data-tone="ok">${icon('check')}</button><span class="ev-round-label">จบ</span></div>
       <div><button class="ev-round" data-big="true" data-act="${run ? 'tpause' : 'tresume'}" data-id="${it.id}" aria-label="${run ? 'หยุดชั่วคราว' : 'ทำต่อ'}">${icon(run ? 'pause' : 'play')}</button><span class="ev-round-label">${run ? 'หยุด' : 'ทำต่อ'}</span></div>
       <div><button class="ev-round" data-act="tcancel" data-id="${it.id}" aria-label="ยกเลิกโดยไม่บันทึก">${icon('x')}</button><span class="ev-round-label">ยกเลิก</span></div>`;
  return `<div class="ev-focus-top"><button class="ev-icon-btn" data-act="focusclose" aria-label="ย่อหน้าจับเวลา">${icon('down')}</button><span class="ev-sub">${TYPES[it.type]}</span><span style="width:44px"></span></div>
    <div class="ev-focus-body"><div><h2 class="ev-focus-title">${esc(it.title)}</h2><p class="ev-focus-state" id="focusState">${state}</p></div>
      <div class="ev-dial" id="dial" style="--p:${p}"><div class="ev-dial-face"><span class="ev-digits" id="digits" data-run="${run}" data-clock="${it.id}">${fmtClock(ms)}</span><span class="ev-goal">วันนี้ ${val(it, UI.date)}/${target(it)} ${esc(it.unitName)}</span></div></div>
      <div class="ev-focus-actions">${main}</div></div>`;
}
function openFocus(id) {
  const it = find(id); if (!it || it.track !== 'timer') return;
  if (isFuture(UI.date) && !(TIMER && TIMER.id == id)) return toast('ยังไม่ถึงวันนี้ จับเวลาล่วงหน้าไม่ได้');
  closeMenu(); closeSheet(); FOCUS_RET = document.activeElement; FOCUS_ID = +id;
  focusEl.hidden = false; focusEl.innerHTML = focusHTML(it);
  requestAnimationFrame(() => { focusEl.dataset.open = 'true'; focusEl.querySelector('[data-big]')?.focus(); });
  renderLive(); acquireWake();
}
function refreshFocus() { const it = FOCUS_ID && find(FOCUS_ID); if (!it) return closeFocus(); focusEl.innerHTML = focusHTML(it); focusEl.querySelector('[data-big]')?.focus(); }
function closeFocus() {
  FOCUS_ID = null; focusEl.dataset.open = 'false'; setTimeout(() => { if (!FOCUS_ID) { focusEl.hidden = true; focusEl.innerHTML = ''; } }, 300);
  renderLive(); releaseWake(); try { FOCUS_RET?.focus?.({ preventScroll: true }); } catch {}
}
/* กันจอดับระหว่างจับเวลา (Android Chrome รองรับ) */
let WAKE = null;
async function acquireWake() { try { if ('wakeLock' in navigator && !WAKE) { WAKE = await navigator.wakeLock.request('screen'); WAKE.addEventListener('release', () => { WAKE = null; }); } } catch { /* ไม่รองรับก็ข้าม */ } }
function releaseWake() { try { WAKE?.release(); } catch {} WAKE = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && FOCUS_ID) { acquireWake(); const d = document.getElementById('digits'); if (d) d.textContent = fmtClock(timerMs()); } });

/* ---------- Feature views ---------- */
const VIEWS = {
  today() {
    const list = onDate(UI.date), tr = list.filter(tracked), done = tr.filter(it => isDone(it, UI.date)).length, p = tr.length ? Math.round(100 * done / tr.length) : 0;
    const start = addDays(new Date(), -new Date().getDay());
    const week = Array.from({ length: 7 }, (_, i) => ymd(addDays(start, i)));
    return `${header(new Date(parse(UI.date)).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' }), 'วันนี้')}
    <div class="ev-week" role="group" aria-label="เลือกวัน">${week.map(d => `<button aria-pressed="${UI.date === d}" data-today="${d === TODAY}" data-act="date" data-id="${d}">${WD[parse(d).getDay()]}<b>${parse(d).getDate()}</b></button>`).join('')}</div>
    <main class="ev-main"><section class="ev-card ev-row" data-tone="accent"><div class="ev-ring" style="--p:${p}"><span>${p}%</span></div>
      <div class="grow"><b>ทำแล้ว ${done}/${tr.length}</b><p class="ev-lead">${list.length - tr.length} รายการที่เป็นตาราง/นัดหมาย</p></div></section>
    ${UI.date === TODAY && overdueList().length ? `<section class="ev-card" data-tone="alert"><b>ค้างอยู่ ${overdueList().length} งาน</b><ul class="ev-plain-list">${overdueList().map(it => `<li class="ev-list-item"><button class="ev-check" role="checkbox" aria-checked="false" aria-label="ทำแล้ว" data-act="checkdue" data-id="${it.id}">${icon('check')}</button><div class="grow"><b>${esc(it.title)}</b><span class="ev-sub">กำหนด ${it.start}${it.subject ? ' · ' + esc(it.subject) : ''}</span></div><span class="ev-chip" data-state="late">เลยกำหนด</span></li>`).join('')}</ul></section>` : ''}
    <section class="ev-card">${list.length ? `<ul class="ev-plain-list">${list.map(it => itemRow(it, UI.date)).join('')}</ul>` : empty('วันนี้ว่าง', 'กดปุ่ม + เพื่อเพิ่มสิ่งที่อยากทำ')}</section></main>`;
  },
  all() {
    const list = S.items.filter(it => UI.type === 'all' || it.type === UI.type);
    const row = it => `<li class="ev-list-item"><span class="ev-chip">${TYPES[it.type]}</span><div class="grow"><b>${esc(it.title)}</b><span class="ev-sub">${repeatText(it)}${it.reminders.length ? ` · ${icon('bell').replace('class="ev-icon"', 'class="ev-icon ev-icon-inline"')}${it.reminders.length}` : ''}</span></div>${kebab(it)}</li>`;
    return `${header('ทุกอย่างที่ตั้งไว้', 'รายการ')}${chipsRow('type', [['all', 'ทั้งหมด'], ...Object.entries(TYPES)], UI.type)}
    <main class="ev-main"><section class="ev-card">${list.length ? `<ul class="ev-plain-list">${list.map(row).join('')}</ul>` : empty('ยังไม่มีรายการ', 'กดปุ่ม + เพื่อสร้าง')}</section></main>`;
  },
  schedule() {
    const date = ymd(addDays(new Date(), UI.cday - new Date().getDay())), list = onDate(date).filter(it => it.type === 'class');
    return `${header('คาบเรียนแต่ละวัน', 'ตารางเรียน')}<div class="ev-week">${[1, 2, 3, 4, 5].map(i => `<button aria-pressed="${UI.cday === i}" data-act="cday" data-id="${i}">${WD[i]}</button>`).join('')}</div>
    <main class="ev-main"><section class="ev-card">${list.length ? list.map(it => `<div class="ev-list-item"><span class="ev-chip">${it.time}</span><div class="grow"><b>${esc(it.title)}</b></div><span class="ev-sub">ถึง ${it.timeEnd}</span></div>`).join('') : empty('วันนี้ไม่มีคาบเรียน', 'กด + แล้วเลือก “คาบเรียน”')}</section></main>`;
  },
  stats() {
    const habits = S.items.filter(it => it.type === 'habit');
    const card = it => { const bars = Array.from({ length: 7 }, (_, i) => { const ds = ymd(addDays(new Date(), i - 6)); return `<i data-state="${occursOn(it, ds) && isDone(it, ds) ? 'hit' : 'miss'}" style="height:${occursOn(it, ds) ? 100 : 15}%"></i>`; }).join('');
      return `<section class="ev-card"><div class="ev-stat"><div><b>${esc(it.title)}</b><p class="ev-sub">สำเร็จ ${rate(it)}% ใน ${STAT_DAYS} วัน</p></div><div class="ev-streak">${streak(it)}<span class="ev-sub"> วันติด</span></div></div><div class="ev-bars ev-gap-top">${bars}</div></section>`; };
    return `${header('ความต่อเนื่องของคุณ', 'สถิติ')}<main class="ev-main">${habits.length ? habits.map(card).join('') : empty('ยังไม่มีกิจวัตร', 'สร้างกิจวัตรเพื่อดูสถิติ')}</main>`;
  },
};

/* ---------- Sheets ---------- */
const sheetEl = document.getElementById('sheet'), scrim = document.getElementById('scrim');
function openSheet(title, body) {
  sheetEl.innerHTML = `<h2>${title}<button class="ev-icon-btn" data-act="close" aria-label="ปิด">${icon('x')}</button></h2>${body}`;
  sheetEl.dataset.open = scrim.dataset.open = 'true';
}
const closeSheet = () => { sheetEl.dataset.open = scrim.dataset.open = 'false'; };

/* ---------- Add form (draft D) ---------- */
let D = {};
const newDraft = type => ({ type, title: '', subject: '', start: TODAY, end: '', endMode: 'never', time: '', timeEnd: '', unit: type === 'habit' ? 'day' : 'none', every: 1, days: [], track: 'check', target: 1, unitName: '', reminders: [], remTime: '', editId: null });
const seg = (act, opts, cur) => `<div class="ev-seg">${opts.map(([k, l]) => `<button type="button" aria-pressed="${cur === k}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
const chips = (act, opts, arr) => `<div class="ev-filters" data-wrap="true">${opts.map(([k, l]) => `<button type="button" aria-pressed="${arr.includes(k)}" data-act="${act}" data-id="${k}">${l}</button>`).join('')}</div>`;
const field = (l, h) => `<label class="ev-field"><span>${l}</span>${h}</label>`;
const inp = (n, t, ph = '') => `<input class="ev-input" name="${n}" type="${t}" value="${esc(D[n])}" placeholder="${ph}">`;
const row2 = (a, b) => `<div class="ev-row2">${a}${b}</div>`;
const rangeBlock = () => field('วันเริ่ม', inp('start', 'date')) + seg('dend', [['never', 'ไม่สิ้นสุด'], ['date', 'ถึงวันที่']], D.endMode) + (D.endMode === 'date' ? field('วันสิ้นสุด', inp('end', 'date')) : '');
const repeatBlock = () => seg('dunit', [['none', 'ไม่ซ้ำ'], ['day', 'วัน'], ['week', 'สัปดาห์'], ['month', 'เดือน']], D.unit)
  + (D.unit === 'none' ? field('วันที่', inp('start', 'date')) : field(`ทำซ้ำทุก ๆ กี่ ${UNIT_TH[D.unit]}`, inp('every', 'number')) + (D.unit === 'week' ? field('เลือกวัน', chips('dday', WEEK_OPTS, D.days)) : '') + rangeBlock());

/* ---------- ส่วนเตือนในฟอร์ม: เวลาเจาะจงหลายเวลา + เตือนล่วงหน้า ---------- */
function remBlock() {
  const has = k => D.reminders.some(r => r.k === 'before' && r.m === k);
  const list = D.reminders.map((r, i) => `<span class="ev-rem-tag">${remText(r)}<button type="button" data-act="rrem" data-id="${i}" aria-label="ลบการเตือน ${remText(r)}">${icon('x')}</button></span>`).join('');
  const anchorTime = D.time && D.type !== 'class' || D.time;
  const quick = anchorTime ? `<div class="ev-filters" data-wrap="true">${REM_OPTS.map(([m, l]) => `<button type="button" aria-pressed="${has(m)}" data-act="rquick" data-id="${m}">${m === 0 ? 'ตรงเวลา' : 'ก่อน ' + l}</button>`).join('')}</div>` : `<p class="ev-rem-hint">ใส่เวลาของรายการด้านบน จะเลือก “เตือนล่วงหน้า” ได้</p>`;
  return `<div class="ev-field" id="remBlock"><span>การแจ้งเตือน ${D.reminders.length ? `(${D.reminders.length}/${MAX_REMINDERS})` : ''}</span>
    <div class="ev-rem">${list ? `<div class="ev-rem-list">${list}</div>` : '<p class="ev-rem-hint">ยังไม่ได้ตั้งเตือน</p>'}
    <div class="ev-rem-add"><input class="ev-input" type="time" name="remTime" value="${esc(D.remTime)}" aria-label="เวลาที่ต้องการให้เตือน"><button type="button" class="ev-mini" data-act="radd" aria-label="เพิ่มเวลาเตือน" style="width:auto;padding:0 14px">เพิ่มเวลา</button></div>
    ${quick}</div></div>`;
}

function formHTML() {
  const T = D.type, multi = D.track !== 'check';
  let h = seg('dtype', Object.entries(TYPES), T) + field(T === 'class' ? 'ชื่อวิชา' : 'ชื่อ', inp('title', 'text', T === 'habit' ? 'เช่น ดื่มน้ำ' : ''));
  if (T === 'task') h += field('วิชา/หมวด', inp('subject', 'text')) + row2(field('วันกำหนดส่ง', inp('start', 'date')), field('เวลา', inp('time', 'time')));
  if (T === 'habit') h += field('เวลาที่ควรทำ (ไม่บังคับ)', inp('time', 'time')) + field('วิธีติดตามผล', seg('dtrack', TRACK_OPTS, D.track))
    + (multi ? row2(field('เป้าหมาย', inp('target', 'number')), field('หน่วย', inp('unitName', 'text'))) : '') + repeatBlock();
  if (T === 'event') h += row2(field('เริ่ม', inp('time', 'time')), field('จบ', inp('timeEnd', 'time'))) + repeatBlock();
  if (T === 'class') h += field('วันที่เรียน', chips('dday', WEEK_OPTS, D.days)) + row2(field('เริ่ม', inp('time', 'time')), field('จบ', inp('timeEnd', 'time'))) + rangeBlock();
  return `<form class="ev-form" id="addForm">${h}${remBlock()}<p class="ev-form-err" id="formErr" role="alert" hidden></p><button class="ev-btn-primary ev-btn-block" type="submit">${D.editId ? 'บันทึกการแก้ไข' : 'บันทึก'}</button></form>`;
}
function renderForm() { const y = sheetEl.scrollTop; openSheet(D.editId ? 'แก้ไข' : 'เพิ่มใหม่', formHTML()); sheetEl.scrollTop = y; }
function buildItem() {
  const T = D.type, week = T === 'class' || D.unit === 'week';
  const days = week ? (D.days.length ? D.days : [parse(D.start).getDay()]) : [];
  const repeat = T === 'task' ? { unit: 'none', every: 1, days: [] } : { unit: T === 'class' ? 'week' : D.unit, every: Math.max(1, +D.every || 1), days };
  const multi = T === 'habit' && D.track !== 'check';
  return { id: D.editId || Date.now(), type: T, title: D.title.trim(), subject: D.subject, start: D.start, end: D.endMode === 'date' && repeat.unit !== 'none' ? D.end : '', time: D.time, timeEnd: D.timeEnd,
    reminders: cleanReminders(D.reminders), repeat, track: T === 'habit' ? D.track : T === 'task' ? 'check' : 'none', target: multi ? Math.max(1, +D.target || 1) : 1, unitName: multi ? D.unitName : '', log: {} };
}

/* โหลดรายการเดิมเข้า draft แล้วเปิดฟอร์มเดิมในโหมดแก้ไข */
function openEdit(id) {
  const it = find(id); if (!it) return;
  closeMenu();
  D = { type: it.type, title: it.title, subject: it.subject || '', start: it.start, end: it.end || '', endMode: it.end ? 'date' : 'never', time: it.time || '', timeEnd: it.timeEnd || '',
    unit: it.repeat.unit, every: it.repeat.every, days: [...it.repeat.days], track: it.track === 'none' ? 'check' : it.track, target: it.target, unitName: it.unitName || '',
    reminders: it.reminders.map(r => ({ ...r })), remTime: '', editId: it.id };
  renderForm();
}
const openAdd = type => { D = newDraft(type); renderForm(); };
const toggle = (arr, v) => { const i = arr.indexOf(v); if (i < 0) arr.push(v); else arr.splice(i, 1); };

/* ---------- AI mock (การ์ดยืนยันก่อนเพิ่ม) ---------- */
const aiOpen = () => openSheet('ผู้ช่วย AI', `<div class="ev-chat" id="chat"><div class="ev-bubble-ai">ลองพิมพ์ เช่น “เพิ่มงาน การบ้านอังกฤษ”</div></div>
  <div class="ev-row ev-gap-top"><input class="ev-input" id="aiText" placeholder="พิมพ์ข้อความ…" aria-label="ข้อความ"><button class="ev-btn-primary" data-act="send">ส่ง</button></div>`);
function aiSend() {
  const inpEl = document.getElementById('aiText'), text = inpEl.value.trim(), chat = document.getElementById('chat');
  if (!text) return;
  const name = text.replace('เพิ่มงาน', '').trim() || 'งานใหม่';
  chat.insertAdjacentHTML('beforeend', '<div class="ev-bubble-user"></div>'); chat.lastElementChild.textContent = text; inpEl.value = '';
  chat.insertAdjacentHTML('beforeend', text.includes('เพิ่มงาน')
    ? `<div class="ev-card" data-tone="soft"><b>เพิ่มงาน “${esc(name)}” ส่งพรุ่งนี้?</b><div class="ev-row ev-gap-top-sm"><button class="ev-btn-primary" data-act="ai-ok" data-id="${encodeURIComponent(name)}">ยืนยัน</button><button class="ev-btn-ghost" data-act="close">ยกเลิก</button></div></div>`
    : '<div class="ev-bubble-ai">รับทราบ (เดโม: ลองพิมพ์ “เพิ่มงาน …”)</div>');
  chat.scrollTop = chat.scrollHeight;
}

/* ---------- Actions ---------- */
const find = id => S.items.find(x => x.id == id);
const isFuture = ds => ds > TODAY;
const bump = (id, n, label) => {
  const it = find(id); if (!it) return;
  if (isFuture(UI.date)) return toast('ยังไม่ถึงวันนี้ บันทึกล่วงหน้าไม่ได้');
  const next = Math.max(0, val(it, UI.date) + n); if (next === val(it, UI.date)) return;
  withUndo(it, UI.date, label || `${n > 0 ? 'เพิ่ม' : 'ลด'} ${Math.abs(n)} ${it.unitName || ''}`.trim(), () => { it.log[UI.date] = next; });
};
/* ข้อความแจ้งสั้นๆ (ไม่มีปุ่มย้อนกลับ) ใช้ toast ตัวเดียวกัน */
function toast(msg) { UNDO.last = { label: msg, restore: null, plain: true }; clearTimeout(UNDO.timer); UNDO.timer = setTimeout(() => { UNDO.last = null; renderToast(); }, UNDO_MS); renderToast(); }
const FORM = 'form';
/* หยุดตัวจับเวลาที่กำลังทำอยู่ (ถ้ามี) แล้วบันทึกนาทีเข้า log ของวันที่เริ่ม */
function commitTimer(label) {
  if (!TIMER) return 0;
  const it = find(TIMER.id), min = timerMin(timerMs()), ds = TIMER.date;
  TIMER = null; saveTimer(); ensureTick();
  if (it && min > 0) withUndo(it, ds, label || `บันทึก ${min} นาที`, () => { it.log[ds] = val(it, ds) + min; });
  else if (it) toast('ไม่ถึง 1 นาที จึงไม่บันทึก');
  return min;
}
const ACTIONS = {
  check: id => { const it = find(id); if (!it) return;
    if (isFuture(UI.date)) return toast('ยังไม่ถึงวันนี้ ติ๊กล่วงหน้าไม่ได้');
    const was = isDone(it, UI.date); withUndo(it, UI.date, was ? `ยกเลิก “${it.title}”` : `ทำแล้ว “${it.title}”`, () => { it.log[UI.date] = was ? 0 : 1; }); },
  checkdue: id => { const it = find(id); if (it) withUndo(it, it.start, `ทำแล้ว “${it.title}”`, () => { it.log[it.start] = 1; }); },
  inc: id => bump(id, 1), dec: id => bump(id, -1),
  /* ตัวจับเวลา: ทีละตัวเท่านั้น, เก็บเป็น timestamp */
  tstart: id => { if (isFuture(UI.date)) return toast('ยังไม่ถึงวันนี้ จับเวลาล่วงหน้าไม่ได้');
    if (TIMER && TIMER.id != id) commitTimer(); /* เริ่มตัวใหม่ = จบตัวเก่าและบันทึกให้ */
    TIMER = { id: +id, date: UI.date, startedAt: Date.now(), acc: 0 }; saveTimer(); ensureTick(); },
  tpause: () => { if (!TIMER || !TIMER.startedAt) return; TIMER.acc += Date.now() - TIMER.startedAt; TIMER.startedAt = null; saveTimer(); ensureTick(); },
  tresume: () => { if (!TIMER || TIMER.startedAt) return; TIMER.startedAt = Date.now(); saveTimer(); ensureTick(); },
  tstop: () => { commitTimer(); },
  tdec: id => bump(id, -TIMER_STEP, `ลด ${TIMER_STEP} นาที`),
  undo: doUndo,
  /* เมนูสามจุด */
  menu: (id, el) => { openMenu(el, id); return NOREDRAW; },
  'm-edit': id => { openEdit(id); return NOREDRAW; },
  'm-timeropen': id => { closeMenu(); openFocus(id); return NOREDRAW; },
  'm-reset': id => { const it = find(id); closeMenu(); if (it && val(it, UI.date) > 0) withUndo(it, UI.date, `ล้างบันทึก “${it.title}”`, () => { delete it.log[UI.date]; }); },
  'm-skip': id => { const it = find(id); closeMenu(); if (!it) return; const had = !!it.skips[UI.date]; it.skips[UI.date] = true;
    pushUndo({ label: `ข้าม “${it.title}” วันนี้`, restore: () => { const x = find(id); if (x) { if (had) x.skips[UI.date] = true; else delete x.skips[UI.date]; } } }); },
  'm-unskip': id => { const it = find(id); closeMenu(); if (!it) return; const ds = UI.date; delete it.skips[ds];
    pushUndo({ label: `ยกเลิกการข้าม “${it.title}”`, restore: () => { const x = find(id); if (x) x.skips[ds] = true; } }); },
  'm-dup': id => { const it = find(id); closeMenu(); if (!it) return;
    const copy = { ...structuredClone(it), id: Date.now(), title: `${it.title} (สำเนา)`, log: {}, skips: {} };
    S.items.push(copy); pushUndo({ label: `ทำสำเนา “${it.title}” แล้ว`, restore: () => { S.items = S.items.filter(x => x.id != copy.id); } }); },
  'm-del': id => { closeMenu(); return ACTIONS.del(id); },
  /* หน้าจับเวลาเต็มจอ */
  timeropen: id => { openFocus(id); return NOREDRAW; },
  focusclose: () => { closeFocus(); },
  tcancel: () => { if (!TIMER) return; TIMER = null; saveTimer(); ensureTick(); toast('ยกเลิกการจับเวลาแล้ว (ไม่บันทึก)'); },
  /* เตือนอิสระ */
  radd: () => { const v = (D.remTime || '').trim(); if (!HHMM.test(v)) return toast('เลือกเวลาที่จะให้เตือนก่อน');
    if (D.reminders.length >= MAX_REMINDERS) return toast(`ตั้งเตือนได้สูงสุด ${MAX_REMINDERS} ครั้ง`);
    D.reminders = cleanReminders([...D.reminders, { k: 'at', t: v }]); D.remTime = ''; return FORM; },
  rrem: id => { D.reminders.splice(+id, 1); return FORM; },
  rquick: id => { const m = +id, i = D.reminders.findIndex(r => r.k === 'before' && r.m === m);
    if (i >= 0) D.reminders.splice(i, 1); else if (D.reminders.length < MAX_REMINDERS) D.reminders = cleanReminders([...D.reminders, { k: 'before', m }]); else toast(`ตั้งเตือนได้สูงสุด ${MAX_REMINDERS} ครั้ง`); return FORM; },
  date: id => { UI.date = id; }, type: id => { UI.type = id; }, cday: id => { UI.cday = +id; },
  del: id => { const idx = S.items.findIndex(x => x.id == id); if (idx < 0) return; const [gone] = S.items.splice(idx, 1);
    if (TIMER && TIMER.id == gone.id) { TIMER = null; saveTimer(); ensureTick(); }
    pushUndo({ label: `ลบ “${gone.title}” แล้ว`, restore: () => { if (!S.items.some(x => x.id == gone.id)) S.items.splice(Math.min(idx, S.items.length), 0, gone); } }); },
  ai: aiOpen, send: aiSend, close: closeSheet,
  settings: () => openSheet('ตั้งค่า', '<div class="ev-form"><button class="ev-btn-ghost ev-btn-block" data-act="notify">เปิดการแจ้งเตือน</button><p class="ev-sub">การแจ้งเตือนจริงต้องใช้ Push จากฝั่ง Server (เฟสถัดไป)</p></div>'),
  notify: () => { if ('Notification' in window) Notification.requestPermission(); },
  'ai-ok': id => { openAdd('task'); D.title = decodeURIComponent(id); D.start = ymd(addDays(new Date(), 1)); renderForm(); },
  dtype: id => { D = { ...newDraft(id), title: D.title }; return FORM; },
  dunit: id => { D.unit = id; return FORM; }, dend: id => { D.endMode = id; return FORM; },
  dtrack: id => { D.track = id; D.target = id === 'timer' ? 30 : 8; D.unitName = id === 'timer' ? 'นาที' : 'แก้ว'; return FORM; },
  dday: id => { toggle(D.days, +id); return FORM; },
};
const NOREDRAW = Symbol('noredraw');
document.addEventListener('click', e => {
  /* คลิกนอกเมนู = ปิดเมนู */
  if (MENU_FOR && !e.target.closest('#menu') && !e.target.closest('[data-act="menu"]')) closeMenu();
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  const res = ACTIONS[act]?.(el.dataset.id, el);
  saveState();
  if (res === NOREDRAW) { renderToast(); renderLive(); return; }
  if (res === FORM) renderForm(); else render();
  /* ถ้าหน้าจับเวลาเปิดอยู่ ให้รีเฟรชปุ่มตามสถานะ */
  if (FOCUS_ID && ['tstart', 'tpause', 'tresume', 'tstop', 'tcancel'].includes(act)) { if (act === 'tstop') { closeFocus(); } else refreshFocus(); }
  renderLive();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (MENU_FOR) return closeMenu();
  if (FOCUS_ID) return closeFocus();
  if (sheetEl.dataset.open === 'true') closeSheet();
});
document.addEventListener('input', e => {
  if (!e.target.closest('#addForm') || !(e.target.name in D)) return;
  const had = !!D.time; D[e.target.name] = e.target.value;
  /* เวลาของรายการเพิ่งมี/หาย -> วาดเฉพาะส่วนเตือนใหม่ (ไม่แตะช่องที่กำลังพิมพ์) */
  if (e.target.name === 'time' && had !== !!D.time) {
    const blk = document.getElementById('remBlock'); if (!blk) return;
    const tmp = document.createElement('div'); tmp.innerHTML = remBlock(); blk.replaceWith(tmp.firstElementChild);
  }
});
/* ตรวจฟอร์มก่อนบันทึก: คืนข้อความผิดพลาดหรือ '' ถ้าผ่าน */
function validateDraft() {
  if (!D.title.trim()) return 'ใส่ชื่อก่อนนะ';
  if (!D.start) return 'เลือกวันที่ก่อนนะ';
  if (D.time && D.timeEnd && D.timeEnd <= D.time) return 'เวลาจบต้องหลังเวลาเริ่ม';
  if (D.type === 'class' && !D.days.length) return 'เลือกวันที่เรียนอย่างน้อย 1 วัน';
  if (D.endMode === 'date' && D.end && D.end < D.start) return 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม';
  if (D.type === 'habit' && D.track !== 'check' && !(+D.target >= 1)) return 'เป้าหมายต้องอย่างน้อย 1';
  if (D.unit !== 'none' && !(+D.every >= 1)) return 'ความถี่ต้องอย่างน้อย 1';
  return '';
}
document.addEventListener('submit', e => {
  e.preventDefault();
  const bad = validateDraft();
  if (bad) { const box = document.getElementById('formErr'); if (box) { box.textContent = bad; box.hidden = false; } return; }
  const next = buildItem();
  if (D.editId) {
    const idx = S.items.findIndex(x => x.id == D.editId), prev = S.items[idx];
    if (idx < 0) { closeSheet(); return toast('ไม่พบรายการนี้แล้ว'); }
    /* เก็บประวัติเดิมไว้เสมอ ยกเว้นวิธีติดตามเปลี่ยนความหมาย (เช่น ติ๊ก -> จับเวลา) จึงล้าง log เฉพาะกรณีนั้น */
    const sameMeaning = prev.track === next.track && (prev.track === 'check' || prev.track === 'none' || prev.unitName === next.unitName);
    next.log = sameMeaning ? prev.log : {}; next.skips = prev.skips || {};
    if (TIMER && TIMER.id == prev.id && next.track !== 'timer') { TIMER = null; saveTimer(); ensureTick(); }
    const snapshot = prev;
    S.items[idx] = next;
    pushUndo({ label: `แก้ไข “${next.title}” แล้ว`, restore: () => { const k = S.items.findIndex(x => x.id == next.id); if (k >= 0) S.items[k] = snapshot; } });
  } else {
    S.items.push(next);
    pushUndo({ label: `เพิ่ม “${next.title}” แล้ว`, restore: () => { S.items = S.items.filter(x => x.id != next.id); } });
  }
  saveState(); closeSheet(); render();
});
scrim.addEventListener('click', closeSheet);
document.getElementById('fab').addEventListener('click', () => openAdd(UI.tab === 'schedule' ? 'class' : 'habit'));
document.getElementById('nav').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { UI.tab = b.dataset.tab; render(); scrollTo(0, 0); } });

/* ---------- Render ---------- */
function render() {
  document.getElementById('app').innerHTML = UI.loading ? skeleton() : VIEWS[UI.tab]();
  document.getElementById('nav').innerHTML = TABS.map(([id, label, ic]) => `<li><button data-tab="${id}" ${UI.tab === id ? 'aria-current="page"' : ''}>${icon(ic)}${label}</button></li>`).join('');
  document.getElementById('fab').innerHTML = icon('plus');
  renderToast();
  renderLive();
  ensureTick();
}
render();
ensureTick();
setTimeout(() => { UI.loading = false; render(); ensureTick(); }, SKELETON_MS);
