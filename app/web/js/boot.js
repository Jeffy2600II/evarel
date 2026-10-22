/* Path: app/web/js/boot.js | Purpose: ลงทะเบียน Service Worker + ระบบอัปเดตเว็บ (เช็คอัปเดต + popup เต็มหน้าต่าง + โน้ตรุ่น)
   หลักการ: build ที่กำลังรัน = VERSION ของ SW ที่คุมหน้านี้ | build ล่าสุด = release.json จากเครือข่าย (no-store)
   ต่างกัน = ขึ้นหน้าต่างอัปเดต | ผู้ใช้กด "อัปเดตเลย" = registration.update() แล้ว reload (SW ใหม่ skipWaiting อยู่แล้ว)
   ฐานสำหรับแอปมือถือ: ใช้ release.json ตัวเดียวกัน แต่ฝั่งแอปจะยึดตาม release ที่ปล่อย (ยังไม่ทำ) */
(function () {
  const SEEN_KEY = 'evarel.seenBuild';   /* build ที่ผู้ใช้เห็นโน้ตแล้ว */
  const SKIP_KEY = 'evarel.skipBuild';   /* build ที่ผู้ใช้กด "ไว้ทีหลัง" (เฉพาะ session นี้) */
  const CHECK_EVERY_MS = 30 * 60 * 1000;
  const TYPES = { new: 'ใหม่', improve: 'ปรับปรุง', fix: 'แก้ไข' };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let showing = false;

  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* โหมดส่วนตัว = ข้าม */ } };
  const ssGet = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ข้าม */ } };

  async function runningBuild() {
    const c = navigator.serviceWorker.controller;
    if (!c) return null;
    return new Promise(res => {
      const ch = new MessageChannel();
      const t = setTimeout(() => res(null), 1500);
      ch.port1.onmessage = e => { clearTimeout(t); res(e.data && e.data.build || null); };
      c.postMessage({ type: 'get-build' }, [ch.port2]);
    });
  }
  async function latestRelease() {
    try {
      const r = await fetch('release.json?_=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' });
      return r.ok ? await r.json() : null;
    } catch (e) { return null; }
  }
  function notesHtml(rel) {
    const groups = ['new', 'improve', 'fix'].map(t => {
      const items = (rel.notes || []).filter(n => n.type === t);
      return items.length ? `<div class="ev-upd-group"><b class="ev-upd-tag" data-t="${t}">${TYPES[t]}</b><ul>${items.map(n => `<li>${esc(n.text)}</li>`).join('')}</ul></div>` : '';
    }).join('');
    return groups || '<p class="ev-sub">ปรับปรุงทั่วไปและแก้ไขข้อผิดพลาด</p>';
  }
  const dialogOpen = () => { const d = document.getElementById('dialog'); return !!(d && d.dataset.open === 'true'); };
  function open(rel, mode) {
    if (showing && !dialogOpen()) showing = false;   /* ถูกปิดด้วยปุ่มย้อนกลับ/แตะพื้นหลัง = ปล่อยธง */
    if (showing || typeof openDialog !== 'function') return;
    showing = true;
    const isNew = mode === 'available';
    const head = isNew ? 'มีเวอร์ชันใหม่' : 'อัปเดตเรียบร้อยแล้ว';
    const sub = `เวอร์ชัน ${esc(rel.version || '')}${rel.date ? ' · ' + esc(rel.date) : ''}`;
    const actions = isNew
      ? '<button class="ev-btn-ghost" data-upd="later">ไว้ทีหลัง</button><button class="ev-btn-primary" data-upd="now">อัปเดตเลย</button>'
      : '<button class="ev-btn-primary ev-upd-one" data-upd="ok">เข้าใจแล้ว</button>';
    openDialog(`<div class="ev-upd"><h3>${head}</h3><p class="ev-sub">${sub}</p>${rel.title ? `<p class="ev-upd-title">${esc(rel.title)}</p>` : ''}<div class="ev-upd-body">${notesHtml(rel)}</div><div class="ev-dlg-actions">${actions}</div></div>`);
    const root = document.getElementById('dialog') || document;
    root.addEventListener('click', function h(e) {
      const b = e.target.closest && e.target.closest('[data-upd]');
      if (!b) return;
      root.removeEventListener('click', h);
      showing = false;
      const a = b.dataset.upd;
      if (a === 'now') applyUpdate(rel);
      else { if (a === 'later') ssSet(SKIP_KEY, rel.build); else lsSet(SEEN_KEY, rel.build); if (typeof closeTop === 'function') closeTop(); }
    });
  }
  async function applyUpdate(rel) {
    lsSet(SEEN_KEY, '');  /* ให้รุ่นใหม่แสดง "อัปเดตเรียบร้อยแล้ว" หลังโหลดซ้ำ */
    try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) { /* โหลดซ้ำต่อ */ }
    location.reload();
  }
  async function check(reason) {
    if (showing && !dialogOpen()) showing = false;
    if (showing || document.visibilityState === 'hidden') return;
    const [rel, mine] = await Promise.all([latestRelease(), runningBuild()]);
    if (!rel || !rel.build) return;
    const seen = lsGet(SEEN_KEY);
    if (mine && mine !== rel.build) {                       /* มีรุ่นใหม่กว่าที่กำลังรัน */
      if (ssGet(SKIP_KEY) === rel.build && reason !== 'start') return;
      open(rel, 'available'); return;
    }
    if (seen === null) { lsSet(SEEN_KEY, rel.build); return; }   /* ผู้ใช้ใหม่ครั้งแรก = ไม่ขึ้น popup */
    if (seen !== rel.build) { open(rel, 'updated'); lsSet(SEEN_KEY, rel.build); }   /* เพิ่งอัปเดตเสร็จ = แสดงโน้ตหนึ่งครั้ง */
  }
  window.EvarelUpdate = { check, latestRelease, runningBuild };  /* จุดต่อให้แอปมือถือ/ทดสอบเรียกใช้ */

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW register fail', err));
    navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'update-ready') check('sw'); });
    navigator.serviceWorker.addEventListener('controllerchange', () => setTimeout(() => check('sw'), 400));
    navigator.serviceWorker.ready.then(() => setTimeout(() => check('start'), 800));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check('visible'); });
    setInterval(() => check('timer'), CHECK_EVERY_MS);
  }
})();
