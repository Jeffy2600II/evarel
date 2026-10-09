/* Path: app-v7/js/boot.js | Purpose: ลงทะเบียน Service Worker + แจ้งเมื่อมีฉบับใหม่ (v7 ไม่มีส่วนนี้)
   ใช้ toast() ของ v7 ที่เป็น global — ต้องโหลดหลัง app.js */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW register fail', err));
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.type === 'update-ready' && typeof toast === 'function') toast('มีเวอร์ชันใหม่ ปิดแล้วเปิดแอปอีกครั้งเพื่อใช้งาน');
  });
}
