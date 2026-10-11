// ตัวตรวจย้อนกลับ: ไฟล์ใหม่ (หลังแปลง) + ย้อน ST.X -> X + ใส่การประกาศ let กลับ ต้องเท่ากับต้นฉบับ ณ ระดับ "token" (ไม่นับช่องว่าง/ขึ้นบรรทัด)
// ใช้: node state_centralize_verify.mjs <origDir> <newDir>
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire('/app/conversations/6ab305110a4ed95a28bc31b7/repo/package.json');
const acorn = require('acorn');
const VARS = ['sheetMode','drag','popBtn','D','TM','focusId','CH','DETAIL','DV','swipeX'];
const [,, origDir, newDir] = process.argv;
const order = JSON.parse(fs.readFileSync(path.join(origDir,'_order.json'),'utf8')).order.map(o=>o.file);
const toks = (code)=>{ const out=[]; for (const t of acorn.tokenizer(code,{ecmaVersion:'latest',sourceType:'script'})) out.push(t.type.label==='eof'?'':(t.value!==undefined?String(t.type.label+':'+(t.value instanceof RegExp?t.value:t.value)):t.type.label)); return out.filter(Boolean); };
// หา token ของ "ST . X" แล้วยุบกลับเป็น "X" ; เอาประกาศ const ST={...}; ออกจากไฟล์หัว
function revert(code, isHead){
  const ts=[...acorn.tokenizer(code,{ecmaVersion:'latest',sourceType:'script',locations:false})];
  let res=[]; for(let i=0;i<ts.length;i++){
    const t=ts[i];
    if(t.type.label==='name' && t.value==='ST' && ts[i+1]?.type.label==='.' && ts[i+2]?.type.label==='name' && VARS.includes(ts[i+2].value) && !(ts[i-1]?.type.label==='.')){ res.push('name:'+ts[i+2].value); i+=2; continue; }
    res.push(t.type.label==='eof'?'':(t.value!==undefined?t.type.label+':'+(t.value instanceof RegExp?t.value:t.value):t.type.label));
  }
  // ยุบ "X : X" (ผลย้อนของ shorthand {X:ST.X}) กลับเป็น "X" ; ต้นฉบับ {X} ก็ถูกเทียบแบบเดียวกันด้วย normShort
  return res.filter(Boolean);
}
// เทียบ shorthand: แปลง {name:X , ...} ที่มีรูป "name:X" ตามด้วย ":" แล้ว "name:X" ให้เป็น "name:X" ตัวเดียว (ทั้งสองฝั่ง)
const normShort=(a)=>{const r=[];for(let i=0;i<a.length;i++){ if(a[i].startsWith('name:')&&a[i+1]===':'&&a[i+2]===a[i]&&VARS.includes(a[i].slice(5))){r.push(a[i]);i+=2;} else r.push(a[i]); } return r;};
const origAll = order.map(f=>fs.readFileSync(path.join(origDir,f),'utf8'));
const newAll  = order.map(f=>fs.readFileSync(path.join(newDir,f),'utf8'));
let bad=0, lines=[];
for (let k=0;k<order.length;k++){
  let a = toks(origAll[k]);
  // ต้นฉบับ: ลบ token ของการประกาศ "let X = ... ;" ระดับบนสุดของ 10 ตัว (เพราะถูกย้ายไป ST)
  const ast = acorn.parse(origAll[k],{ecmaVersion:'latest',sourceType:'script'});
  let code=origAll[k]; const cut=[];
  for (const st of ast.body) if (st.type==='VariableDeclaration' && st.declarations.length===1 && st.declarations[0].id.type==='Identifier' && VARS.includes(st.declarations[0].id.name)) cut.push([st.start,st.end]);
  for (const [s,e] of cut.sort((x,y)=>y[0]-x[0])) code=code.slice(0,s)+code.slice(e);
  a = normShort(toks(code));
  let n = normShort(revert(newAll[k]));
  // ไฟล์หัว: ตัด const ST={...}; ออก
  if (k===0){ const m=newAll[k].indexOf('\nconst ST={'); if(m<0){bad++;lines.push('หัว: ไม่พบ const ST');continue;} const end=newAll[k].indexOf('};',m)+2; n = normShort(revert(newAll[k].slice(0,m)+newAll[k].slice(end))); }
  const same = a.length===n.length && a.every((x,i)=>x===n[i]);
  if(!same){ bad++; let i=0; while(i<a.length&&a[i]===n[i]) i++; lines.push(`${order[k]}: ต่าง token ที่ #${i}: ต้นฉบับ=${a[i]} ใหม่=${n[i]}`); }
}
// แกนที่ 2 (สำคัญ): ในไฟล์ใหม่ ห้ามเหลือตัวแปรทั้ง 10 ตัวเป็น "ตัวแปรเปล่า" (ไม่ใช่ ST.X, ไม่ใช่คีย์/property)
const kidsV=(n)=>{const r=[];for(const k of Object.keys(n)){const c=n[k];if(Array.isArray(c))c.forEach(x=>x&&typeof x.type==='string'&&r.push([k,x]));else if(c&&typeof c.type==='string')r.push([k,c]);}return r;};
let leftover=0; const leftLines=[];
for (let k=0;k<order.length;k++){
  const ast=acorn.parse(newAll[k],{ecmaVersion:'latest',sourceType:'script',locations:true});
  (function w(n,par,key){
    if(n.type==='Identifier'&&VARS.includes(n.name)){
      const isProp=par&&par.type==='MemberExpression'&&key==='property'&&!par.computed;
      const isKey=par&&par.type==='Property'&&key==='key'&&!par.computed&&!par.shorthand;
      const isShortKey=par&&par.type==='Property'&&par.shorthand&&key==='key';
      if(!isProp&&!isKey&&!isShortKey){leftover++;leftLines.push(`${order[k]}:${n.loc.start.line} ตัวแปรเปล่า ${n.name}`);}
    }
    for(const [kk,c] of kidsV(n)) w(c,n,kk);
  })(ast,null,null);
}
if(leftover){bad+=leftover;lines.push(...leftLines.slice(0,5));}
console.log(bad===0?`VERIFY-PASS ทุก ${order.length} ไฟล์: ย้อนกลับเท่าต้นฉบับระดับ token และไม่เหลือตัวแปรเปล่า`:`VERIFY-FAIL ${bad} รายการ\n`+lines.slice(0,5).join('\n'));
process.exit(bad===0?0:1);
