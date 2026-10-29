/* ตรวจความสมบูรณ์ของผลบิลด์ Next (build/web) แบบสถิต: Node ล้วน ไม่เปิดเบราว์เซอร์ ไม่ใช้ความลับ ไม่แตะเครือข่าย
   ที่มา: CI ไม่เคยรันเทสต์หน้าเว็บเลย ขั้นเดิมดูแค่ release.json ตรง sw.js จึงผ่านได้แม้ไฟล์ที่ index.html อ้างหายหรือสคริปต์พัง
   ขอบเขต: จับ "ไฟล์หาย / สคริปต์ parse ไม่ได้ / js/m หลุดเข้าบิลด์ / กล่องหาย / แคช sw อ้างไฟล์ผี" ไม่ได้พิสูจน์ว่าแอปบูตในเบราว์เซอร์ (นั่นยังเป็นเทสต์ next_boot ที่รันมือ)
   ใช้: node tests/build_integrity.test.mjs [โฟลเดอร์บิลด์ ค่าเริ่มต้น build/web]   ผล: exit 1 ถ้าข้อใดไม่ผ่าน */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(process.argv[2] || path.join(root, 'build/web'));
let fails = 0; const t = (n, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : ' :: ' + extra}`); if (!ok) fails++; };
const exists = (rel) => fs.existsSync(path.join(dir, rel.split('?')[0].replace(/^\.?\//, '')));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
if (!fs.existsSync(path.join(dir, 'index.html'))) { console.log('FAIL ไม่พบ ' + dir + '/index.html (ยังไม่ได้บิลด์?)'); process.exit(1); }
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
/* (1) ทุกสคริปต์/สไตล์/manifest ที่ index.html อ้างต้องมีจริง */
const refs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]).concat([...html.matchAll(/<link[^>]*\shref="([^"]+)"/g)].map((m) => m[1])).filter((u) => !/^(https?:)?\/\//.test(u));
const missing = refs.filter((u) => !exists(u));
t(`index.html อ้างไฟล์ ${refs.length} รายการ มีครบ`, refs.length >= 5 && !missing.length, 'ขาด: ' + missing.slice(0, 4).join(', ') + (refs.length < 5 ? ' (อ้างน้อยผิดปกติ)' : ''));
/* (2) js/m ต้องไม่อยู่ในบิลด์ (โหลดเป็นบันเดิลแล้ว) และไม่ถูกอ้าง */
t('ไม่มีโฟลเดอร์ js/m และไม่ถูกอ้างใน index.html', !fs.existsSync(path.join(dir, 'js/m')) && !/\/js\/m\//.test(html));
/* (3) sw.js: CORE ทุกรายการมีจริง */
const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
const cm = /const CORE = \[([\s\S]*?)\n\s*\];/.exec(sw);
const core = cm ? [...cm[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
const coreMissing = core.filter((u) => u !== './' && !exists(u));
t(`sw.js CORE ${core.length} รายการ มีไฟล์จริงครบ`, core.length >= 20 && !coreMissing.length, 'ขาด: ' + coreMissing.slice(0, 4).join(', ') + (core.length < 20 ? ' (อ่าน CORE ได้น้อยผิดปกติ)' : ''));
/* (4) ไฟล์ .js ทุกไฟล์ใน js/ ต้อง parse ได้ (ไม่ได้รัน) */
const bad = [];
for (const f of walk(path.join(dir, 'js')).filter((x) => x.endsWith('.js'))) { try { new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f }); } catch (e) { bad.push(path.basename(f) + ': ' + String(e.message).slice(0, 60)); } }
t('ไฟล์ .js ใน js/ parse ได้ทุกไฟล์', !bad.length, bad.slice(0, 3).join(' | '));
/* (5) กล่อง/หน้าที่ต้องมีในบันเดิล React ครบตามรายการที่ต้นทางลงทะเบียน */
const regSrc = fs.readFileSync(path.join(root, 'app/src/m/19-views__settings.ts'), 'utf8');
const bm = /const REACT_PAGES_BASE=\[([^\]]*)\]/.exec(regSrc);
const pages = bm ? [...bm[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
const pgMissing = pages.filter((p) => !exists('js/react/' + p + '.js'));
t(`หน้า React ที่ลงทะเบียน ${pages.length} หน้า มีไฟล์ในบิลด์ครบ + runtime`, pages.length >= 10 && !pgMissing.length && exists('js/react/runtime.js'), 'ขาด: ' + pgMissing.join(', '));
/* (6) release.json ตรงกับ sw.js (เหมือนขั้นเดิมของ CI แต่รวมไว้ให้ตรวจมือได้ที่เดียว) */
let rel = {}; try { rel = JSON.parse(fs.readFileSync(path.join(dir, 'release.json'), 'utf8')); } catch (e) { /* ปล่อยให้ข้อนี้ตก */ }
const vm2 = /const VERSION = 'evarel-next-([0-9a-f]+)'/.exec(sw);
t('release.json ตรง sw.js (รหัสบิลด์)', !!(rel.build && vm2 && String(rel.build) === vm2[1]), `release=${rel.build} sw=${vm2 && vm2[1]}`);
console.log(fails ? `\nผล: ตก ${fails} ข้อ` : '\nผล: ผ่านทุกข้อ'); process.exit(fails ? 1 : 0);
