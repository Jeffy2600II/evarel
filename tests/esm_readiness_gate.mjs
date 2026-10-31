// esm_readiness_gate.mjs (evarel-esm-1a): ประตูความพร้อมเป็น ES module ของ js/app/*.js (สคริปต์คลาสสิก)
// ตรวจ 3 อย่างที่ ES module จะทำให้พัง: (1) ตัวแปรร่วมถูก assign จากไฟล์อื่นที่ไม่ใช่ไฟล์ประกาศ (import เป็น read-only)
// (2) implicit global (assign ชื่อที่ไม่เคยประกาศ ใน strict mode จะ throw) (3) this ระดับบนสุด (ใน module คือ undefined)
// ใช้: node esm_readiness_gate.mjs <appdir>  exit 0=ผ่าน  1=ตก
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const acorn = createRequire('/app/conversations/6ab305110a4ed95a28bc31b7/repo/package.json')('acorn');
const app = process.argv[2]; const dir = path.join(app, 'js/app');
const files = JSON.parse(fs.readFileSync(path.join(dir, '_order.json'), 'utf8')).order.map(o => o.file);
const kids = (n) => { const r = []; for (const k of Object.keys(n)) { const c = n[k]; if (Array.isArray(c)) c.forEach(x => x && typeof x.type === 'string' && r.push([k, x])); else if (c && typeof c.type === 'string') r.push([k, c]); } return r; };
const pn = (p, o) => { if (!p) return; if (p.type === 'Identifier') o.push(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach(x => pn(x.value || x.argument, o)); else if (p.type === 'ArrayPattern') p.elements.forEach(x => pn(x, o)); else if (p.type === 'AssignmentPattern') pn(p.left, o); else if (p.type === 'RestElement') pn(p.argument, o); };
const parsed = {}, topDecl = {}; // ชื่อระดับบนสุด -> ไฟล์
for (const f of files) { const code = fs.readFileSync(path.join(dir, f), 'utf8'); const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' }); parsed[f] = { code, ast };
  for (const st of ast.body) { if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') topDecl[st.id.name] = f; else if (st.type === 'VariableDeclaration') st.declarations.forEach(d => { const o = []; pn(d.id, o); o.forEach(n => topDecl[n] = f); }); } }
const KNOWN_GLOBALS = new Set(['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'location', 'history', 'console', 'FullCalendar', 'Notification', 'crypto', 'performance', 'self']);
const cross = [], implicit = [], thisTop = [];
for (const f of files) { const { code, ast } = parsed[f]; const line = (pos) => code.slice(0, pos).split('\n').length;
  (function w(n, parent, key, scopes, fnDepth) {
    const here = new Set();
    if (/Function/.test(n.type)) { n.params.forEach(p => { const o = []; pn(p, o); o.forEach(x => here.add(x)); }); if (n.id && n.type === 'FunctionExpression') here.add(n.id.name); }
    if (n.type === 'CatchClause' && n.param) { const o = []; pn(n.param, o); o.forEach(x => here.add(x)); }
    if (n.type === 'BlockStatement' || n.type === 'Program' || /Function/.test(n.type) && n.body.type === 'BlockStatement') { const body = n.type === 'BlockStatement' || n.type === 'Program' ? n.body : []; body.forEach(s => { if (s.type === 'VariableDeclaration') s.declarations.forEach(d => { const o = []; pn(d.id, o); o.forEach(x => here.add(x)); }); if (s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') here.add(s.id.name); }); }
    if (n.type === 'ForStatement' && n.init && n.init.type === 'VariableDeclaration') n.init.declarations.forEach(d => { const o = []; pn(d.id, o); o.forEach(x => here.add(x)); });
    if ((n.type === 'ForInStatement' || n.type === 'ForOfStatement') && n.left.type === 'VariableDeclaration') n.left.declarations.forEach(d => { const o = []; pn(d.id, o); o.forEach(x => here.add(x)); });
    if (n.type === 'VariableDeclaration' && n.kind === 'var') n.declarations.forEach(d => { const o = []; pn(d.id, o); o.forEach(x => here.add(x)); });
    const sc = here.size ? [...scopes, here] : scopes; const isLocal = (name) => sc.some(s => s.has(name));
    const target = (p) => { const o = []; pn(p, o); o.forEach(name => { if (isLocal(name)) return; if (topDecl[name] && topDecl[name] !== f) cross.push(`${name} (ประกาศ ${topDecl[name].slice(0, 2)}) ถูกเขียนที่ ${f.slice(0, 2)}:${line(p.start)}`); else if (!topDecl[name] && !KNOWN_GLOBALS.has(name)) implicit.push(`${name} @ ${f.slice(0, 2)}:${line(p.start)}`); }); };
    if (n.type === 'AssignmentExpression') target(n.left); if (n.type === 'UpdateExpression' && n.argument.type === 'Identifier') target(n.argument);
    if (n.type === 'ThisExpression' && fnDepth === 0) thisTop.push(`${f.slice(0, 2)}:${line(n.start)}`);
    const nd = (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression') ? fnDepth + 1 : fnDepth; // ลูกศร this สืบทอดจากภายนอก จึงไม่เพิ่มความลึก
    for (const [k, c] of kids(n)) w(c, n, k, sc, nd);
  })(parsed[f].ast, null, null, [], 0);
}
const ok = !cross.length && !implicit.length && !thisTop.length;
console.log(`ESM-READINESS ${ok ? 'PASS' : 'FAIL'} | ไฟล์ ${files.length} | ชื่อระดับบนสุด ${Object.keys(topDecl).length} | เขียนข้ามไฟล์ ${cross.length} | implicit global ${implicit.length} | this ระดับบนสุด ${thisTop.length}`);
cross.forEach(x => console.log('  - เขียนข้ามไฟล์: ' + x)); implicit.forEach(x => console.log('  - implicit global: ' + x)); thisTop.forEach(x => console.log('  - this ระดับบนสุด: ' + x));
process.exit(ok ? 0 : 1);
