// dep_manifest.mjs: สร้างแผนที่การพึ่งพาของโมดูลคลาสสิก (js/m/*.js) จากโค้ดจริงด้วย AST ไม่แก้โค้ดแอป
// ใช้: node dep_manifest.mjs <mdir> [--parser acorn|babel] [--write <out.json>]
// หลักการ: ใช้ตัวเดินต้นไม้ชุดเดียว รับ parser สองแบบ เพื่อให้เทียบผลข้าม parser ได้ (U1)
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const args = process.argv.slice(2); const mdir = args[0];
const pi = args.indexOf('--parser'); const which = pi >= 0 ? args[pi + 1] : 'acorn';
const wi = args.indexOf('--write'); const out = wi >= 0 ? args[wi + 1] : null;
const rq = createRequire('/app/conversations/6ab305110a4ed95a28bc31b7/repo/package.json');
let parse;
if (which === 'babel') { const b = createRequire('/app/fanhoard-page/package.json')('@babel/parser'); parse = (c) => b.parse(c, { sourceType: 'module', ranges: false }).program; }
else { const a = rq('acorn'); parse = (c) => a.parse(c, { ecmaVersion: 'latest', sourceType: 'module' }); }
const order = JSON.parse(fs.readFileSync(path.join(mdir, '_order.json'), 'utf8')).order.map(o => o.file);
const idx = Object.fromEntries(order.map((f, i) => [f, i]));
const kids = (n) => { const r = []; for (const k of Object.keys(n)) { if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra' || k === 'leadingComments' || k === 'trailingComments' || k === 'innerComments') continue; const c = n[k]; if (Array.isArray(c)) c.forEach(x => x && typeof x.type === 'string' && r.push([k, x])); else if (c && typeof c.type === 'string') r.push([k, c]); } return r; };
const isFn = (t) => /Function/.test(t) || t === 'ClassMethod' || t === 'ObjectMethod' || t === 'ClassPrivateMethod';
const bind = (p, acc) => { if (!p) return; if (p.type === 'Identifier') acc.push(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach(q => bind(q.value || q.argument, acc)); else if (p.type === 'ArrayPattern') p.elements.forEach(e => bind(e, acc)); else if (p.type === 'AssignmentPattern') bind(p.left, acc); else if (p.type === 'RestElement') bind(p.argument, acc); };
const asts = {}, declares = {}, owner = {};
for (const f of order) {
  const prog = parse(fs.readFileSync(path.join(mdir, f), 'utf8')); asts[f] = prog; declares[f] = [];
  for (const st of prog.body) { if (st.type === 'VariableDeclaration') st.declarations.forEach(d => bind(d.id, declares[f])); else if ((st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') && st.id) declares[f].push(st.id.name); }
  declares[f].forEach(n => { (owner[n] = owner[n] || []).push(f); });
}
const dupNames = Object.entries(owner).filter(([, fs_]) => fs_.length > 1).map(([n, fs_]) => ({ name: n, files: fs_ }));
// ขอบเขตท้องถิ่น (evarel-ts-1j): ชื่อที่ถูกผูกในฟังก์ชัน/บล็อกที่ครอบจุดอ้างอิง ไม่นับเป็นการพึ่งพาข้ามไฟล์
// var ยกขึ้นถึงฟังก์ชันที่ครอบ ส่วน let/const/class/function ภายในผูกที่บล็อกของมัน
const isBlockScope = (t) => t === 'BlockStatement' || t === 'StaticBlock' || t === 'ForStatement' || t === 'ForInStatement' || t === 'ForOfStatement' || t === 'SwitchStatement' || t === 'CatchClause' || t === 'Program';
const collectVar = (n, acc) => { // รวบรวม var ในฟังก์ชันนี้ (ไม่ลงไปในฟังก์ชันซ้อน)
  if (n.type === 'VariableDeclaration' && n.kind === 'var') n.declarations.forEach(d => bind(d.id, acc));
  for (const [, c] of kids(n)) if (!isFn(c.type)) collectVar(c, acc);
};
const blockDecls = (n) => { // ชื่อที่ผูกตรงในบล็อกนี้ (let/const/class/function declaration ที่เป็นลูกตรงของบล็อก)
  const acc = []; const list = n.type === 'SwitchStatement' ? n.cases.flatMap(c => c.consequent) : (n.body && Array.isArray(n.body) ? n.body : []);
  for (const s of list) { if (s.type === 'VariableDeclaration' && s.kind !== 'var') s.declarations.forEach(d => bind(d.id, acc)); else if ((s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') && s.id) acc.push(s.id.name); }
  return acc;
};
const scopeNames = (n, isTop) => { // ชื่อที่ node นี้เปิดขอบเขตใหม่และผูก
  const acc = [];
  if (isFn(n.type)) { (n.params || []).forEach(p => bind(p, acc)); if (n.type === 'FunctionExpression' && n.id) acc.push(n.id.name); if (n.body && n.body.type === 'BlockStatement') collectVar(n.body, acc); }
  else if (n.type === 'ClassExpression' && n.id) acc.push(n.id.name);
  else if (n.type === 'CatchClause' && n.param) bind(n.param, acc);
  else if ((n.type === 'ForStatement') && n.init && n.init.type === 'VariableDeclaration' && n.init.kind !== 'var') n.init.declarations.forEach(d => bind(d.id, acc));
  else if ((n.type === 'ForInStatement' || n.type === 'ForOfStatement') && n.left && n.left.type === 'VariableDeclaration' && n.left.kind !== 'var') n.left.declarations.forEach(d => bind(d.id, acc));
  if (isBlockScope(n.type) && !(isTop && n.type === 'Program')) acc.push(...blockDecls(n)); // Program: ชื่อบนสุดไม่ถือเป็นท้องถิ่น
  if (isFn(n.type) && n.body && n.body.type === 'BlockStatement') { /* บล็อกของฟังก์ชันจะเปิดขอบเขตของมันเองตอนเดินเข้า */ }
  return acc;
};
const explainOn = args.includes('--explain'); const shadowed = [];
const uses = {}, loadRefs = [];
for (const f of order) {
  uses[f] = {};
  (function w(n, par, key, inFn, scopes) {
    const nowIn = inFn || isFn(n.type);
    const here = scopeNames(n, true); const sc2 = here.length ? [...scopes, new Set(here)] : scopes;
    if (n.type === 'Identifier') {
      const isP = par && /MemberExpression/.test(par.type) && key === 'property' && !par.computed;
      const isK = par && /Property|ObjectProperty/.test(par.type) && key === 'key' && !par.computed && !par.shorthand;
      const isDecl = par && par.type === 'VariableDeclarator' && key === 'id';
      const isFnName = par && isFn(par.type) && key === 'id';
      if (!isP && !isK && !isDecl && !isFnName) {
        const os = owner[n.name]; if (os && scopes.some(s => s.has(n.name))) { if (explainOn) for (const g of os) if (g !== f) shadowed.push(`${f} (${n.name}) ผูกท้องถิ่น ไม่นับพึ่ง ${g}`); }
        else if (os) for (const g of os) if (g !== f) {
          (uses[f][g] = uses[f][g] || new Set()).add(n.name);
          if (!inFn) loadRefs.push({ from: f, to: g, name: n.name, forward: idx[g] > idx[f] });
        }
      }
    }
    for (const [k, c] of kids(n)) w(c, n, k, nowIn, sc2);
  })(asts[f], null, null, false, []);
}
const edges = {}; for (const f of order) edges[f] = Object.keys(uses[f]).sort();
const backEdges = []; for (const f of order) for (const g of edges[f]) if (idx[g] > idx[f]) backEdges.push(`${f} -> ${g}`);
// SCC (Tarjan)
const ix = {}, lw = {}, on = new Set(), st = [], comps = []; let c = 0;
const sc = (v) => { ix[v] = lw[v] = c++; st.push(v); on.add(v); for (const w of edges[v]) { if (!(w in ix)) { sc(w); lw[v] = Math.min(lw[v], lw[w]); } else if (on.has(w)) lw[v] = Math.min(lw[v], ix[w]); } if (lw[v] === ix[v]) { const comp = []; let w; do { w = st.pop(); on.delete(w); comp.push(w); } while (w !== v); comps.push(comp.sort()); } };
for (const v of order) if (!(v in ix)) sc(v);
const cyc = comps.filter(x => x.length > 1).sort((a, b) => b.length - a.length);
const m = {
  schema: 1, files: order.length,
  summary: {
    pairEdges: order.reduce((a, f) => a + edges[f].length, 0), backEdges: backEdges.length, loadTimeRefs: loadRefs.length,
    loadTimeForwardRefs: loadRefs.filter(r => r.forward).length, duplicateTopLevelNames: dupNames.length,
    cyclicGroups: cyc.map(g => g.length), largestCycleFiles: cyc[0] || []
  },
  backEdges: backEdges.sort(),
  loadTimeRefs: loadRefs.map(r => `${r.from} -> ${r.to} (${r.name})${r.forward ? ' FORWARD' : ''}`).sort(),
  files_detail: Object.fromEntries(order.map(f => [f, { declares: declares[f], dependsOn: edges[f] }]))
};
if (explainOn) { const uniq = [...new Set(shadowed)].sort(); console.error('ตัดออกเพราะผูกท้องถิ่น ' + uniq.length + ' รายการ:'); uniq.forEach(x => console.error('  ' + x)); }
const text = JSON.stringify(m, null, 1) + '\n';
if (out) fs.writeFileSync(out, text); else process.stdout.write(text);
console.error(`parser=${which} | files=${m.files} pairEdges=${m.summary.pairEdges} back=${m.summary.backEdges} loadRefs=${m.summary.loadTimeRefs} loadFwd=${m.summary.loadTimeForwardRefs} dup=${m.summary.duplicateTopLevelNames} cycles=${JSON.stringify(m.summary.cyclicGroups)}`);
