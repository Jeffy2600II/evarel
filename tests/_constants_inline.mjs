// ตัวช่วยของเทสต์ F6: คืนข้อความของ 01-core__constants.js ที่ "รวม" core/constants.js ไว้ในตัว (import ภายในถูกแทนด้วยเนื้อ core)
// เหตุผล: เทสต์โหลดไฟล์ m ผ่าน blob URL ซึ่ง import แบบพาธสัมพัทธ์ ./core/constants.js ไม่ได้ จึงรวมเป็นไฟล์เดียวที่ส่งออกชื่อเดียวกันเหมือนเดิม
import fs from 'fs';
export function constantsInlined(root = '.') {
  const m = fs.readFileSync(root + '/app/web/js/m/01-core__constants.js', 'utf8');
  const c = fs.readFileSync(root + '/app/web/js/m/core/constants.js', 'utf8');
  const imp = m.match(/^import \{[^}]*\} from ['"]\.\/core\/constants\.js['"];?\s*$/m);
  if (!imp) return m;                                   // ฐานเดิม (ไม่มี import) ใช้ตามเดิม
  const body = m.replace(imp[0], '').replace(/^export \{[^}]*\};?\s*$/m, '');   // ตัด import และ re-export ออก เหลือ Object.assign(window,...)
  const core = c.replace(/^"use strict";?/, '');
  return core + '\n' + body;                            // core (export const ...) + ตัวลงทะเบียน window
}
