/* Path: app/web/js/boot.js | Purpose: ลงทะเบียน Service Worker + หน้าต่าง "มีอะไรใหม่" (What's New) ของแต่ละเวอร์ชัน
   เป้าหมายของ popup (Master สั่ง 22 ต.ค. 2026): บอกผู้ใช้อย่างเป็นทางการว่าเวอร์ชันนี้ปรับปรุง/เปลี่ยนแปลงอะไร
   แบบเดียวกับแพลตฟอร์มใหญ่ ไม่ใช่การแจ้งว่าระบบอัปเดตตัวเองสำเร็จ | ขึ้นหนึ่งครั้งต่อเลขเวอร์ชัน | ปุ่มเดียวคือปิด
   การอัปเดตตัวแอปเป็นเรื่องเงียบๆ ไม่เรียลไทม์: รุ่นใหม่เข้าเมื่อรีเฟรช/เปิดหน้าใหม่เท่านั้น (HTML network-first + ไฟล์ผูก ?v=<build>)
   หน้าที่เพิ่งโหลดสั่ง SW ที่รออยู่ให้รับช่วง (SKIP_WAITING) | เลขเวอร์ชันที่รันอยู่ = window.__EV_VERSION__ (ฝังใน HTML ตอน build) */
(function () {
  const SEEN_KEY = 'evarel.seenVersion';   /* เลขเวอร์ชันล่าสุดที่ผู้ใช้เห็นหน้าต่าง มีอะไรใหม่ แล้ว */
  const TYPES = { new: 'ใหม่', improve: 'ปรับปรุง', fix: 'แก้ไข' };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let showing = false;

  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* โหมดส่วนตัว = ข้าม */ } };

  /* เลขเวอร์ชันที่หน้านี้รันจริง = ค่าที่ฝังใน HTML ตอน build (ไม่ถาม SW: ระหว่างเปลี่ยนรุ่น SW เก่าอาจยังคุมอยู่และตอบรุ่นเก่า) */
  const runningVersion = () => (typeof window !== 'undefined' && window.__EV_VERSION__) || null;
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
  /* What's New: หัวข้อ + เลขเวอร์ชัน + รายการสิ่งที่เปลี่ยน แล้วปิดด้วยปุ่มเดียว (ไม่มีปุ่มอัปเดต/ไว้ทีหลัง) */
  function open(rel) {
    if (showing && !dialogOpen()) showing = false;
    if (showing || typeof openDialog !== 'function') return;
    showing = true;
    const ver = String(rel.version || '').replace(/-[a-z]+$/, '');   /* ผู้ใช้เห็นเลขรุ่นสาธารณะ ไม่เห็นช่อง -forge */
    const sub = `เวอร์ชัน ${esc(ver)}${rel.date ? ' · ' + esc(rel.date) : ''}`;
    openDialog(`<div class="ev-upd"><h3>มีอะไรใหม่</h3><p class="ev-sub">${sub}</p>${rel.title ? `<p class="ev-upd-title">${esc(rel.title)}</p>` : ''}<div class="ev-upd-body">${notesHtml(rel)}</div><div class="ev-dlg-actions"><button class="ev-btn-primary ev-upd-one" data-upd="ok">เริ่มใช้งาน</button></div></div>`);
    const root = document.getElementById('dialog') || document;
    root.addEventListener('click', function h(e) {
      const b = e.target.closest && e.target.closest('[data-upd]');
      if (!b) return;
      root.removeEventListener('click', h);
      showing = false;
      if (typeof closeTop === 'function') closeTop();
    });
  }
  /* เรียกครั้งเดียวตอนเปิดหน้า: ถ้าเลขเวอร์ชันที่รันอยู่ต่างจากที่ผู้ใช้เคยเห็น = แสดง มีอะไรใหม่ หนึ่งครั้ง
     (แก้แค่ไฟล์โดยไม่ขยับเลขเวอร์ชัน = ไม่ขึ้น เพราะไม่มีอะไรใหม่ให้บอกผู้ใช้) */
  async function check() {
    const mine = runningVersion();
    if (!mine) return;
    const seen = lsGet(SEEN_KEY);
    if (seen === null) { lsSet(SEEN_KEY, mine); return; }      /* ผู้ใช้ใหม่ครั้งแรก = ไม่ขึ้น (ไม่มีรุ่นก่อนให้เทียบ) */
    if (seen === mine) return;
    const rel = await latestRelease();
    lsSet(SEEN_KEY, mine);
    if (rel && rel.version === mine) open(rel);                /* โน้ตต้องเป็นของเวอร์ชันที่รันอยู่เท่านั้น กันขึ้นโน้ตของรุ่นอื่น */
  }
  window.EvarelUpdate = { check, latestRelease, runningVersion };  /* จุดต่อให้แอปมือถือ/ทดสอบเรียกใช้ */

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      /* รุ่นใหม่ที่ติดตั้งเสร็จและรออยู่ -> ให้รับช่วงเดี๋ยวนี้ (หน้านี้โหลดด้วยรุ่นใหม่แล้ว ไม่ทับอะไรที่ผู้ใช้ทำอยู่) */
      const take = w => { if (w) w.postMessage({ type: 'SKIP_WAITING' }); };
      take(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) take(reg.waiting); });
      });
    }).catch(err => console.warn('SW register fail', err));
    navigator.serviceWorker.ready.then(() => setTimeout(() => check(), 800));
  }
})();
