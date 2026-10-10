/* Path: app-v12/js/auth.js | Purpose: ล็อกอิน + เก็บเซสชัน + นำเข้าข้อมูลเดิมครั้งเดียว + ปุ่มออกจากระบบ
   Flow: เปิดแอป -> มีเซสชันที่ใช้ได้ ? ใช้เลย : แสดงหน้าล็อกอิน -> ตั้ง Repo เป็น HttpAdapter -> (ถ้าเซิร์ฟเวอร์ว่าง + เครื่องมีข้อมูล) ถามนำเข้า
   ความปลอดภัย: ไม่มีกุญแจ Supabase ในเบราว์เซอร์ — ล็อกอินผ่าน Worker; เก็บ token ใน localStorage (แอปส่วนตัวบนเครื่องเดียว) */
(() => {
  const API = (window.EVAREL_API || 'https://evarel-api-test.nontakorn2600.workers.dev') + '/api';
  const SESS_KEY = 'evarel-session-v1';
  const IMPORTED_KEY = 'evarel-imported-v1';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const loadSess = () => { try { return JSON.parse(localStorage.getItem(SESS_KEY)); } catch { return null; } };
  const saveSess = s => localStorage.setItem(SESS_KEY, JSON.stringify(s));
  const clearSess = () => localStorage.removeItem(SESS_KEY);
  const now = () => Math.floor(Date.now() / 1000);

  async function post(path, body) {
    const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'ผิดพลาด'); e.status = r.status; throw e; }
    return j;
  }

  /* คืน access_token ที่ยังไม่หมดอายุ (รีเฟรชให้อัตโนมัติเมื่อเหลือ < 60 วินาที) */
  let refreshing = null;
  async function getToken() {
    let s = loadSess();
    if (!s) throw new Error('ยังไม่ได้เข้าสู่ระบบ');
    if (s.expires_at - now() > 60) return s.access_token;
    refreshing = refreshing || post('/auth/refresh', { refresh_token: s.refresh_token })
      .then(n => { saveSess(n); return n; })
      .catch(e => { if (e.status === 401 || e.status === 400) clearSess(); throw e; })
      .finally(() => { refreshing = null; });
    return (await refreshing).access_token;
  }

  /* ---------- หน้าล็อกอิน (ใช้คลาส/โทเค็นของแอป) ---------- */
  function showLogin(message) {
    return new Promise(resolve => {
      const el = document.createElement('div');
      el.id = 'ev-login';
      el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;background:var(--c-bg)';
      el.innerHTML = `
        <form class="ev-card" style="width:min(100%,380px);display:grid;gap:16px" novalidate>
          <div><h1 style="margin:0 0 4px;font:700 24px var(--font)">Evarel</h1>
            <p style="margin:0;color:var(--c-muted);font:400 14px var(--font)">เข้าสู่ระบบเพื่อดูรายการของคุณ</p></div>
          <label style="display:grid;gap:6px;font:500 14px var(--font)">อีเมล
            <input name="email" type="email" autocomplete="username" inputmode="email" required
              style="height:48px;border-radius:14px;border:1px solid var(--c-line);background:var(--c-fill);color:var(--c-text);padding:0 14px;font:400 16px var(--font)"></label>
          <label style="display:grid;gap:6px;font:500 14px var(--font)">รหัสผ่าน
            <input name="password" type="password" autocomplete="current-password" required
              style="height:48px;border-radius:14px;border:1px solid var(--c-line);background:var(--c-fill);color:var(--c-text);padding:0 14px;font:400 16px var(--font)"></label>
          <p id="ev-login-err" role="alert" style="margin:0;min-height:20px;color:var(--c-danger);font:500 14px var(--font)">${message ? esc(message) : ''}</p>
          <button class="ev-btn-primary ev-btn-block" type="submit">เข้าสู่ระบบ</button>
        </form>`;
      document.body.appendChild(el);
      const form = el.querySelector('form'), err = el.querySelector('#ev-login-err'), btn = form.querySelector('button');
      form.email.focus();
      form.addEventListener('submit', async e => {
        e.preventDefault(); err.textContent = '';
        if (!form.email.value || !form.password.value) { err.textContent = 'กรอกอีเมลและรหัสผ่านให้ครบ'; return; }
        btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ…';
        try {
          const s = await post('/auth/login', { email: form.email.value, password: form.password.value });
          saveSess(s); el.remove(); resolve(s);
        } catch (ex) {
          err.textContent = ex.status === 401 ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง';
          btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
        }
      });
    });
  }

  /* ---------- นำเข้าข้อมูลเดิมจาก localStorage ครั้งเดียว ---------- */
  function readLocal() {
    try {
      const r = localStorage.getItem(window.EvarelRepo.STORE_KEY);
      const j = r ? JSON.parse(r) : null;
      return j && Array.isArray(j.items) ? j.items : [];
    } catch { return []; }
  }
  const confirmImport = n => new Promise(resolve => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;background:var(--c-scrim)';
    el.innerHTML = `<div class="ev-card" style="width:min(100%,380px);display:grid;gap:16px" role="alertdialog" aria-modal="true">
      <h2 style="margin:0;font:700 20px var(--font)">นำเข้าข้อมูลจากเครื่องนี้?</h2>
      <p style="margin:0;color:var(--c-muted);font:400 15px var(--font)">พบ ${n} รายการในเครื่อง และบัญชีนี้ยังว่างอยู่ จะนำเข้าไปเก็บบนเซิร์ฟเวอร์ ข้อมูลในเครื่องจะยังอยู่ ไม่ถูกลบ</p>
      <button class="ev-btn-primary ev-btn-block" data-yes>นำเข้า ${n} รายการ</button>
      <button class="ev-btn-ghost ev-btn-block" data-no>เริ่มจากบัญชีว่าง</button></div>`;
    document.body.appendChild(el);
    el.querySelector('[data-yes]').onclick = () => { el.remove(); resolve(true); };
    el.querySelector('[data-no]').onclick = () => { el.remove(); resolve(false); };
  });

  async function maybeImport(adapter, userId) {
    const flag = IMPORTED_KEY + ':' + userId;
    if (localStorage.getItem(flag)) return;
    const local = readLocal();
    const remote = (await adapter.load()).items;
    if (remote.length > 0 || local.length === 0) { localStorage.setItem(flag, 'skip'); return; }
    if (!(await confirmImport(local.length))) { localStorage.setItem(flag, 'declined'); return; }
    await adapter.apply({ upserts: local, removes: [] });
    /* ตรวจก่อนยืนยัน: จำนวนที่อ่านกลับมาต้องเท่ากับที่ส่งไป ไม่งั้นไม่ตั้งธง (จะลองใหม่รอบหน้า) */
    const back = (await adapter.load()).items;
    if (back.length !== local.length) throw new Error(`นำเข้าไม่ครบ: ส่ง ${local.length} แต่เซิร์ฟเวอร์มี ${back.length}`);
    localStorage.setItem(flag, 'imported:' + local.length);
    if (typeof toast === 'function') toast(`นำเข้า ${local.length} รายการเรียบร้อย`);
  }

  /* ---------- ประตูก่อนบูต: app.js เรียก window.EvarelGate() ก่อน Repo.load() ---------- */
  window.EvarelGate = async () => {
    let s = loadSess();
    if (s) {
      try { await getToken(); s = loadSess(); }
      catch (e) {
        /* รีเฟรชล้มเหลว: ถ้าเพราะเครือข่าย (TypeError ไม่ใช่ 401/400) คงเซสชันไว้ ให้เปิดแอปจากแคชได้
           ถ้าเซิร์ฟเวอร์ปฏิเสธจริง (getToken ล้าง session แล้ว) loadSess() จะคืน null -> ไปหน้าล็อกอิน */
        s = loadSess();
      }
    }
    if (!s) s = await showLogin();
    const adapter = window.EvarelHttpAdapter(API, getToken, () => { clearSess(); showLogin('เซสชันหมดอายุ').then(() => location.reload()); }, () => s.user.id);
    window.EvarelRepo.use(adapter);
    await maybeImport(adapter, s.user.id);
  };
  window.EvarelAuth = { logout() { clearSess(); location.reload(); }, user: () => (loadSess() || {}).user };
})();
