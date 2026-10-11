// state_wrap.mjs: ห่อตัวแปรร่วมระดับบนสุดที่ "ถูกกำหนดค่าใหม่ข้ามไฟล์" เข้า ST (evarel-esm-1a) เพื่อให้พร้อมเป็น ES module (import เป็น read-only)
// ต่างจาก state_centralize.mjs (ts-1c): รับรายชื่อจาก CLI, รองรับประกาศรวมหลายตัว (let A=1,B=2;), ตรวจ shadow ก่อนแก้แล้ว throw, ต่อเข้า ST เดิมที่มีอยู่ (ไม่สร้างใหม่)
// ใช้: node state_wrap.mjs <mdir> NAME1,NAME2,...   (แก้ไฟล์ในที่ ต้องสำรองก่อนเรียก) หลักการเดิม: ใช้ AST หา offset จริงแล้วแก้ที่ offset ไม่พิมพ์โค้ดใหม่
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const acorn = createRequire('/app/conversations/6ab305110a4ed95a28bc31b7/repo/package.json')('acorn');
const mdir = process.argv[2]; const VARS = (process.argv[3] || '').split(',').filter(Boolean); if (!mdir || !VARS.length) throw new Error('ใช้: node state_wrap.mjs <mdir> NAME1,NAME2');
const order = JSON.parse(fs.readFileSync(path.join(mdir, '_order.json'), 'utf8')).order.map(o => o.file);
const kids = (n) => { const r = []; for (const k of Object.keys(n)) { const c = n[k]; if (Array.isArray(c)) c.forEach(x => x && typeof x.type === 'string' && r.push([k, x])); else if (c && typeof c.type === 'string') r.push([k, c]); } return r; };
const pn = (p, o) => { if (!p) return; if (p.type === 'Identifier') o.push(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach(x => pn(x.value || x.argument, o)); else if (p.type === 'ArrayPattern') p.elements.forEach(x => pn(x, o)); else if (p.type === 'AssignmentPattern') pn(p.left, o); else if (p.type === 'RestElement') pn(p.argument, o); };
const files = {}, edits = {}, inits = {}, report = { decl: [], refs: 0, shorthand: 0, partialDecl: 0 };
for (const f of order) { files[f] = fs.readFileSync(path.join(mdir, f), 'utf8'); edits[f] = []; }
for (const f of order) {
  const code = files[f]; const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' }); const declRanges = [];
  for (const st of ast.body) {
    if (st.type !== 'VariableDeclaration') continue;
    const hit = st.declarations.filter(d => d.id.type === 'Identifier' && VARS.includes(d.id.name)); if (!hit.length) continue;
    if (st.kind === 'const') throw new Error(`${f}: ${hit[0].id.name} ประกาศเป็น const ไม่ควรถูก assign`);
    hit.forEach(d => { inits[d.id.name] = d.init ? code.slice(d.init.start, d.init.end) : 'undefined'; report.decl.push(`${d.id.name} @ ${f.slice(0, 2)}`); });
    if (hit.length === st.declarations.length) { edits[f].push({ start: st.start, end: st.end, text: '' }); declRanges.push([st.start, st.end]); }
    else { // ประกาศรวมที่มีตัวอื่นปนอยู่ ตัดเฉพาะตัวที่เป็นเป้าหมายออกพร้อมเครื่องหมายจุลภาคที่เกี่ยวข้อง
      report.partialDecl++; const ds = st.declarations;
      for (const d of hit) { const i = ds.indexOf(d); const s = i < ds.length - 1 ? d.start : ds[i - 1].end; const e = i < ds.length - 1 ? ds[i + 1].start : d.end; edits[f].push({ start: s, end: e, text: '' }); declRanges.push([d.start, d.end]); }
    }
  }
  (function walk(n, parent, key, scopes) {
    const here = []; if (/Function/.test(n.type)) { n.params.forEach(p => pn(p, here)); }
    if (n.type === 'CatchClause' && n.param) pn(n.param, here);
    if (n.type === 'BlockStatement' || n.type === 'Program') n.body.forEach(s => { if (s.type === 'VariableDeclaration' && n.type !== 'Program') s.declarations.forEach(d => pn(d.id, here)); if (s.type === 'FunctionDeclaration' && n.type !== 'Program') here.push(s.id.name); });
    here.filter(x => VARS.includes(x)).forEach(x => { throw new Error(`${f}: พบตัวแปรท้องถิ่นชื่อซ้ำกับตัวแปรร่วม ${x} ต้องจัดการด้วยมือ`); });
    if (n.type === 'Identifier' && VARS.includes(n.name)) {
      const inDecl = declRanges.some(([s, e]) => n.start >= s && n.end <= e);
      const isProp = parent && parent.type === 'MemberExpression' && key === 'property' && !parent.computed;
      const isKey = parent && parent.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand;
      const isMethod = parent && (parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') && key === 'key' && !parent.computed;
      const isLabel = parent && /Label|Break|Continue/.test(parent.type);
      if (!inDecl && !isProp && !isKey && !isMethod && !isLabel) {
        if (parent && parent.type === 'Property' && parent.shorthand && key === 'value') { edits[f].push({ start: parent.start, end: parent.end, text: `${n.name}:ST.${n.name}` }); report.shorthand++; }
        else if (parent && parent.type === 'Property' && parent.shorthand && key === 'key') { /* จัดการที่ value */ }
        else { edits[f].push({ start: n.start, end: n.end, text: 'ST.' + n.name }); report.refs++; }
      }
    }
    for (const [k, c] of kids(n)) walk(c, n, k, scopes);
  })(ast, null, null, []);
}
const miss = VARS.filter(v => !(v in inits)); if (miss.length) throw new Error('ไม่พบการประกาศ: ' + miss);
let changed = 0;
for (const f of order) {
  const es = edits[f].sort((a, b) => b.start - a.start); let c = files[f];
  for (let i = 1; i < es.length; i++) if (es[i].end > es[i - 1].start) throw new Error(`${f}: การแก้ซ้อนทับ`);
  for (const e of es) c = c.slice(0, e.start) + e.text + c.slice(e.end);
  if (c !== files[f]) { fs.writeFileSync(path.join(mdir, f), c); changed++; }
}
// เพิ่มคีย์เข้า ST ที่มีอยู่แล้วในไฟล์หัว (ไม่สร้าง ST ใหม่) ตามลำดับที่ระบุ
const headP = path.join(mdir, order[0]); let head = fs.readFileSync(headP, 'utf8'); const m = head.match(/const ST=\{([^]*?)\};/); if (!m) throw new Error('ไม่พบ const ST={...}; ในไฟล์หัว');
const add = VARS.map(v => `${v}:${inits[v]}`).join(','); const body = m[1].trim() ? `${m[1]},${add}` : add; head = head.replace(m[0], `const ST={${body}};`); fs.writeFileSync(headP, head);
console.log(JSON.stringify({ ไฟล์ที่แก้: changed, ประกาศที่ตัด: report.decl, ประกาศรวมที่ตัดบางส่วน: report.partialDecl, การอ้างที่แปลง: report.refs, shorthandที่แปลง: report.shorthand }));
