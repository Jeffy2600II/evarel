/**
 * ถาดข้อมูลของหน้าผู้ช่วย AI (ai) F3.3-g10
 * ส่วนที่ 1 (ถอด window จริง): import จาก core/ ตรง ๆ  TYPES fmtDate  (พิสูจน์แล้วว่าตรงกับสำเนาชั้น m: กลุ่ม g3/g7/g9)
 * ส่วนที่ 2 (ย้ายจุดอ่านเข้าถาด ยังไม่ใช่การถอด window): ครอบสำเนาของชั้น m ตัวเดียว ไม่คัดลอกโค้ด
 *   core/ ไม่มีชื่อเหล่านี้เลย (SUGG AI_TOOL_LABEL isMemTool mdToHtml icon) และ mdToHtml มีแคช MD_CACHE ย้ายไม่ได้โดยไม่เสี่ยง
 * ส่วนที่ 3 สถานะสดและตัวช่วยที่เดิมอ่านแบบมี guard (profileOf whenText AI): คง guard เดิม ไม่เข้มกว่าเดิม
 *   เดิม w.profileOf ? w.profileOf() : '' | w.AI && w.AI.notice | w.whenText ? w.whenText(x) : ''  ถาดจึงรับ undefined ได้และคืน undefined
 * ไฟล์นี้เป็นที่เดียวที่อ่านจาก window (BOX-05) | อ่านตอนเรียก ไม่ใช่ตอน import | AI เป็นสถานะสด ห้ามแคช
 */
import { tray, T } from '../shared/tray.js';
import { fmtDate } from '../src/core/dates';
import { TYPES } from '../src/core/schedule';

const fromCore = tray('ai', { fmtDate: T.func, TYPES: T.any });
const required = tray('ai', {
  SUGG: T.arrayOf(T.string), AI_TOOL_LABEL: T.any, isMemTool: T.func, mdToHtml: T.func, icon: T.func,
});

/** อ่านสดทุกครั้งที่เรียก: ส่วนที่เดิมมี guard (profileOf whenText AI) ผ่านเป็นค่าตรง ๆ ไม่บังคับรูป เพื่อคงพฤติกรรมเดิมเมื่อชั้น m ยังไม่พร้อม */
export function takeAi(src = (typeof window !== 'undefined' ? window : {})) {
  const a = fromCore.take({ fmtDate, TYPES });
  const b = required.take({ SUGG: src.SUGG, AI_TOOL_LABEL: src.AI_TOOL_LABEL, isMemTool: src.isMemTool, mdToHtml: src.mdToHtml, icon: src.icon });
  return Object.assign({}, a, b, { profileOf: src.profileOf, whenText: src.whenText, AI: src.AI });
}
