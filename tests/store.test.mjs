/* ตัวทดสอบ store กลางที่ React subscribe ได้ (S4 s4f-store-react): สัญญาของ createStore ที่ useSyncExternalStore ต้องการ
   ตรวจ: snapshot คงที่ถ้าไม่ notify | notify เพิ่ม version | ผู้ฟังถูกเรียกครั้งเดียวต่อ notify | unsubscribe หยุดเรียก | ผู้ฟังที่ throw ไม่ล้มคนอื่น | ไม่มีผู้ฟัง = ไม่ทำอะไร
   ใช้: node tests/store.test.mjs   exit 1 ถ้าข้อใดตก */
import { createStore } from '../app/src/react/store.js';
let pass = 0, fail = 0; const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c || !d ? '' : ' | ' + d)); };
const s = createStore();
const v0 = s.getSnapshot();
ok('snapshot เริ่มต้นเป็นตัวเลข version', typeof v0 === 'number', String(v0));
ok('getSnapshot ซ้ำโดยไม่ notify ต้องได้ค่าเดิม (ไม่งั้น React วนไม่รู้จบ)', s.getSnapshot() === v0 && s.getSnapshot() === v0);
let a = 0, b = 0; const ua = s.subscribe(() => { a++ }), ub = s.subscribe(() => { b++ });
s.notify();
ok('notify เรียกผู้ฟังทุกคนคนละหนึ่งครั้ง', a === 1 && b === 1, `a=${a} b=${b}`);
ok('notify เพิ่ม version', s.getSnapshot() === v0 + 1, String(s.getSnapshot()));
ua(); s.notify();
ok('unsubscribe แล้วไม่ถูกเรียกอีก แต่คนอื่นยังถูกเรียก', a === 1 && b === 2, `a=${a} b=${b}`);
ua();
ok('unsubscribe ซ้ำปลอดภัย', true);
const s2 = createStore(); let ran = 0;
s2.subscribe(() => { throw new Error('boom') }); s2.subscribe(() => { ran++ });
let threw = false; try { s2.notify() } catch { threw = true }
ok('ผู้ฟังที่ throw ไม่ล้ม notify และไม่ขวางผู้ฟังคนถัดไป', !threw && ran === 1, `threw=${threw} ran=${ran}`);
const s3 = createStore(); const before = s3.getSnapshot(); s3.notify();
ok('ไม่มีผู้ฟัง notify ยังเพิ่ม version ได้โดยไม่พัง', s3.getSnapshot() === before + 1);
const s4 = createStore(); let calls = 0; s4.subscribe(() => { calls++; if (calls < 1000) s4.notify() }); /* ผู้ฟังสั่ง notify ซ้ำเองไม่หยุด (หยุดที่ 1000 กันเทสต์ค้าง) ถ้าไม่มีตัวกัน calls จะไปถึง 1000 */
s4.notify();
ok('notify ซ้อนใน listener ที่วนไม่หยุด ถูกตัดที่ความลึกจำกัด (ไม่ถึง 1000)', calls <= 5, String(calls));
const s5 = createStore(), s6 = createStore(); let c5 = 0; s5.subscribe(() => { c5++ }); s6.notify();
ok('สอง store แยกกันจริง', c5 === 0);
console.log(`ผ่าน ${pass} | ตก ${fail}`); process.exit(fail ? 1 : 0);
