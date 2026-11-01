/* S4 next-pages ไบต์ N1: หน้าเดียวของแอป (SPA hash route #/today ฯลฯ) — containers ทั้งหมดตาม body ของ index.html เดิมเป๊ะ
   แอปทั้งเรื่องเรนเดอร์ด้วยส่วนประกอบ React ผ่าน EvarelComponents (ทุก route: วันนี้ รายการ ปฏิทิน สถิติ ผู้ช่วย AI ตั้งค่า)
   <AppBoot /> เป็น client component ที่บันเดิลเครื่องยนต์ (26 โมดูล + react runtime + route + boot) ตามลำดับเดิม
   + สแปลชบูต #ev-boot และสคริปต์เฟรมแรก: จับ token ที่กลับมาจาก Google + โชว์สแปลชทันที (กันหน้าขาว) — เนื้อหาตาม classic/index.html เป๊ะ */
import AppBoot from '../lib/boot';

/* สคริปต์เดียวกับ web/classic/index.html (แก้ที่ไหนแก้อีกที่ด้วย): จอด (park) token OAuth จาก hash กันหาย + โชว์สแปลชทันทีเมื่อจะเข้าสู่ระบบอัตโนมัติ
   ต้องอยู่ "หลัง" markup ของ #ev-boot (หา element ตัวเองด้วย getElementById) และ "ก่อน" โมดูลเครื่องยนต์ซึ่ง AppBoot โหลดแบบ dynamic import */
const EV_BOOT_JS = `(function () {
  var PARK = 'evarel-oauth-park', OERR = 'evarel-oauth-error', back = false;
  try {
    var h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('error')) {
      try { sessionStorage.setItem(OERR, h.get('error_description') || h.get('error') || 'oauth'); } catch (e) {}
      history.replaceState(null, '', location.pathname + location.search);
    } else if (h.get('access_token')) {
      var p = {}; h.forEach(function (v, k) { p[k] = v; });
      try { localStorage.setItem(PARK, JSON.stringify(p)); } catch (e) {}
      history.replaceState(null, '', location.pathname + location.search);
      back = true;
    }
    var parked = false; try { parked = !!localStorage.getItem(PARK); } catch (e) {}
    var sess = false; try { sess = !!localStorage.getItem('evarel-session-v2'); } catch (e) {}
    if (back || parked || sess) {
      var b = document.getElementById('ev-boot');
      if (b) {
        if (back || parked) { var n = b.querySelector('.ev-splash-note'); if (n) n.textContent = 'กำลังเข้าสู่ระบบด้วย Google…'; }
        b.hidden = false;
        requestAnimationFrame(function () { b.dataset.on = '1'; });
      }
    }
  } catch (e) { /* อะไรก็ตามล้มเหลว ห้ามกระทบการบูตเดิม */ }
  window.evBootHide = function () { try { var x = document.getElementById('ev-boot'); if (x) x.dataset.on = ''; } catch (e) {} };
  /* กันค้างสุดขั้ว: 15 วิ ไม่ว่าอะไรจะเกิดขึ้นก็ปลดสแปลชออก */
  setTimeout(function () { window.evBootHide(); }, 15000);
})();`;

export default function Page() {
  return (
    <>
      <div id="ev-boot" hidden><div className="ev-splash">
        <svg className="mark" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="24" cy="24" r="17" /><path d="M16.5 24.5l5.5 5.5 10-11.5" /></svg>
        <b style={{ fontSize: 28, letterSpacing: -1 }}>Evarel</b>
        <span className="ev-spin ev-spin-splash" aria-hidden="true"></span>
        <span className="ev-splash-note" role="status">กำลังโหลด…</span>
      </div></div>
      <script dangerouslySetInnerHTML={{ __html: EV_BOOT_JS }} />
      <div className="ev-app" id="app"></div>
      <button className="ev-live" id="live" data-show="false" aria-label="เปิดหน้าจับเวลา"></button>
      <nav className="ev-nav" aria-label="เมนูหลัก"><ul id="nav"></ul></nav>
      <div className="ev-toast" id="toast" role="status" aria-live="polite" data-open="false"></div>
      <div className="ev-scrim" id="scrim"></div>
      <div className="ev-sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" hidden></div>
      <section className="ev-page" id="page" role="dialog" aria-modal="true" hidden></section>
      <section className="ev-auth" id="auth" aria-live="polite" hidden></section>
      <div className="ev-dialog" id="dialog" role="alertdialog" aria-modal="true" hidden></div>
      <div className="ev-pop" id="pop" role="menu" hidden></div>
      <AppBoot />
    </>
  );
}
