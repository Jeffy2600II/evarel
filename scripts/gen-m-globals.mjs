// สร้าง app/src/app/globals.d.ts: ประกาศชื่อ global ที่ชั้นโมดูล (เดิม m/ ปัจจุบัน app/) ส่งออกผ่าน Object.assign(window, {...}) ให้ tsc รู้จัก (ชนิด any)
// ทำไม: ไฟล์ m เรียกกันผ่านชื่อ global ล้วน tsc จึงฟ้อง "หาชื่อไม่เจอ" ราว 720 จุด และการย้ายไฟล์เป็นโมดูล (ใส่ import/export) ทำให้ชื่อหายจาก global เพิ่ม error
// วิธี: อ่านชื่อจาก Object.assign(window,...) ทุกไฟล์ แล้วให้ tsc เป็นผู้บอกชื่อที่ชนกับ const/let/function ที่ไฟล์สคริปต์ประกาศเอง (TS2451 และ TS2300) (ไม่เดาด้วย regex) ตัดชื่อนั้นออก
// ใช้: node scripts/gen-m-globals.mjs          (เขียนไฟล์)   node scripts/gen-m-globals.mjs --check  (ไม่เขียน ต่างจากที่ commit ไว้ exit 1)
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = join(root, 'node_modules/typescript/bin/tsc'); /* พาธตรงเหมือน compile-ts.mjs (require.resolve ถูกบล็อกโดย exports ของแพ็กเกจ) */
const M = join(root, 'app/src/app'), OUT = join(M, 'globals.d.ts'), check = process.argv.includes('--check');
const exported = new Set();
for (const f of readdirSync(M).filter((x) => x.endsWith('.ts') && !x.endsWith('.d.ts'))) {
  /* ไฟล์หนึ่งมี Object.assign(window,{...}) ได้หลายก้อน (เช่น 12-ui__primitives) ต้องอ่านทุกก้อน ไม่ใช่ก้อนแรก */
  for (const m of readFileSync(join(M, f), 'utf8').matchAll(/Object\.assign\(window,\s*\{([^}]*)\}/g))
    for (const raw of m[1].split(',')) { const n = raw.trim().split(':')[0].trim(); if (/^[A-Za-z_$][\w$]*$/.test(n)) exported.add(n); }
}
const HEAD = '/* สร้างโดย scripts/gen-m-globals.mjs ห้ามแก้มือ | ชื่อ global ที่ m/ ส่งออกผ่าน window (ชนิด any: ประกาศให้ tsc รู้จักชื่อ ยังไม่ระบุชนิดจริง) */\n';
const render = (skip) => HEAD + [...exported].filter((n) => !skip.has(n)).sort().map((n) => `declare var ${n}: any;`).join('\n') + '\n';
const tscClash = () => { const r = spawnSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.json')], { cwd: root, encoding: 'utf8' });
  return new Set([...((r.stdout || '') + (r.stderr || '')).matchAll(/(?:TS2451: Cannot redeclare block-scoped variable|TS2300: Duplicate identifier) '([^']+)'/g)].map((x) => x[1])); };
const prev = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null;
writeFileSync(OUT, render(new Set())); const clash = tscClash();   // ประกาศครบก่อน ให้ tsc บอกว่าชื่อไหนชน
const text = render(clash);
if (check) { writeFileSync(OUT, prev ?? ''); if (prev !== text) { console.error('globals.d.ts ไม่ตรงกับที่สร้างได้ (รัน node scripts/gen-m-globals.mjs)'); process.exit(1); } console.log('globals.d.ts ตรง (' + (exported.size - clash.size) + ' ชื่อ)'); process.exit(0); }
writeFileSync(OUT, text);
console.log('เขียน globals.d.ts: ' + (exported.size - clash.size) + ' ชื่อ (ตัดออก ' + clash.size + ' ชื่อที่ชนกับที่ไฟล์ประกาศเอง)');
