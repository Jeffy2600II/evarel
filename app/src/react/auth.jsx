// หน้าล็อกอิน/สมัคร/ลืมรหัสผ่าน ของ Evarel เป็น React (S4 s4f-shell-layers-auth ไบต์ 4)
// mount ที่ #auth ผ่าน EvarelMount.mountAt — เนื้อใช้ template เดิม (AUTH_VIEWS/AUTH_SPLASH) ผ่าน dangerouslySetInnerHTML
// เพราะ auth มี 7 views ซับซ้อน (forms/SVG/เงื่อนไข) การแปลงเป็น JSX ทั้งหมดเสี่ยงพลาดและไม่คุ้ม — ใช้กลไก mount ของ React ครบ (createRoot/unmount) ส่วนเนื้อคง template เดิมการันตี parity ทุกไบต์
// อัปเกรดเป็น React ได้เพราะ: (1) renderAuthRoot เรียก mountAt เมื่อพร้อม (2) dynamic updates (paintCool/fieldErr/startCool) ทำงานบน DOM ของ React ได้เพราะ React ไม่ re-render กลาง auth flow (au-go เรียก renderAuthRoot ตรงๆ ไม่ผ่าน render())
import { takeAuthConsts } from '../../data/auth.tray.js';
const { h } = window.EvarelReact;
const W = () => window;

function AuthContent(p) {
  const sc = p.screen;
  const A = takeAuthConsts();
  const html = sc === 'loading' ? A.AUTH_SPLASH : (A.AUTH_VIEWS[sc] ? A.AUTH_VIEWS[sc]() : '');
  return h('div', { className: 'ev-auth-in', dangerouslySetInnerHTML: { __html: html } });
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.auth = (p) => window.EvarelReact.renderToStaticMarkup(h(AuthContent, p));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.auth = AuthContent;
