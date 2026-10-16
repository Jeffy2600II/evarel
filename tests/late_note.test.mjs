/* ตรวจฟังก์ชัน lateNote ของ service worker: บอกผู้ใช้ว่าแจ้งเตือนมาช้ากว่าเวลาที่ตั้งไว้กี่นาที
   ค่าที่คาดคำนวณมือจากตัวอย่างจริง (ไม่ใช้สูตรเดียวกับโค้ด) | เวลาไทย = UTC+7 คงที่ */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '../app/web/sw.js'), 'utf8');
const m = src.match(/\/\* LATE_NOTE_BEGIN \*\/([\s\S]*?)\/\* LATE_NOTE_END \*\//);
let pass = 0, fail = 0; const t = (n, fn) => { try { fn(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + ' :: ' + e.message); } };
const eq = (a, b) => { if (a !== b) throw new Error(`ได้ ${JSON.stringify(a)} คาด ${JSON.stringify(b)}`); };
t('S0 sw.js มีบล็อก lateNote ที่ตัดออกมาทดสอบได้', () => { if (!m) throw new Error('ไม่พบ LATE_NOTE_BEGIN/END'); });
if (!m) { console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(1); }
const ctx = {}; vm.createContext(ctx); vm.runInContext(m[1] + ';this.lateNote=lateNote;', ctx);
const ms = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h - 7, mi);            // เวลาไทย -> epoch ms (ลบ 7 ชม.)
const abs = (y, mo, d, h, mi) => Math.floor((ms(y, mo, d, h, mi) + 7 * 3600e3) / 60000); // atAbs ที่เซิร์ฟเวอร์ส่งมา
const at = abs(2026, 10, 16, 7, 30);                                           // ควรเตือน 07:30 ไทย
t('S1 มาตรงเวลา (0 นาที) = ไม่ต่อท้ายอะไร', () => eq(ctx.lateNote(at, ms(2026, 10, 16, 7, 30)), ''));
t('S2 มาช้า 3 นาที ยังอยู่ในหน้าต่างปกติ = ไม่ต่อท้าย (ไม่รบกวน)', () => eq(ctx.lateNote(at, ms(2026, 10, 16, 7, 33)), ''));
t('S3 มาช้า 20 นาที = บอกเป็นนาที', () => eq(ctx.lateNote(at, ms(2026, 10, 16, 7, 50)), ' (เลยเวลามา 20 นาที)'));
t('S4 มาช้า 90 นาที = บอกเป็นชั่วโมงกับนาที', () => eq(ctx.lateNote(at, ms(2026, 10, 16, 9, 0)), ' (เลยเวลามา 1 ชม. 30 นาที)'));
t('S5 มาช้า 3 ชั่วโมงพอดี = ไม่มีนาทีเศษ', () => eq(ctx.lateNote(at, ms(2026, 10, 16, 10, 30)), ' (เลยเวลามา 3 ชม.)'));
t('S6 ข้ามวัน (ควรเตือน 23:50 มาถึง 00:20 วันถัดไป) = 30 นาที ไม่ใช่ติดลบ', () => eq(ctx.lateNote(abs(2026, 10, 16, 23, 50), ms(2026, 10, 17, 0, 20)), ' (เลยเวลามา 30 นาที)'));
t('S7 นาฬิกาเครื่องเดินเร็วกว่าเวลาเตือน (ค่าติดลบ) = ไม่ต่อท้าย', () => eq(ctx.lateNote(at, ms(2026, 10, 16, 7, 0)), ''));
t('S8 ไม่มี atAbs (push เก่าจากเซิร์ฟเวอร์รุ่นก่อน) = ไม่ต่อท้าย ไม่พัง', () => { eq(ctx.lateNote(undefined, Date.now()), ''); eq(ctx.lateNote(null, Date.now()), ''); eq(ctx.lateNote('x', Date.now()), ''); });
t('S9 ช้าเกิน 24 ชม. = ไม่ต่อท้ายตัวเลขแปลกๆ แต่บอกว่าเมื่อวานหรือก่อนหน้า', () => { const r = ctx.lateNote(at, ms(2026, 10, 18, 7, 30)); if (!/เลยเวลา/.test(r)) throw new Error(JSON.stringify(r)); if (/\d{4,} นาที/.test(r)) throw new Error('ตัวเลขนาทีใหญ่เกินอ่านไม่รู้เรื่อง: ' + r); });
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);
