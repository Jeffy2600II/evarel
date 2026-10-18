/* S4 next-pages ไบต์ N1: หน้าเดียวของแอป (SPA hash route #/today ฯลฯ) — containers ทั้งหมดตาม body ของ index.html เดิมเป๊ะ
   แอปทั้งเรื่องเรนเดอร์ด้วยส่วนประกอบ React ผ่าน EvarelComponents (ทุก route: วันนี้ รายการ ปฏิทิน สถิติ ผู้ช่วย AI ตั้งค่า)
   <AppBoot /> เป็น client component ที่บันเดิลเครื่องยนต์ (26 โมดูล + react runtime + route + boot) ตามลำดับเดิม */
import AppBoot from '../lib/boot';

export default function Page() {
  return (
    <>
      <div className="ev-app" id="app"></div>
      <button className="ev-live" id="live" data-show="false" aria-label="เปิดหน้าจับเวลา"></button>
      <nav className="ev-nav" aria-label="เมนูหลัก"><ul id="nav"></ul></nav>
      <div className="ev-toast" id="toast" role="status" aria-live="polite" data-open="false"></div>
      <div className="ev-scrim" id="scrim"></div>
      <aside className="ev-sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" hidden></aside>
      <section className="ev-page" id="page" role="dialog" aria-modal="true" hidden></section>
      <section className="ev-auth" id="auth" aria-live="polite" hidden></section>
      <div className="ev-dialog" id="dialog" role="alertdialog" aria-modal="true" hidden></div>
      <div className="ev-pop" id="pop" role="menu" hidden></div>
      <AppBoot />
    </>
  );
}
