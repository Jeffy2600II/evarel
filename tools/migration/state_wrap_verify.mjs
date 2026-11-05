// ตัวพิสูจน์ย้อนกลับของ state_wrap.mjs (evarel-esm-1a): ไฟล์หลังแปลง ย้อน ST.X -> X แล้วเติมประกาศที่ถูกตัดกลับ ต้องเท่ากับต้นฉบับระดับ token
// ใช้: node state_wrap_verify.mjs <origDir> <newDir> NAME1,NAME2,...  ข้อยกเว้นที่ประกาศชัด: รายการ --allow-decl-move NAME@FILE=EXPR คือประกาศที่ย้ายตำแหน่งโดยตั้งใจ (ตรวจแยก)
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const acorn = createRequire('/app/conversations/6ab305110a4ed95a28bc31b7/repo/package.json')('acorn');
const [,, origDir, newDir, vars] = process.argv; const VARS = vars.split(',');
const order = JSON.parse(fs.readFileSync(path.join(origDir, '_order.json'), 'utf8')).order.map(o => o.file);
const lab = (t) => t.type.label === 'eof' ? '' : (t.value !== undefined ? t.type.label + ':' + (t.value instanceof RegExp ? String(t.value) : t.value) : t.type.label);
const toks = (code) => [...acorn.tokenizer(code, { ecmaVersion: 'latest', sourceType: 'script' })].map(lab).filter(Boolean);
// ย้อน: "ST . X" -> "X" (ไม่ใช่ member ของอย่างอื่น)
function revert(code) { const ts = [...acorn.tokenizer(code, { ecmaVersion: 'latest', sourceType: 'script' })]; const res = [];
  for (let i = 0; i < ts.length; i++) { const t = ts[i];
    if (t.type.label === 'name' && t.value === 'ST' && ts[i + 1]?.type.label === '.' && ts[i + 2]?.type.label === 'name' && VARS.includes(ts[i + 2].value) && ts[i - 1]?.type.label !== '.') { res.push('name:' + ts[i + 2].value); i += 2; continue; }
    res.push(lab(t)); } return res.filter(Boolean); }
// ประกาศที่ถูกตัด: ต้นฉบับมี "let NAME = init ;" (หรือรวมกับตัวอื่น) ในไฟล์ใด ให้ลบ token เหล่านั้นออกจากต้นฉบับก่อนเทียบ แล้วตรวจ init ที่ ST ใหม่ตรงกัน
function stripDecls(code) { const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' }); const cuts = [], inits = {};
  for (const st of ast.body) { if (st.type !== 'VariableDeclaration') continue; const hit = st.declarations.filter(d => d.id.type === 'Identifier' && VARS.includes(d.id.name)); if (!hit.length) continue;
    hit.forEach(d => inits[d.id.name] = d.init ? code.slice(d.init.start, d.init.end) : 'undefined');
    if (hit.length === st.declarations.length) cuts.push([st.start, st.end]); else for (const d of hit) { const i = st.declarations.indexOf(d); const ds = st.declarations; cuts.push(i < ds.length - 1 ? [d.start, ds[i + 1].start] : [ds[i - 1].end, d.end]); } }
  cuts.sort((a, b) => b[0] - a[0]); let c = code; for (const [s, e] of cuts) c = c.slice(0, s) + c.slice(e); return { code: c, inits }; }
let bad = 0, total = 0; const allInits = {};
const allowSet0 = new Set(process.argv.slice(5).filter(x => x.startsWith('--allow=')).map(x => x.slice(8).split(':')[0]));
for (const f of order) { const { inits } = stripDecls(fs.readFileSync(path.join(origDir, f), 'utf8')); Object.assign(allInits, inits); } /* รอบแรก: เก็บ init ของทุกไฟล์ก่อน เพราะไฟล์หัวต้องรู้ค่าที่ประกาศในไฟล์หลัง */
for (const f of order) { const o = fs.readFileSync(path.join(origDir, f), 'utf8'); const n = fs.readFileSync(path.join(newDir, f), 'utf8');
  const { code: oc, inits } = stripDecls(o); Object.assign(allInits, inits);
  let a = toks(oc), b = revert(n);
  // ข้อยกเว้นตั้งใจ: "ST.NAME=EXPR;" ที่แทรกเพิ่ม (ใช้กับ Repo) ถ้ามีรายการ allow ให้ลบ 4+ token นั้นออกจากฝั่งใหม่ก่อนเทียบ
  for (const al of (process.argv.slice(5).filter(x => x.startsWith('--allow='))).map(x => x.slice(8))) { const [nm, file, expr] = al.split(':'); if (file !== f.slice(0, 2)) continue;
    const pat = toks(`${nm}=${expr};`); for (let i = 0; i + pat.length <= b.length; i++) if (pat.every((x, k) => b[i + k] === x)) { b.splice(i, pat.length); break; } }
  // ไฟล์หัว: คีย์ที่เพิ่มเข้า ST (",NAME:INIT" ต่อท้ายตามลำดับ VARS) เป็นการเปลี่ยนที่ตั้งใจ ต้องลบออกจากฝั่งใหม่ทีละคีย์แบบเจาะจงตามค่าที่คาดไว้ แล้วค่อยเทียบ
  if (f === order[0]) { for (const v of VARS) { const want = [...allowSet0].includes(v) ? 'null' : allInits[v]; const pat = toks(`,${v}:${want}`);
    let hit = -1; for (let i = 0; i + pat.length <= b.length; i++) if (pat.every((x, k) => b[i + k] === x)) { hit = i; break; }
    if (hit < 0) { bad++; console.log(`INITKEY ${v}: ไม่พบ ,${v}:${want} ใน ST ของไฟล์หัว`); } else b.splice(hit, pat.length); } }
  total++; const ok = a.length === b.length && a.every((x, i) => x === b[i]);
  if (!ok) { bad++; let i = 0; while (i < a.length && a[i] === b[i]) i++; console.log(`DIFF ${f} @token ${i}: ต้นฉบับ=${a.slice(i, i + 4).join(' ')} | ใหม่=${b.slice(i, i + 4).join(' ')}`); } }
// ตรวจค่าเริ่มต้นที่ ST ใหม่ตรงกับ init เดิม (ยกเว้นที่ระบุว่าย้ายตำแหน่ง)
const head = fs.readFileSync(path.join(newDir, order[0]), 'utf8'); const m = head.match(/const ST=\{([^]*?)\};/);
const allowSet = new Set(process.argv.slice(5).filter(x => x.startsWith('--allow=')).map(x => x.slice(8).split(':')[0]));
for (const v of VARS) { const want = allowSet.has(v) ? 'null' : allInits[v]; const re = new RegExp('(^|,)' + v + ':' + want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(,|$)'); if (!re.test(m[1])) { bad++; console.log(`INIT ${v}: ใน ST ไม่ตรง (ต้องเป็น ${want})`); } }
console.log(`ไฟล์ ${total} | ตรงต้นฉบับ ${total - bad > 0 ? total - (bad) : 0} | ผิด ${bad} ${bad ? 'FAIL' : 'VERIFY-PASS'}`); process.exit(bad ? 1 : 0);
