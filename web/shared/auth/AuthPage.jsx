/**
 * หน้าล็อกอิน/สมัคร/ลืมรหัสผ่านของ Evarel (ชั้นที่ 1 ของกล่อง auth โซน shared เพราะ mount ที่ #auth ผ่าน EvarelMount.mountAt)
 * ลงทะเบียนทั้งฟังก์ชันหน้า (สตริง) และ component | ข้อมูล (AUTH_SPLASH, AUTH_VIEWS) มาจากถาด auth.tray.js ที่เดียว กล่องนี้ไม่แตะ window
 * ไม่แปลงเนื้อ 7 views เป็น JSX เพราะซับซ้อน (ฟอร์ม/SVG/เงื่อนไข) เสี่ยงพลาดและไม่คุ้ม ใช้ template เดิมเพื่อการันตีตรงทุกไบต์
 * h/Fragment บิลด์ฉีดให้ (scripts/build-react.mjs)
 */
import { takeAuthConsts } from './auth.tray.js';
import { authBody } from './parts/AuthBody.jsx';

export default function AuthPage(p) {
  const sc = p.screen;
  const A = takeAuthConsts();
  const html = sc === 'loading' ? A.AUTH_SPLASH : (A.AUTH_VIEWS[sc] ? A.AUTH_VIEWS[sc]() : '');
  return authBody(html);
}
