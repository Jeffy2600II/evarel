// reorder_modules.mjs: ย้ายไฟล์โมดูล 1 ไฟล์ไปตำแหน่งใหม่ แล้วเขียนลำดับ 3 ที่จากแหล่งเดียว (evarel-ts-1i)
// ที่ที่กำหนดลำดับ: index.html (บรรทัด <script src="js/m/..."> เรียงต่อกัน), sw.js (รายการ CORE), js/m/_order.json
// เปลี่ยนชื่อไฟล์ให้เลขนำหน้าสะท้อนลำดับใหม่ (เนื้อหาไม่เปลี่ยนไบต์เดียว) แล้ว sw.js VERSION ให้ผู้เรียกขยับเอง
// ใช้: node reorder_modules.mjs <appdir> <ไฟล์ที่จะย้าย เช่น 17-services__ai-quota.js> <ย้ายไปก่อนไฟล์ เช่น 15-views__ai.js>
import fs from 'fs'; import path from 'path';
const [app, mover, before] = process.argv.slice(2); const mdir = path.join(app, 'js/m');
const ordFile = path.join(mdir, '_order.json'); const ord = JSON.parse(fs.readFileSync(ordFile, 'utf8'));
const names = ord.order.map(o => o.file); const bytes = Object.fromEntries(ord.order.map(o => [o.file, o.bytes]));
if (!names.includes(mover) || !names.includes(before)) { console.error('ไม่พบไฟล์ใน _order.json'); process.exit(2); }
const rest = names.filter(f => f !== mover); const at = rest.indexOf(before); const next = [...rest.slice(0, at), mover, ...rest.slice(at)];
const num = (f) => f.replace(/^\d+-/, ''); const pad = (i) => String(i).padStart(2, '0');
const rename = Object.fromEntries(next.map((f, i) => [f, pad(i) + '-' + num(f)])); // ชื่อเดิม -> ชื่อใหม่
// 1) เปลี่ยนชื่อไฟล์ผ่านชื่อชั่วคราว กันชนกัน
for (const f of names) if (rename[f] !== f) fs.renameSync(path.join(mdir, f), path.join(mdir, '__tmp__' + f));
for (const f of names) if (rename[f] !== f) fs.renameSync(path.join(mdir, '__tmp__' + f), path.join(mdir, rename[f]));
// 2) _order.json
ord.order = next.map(f => ({ file: rename[f], bytes: bytes[f] })); fs.writeFileSync(ordFile, JSON.stringify(ord, null, 1) + '\n');
// 3) index.html : แทนที่เฉพาะลำดับ <script src="js/m/..."> ที่ติดกัน (ต้องมีบล็อกเดียว)
const hp = path.join(app, 'index.html'); let html = fs.readFileSync(hp, 'utf8');
const re = /(?:<script src="js\/m\/[^"]+"><\/script>)+/g; const blocks = html.match(re) || [];
if (blocks.length !== 1) { console.error('index.html ควรมีบล็อก script โมดูลเดียว พบ ' + blocks.length); process.exit(3); }
html = html.replace(re, next.map(f => `<script src="js/m/${rename[f]}"></script>`).join('')); fs.writeFileSync(hp, html);
// 4) sw.js : แทนที่เฉพาะบรรทัด './js/m/NN-xxx.js', ที่ติดกัน (ต้องมีบล็อกเดียว)
const sp = path.join(app, 'sw.js'); let sw = fs.readFileSync(sp, 'utf8');
const rs = /(?:  '\.\/js\/m\/[^']+',\n)+/g; const sb = sw.match(rs) || [];
if (sb.length !== 1) { console.error('sw.js ควรมีบล็อกรายการโมดูลเดียว พบ ' + sb.length); process.exit(4); }
sw = sw.replace(rs, next.map(f => `  './js/m/${rename[f]}',\n`).join('')); fs.writeFileSync(sp, sw);
console.log('ย้าย', mover, 'ไปก่อน', before, '| เปลี่ยนชื่อ', Object.entries(rename).filter(([a, b]) => a !== b).map(([a, b]) => a.slice(0, 2) + '->' + b.slice(0, 2)).join(' '));
