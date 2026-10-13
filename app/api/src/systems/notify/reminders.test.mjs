// เทสต์ reminders.ts: รอยต่อ (seam) = dueReminders(items, nowStr, skipMap?) ฟังก์ชันบริสุทธิ์
// nowStr = 'YYYY-MM-DD HH:MM' เวลาไทย | ค่าคาดหวังทุกค่าเป็นตัวเลข/ข้อความที่คำนวณมือจากสเปก ไม่คำนวณซ้ำด้วยตรรกะเดียวกับโค้ด
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
execSync(`/tmp/evarel-deploy/node_modules/.bin/esbuild ${path.join(here, 'reminders.ts')} --bundle --format=esm --outfile=/tmp/notify-rem-bundle.mjs --log-level=error`);
const M = await import(pathToFileURL('/tmp/notify-rem-bundle.mjs').href + '?v=' + Date.now());
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' :: ' + e.message); } };
const eq = (a, b, m = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(m + ' ได้ ' + JSON.stringify(a) + ' ควรเป็น ' + JSON.stringify(b)); };
const day = (o = {}) => ({ id: 1, type: 'task', title: 'ส่งงาน', time: '09:00', start: '2026-10-14', end: '', repeat: { unit: 'none', every: 1, days: [] }, skip: {}, rem: [{ k: 'before', m: 0 }], ...o });
const keys = (r) => r.map((x) => x.key);

t('R1 ตรงเวลา: 09:00 ตอน 09:00 -> เตือน 1 รายการ', () => eq(keys(M.dueReminders([day()], '2026-10-14 09:00')), ['1|2026-10-14|before:0']));
t('R2 ก่อน 30 นาที: เตือนตอน 08:30', () => eq(keys(M.dueReminders([day({ rem: [{ k: 'before', m: 30 }] })], '2026-10-14 08:30')), ['1|2026-10-14|before:30']));
t('R3 ยังไม่ถึงเวลา: 08:29 ไม่เตือนก่อน 30 นาที', () => eq(M.dueReminders([day({ rem: [{ k: 'before', m: 30 }] })], '2026-10-14 08:29'), []));
t('R4 หน้าต่าง 5 นาที: cron มาช้า 4 นาที (09:04) ยังเตือน', () => eq(keys(M.dueReminders([day()], '2026-10-14 09:04')).length, 1));
t('R5 เลยหน้าต่าง: 09:06 ไม่เตือนแล้ว (ไม่ส่งของเก่าเกิน)', () => eq(M.dueReminders([day()], '2026-10-14 09:06'), []));
t('R6 ก่อน 1 วัน ข้ามเที่ยงคืน: รายการ 14 ต.ค. 09:00 เตือน 13 ต.ค. 09:00 ด้วย key ของวันที่รายการเกิด', () => eq(keys(M.dueReminders([day({ rem: [{ k: 'before', m: 1440 }] })], '2026-10-13 09:00')), ['1|2026-10-14|before:1440']));
t('R7 รายการ 00:30 ก่อน 90 นาที: เตือนเมื่อวาน 23:00 key เป็นวันที่รายการเกิด', () => eq(keys(M.dueReminders([day({ time: '00:30', rem: [{ k: 'before', m: 90 }] })], '2026-10-13 23:00')), ['1|2026-10-14|before:90']));
t('R8 at: เวลาที่ตั้งเอง 07:15 ในวันที่รายการเกิด', () => eq(keys(M.dueReminders([day({ rem: [{ k: 'at', t: '07:15' }] })], '2026-10-14 07:15')), ['1|2026-10-14|at:07:15']));
t('R9 รายการไม่มีเวลา: before ไม่ส่ง (ปลอดภัยกว่าส่งผิดเวลา)', () => eq(M.dueReminders([day({ time: '' })], '2026-10-14 09:00'), []));
t('R10 รายการไม่มีเวลา: at ยังส่ง', () => eq(keys(M.dueReminders([day({ time: '', rem: [{ k: 'at', t: '08:00' }] })], '2026-10-14 08:00')), ['1|2026-10-14|at:08:00']));
t('R11 ไม่ใช่วันที่รายการเกิด (ซ้ำทุกสัปดาห์จันทร์ แต่วันนี้อังคาร) ไม่เตือน', () => eq(M.dueReminders([day({ start: '2026-10-12', repeat: { unit: 'week', every: 1, days: [1] } })], '2026-10-14 09:00'), []));
t('R12 ข้ามวัน (skip) ไม่เตือน', () => eq(M.dueReminders([day({ skip: { '2026-10-14': true } })], '2026-10-14 09:00'), []));
t('R13 หลายเตือนในรายการเดียว: key ไม่ซ้ำกัน', () => { const r = M.dueReminders([day({ rem: [{ k: 'before', m: 0 }, { k: 'at', t: '09:00' }] })], '2026-10-14 09:00'); eq(r.length, 2); eq(new Set(keys(r)).size, 2); });
t('R14 เดือน: วันที่ 31 ในเดือนที่ไม่มี 31 ไม่เตือน (ตรง occursOn ของแอป)', () => eq(M.dueReminders([day({ start: '2026-08-31', repeat: { unit: 'month', every: 1, days: [] } })], '2026-09-30 09:00'), []));
t('R15 ข้อมูลพัง: rem ไม่ใช่ array / time รูปแบบผิด ไม่ throw และไม่เตือน', () => { eq(M.dueReminders([day({ rem: null })], '2026-10-14 09:00'), []); eq(M.dueReminders([day({ time: '9:7x' })], '2026-10-14 09:00'), []); });
t('R16 ข้ามปี: รายการ 1 ม.ค. 00:10 ก่อน 1 วัน เตือน 31 ธ.ค. 00:10', () => eq(keys(M.dueReminders([day({ start: '2027-01-01', time: '00:10', rem: [{ k: 'before', m: 1440 }] })], '2026-12-31 00:10')), ['1|2027-01-01|before:1440']));
t('R17 ขอบหน้าต่าง: +4 นาทียังเตือน, +5 นาทีพอดีไม่เตือน (หน้าต่างกว้าง 5 ไม่ใช่ 6)', () => { eq(M.dueReminders([day()], '2026-10-14 09:04').length, 1, '+4'); eq(M.dueReminders([day()], '2026-10-14 09:05').length, 0, '+5'); });
t('R18 รายการไม่มีเวลา before: ไม่ส่งแม้ตอนเที่ยงคืนของวันนั้น (กันถอยไปใช้ 00:00)', () => { const it = day({ time: '', rem: [{ k: 'before', m: 0 }] }); eq(M.dueReminders([it], '2026-10-14 00:00'), [], '00:00'); eq(M.dueReminders([day({ time: '', rem: [{ k: 'before', m: 60 }] })], '2026-10-13 23:00'), [], '23:00 ก่อนเที่ยงคืน'); });
t('R19 ค่า m ผิดรูป (ติดลบ ทศนิยม ข้อความ) ไม่เตือนและไม่ throw', () => { for (const m of [-5, 1.5, '30', NaN, null]) eq(M.dueReminders([day({ rem: [{ k: 'before', m }] })], '2026-10-14 09:00'), [], String(m)); });
t('R20 ผู้ใช้เปลี่ยนเวลารายการแล้ว: เวลาเก่าไม่เตือน เวลาใหม่เตือน', () => { eq(M.dueReminders([day({ time: '10:30' })], '2026-10-14 09:00'), [], 'เวลาเก่า'); eq(M.dueReminders([day({ time: '10:30' })], '2026-10-14 10:30').length, 1, 'เวลาใหม่'); });
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);
