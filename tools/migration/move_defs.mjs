// move_defs.mjs: ย้ายนิยามระดับบนสุดของชื่อที่ระบุจากไฟล์ต้นทางไปท้ายไฟล์ปลายทาง โดยแก้ตาม offset จาก AST เท่านั้น
// ใช้: node move_defs.mjs <srcMdir> <dstMdir> <destFile> <name1,name2,...>   (dstMdir ต้องเป็นสำเนาที่ยังไม่แก้)
// จัดการกรณี "const A=..,B=.." หลายชื่อในคำสั่งเดียว: ตัดเฉพาะ declarator ที่ระบุ ที่เหลืออยู่ที่เดิม
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const [src, dst, destFile, namesArg] = process.argv.slice(2); const names = new Set(namesArg.split(','));
const rq = createRequire('/app/conversations/6ab305110a4ed95a28bc31b7/repo/package.json'); const acorn = rq('acorn');
const order = JSON.parse(fs.readFileSync(path.join(src, '_order.json'), 'utf8')).order.map(o => o.file);
const moved = []; const edits = {}; const found = new Set();
for (const f of order) {
  const code = fs.readFileSync(path.join(src, f), 'utf8'); const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration' && st.id && names.has(st.id.name)) { if (f === destFile) { found.add(st.id.name); continue; } moved.push(code.slice(st.start, st.end)); (edits[f] = edits[f] || []).push([st.start, st.end, st.id.name]); found.add(st.id.name); }
    else if (st.type === 'VariableDeclaration' && st.declarations.some(d => d.id.type === 'Identifier' && names.has(d.id.name))) {
      const keep = st.declarations.filter(d => !(d.id.type === 'Identifier' && names.has(d.id.name))); const take = st.declarations.filter(d => d.id.type === 'Identifier' && names.has(d.id.name));
      take.forEach(d => found.add(d.id.name)); if (f === destFile) continue;
      if (take.some(d => st.kind === 'let' && !d.init)) throw new Error('ไม่รองรับ let ไม่มีค่าเริ่ม: ' + take.map(d => d.id.name));
      const piece = `${st.kind} ${take.map(d => code.slice(d.start, d.end)).join(',')};`; moved.push(piece);
      if (keep.length === 0) (edits[f] = edits[f] || []).push([st.start, st.end, take.map(d => d.id.name).join(',')]);
      else { // สร้างคำสั่งใหม่เฉพาะส่วนที่เหลือ แทนที่ทั้งคำสั่งเดิม
        (edits[f] = edits[f] || []).push([st.start, st.end, take.map(d => d.id.name).join(','), `${st.kind} ${keep.map(d => code.slice(d.start, d.end)).join(',')};`]); }
    }
  }
}
const miss = [...names].filter(n => !found.has(n)); if (miss.length) { console.error('ไม่พบนิยาม:', miss.join(',')); process.exit(2); }
for (const [f, es] of Object.entries(edits)) { const p = path.join(dst, f); let code = fs.readFileSync(p, 'utf8'); for (const e of es.sort((a, b) => b[0] - a[0])) code = code.slice(0, e[0]) + (e[3] || '') + code.slice(e[1]); fs.writeFileSync(p, code); }
const dp = path.join(dst, destFile); let dcode = fs.readFileSync(dp, 'utf8'); if (!dcode.endsWith('\n')) dcode += '\n'; dcode += '/* moved by move_defs (evarel-ts-1f) */\n' + moved.join('\n') + '\n'; fs.writeFileSync(dp, dcode);
console.log('ย้ายแล้ว', moved.length, 'คำสั่ง | ชื่อ', [...names].join(',') , '| แก้ไฟล์ต้นทาง', Object.keys(edits).map(f => f.slice(0, 2)).join(','));
