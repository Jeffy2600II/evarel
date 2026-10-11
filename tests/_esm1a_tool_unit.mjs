// เทสต์หน่วยของ tools/state_wrap.mjs บนโค้ดจำลอง (TDD: ต้องพังก่อนถ้าเครื่องมือผิด) ใช้: node _esm1a_tool_unit.mjs
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import os from 'os';
const mk = (files) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-')); fs.writeFileSync(path.join(d, '_order.json'), JSON.stringify({ order: Object.keys(files).map(f => ({ file: f })) })); for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(d, f), c); return d; };
const run = (d, v) => { try { return { ok: true, out: execFileSync('node', ['/tmp/evarel-repo/tools/state_wrap.mjs', d, v], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { ok: false, err: (e.stderr || '') + (e.message || '') }; } };
const rd = (d, f) => fs.readFileSync(path.join(d, f), 'utf8'); let pass = 0, fail = 0; const t = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' | ' + v)); };
// 1 ประกาศเดี่ยว + อ่าน + เขียน + update
let d = mk({ '00.js': 'const ST={a:1};\n', '01.js': 'let U=null;\nfunction f(){return U}\n', '02.js': 'function g(x){U=x;U++;if(U>1)h(U)}\n' }); let r = run(d, 'U');
t('1 รันสำเร็จ', r.ok, r.err); t('1 ตัดประกาศ let U ออก', !/let U/.test(rd(d, '01.js'))); t('1 อ่านเป็น ST.U', /return ST\.U/.test(rd(d, '01.js')));
t('1 เขียน/update เป็น ST.U', /ST\.U=x;ST\.U\+\+;if\(ST\.U>1\)h\(ST\.U\)/.test(rd(d, '02.js')), rd(d, '02.js')); t('1 ST มีคีย์ U:null', /const ST=\{a:1,U:null\};/.test(rd(d, '00.js')), rd(d, '00.js'));
// 2 ประกาศรวมหลายตัวปนตัวอื่น
d = mk({ '00.js': 'const ST={};\n', '01.js': 'let A=null,B=0,C=5;\nfunction f(){B=C+A}\n' }); r = run(d, 'A,B');
t('2 รันสำเร็จ', r.ok, r.err); t('2 เหลือเฉพาะ C ในประกาศ', /let C=5;/.test(rd(d, '01.js')) && !/\bA=null/.test(rd(d, '01.js')), rd(d, '01.js')); t('2 ตัวที่ไม่ใช่เป้าหมายคงเดิม (C ไม่เป็น ST.C)', /ST\.B=C\+ST\.A/.test(rd(d, '01.js')), rd(d, '01.js'));
// 3 ประกาศรวมล้วนเป็นเป้าหมายทั้งหมด (ลบทั้งบรรทัด)
d = mk({ '00.js': 'const ST={};\n', '01.js': 'let Q=null,T=0,K=0;\nfunction f(){Q=1;T++;return K}\n' }); r = run(d, 'Q,T,K');
t('3 รันสำเร็จ', r.ok, r.err); t('3 ไม่เหลือ let', !/\blet\b/.test(rd(d, '01.js')), rd(d, '01.js')); t('3 ST มีครบ', /Q:null,T:0,K:0/.test(rd(d, '00.js')), rd(d, '00.js'));
// 4 shorthand property
d = mk({ '00.js': 'const ST={};\n', '01.js': 'let U=1;\nconst o={U};\n' }); r = run(d, 'U');
t('4 shorthand {U} -> {U:ST.U}', r.ok && /const o=\{U:ST\.U\}/.test(rd(d, '01.js')), r.err || rd(d, '01.js'));
// 5 ชื่อเป็น property (x.U) และคีย์ ({U:1}) ต้องไม่ถูกแตะ
d = mk({ '00.js': 'const ST={};\n', '01.js': 'let U=1;\nconst a=obj.U;const b={U:2};\n' }); r = run(d, 'U');
t('5 member/key ไม่ถูกแตะ', r.ok && /obj\.U;const b=\{U:2\}/.test(rd(d, '01.js')), r.err || rd(d, '01.js'));
// 6 ตัวแปรท้องถิ่นชื่อซ้ำ ต้อง throw (ปลอดภัยกว่าเงียบ) และไม่แก้ไฟล์
d = mk({ '00.js': 'const ST={};\n', '01.js': 'let U=1;\nfunction f(U){return U}\n' }); const before = rd(d, '01.js'); r = run(d, 'U');
t('6 พารามิเตอร์ชื่อซ้ำ -> ปฏิเสธ', !r.ok, 'ควร throw'); t('6 ไฟล์ไม่ถูกแก้เมื่อปฏิเสธ', rd(d, '01.js') === before);
// 7 ตัวแปรท้องถิ่น let/const ใน block ชื่อซ้ำ ต้อง throw
d = mk({ '00.js': 'const ST={};\n', '01.js': 'let U=1;\nfunction f(){const U=2;return U}\n' }); r = run(d, 'U'); t('7 const ท้องถิ่นชื่อซ้ำ -> ปฏิเสธ', !r.ok);
// 8 ไม่พบการประกาศ -> throw
d = mk({ '00.js': 'const ST={};\n', '01.js': 'function f(){}\n' }); r = run(d, 'ZZ'); t('8 ไม่พบประกาศ -> ปฏิเสธ', !r.ok);
// 9 ชื่อใน template literal ${U} ต้องแก้ (AST เห็น) และชื่อใน string ธรรมดาต้องไม่แตะ
d = mk({ '00.js': 'const ST={};\n', '01.js': 'let U=1;\nconst s=`a ${U} b`;const t2="U stays";\n' }); r = run(d, 'U');
t('9 ${U} -> ${ST.U} และ string "U stays" คงเดิม', r.ok && /`a \$\{ST\.U\} b`/.test(rd(d, '01.js')) && /"U stays"/.test(rd(d, '01.js')), r.err || rd(d, '01.js'));
// 10 ไวยากรณ์ผลลัพธ์ยังถูกต้อง
d = mk({ '00.js': 'const ST={};\n', '01.js': 'let A=null,B=0;\nfunction f(){A={x:B++};return A}\n' }); r = run(d, 'A,B');
try { new Function(rd(d, '00.js') + rd(d, '01.js')); t('10 ผลลัพธ์รันเป็นโค้ด JS ที่ถูกต้อง', r.ok); } catch (e) { t('10 ผลลัพธ์รันเป็นโค้ด JS ที่ถูกต้อง', false, e.message); }
console.log(`ผ่าน ${pass}/${pass + fail}`); process.exit(fail ? 1 : 0);
