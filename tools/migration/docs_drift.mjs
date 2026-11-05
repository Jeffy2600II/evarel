// docs_drift.mjs (evarel-close-open-items): ตรวจว่าตาราง "ACTIONS Dictionary" ใน docs/system-logic.md ตรงกับคีย์ของ ACTIONS ในโค้ดจริง
// อ่านอย่างเดียว ไม่แก้ไฟล์ใด ใช้: node docs_drift.mjs <appdir> [--doc docs/system-logic.md]  exit 0=ตรง 1=drift 2=ตรวจไม่ได้
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const acorn = createRequire('/app/conversations/6ab305110a4ed95a28bc31b7/repo/package.json')('acorn');
const app = process.argv[2]; const di = process.argv.indexOf('--doc'); const doc = di > 0 ? process.argv[di + 1] : 'docs/system-logic.md';
if (!app) { console.error('ใช้: node docs_drift.mjs <appdir>'); process.exit(2); }
const dir = path.join(app, 'js/m'); const files = JSON.parse(fs.readFileSync(path.join(dir, '_order.json'), 'utf8')).order.map(o => o.file);
// 1) คีย์ของ ACTIONS จากโค้ดด้วย AST (ไม่ใช้ regex เพราะค่าเป็นฟังก์ชันลูกศรซ้อนกัน)
let codeKeys = null, where = '';
for (const f of files) { const code = fs.readFileSync(path.join(dir, f), 'utf8'); const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
  for (const st of ast.body) if (st.type === 'VariableDeclaration') for (const d of st.declarations)
    if (d.id.name === 'ACTIONS' && d.init && d.init.type === 'ObjectExpression') {
      if (codeKeys) { console.error('พบ ACTIONS ประกาศซ้ำ'); process.exit(2); }
      codeKeys = d.init.properties.filter(p => p.type === 'Property').map(p => p.key.name ?? p.key.value); where = f; } }
if (!codeKeys) { console.error('ไม่พบ ACTIONS ในโค้ด'); process.exit(2); }
// 2) ชื่อใน section 4.3 ของเอกสาร: คอลัมน์แรกของตาราง รองรับ `a` / `b` / `c` ในแถวเดียว
const md = fs.readFileSync(doc, 'utf8'); const s = md.indexOf('ACTIONS Dictionary'); if (s < 0) { console.error('ไม่พบหัวข้อ ACTIONS Dictionary ในเอกสาร'); process.exit(2); }
const rest = md.slice(s); const e = rest.search(/\n---\n|\n#{2,3} (?!4\.3)/); const sec = e > 0 ? rest.slice(0, e) : rest;
const docKeys = new Set(); for (const line of sec.split('\n')) { const m = line.match(/^\|\s*([^|]+?)\s*\|/); if (!m || /^-+$/.test(m[1]) || /Action Name/.test(m[1])) continue; for (const k of m[1].matchAll(/`([^`]+)`/g)) docKeys.add(k[1]); }
const code = new Set(codeKeys); const missingInDoc = [...code].filter(k => !docKeys.has(k)).sort(); const extraInDoc = [...docKeys].filter(k => !code.has(k)).sort();
// 3) ข้ออ้างตัวเลขและตำแหน่งไฟล์ในเอกสาร
const claim = md.match(/ACTIONS`?\s*ใน\s*`([^`]+)`\s*มี\s*(\d+)\s*key/); const claimOk = claim ? (claim[2] == code.size) : null;
console.log(`โค้ด: ACTIONS ${code.size} คีย์ ที่ ${where} | เอกสาร: ${docKeys.size} ชื่อ`);
if (claim) console.log(`เอกสารอ้างว่า: อยู่ที่ ${claim[1]} มี ${claim[2]} key | จริง: ${where} ${code.size} key`);
console.log('มีในโค้ดแต่ไม่มีในเอกสาร:', missingInDoc.length ? missingInDoc.join(', ') : '-');
console.log('มีในเอกสารแต่ไม่มีในโค้ด:', extraInDoc.length ? extraInDoc.join(', ') : '-');
const claimFileOk = !claim || fs.existsSync(path.join(app, 'js', path.basename(claim[1]))) || claim[1].includes(where.replace(/^\d+-/, '').replace('.js', '')) ;
const drift = missingInDoc.length || extraInDoc.length || claimOk === false;
console.log(drift ? 'DOCS-DRIFT FOUND' : 'DOCS-DRIFT NONE'); process.exit(drift ? 1 : 0);
