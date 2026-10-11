// hook_calls.mjs: แทนที่ "การเรียก" ชื่อ T เป็น H ในไฟล์ที่ระบุ ตาม offset จาก AST เท่านั้น (ไม่แตะการใช้เป็นค่า/นิยาม/property)
// เพิ่ม "let H=()=>{};" ท้ายไฟล์ headFile และ "H=T;" ท้ายไฟล์ bindFile
// ใช้: node hook_calls.mjs <mdir> <T> <H> <headFile> <bindFile> <callerFile1,callerFile2,...>
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const [mdir, T, H, headFile, bindFile, callersArg] = process.argv.slice(2); const callers = callersArg.split(',');
const rq = createRequire('/app/conversations/6ab305110a4ed95a28bc31b7/repo/package.json'); const acorn = rq('acorn');
const isP = (p, k) => p && p.type === 'MemberExpression' && k === 'property' && !p.computed;
const kids = (n) => { const r = []; for (const k of Object.keys(n)) { const c = n[k]; if (Array.isArray(c)) c.forEach(x => x && typeof x.type === 'string' && r.push([k, x])); else if (c && typeof c.type === 'string') r.push([k, c]); } return r; };
let total = 0;
for (const f of callers) {
  const p = path.join(mdir, f); let code = fs.readFileSync(p, 'utf8'); const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' }); const pos = [];
  (function w(x, par, key) { if (x.type === 'Identifier' && x.name === T && par && par.type === 'CallExpression' && key === 'callee' && !isP(par, key)) pos.push([x.start, x.end]); for (const [k, c] of kids(x)) w(c, x, k); })(ast, null, null);
  for (const [s, e] of pos.sort((a, b) => b[0] - a[0])) code = code.slice(0, s) + H + code.slice(e);
  fs.writeFileSync(p, code); console.log(f.slice(0, 2), 'แทนที่', pos.length, 'จุด'); total += pos.length;
}
const hp = path.join(mdir, headFile); let h = fs.readFileSync(hp, 'utf8'); if (!h.endsWith('\n')) h += '\n'; fs.writeFileSync(hp, h + `/* hook for ${T} (evarel-ts-1g): ผู้เรียกชั้นล่างเรียกผ่าน ${H} เพื่อไม่ชี้ย้อนทิศไปไฟล์ที่ประกาศ ${T} */\nlet ${H}=()=>{};\n`);
const bp = path.join(mdir, bindFile); let b = fs.readFileSync(bp, 'utf8'); if (!b.endsWith('\n')) b += '\n'; fs.writeFileSync(bp, b + `${H}=${T};\n`);
console.log('รวมแทนที่', total, 'จุด | ประกาศ hook ที่', headFile.slice(0, 2), '| ผูกค่าที่', bindFile.slice(0, 2));
