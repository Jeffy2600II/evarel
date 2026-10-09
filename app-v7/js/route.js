/* Path: app-v7/js/route.js | Purpose: ชั้น hash route บางๆ ครอบ v7 โดยไม่แก้ตรรกะ v7
   Routes: #/today #/all #/schedule #/stats (แท็บ) · #/ai #/settings (หน้าเต็มของ v7 = เลเยอร์)
   Rule: เลเยอร์ของ v7 (sheet/dialog/page) ผลัก history เอง (state {ev:n}) → route ไม่แตะ state นั้น
   ต้องโหลดหลัง app.js (ใช้ UI, TABS, render, LAYERS, ACTIONS ที่เป็น global ของ v7) */
(() => {
  const TAB_IDS = TABS.map(t => t[0]);
  const NAMES = { today: 'วันนี้', all: 'รายการ', schedule: 'ตารางเรียน', stats: 'สถิติ', ai: 'ผู้ช่วย AI', settings: 'ตั้งค่า' };
  const routeOf = () => { const m = /^#\/(\w+)/.exec(location.hash); return m && (TAB_IDS.includes(m[1]) || m[1] === 'ai' || m[1] === 'settings') ? m[1] : null; };
  const setTitle = r => { document.title = 'Evarel · ' + (NAMES[r] || NAMES.today); };
  const pageOpen = () => LAYERS.some(l => l.el === page);

  /* hash → หน้าจอ (เรียกเมื่อโหลดครั้งแรก และเมื่อ Back/Forward เปลี่ยน hash ข้ามแท็บ) */
  function apply() {
    const r = routeOf();
    if (!r) { history.replaceState(history.state, '', '#/' + UI.tab); setTitle(UI.tab); return; }
    if (TAB_IDS.includes(r)) {
      if (UI.tab !== r) { UI.tab = r; UI.animate = true; render(); scrollTo(0, 0); }
      setTitle(r);
    }
  }

  /* แท็บเปลี่ยนด้วยการกดแถบล่าง → เขียน hash ใหม่เป็น history entry (ให้ Back กลับแท็บก่อนหน้าได้) */
  $('nav').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    const t = b.dataset.tab;
    if (location.hash !== '#/' + t && TAB_IDS.includes(t)) history.pushState({ evr: t }, '', '#/' + t);
    setTitle(t);
  });

  addEventListener('hashchange', apply);
  addEventListener('popstate', () => { if (!LAYERS.length) apply(); });
  addEventListener('load', () => {
    const r = routeOf();
    apply();
    /* ลิงก์ลึกไปหน้าเต็ม: เปิดผ่านกลไก v7 เอง แล้วคืน hash ให้ตรงแท็บ */
    if (r === 'ai' || r === 'settings') { history.replaceState(history.state, '', '#/' + UI.tab); setTimeout(() => ACTIONS[r]?.(), 0); }
  });
})();
