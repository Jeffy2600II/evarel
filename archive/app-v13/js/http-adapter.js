/* Path: app-v12/js/http-adapter.js | Purpose: Repo adapter ที่คุยกับ Worker (/api) ด้วย Bearer JWT
   สัญญาเดียวกับ LocalAdapter: load():{items} · apply({upserts,removes}) โยน error เมื่อบันทึกไม่สำเร็จ
   กฎ: ห้ามทำข้อมูลเครื่องหาย — ไม่แตะ localStorage ที่นี่เลย (การนำเข้าอยู่ใน auth.js และเก็บของเดิมไว้เป็นสำรอง) */
(() => {
  const makeHttpAdapter = (base, getToken, onUnauthorized, getUserId) => {
    const call = async (path, opt = {}) => {
      const r = await fetch(base + path, {
        ...opt,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await getToken(), ...(opt.headers || {}) },
      });
      if (r.status === 401) { onUnauthorized && onUnauthorized(); throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); }
      if (!r.ok) throw new Error(`${opt.method || 'GET'} ${path} ${r.status}`);
      return r;
    };
    return {
      async load() {
        /* แคชอ่านอย่างเดียวต่อผู้ใช้: ออนไลน์ -> เก็บสำเนาล่าสุด; ออฟไลน์ (เครือข่ายล้มเหลว) -> ใช้สำเนานั้น
           ไม่ใช้แคชเมื่อ 401 (เซสชันหมดอายุ) หรือเมื่อเซิร์ฟเวอร์ตอบ error — และ apply() ไม่ใช้แคชเลย (ห้ามเขียนทับของจริง) */
        const key = 'evarel-cache-v1:' + (getUserId ? getUserId() : '');
        try {
          const items = (await (await call('/items')).json()).items;
          try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), items })); } catch (e) { console.warn('cache save', e); }
          return { items };
        } catch (err) {
          const offline = err instanceof TypeError || navigator.onLine === false; /* fetch ล้มด้วย TypeError = ไม่มีเครือข่าย */
          if (offline) {
            try { const c = JSON.parse(localStorage.getItem(key)); if (c && Array.isArray(c.items)) { window.EvarelOffline = { at: c.at }; return { items: c.items }; } } catch (e) { console.warn('cache read', e); }
          }
          throw err;
        }
      },
      async apply({ upserts, removes }) {
        /* ทีละรายการตามลำดับ: อ่านง่าย ตรวจ error ชัด และไม่ยิงขนานเกินโควตา subrequest ของ Worker ฟรี */
        for (const it of upserts) await call('/items/' + it.id, { method: 'PUT', body: JSON.stringify(it) });
        for (const id of removes) await call('/items/' + id, { method: 'DELETE' });
      },
    };
  };
  window.EvarelHttpAdapter = makeHttpAdapter;
})();
