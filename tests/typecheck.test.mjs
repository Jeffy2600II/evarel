// S4 ชั้น 1: ล็อกพฤติกรรมของตัวตรวจชนิด ทดสอบกับสำเนาในโฟลเดอร์ชั่วคราว ไม่แตะไฟล์จริง
import { spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('ผ่าน', name); } catch (e) { fail++; console.log('ตก ', name, '->', e.message); } };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || ''} ได้ ${a} คาด ${b}`); };
// สำเนาทำงาน: เฉพาะที่ตัวตรวจต้องใช้ (node_modules ลิงก์ผ่าน symlink กันคัดลอกหนัก)
const mk = () => {
  const d = mkdtempSync(join(tmpdir(), 'evtc-'));
  mkdirSync(join(d, 'tools')); mkdirSync(join(d, 'app/web/js'), { recursive: true });
  cpSync(join(root, 'app/web/js/m'), join(d, 'app/web/js/m'), { recursive: true });
  cpSync(join(root, 'types'), join(d, 'types'), { recursive: true });
  for (const f of ['tsconfig.check.json']) cpSync(join(root, f), join(d, f));
  cpSync(join(root, 'tools/typecheck.mjs'), join(d, 'tools/typecheck.mjs'));
  cpSync(join(root, 'tools/typecheck.baseline.json'), join(d, 'tools/typecheck.baseline.json'));
  spawnSync('ln', ['-s', join(root, 'node_modules'), join(d, 'node_modules')]);
  return d;
};
const run = d => spawnSync('node', ['tools/typecheck.mjs'], { cwd: d, encoding: 'utf8' });
let d = mk();
t('T1 โค้ดปัจจุบันผ่าน (ไม่มี error นอก baseline)', () => eq(run(d).status, 0));
t('T2 ไฟล์ types พัง = ล้มเหลวและบอกว่าไม่ได้ตรวจโค้ดจริง', () => {
  const p = join(d, 'types/st.d.ts'); const k = readFileSync(p, 'utf8'); writeFileSync(p, k + '\nเสียหาย {{{ ;;; */\n');
  const r = run(d); writeFileSync(p, k); eq(r.status, 1); if (!/types พัง/.test(r.stderr)) throw new Error('ข้อความไม่บอกสาเหตุ');
});
t('T3 error ชนิดใหม่ที่ไม่ใช่ชื่อฟิลด์ ST = ล้มเหลว (ส่งสตริงให้พารามิเตอร์ตัวเลข)', () => {
  const p = join(d, 'app/web/js/m/07-services__stats.js'); const k = readFileSync(p, 'utf8');
  writeFileSync(p, k + '\n/** @param {number} n */ function _tcProbe(n){return n}\n_tcProbe("x");\n');
  const r = run(d); writeFileSync(p, k); eq(r.status, 1, 'ควรจับได้');
});
t('T4 พิมพ์ชื่อฟิลด์ ST ผิด (ST.TMM) ถูกจับ เพราะ ST ผูกชนิดแล้ว', () => {
  const p = join(d, 'app/web/js/m/15-core__timer.js'); const k = readFileSync(p, 'utf8');
  writeFileSync(p, k.replace('ST.TM', 'ST.TMM')); const r = run(d); writeFileSync(p, k);
  eq(r.status, 1, 'ควรจับได้');
});
t('T5 สะกดเมธอด DOM ผิด (e.target.cloest) ยังถูกจับ ไฟล์ types/dom.d.ts ไม่ได้ทำให้ตัวตรวจตาบอด', () => {
  const p = join(d, 'app/web/js/m/25-actions.js'); const k = readFileSync(p, 'utf8');
  const a = "document.addEventListener('click',e=>{const el=e.target.closest('[data-act]')";
  eq(k.split(a).length, 2, 'ไม่พบจุดอ้างอิงใน 25-actions.js (โค้ดเปลี่ยน ให้แก้เทสต์ไม่ใช่ผ่อนเกณฑ์)');
  writeFileSync(p, k.replace(a, a.replace('e.target.closest', 'e.target.cloest'))); const r = run(d); writeFileSync(p, k);
  eq(r.status, 1, 'ควรจับได้');
});
t('T6 เรียกเมธอดที่ไม่มีจริงบน element (el.nonexistentMethod()) ยังถูกจับ', () => {
  const p = join(d, 'app/web/js/m/25-actions.js'); const k = readFileSync(p, 'utf8');
  const a = "const el=e.target.closest('[data-act]');if(!el)return;";
  eq(k.split(a).length, 2, 'ไม่พบจุดอ้างอิงใน 25-actions.js');
  writeFileSync(p, k.replace(a, a + 'el.nonexistentMethod();')); const r = run(d); writeFileSync(p, k);
  eq(r.status, 1, 'ควรจับได้');
});
rmSync(d, { recursive: true, force: true });
console.log(`\nรวม ผ่าน ${pass} ตก ${fail}`); process.exit(fail ? 1 : 0);
