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
/* key จริง = id|วันที่รายการเกิด|@นาทีสัมบูรณ์ (ผูกกับเวลาเด้งจริง) | แปลงเป็น 'id|วันรายการ|YYYY-MM-DD HH:MM ที่เด้ง' เพื่อให้ค่าคาดหวังคำนวณมือได้ ไม่ใช่เลขที่ไม่มีใครอ่านออก */
const human = (x) => { const [id, occ, at] = x.key.split('|'); const mins = Number(at.slice(1)); const d = new Date(Math.floor(mins / 1440) * 86400000); const hh = Math.floor((mins % 1440) / 60), mm = mins % 60; const p2 = (n) => String(n).padStart(2, '0'); return `${id}|${occ}|${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(hh)}:${p2(mm)}`; };
const keys = (r) => r.map(human);

t('R1 ตรงเวลา: 09:00 ตอน 09:00 -> เตือน 1 รายการ', () => eq(keys(M.dueReminders([day()], '2026-10-14 09:00')), ['1|2026-10-14|2026-10-14 09:00']));
t('R2 ก่อน 30 นาที: เตือนตอน 08:30', () => eq(keys(M.dueReminders([day({ rem: [{ k: 'before', m: 30 }] })], '2026-10-14 08:30')), ['1|2026-10-14|2026-10-14 08:30']));
t('R3 ยังไม่ถึงเวลา: 08:29 ไม่เตือนก่อน 30 นาที', () => eq(M.dueReminders([day({ rem: [{ k: 'before', m: 30 }] })], '2026-10-14 08:29'), []));
t('R4 หน้าต่าง 5 นาที: cron มาช้า 4 นาที (09:04) ยังเตือน', () => eq(keys(M.dueReminders([day()], '2026-10-14 09:04')).length, 1));
t('R5 เลยหน้าต่าง: 09:06 ไม่เตือนแล้ว (ไม่ส่งของเก่าเกิน)', () => eq(M.dueReminders([day()], '2026-10-14 09:06'), []));
t('R6 ก่อน 1 วัน ข้ามเที่ยงคืน: รายการ 14 ต.ค. 09:00 เตือน 13 ต.ค. 09:00 ด้วย key ของวันที่รายการเกิด', () => eq(keys(M.dueReminders([day({ rem: [{ k: 'before', m: 1440 }] })], '2026-10-13 09:00')), ['1|2026-10-14|2026-10-13 09:00']));
t('R7 รายการ 00:30 ก่อน 90 นาที: เตือนเมื่อวาน 23:00 key เป็นวันที่รายการเกิด', () => eq(keys(M.dueReminders([day({ time: '00:30', rem: [{ k: 'before', m: 90 }] })], '2026-10-13 23:00')), ['1|2026-10-14|2026-10-13 23:00']));
t('R8 at: เวลาที่ตั้งเอง 07:15 ในวันที่รายการเกิด', () => eq(keys(M.dueReminders([day({ rem: [{ k: 'at', t: '07:15' }] })], '2026-10-14 07:15')), ['1|2026-10-14|2026-10-14 07:15']));
t('R9 รายการไม่มีเวลา: before ไม่ส่ง (ปลอดภัยกว่าส่งผิดเวลา)', () => eq(M.dueReminders([day({ time: '' })], '2026-10-14 09:00'), []));
t('R10 รายการไม่มีเวลา: at ยังส่ง', () => eq(keys(M.dueReminders([day({ time: '', rem: [{ k: 'at', t: '08:00' }] })], '2026-10-14 08:00')), ['1|2026-10-14|2026-10-14 08:00']));
t('R11 ไม่ใช่วันที่รายการเกิด (ซ้ำทุกสัปดาห์จันทร์ แต่วันนี้อังคาร) ไม่เตือน', () => eq(M.dueReminders([day({ start: '2026-10-12', repeat: { unit: 'week', every: 1, days: [1] } })], '2026-10-14 09:00'), []));
t('R12 ข้ามวัน (skip) ไม่เตือน', () => eq(M.dueReminders([day({ skip: { '2026-10-14': true } })], '2026-10-14 09:00'), []));
t('R13 หลายเตือนในรายการเดียว เวลาต่างกัน: key ไม่ซ้ำกัน (ตรงเวลา 09:00 กับ ล่วงหน้า 30 นาที 08:30 เด้งคนละรอบ)', () => { const it = day({ rem: [{ k: 'before', m: 0 }, { k: 'before', m: 30 }] }); eq(keys(M.dueReminders([it], '2026-10-14 08:30')), ['1|2026-10-14|2026-10-14 08:30']); eq(keys(M.dueReminders([it], '2026-10-14 09:00')), ['1|2026-10-14|2026-10-14 09:00']); const a = M.dueReminders([it], '2026-10-14 08:30')[0].key, b = M.dueReminders([it], '2026-10-14 09:00')[0].key; if (a === b) throw new Error('key ซ้ำกันทั้งที่เวลาเด้งต่างกัน'); });
t('R13b เตือนหลายแบบที่ลงเวลาเดียวกัน (ตรงเวลา + at 09:00) รวมเป็นเตือนเดียว ไม่เด้งซ้ำสองที', () => { const r = M.dueReminders([day({ rem: [{ k: 'before', m: 0 }, { k: 'at', t: '09:00' }] })], '2026-10-14 09:00'); eq(r.length, 1); eq(keys(r), ['1|2026-10-14|2026-10-14 09:00']); });
t('R21 แก้เวลารายการ: เวลาเด้งต่างกัน = key ต่างกัน (ต้นเหตุที่แก้เวลาแล้วไม่เด้งอีก) แต่เวลาเดิมเดียวกัน = key เดิม', () => { const k = (time, now) => M.dueReminders([day({ time })], now)[0].key; if (k('19:05', '2026-10-14 19:05') === k('19:10', '2026-10-14 19:10')) throw new Error('key เหมือนกันทั้งที่เวลาต่าง'); eq(k('19:05', '2026-10-14 19:05'), k('19:05', '2026-10-14 19:07')); });
t('R22 atAbs คืนเวลาเด้งเป็นนาทีสัมบูรณ์เวลาไทย (ตัวจัดเวลาใช้ตัดเครื่องใหม่): 09:00 วันที่ 14 ต.ค. 2026 = 29866140', () => eq(M.dueReminders([day()], '2026-10-14 09:00')[0].atAbs, 29866140));
t('R14 เดือน: วันที่ 31 ในเดือนที่ไม่มี 31 ไม่เตือน (ตรง occursOn ของแอป)', () => eq(M.dueReminders([day({ start: '2026-08-31', repeat: { unit: 'month', every: 1, days: [] } })], '2026-09-30 09:00'), []));
t('R15 ข้อมูลพัง: rem ไม่ใช่ array / time รูปแบบผิด ไม่ throw และไม่เตือน', () => { eq(M.dueReminders([day({ rem: null })], '2026-10-14 09:00'), []); eq(M.dueReminders([day({ time: '9:7x' })], '2026-10-14 09:00'), []); });
t('R16 ข้ามปี: รายการ 1 ม.ค. 00:10 ก่อน 1 วัน เตือน 31 ธ.ค. 00:10', () => eq(keys(M.dueReminders([day({ start: '2027-01-01', time: '00:10', rem: [{ k: 'before', m: 1440 }] })], '2026-12-31 00:10')), ['1|2027-01-01|2026-12-31 00:10']));
t('R17 ขอบหน้าต่าง: +4 นาทียังเตือน, +5 นาทีพอดีไม่เตือน (หน้าต่างกว้าง 5 ไม่ใช่ 6)', () => { eq(M.dueReminders([day()], '2026-10-14 09:04').length, 1, '+4'); eq(M.dueReminders([day()], '2026-10-14 09:05').length, 0, '+5'); });
t('R18 รายการไม่มีเวลา before: ไม่ส่งแม้ตอนเที่ยงคืนของวันนั้น (กันถอยไปใช้ 00:00)', () => { const it = day({ time: '', rem: [{ k: 'before', m: 0 }] }); eq(M.dueReminders([it], '2026-10-14 00:00'), [], '00:00'); eq(M.dueReminders([day({ time: '', rem: [{ k: 'before', m: 60 }] })], '2026-10-13 23:00'), [], '23:00 ก่อนเที่ยงคืน'); });
t('R19 ค่า m ผิดรูป (ติดลบ ทศนิยม ข้อความ) ไม่เตือนและไม่ throw', () => { for (const m of [-5, 1.5, '30', NaN, null]) eq(M.dueReminders([day({ rem: [{ k: 'before', m }] })], '2026-10-14 09:00'), [], String(m)); });
t('R20 ผู้ใช้เปลี่ยนเวลารายการแล้ว: เวลาเก่าไม่เตือน เวลาใหม่เตือน', () => { eq(M.dueReminders([day({ time: '10:30' })], '2026-10-14 09:00'), [], 'เวลาเก่า'); eq(M.dueReminders([day({ time: '10:30' })], '2026-10-14 10:30').length, 1, 'เวลาใหม่'); });
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);
