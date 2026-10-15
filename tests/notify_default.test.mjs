/* เทสต์ตรรกะแจ้งเตือนฝั่งแอป (evarel-notify-default) | seam = notifyState / checkNotify / defaultRem / toggleOnTime / toggleAhead
   โมดูลจริง: app/web/js/m/*-services__notify.js (หาจาก _order.json) (ไม่มี DOM ดึงมารันใน sandbox ได้)
   ความหมายตามสเปก D1: rem มี {k:'before',m:0} = แจ้งเตือนตรงเวลา "เปิด" | ไม่มี = ผู้ใช้ปิด | ล่วงหน้า = before m>0
   ค่าคาดหวังทุกค่ามาจากสเปกและข้อมูลจริง 21 รายการของผู้ใช้ ไม่คำนวณซ้ำด้วยตรรกะเดียวกับโค้ด */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
/* โค้ดที่รันใน vm สร้าง Array/Object จาก realm อื่น deepEqual strict จึงเทียบ prototype ไม่ผ่านทั้งที่เนื้อหาเท่ากัน -> เทียบผ่าน JSON */
const J = (x) => JSON.parse(JSON.stringify(x));
const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const here = dirname(fileURLToPath(import.meta.url));
const mdir = join(here, '../app/web/js/m');
/* ไม่ผูกเลขลำดับ: หาชื่อจริงจาก _order.json (เลขเปลี่ยนเมื่อย้ายลำดับโมดูล) */
const notifyFile = JSON.parse(readFileSync(join(mdir, '_order.json'), 'utf8')).order.map((o) => o.file).find((f) => f.endsWith('services__notify.js'));
const file = join(mdir, notifyFile);
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' :: ' + String(e.message || e).slice(0, 230)); } };
let N = null;
try {
  const src = readFileSync(file, 'utf8').replace(/Object\.assign\(window,[^;]*\);?/g, '');
  const sb = { out: null }; vm.createContext(sb);
  vm.runInContext(src + '\nout={notifyState,checkNotify,defaultRem,toggleOnTime,toggleAhead,AHEAD_PRESETS,countNotifiable};', sb); N = sb.out;
} catch (e) { t('N0 โหลดโมดูล services__notify.js', () => { throw new Error('ยังไม่มีโมดูล (red ตามที่คาด): ' + String(e.message).slice(0, 80)); }); }

if (N) {
  const ON = { k: 'before', m: 0 };
  t('N1 ค่าเริ่มต้นรายการใหม่: แจ้งเตือนตรงเวลาเปิด ไม่มีล่วงหน้า', () => deq(N.defaultRem(), [ON]));
  t('N2 notifyState ข้อมูลจริง 21 รายการ [{before,0}] + มีเวลา -> onTime เปิด ไม่มีปัญหา', () => { const s = N.notifyState([ON], true); assert.equal(s.onTime, true); deq(s.ahead, []); assert.equal(s.issue, ''); });
  t('N3 ปิดแจ้งเตือน (rem ว่าง) -> onTime ปิด ไม่มีปัญหาแม้ไม่มีเวลา', () => { const s = N.notifyState([], false); assert.equal(s.onTime, false); assert.equal(s.issue, ''); });
  t('N4 ข้อมูลจริง 8 รายการ: เปิดตรงเวลาแต่ไม่มีเวลา -> issue ต้องมีข้อความไทยบอกให้ใส่เวลา', () => { const s = N.notifyState([ON], false); assert.equal(s.onTime, true); assert.match(s.issue, /เวลา/); assert.match(s.issue, /แจ้งเตือน/); });
  t('N5 ล่วงหน้าอย่างเดียว (ปิดตรงเวลา) ไม่ใช่ "ปิดแจ้งเตือนทั้งหมด": onTime=false, ahead=[10]', () => { const s = N.notifyState([{ k: 'before', m: 10 }], true); assert.equal(s.onTime, false); deq(s.ahead, [10]); });
  t('N6 ล่วงหน้าแต่ไม่มีเวลา -> issue (นับถอยหลังจากเวลาไม่ได้)', () => assert.match(N.notifyState([ON, { k: 'before', m: 30 }], false).issue, /เวลา/));
  t('N6b ล่วงหน้าอย่างเดียว (ปิดตรงเวลา) แล้วไม่มีเวลา -> ยังมี issue (นับถอยหลังจากเวลาไม่ได้)', () => assert.match(N.notifyState([{ k: 'before', m: 10 }], false).issue, /เวลา/));
  t('N7b ล่วงหน้าค่าซ้ำใน rem เดิม (ข้อมูลเสีย) ถูกยุบเหลือค่าเดียวโดยไม่ทำให้ฟังก์ชันพัง', () => { const s = N.notifyState([{ k: 'before', m: 30 }, { k: 'before', m: 30 }, { k: 'before', m: 30 }], true); deq(s.ahead, [30]); });
  t('N7 ล่วงหน้าหลายอัน เรียงน้อยไปมาก ไม่ซ้ำ', () => deq(N.notifyState([{ k: 'before', m: 1440 }, ON, { k: 'before', m: 10 }, { k: 'before', m: 10 }], true).ahead, [10, 1440]));
  t('N8 at (เวลาที่ตั้งเอง) ใช้ได้แม้ไม่มีเวลารายการ ไม่ถูกนับเป็นปัญหา', () => { const s = N.notifyState([{ k: 'at', t: '07:30' }], false); deq(s.at, ['07:30']); assert.equal(s.issue, ''); });
  t('N9 toggleOnTime ปิด: ลบเฉพาะตรงเวลา คงล่วงหน้าและ at ไว้', () => deq(N.toggleOnTime([ON, { k: 'before', m: 10 }, { k: 'at', t: '07:30' }], false), [{ k: 'before', m: 10 }, { k: 'at', t: '07:30' }]));
  t('N10 toggleOnTime เปิด: เติมตรงเวลา ไม่ซ้ำเมื่อมีอยู่แล้ว', () => { deq(N.toggleOnTime([], true), [ON]); deq(N.toggleOnTime([ON], true), [ON]); });
  t('N11 toggleAhead เพิ่ม/ลบทีละค่า ไม่แตะตรงเวลา', () => { deq(N.toggleAhead([ON], 30), [ON, { k: 'before', m: 30 }]); deq(N.toggleAhead([ON, { k: 'before', m: 30 }], 30), [ON]); });
  t('N12 toggleAhead ปฏิเสธ m=0 (ตรงเวลาต้องใช้ toggleOnTime) และค่าผิดรูป', () => { for (const m of [0, -5, 1.5, NaN, '10', null]) deq(N.toggleAhead([ON], m), [ON], String(m)); });
  t('N13 ลิสต์ rem ผิดรูป (null / ไม่ใช่ array / มีขยะ) ไม่ throw และถือว่าปิด', () => { for (const r of [null, undefined, 'x', 5, {}, [null, 3, { k: 'zzz' }]]) { const s = N.notifyState(r, true); assert.equal(s.onTime, false, JSON.stringify(r)); } });
  t('N14 checkNotify: คืนข้อความว่างเมื่อไม่มีปัญหา และข้อความเมื่อมี', () => { assert.equal(N.checkNotify([ON], '09:00'), ''); assert.match(N.checkNotify([ON], ''), /เวลา/); assert.equal(N.checkNotify([], ''), ''); });
  t('N15 ปิดแล้วต้องไม่เติมกลับเอง: toggleOnTime(false) แล้ว notifyState ยังปิด', () => assert.equal(N.notifyState(N.toggleOnTime(N.defaultRem(), false), true).onTime, false));
  t('N16 ตัวเลือกล่วงหน้า: 10 นาที 30 นาที 1 ชม. 1 วัน และไม่มี 0 (ตรงเวลาไม่ใช่ตัวเลือกล่วงหน้า)', () => deq(N.AHEAD_PRESETS, [10, 30, 60, 1440]));
  /* N18: จำนวน "รายการที่แจ้งเตือนได้จริง" สำหรับหน้าตั้งค่า (เดิมนับ rem.length ซึ่งรวมรายการที่ไม่มีเวลา ส่งไม่ได้จริง) */
  const IT = (time, rem) => ({ time, rem });
  t('N18a นับเฉพาะรายการที่เปิดแจ้งเตือนและมีเวลา', () => assert.equal(N.countNotifiable([IT('09:00', [ON]), IT('', [ON]), IT('10:00', []), IT('11:00', [{ k: 'before', m: 10 }])]), 2));
  t('N18b ข้อมูลจริง 21 รายการ (13 มีเวลา 8 ไม่มี ทุกรายการเปิดตรงเวลา) -> 13 ไม่ใช่ 21', () => { const L = [...Array(13).fill(0).map(() => IT('08:00', [ON])), ...Array(8).fill(0).map(() => IT('', [ON]))]; assert.equal(N.countNotifiable(L), 13); });
  t('N18c ล่วงหน้าอย่างเดียวที่มีเวลา นับ; at (เวลาตั้งเอง) นับแม้ไม่มีเวลารายการ', () => assert.equal(N.countNotifiable([IT('09:00', [{ k: 'before', m: 30 }]), IT('', [{ k: 'at', t: '07:30' }])]), 2));
  t('N18d รายการว่าง / ข้อมูลผิดรูป -> 0 ไม่ throw', () => { assert.equal(N.countNotifiable([]), 0); assert.equal(N.countNotifiable(null), 0); assert.equal(N.countNotifiable([null, 5, {}, { rem: null }]), 0); });
  /* N17: พิสูจน์ว่าความหมายของแอปตรงกับที่ Worker ปฏิบัติจริง โดยรัน dueReminders ตัวจริงของ Worker (บันเดิลด้วย esbuild) */
  const { execSync } = await import('node:child_process'); const { pathToFileURL } = await import('node:url');
  const { tmpdir } = await import('node:os'); const outFile = join(tmpdir(), 'notify-nd-rem.mjs');
  execSync(`"${join(here, '../node_modules/.bin/esbuild')}" "${join(here, '../app/api/src/systems/notify/reminders.ts')}" --bundle --format=esm --outfile="${outFile}" --log-level=error`);
  const R = await import(pathToFileURL(outFile).href + '?v=' + Date.now());
  const base = { id: 1, title: 'ส่งงาน', time: '09:00', start: '2026-10-14', end: '', repeat: { unit: 'none', every: 1, days: [] }, skip: {} };
  const tags = (rem, now) => R.dueReminders([{ ...base, rem }], now).map((d) => d.key.split('|')[2]);
  t('N17a ค่าเริ่มต้นของแอป -> Worker ส่งตรงเวลาตอน 09:00', () => deq(tags(N.defaultRem(), '2026-10-14 09:00'), ['before:0']));
  t('N17b ผู้ใช้ปิดตรงเวลา (toggleOnTime false) -> Worker ไม่ส่งตอน 09:00', () => deq(tags(N.toggleOnTime(N.defaultRem(), false), '2026-10-14 09:00'), []));
  t('N17c ปิดตรงเวลาแต่เปิดล่วงหน้า 30 นาที -> ส่งตอน 08:30 ไม่ส่งตอน 09:00', () => { const rem = N.toggleAhead(N.toggleOnTime(N.defaultRem(), false), 30); deq(tags(rem, '2026-10-14 08:30'), ['before:30']); deq(tags(rem, '2026-10-14 09:00'), []); });
  t('N17d เปิดตรงเวลา + ล่วงหน้า 1 วัน -> ส่ง 2 ครั้ง (เมื่อวาน 09:00 และวันนี้ 09:00) คีย์ไม่ซ้ำ', () => { const rem = N.toggleAhead(N.defaultRem(), 1440); deq(tags(rem, '2026-10-13 09:00'), ['before:1440']); deq(tags(rem, '2026-10-14 09:00'), ['before:0']); });
  t('N17e ข้อมูลจริง 8 รายการเปิดตรงเวลาแต่ไม่มีเวลา -> แอปแจ้งปัญหา และ Worker ไม่ส่ง (ปลอดภัย ไม่ส่งผิดเวลา)', () => { assert.notEqual(N.checkNotify(N.defaultRem(), ''), ''); deq(R.dueReminders([{ ...base, time: '', rem: N.defaultRem() }], '2026-10-14 09:00'), []); });
}
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);
