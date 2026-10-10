/* Path: app-v12/js/http-adapter.js | Purpose: Repo adapter ที่คุยกับ Worker (/api) ด้วย Bearer JWT
   สัญญาเดียวกับ LocalAdapter: load():{items} · apply({upserts,removes}) โยน error เมื่อบันทึกไม่สำเร็จ
   กฎ: ห้ามทำข้อมูลเครื่องหาย — ไม่แตะ localStorage ที่นี่เลย (การนำเข้าอยู่ใน auth.js และเก็บของเดิมไว้เป็นสำรอง) */
(() => {
  const makeHttpAdapter = (base, getToken, onUnauthorized) => {
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
      async load() { return { items: (await (await call('/items')).json()).items }; },
      async apply({ upserts, removes }) {
        /* ทีละรายการตามลำดับ: อ่านง่าย ตรวจ error ชัด และไม่ยิงขนานเกินโควตา subrequest ของ Worker ฟรี */
        for (const it of upserts) await call('/items/' + it.id, { method: 'PUT', body: JSON.stringify(it) });
        for (const id of removes) await call('/items/' + id, { method: 'DELETE' });
      },
    };
  };
  window.EvarelHttpAdapter = makeHttpAdapter;
})();
