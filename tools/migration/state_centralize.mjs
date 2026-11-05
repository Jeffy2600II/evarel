// state_centralize.mjs: รวมตัวแปรร่วมระดับบนสุด 10 ตัวเป็นอ็อบเจ็กต์ ST (ทาง Y ของ evarel-ts-1c)
// หลักการ: ใช้ AST (acorn) หาตำแหน่งจริงของ "การประกาศ" และ "ทุกการอ้างถึง" แล้วแก้ที่ offset เท่านั้น ไม่ใช้ regex กับเนื้อโค้ด ไม่พิมพ์โค้ดซ้ำ
// ใช้: node state_centralize.mjs <mdir>   (mdir = โฟลเดอร์ js/m ที่มี _order.json) แก้ไฟล์ในที่ หลังทำสำรองแล้ว
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire('/app/conversations/6ab305110a4ed95a28bc31b7/repo/package.json');
const acorn = require('acorn');
const VARS = ['sheetMode','drag','popBtn','D','TM','focusId','CH','DETAIL','DV','swipeX'];
const mdir = process.argv[2];
const order = JSON.parse(fs.readFileSync(path.join(mdir,'_order.json'),'utf8')).order.map(o=>o.file);
const kids = (n)=>{ const r=[]; for(const k of Object.keys(n)){ const c=n[k]; if(Array.isArray(c)) c.forEach(x=>x&&typeof x.type==='string'&&r.push([k,x])); else if(c&&typeof c.type==='string') r.push([k,c]); } return r; };
const files = {}; const inits = {}; const edits = {}; const report = {decl:[], refs:0, shorthand:0};
for (const f of order) { files[f] = fs.readFileSync(path.join(mdir,f),'utf8'); edits[f] = []; }
for (const f of order) {
  const code = files[f]; const ast = acorn.parse(code,{ecmaVersion:'latest',sourceType:'script'});
  // 1) การประกาศระดับบนสุด
  const declRanges = [];
  for (const st of ast.body) {
    if (st.type==='VariableDeclaration') {
      const names = st.declarations.map(d=>d.id.type==='Identifier'?d.id.name:null);
      const hit = names.filter(n=>VARS.includes(n));
      if (hit.length) {
        if (st.declarations.length!==1 || st.kind!=='let') throw new Error(`${f}: การประกาศรวม/ไม่ใช่ let ที่ offset ${st.start} ต้องจัดการด้วยมือ`);
        const d = st.declarations[0]; const name = d.id.name;
        inits[name] = d.init ? code.slice(d.init.start, d.init.end) : 'undefined';
        edits[f].push({start:st.start, end:st.end, text:''}); declRanges.push([st.start,st.end]); report.decl.push(`${name} @ ${f}`);
      }
    }
  }
  // 2) ทุกการอ้างถึง: เดินต้นไม้ แยกบริบทที่ไม่ใช่ "การอ้างตัวแปร" ออก
  (function walk(n, parent, key) {
    if (n.type==='Identifier' && VARS.includes(n.name)) {
      const inDecl = declRanges.some(([s,e])=>n.start>=s && n.end<=e);
      const isProp = parent && parent.type==='MemberExpression' && key==='property' && !parent.computed;
      const isKey = parent && parent.type==='Property' && key==='key' && !parent.computed && !parent.shorthand;
      const isMethod = parent && (parent.type==='MethodDefinition'||parent.type==='PropertyDefinition') && key==='key' && !parent.computed;
      const isLabel = parent && /Label|Break|Continue/.test(parent.type);
      if (!inDecl && !isProp && !isKey && !isMethod && !isLabel) {
        if (parent && parent.type==='Property' && parent.shorthand && key==='value') { edits[f].push({start:parent.start,end:parent.end,text:`${n.name}:ST.${n.name}`}); report.shorthand++; }
        else if (parent && parent.type==='Property' && parent.shorthand && key==='key') { /* ข้าม: คีย์ของ shorthand จัดการที่ value */ }
        else { edits[f].push({start:n.start,end:n.end,text:'ST.'+n.name}); report.refs++; }
      }
    }
    for (const [k,c] of kids(n)) walk(c, n, k);
  })(ast, null, null);
}
// 3) ตรวจตัวแปรครบ 10 ตัวถูกประกาศ
const miss = VARS.filter(v=>!(v in inits)); if (miss.length) throw new Error('ไม่พบการประกาศ: '+miss);
// 4) ใช้การแก้จากท้ายไปหน้า (ไม่ให้ offset เลื่อน)
let changed = 0;
for (const f of order) {
  const es = edits[f].sort((a,b)=>b.start-a.start); let c = files[f];
  for (let i=1;i<es.length;i++) if (es[i].end>es[i-1].start) throw new Error(`${f}: การแก้ซ้อนทับ`);
  for (const e of es) c = c.slice(0,e.start)+e.text+c.slice(e.end);
  if (c!==files[f]) { fs.writeFileSync(path.join(mdir,f),c); changed++; }
}
// 5) ประกาศ ST ที่ท้ายไฟล์หัว (00-head.js) ตามลำดับเดิมของตัวแปร
const stLine = '\nconst ST={'+VARS.map(v=>`${v}:${inits[v]}`).join(',')+'};\n';
const headP = path.join(mdir, order[0]); fs.appendFileSync(headP, stLine);
console.log(JSON.stringify({ไฟล์ที่แก้:changed, ประกาศที่ลบ:report.decl.length, การอ้างที่แปลง:report.refs, shorthandที่แปลง:report.shorthand, ST:stLine.trim().slice(0,200)}));
