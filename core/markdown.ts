/* ชั้นฐาน (ES module จริง): แปลงข้อความ Markdown ของ AI เป็น HTML ปลอดภัย ฟังก์ชันบริสุทธิ์ ไม่แตะ DOM/สถานะกลาง
   ตัดวางจาก m/12-ui__primitives ตรงตัวอักษร ห้ามปรับตรรกะ: ชุดนี้คือกำแพงกัน XSS (escape ก่อนครอบแท็ก ลิงก์รับเฉพาะ http(s)/mailto/tel)
   ตรรกะชุดเดียว: โมดูลเดิมนำเข้า mdToHtml จากที่นี่แล้วส่งออกผ่าน window เหมือนเดิม */
/* ===== MODULE: markdown (ตัวแสดงผลข้อความ AI แบบ Markdown เต็ม) =====
   หลักการ: ปลอดภัยโดยโครงสร้าง — ทุกข้อความ escape ก่อนครอบแท็ก ไม่มีทางส่ง HTML ดิบจากผู้ใช้/AI ผ่านได้ ลิงก์รับเฉพาะ http(s)/mailto/tel
   รองรับ: หัวข้อ # ถึง ######, **หนา**, *เอียง* หรือ _เอียง_, ***หนาเอียง***, ~~ขีดฆ่า~~, `โค้ดในบรรทัด`, ```บล็อกโค้ด+ภาษา```, > อ้างอิง (ซ้อนได้),
   ลิสต์ - * + และ 1. ซ้อนหลายชั้น, checklist - [ ] / - [x], ตาราง | a | b | พร้อมจัดชิด :--- :---: ---:, [ข้อความ](url), URL ลอย, เส้นคั่น --- *** ___, \ escape
   โครงสร้าง: แยกเป็นบล็อกก่อน (block) แล้วค่อยแปลงภายในบรรทัด (inline) · ส่งออกคลาส ev-md-* ให้ CSS จัดสไตล์ */
const MD_ESC=(s:string)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c as '&']));
const MD_SAFE_URL=/^(https?:\/\/|mailto:|tel:)/i;
function mdInline(src:string):string{
 /* 1) เก็บ inline code ไว้ก่อน (เนื้อในห้ามแปลงต่อ) แล้วแทนด้วยตัวยึด */
 const slots:string[]=[];const hold=(h:string)=>{slots.push(h);return '\u0000'+(slots.length-1)+'\u0000'};
 let s=String(src??'');
 s=s.replace(/\\([\\`*_{}\[\]()#+\-.!|~>])/g,(_,c)=>hold(MD_ESC(c)));
 s=s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g,(_,__,c)=>hold('<code class="ev-md-code">'+MD_ESC(c.trim())+'</code>'));
 s=MD_ESC(s);
 /* 2) ลิงก์ [text](url "title") — เฉพาะ scheme ปลอดภัย */
 s=s.replace(/\[([^\]\n]+)\]\(\s*([^\s)]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g,(m,t,u,ti)=>{const url=u.replace(/&amp;/g,'&');if(!MD_SAFE_URL.test(url))return t;return hold('<a class="ev-md-a" href="'+MD_ESC(url)+'" target="_blank" rel="noopener noreferrer"'+(ti?' title="'+ti+'"':'')+'>'+t+'</a>')});
 /* 3) URL ลอย */
 s=s.replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+[^\s<).,;:!?])/g,(m,p,u)=>p+hold('<a class="ev-md-a" href="'+u+'" target="_blank" rel="noopener noreferrer">'+u+'</a>'));
 /* 4) ตัวอักษรตกแต่ง — ลำดับ: หนาเอียง > หนา > ขีดฆ่า > เอียง */
 s=s.replace(/\*\*\*([^\s*][\s\S]*?[^\s*]|[^\s*])\*\*\*/g,'<strong><em>$1</em></strong>');
 s=s.replace(/\*\*([^\s*][\s\S]*?[^\s*]|[^\s*])\*\*/g,'<strong>$1</strong>');
 s=s.replace(/__([^\s_][\s\S]*?[^\s_]|[^\s_])__/g,'<strong>$1</strong>');
 s=s.replace(/~~([^\s~][\s\S]*?[^\s~]|[^\s~])~~/g,'<del>$1</del>');
 s=s.replace(/(^|[^\w*])\*([^\s*][^*\n]*?[^\s*]|[^\s*])\*(?!\w)/g,'$1<em>$2</em>');
 s=s.replace(/(^|[^\w_])_([^\s_][^_\n]*?[^\s_]|[^\s_])_(?!\w)/g,'$1<em>$2</em>');
 /* 5) ขึ้นบรรทัดใหม่ (ท้ายบรรทัดมีช่องว่าง 2 ตัว หรือ \) */
 s=s.replace(/(?: {2,}|\\)\n/g,'<br>');
 return s.replace(/\u0000(\d+)\u0000/g,(_,i)=>slots[+i]);
}
function mdSplitRow(line:string):string[]{let t=line.trim();if(t.startsWith('|'))t=t.slice(1);if(t.endsWith('|')&&!t.endsWith('\\|'))t=t.slice(0,-1);const out:string[]=[];let cur='';for(let i=0;i<t.length;i++){const c=t[i];if(c==='\\'&&t[i+1]==='|'){cur+='|';i++}else if(c==='|'){out.push(cur.trim());cur=''}else cur+=c}out.push(cur.trim());return out}
const MD_TABLE_SEP=/^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
function mdBlocks(lines:string[]):string{
 const out:string[]=[];let i=0;
 const isBlank=(l:string)=>!l.trim();
 while(i<lines.length){const line=lines[i];
  if(isBlank(line)){i++;continue}
  /* บล็อกโค้ด */
  let m=line.match(/^\s*(`{3,}|~{3,})\s*([\w+#.\-]*)[^\n]*$/);
  if(m){const fence=m[1],lang=m[2];const body:string[]=[];i++;while(i<lines.length&&!new RegExp('^\\s*'+fence[0]+'{'+fence.length+',}\\s*$').test(lines[i])){body.push(lines[i]);i++}i++;
   out.push('<div class="ev-md-pre">'+(lang?'<span class="ev-md-lang">'+MD_ESC(lang)+'</span>':'')+'<pre><code>'+MD_ESC(body.join('\n'))+'</code></pre></div>');continue}
  /* หัวข้อ */
  m=line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
  if(m){const n=m[1].length;out.push('<h'+(n+2>6?6:n+2)+' class="ev-md-h ev-md-h'+n+'">'+mdInline(m[2])+'</h'+(n+2>6?6:n+2)+'>');i++;continue}
  /* เส้นคั่น */
  if(/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)){out.push('<hr class="ev-md-hr">');i++;continue}
  /* ตาราง */
  if(line.includes('|')&&i+1<lines.length&&MD_TABLE_SEP.test(lines[i+1])&&lines[i+1].includes('-')){
   const head=mdSplitRow(line),seps=mdSplitRow(lines[i+1]);const al=seps.map(c=>/^:-*:$/.test(c)?'center':/-:$/.test(c)?'right':/^:-/.test(c)?'left':'');
   i+=2;const rows:string[][]=[];while(i<lines.length&&!isBlank(lines[i])&&lines[i].includes('|')){rows.push(mdSplitRow(lines[i]));i++}
   const cell=(t:string,k:number,tag:string)=>'<'+tag+(al[k]?' style="text-align:'+al[k]+'"':'')+'>'+mdInline(t)+'</'+tag+'>';
   out.push('<div class="ev-md-tablewrap"><table class="ev-md-table"><thead><tr>'+head.map((c,k)=>cell(c,k,'th')).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+head.map((_,k)=>cell(r[k]??'',k,'td')).join('')+'</tr>').join('')+'</tbody></table></div>');continue}
  /* อ้างอิง (ซ้อนได้ — ถอด > แล้วแปลงเนื้อในซ้ำ) */
  if(/^\s{0,3}>/.test(line)){const q:string[]=[];while(i<lines.length&&/^\s{0,3}>/.test(lines[i])){q.push(lines[i].replace(/^\s{0,3}>\s?/,''));i++}out.push('<blockquote class="ev-md-quote">'+mdBlocks(q)+'</blockquote>');continue}
  /* ลิสต์ (ซ้อนตามการย่อหน้า) */
  const LI=/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
  if(LI.test(line)){const res=mdList(lines,i);out.push(res.html);i=res.next;continue}
  /* ย่อหน้า: รวมบรรทัดต่อเนื่องจนเจอบล็อกอื่น */
  const para:string[]=[line];i++;
  while(i<lines.length&&!isBlank(lines[i])&&!/^\s*(`{3,}|~{3,})/.test(lines[i])&&!/^\s{0,3}#{1,6}\s/.test(lines[i])&&!/^\s{0,3}>/.test(lines[i])&&!LI.test(lines[i])&&!/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(lines[i])&&!(lines[i].includes('|')&&i+1<lines.length&&MD_TABLE_SEP.test(lines[i+1])&&lines[i+1].includes('-'))){para.push(lines[i]);i++}
  out.push('<p class="ev-md-p">'+mdInline(para.join('\n').replace(/\n/g,'\n'))+'</p>')}
 return out.join('')}
function mdList(lines:string[],start:number):{html:string,next:number}{
 const LI=/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;const first=lines[start].match(LI) as RegExpMatchArray;const baseIndent=first[1].replace(/\t/g,'    ').length;const ordered=/\d/.test(first[2]);
 const startNum=ordered?parseInt(first[2],10):1;const items:string[]=[];let i=start;
 while(i<lines.length){const mm=lines[i].match(LI);if(!mm)break;const ind=mm[1].replace(/\t/g,'    ').length;if(ind<baseIndent)break;if(ind>baseIndent&&items.length===0)break;if(ind>baseIndent)break;
  if(/\d/.test(mm[2])!==ordered)break;
  let text=mm[3];i++;const sub:string[]=[];
  while(i<lines.length){const nx=lines[i];if(!nx.trim()){/* บรรทัดว่างคั่น: ต่อได้ถ้าบรรทัดถัดไปยังย่อหน้าลึกกว่า */ if(i+1<lines.length&&lines[i+1].trim()&&(lines[i+1].match(/^(\s*)/) as RegExpMatchArray)[1].replace(/\t/g,'    ').length>baseIndent){sub.push('');i++;continue}break}
   const ni=(nx.match(/^(\s*)/) as RegExpMatchArray)[1].replace(/\t/g,'    ').length;if(ni>baseIndent){sub.push(nx.slice(Math.min(ni,baseIndent+ (ni-baseIndent>=2?2:ni-baseIndent))));i++;continue}break}
  let box='';const cb=text.match(/^\[( |x|X)\]\s+(.*)$/);if(cb){box='<input type="checkbox" class="ev-md-check" disabled'+(cb[1]!==' '?' checked':'')+' aria-hidden="true">';text=cb[2]}
  const subHtml=sub.length?mdBlocks(sub.map(l=>l.replace(/^ {0,4}/,''))):'';
  items.push('<li class="ev-md-li'+(cb?' ev-md-task':'')+'">'+box+mdInline(text)+subHtml+'</li>')}
 const tag=ordered?'ol':'ul';return {html:'<'+tag+' class="ev-md-list"'+(ordered&&startNum!==1?' start="'+startNum+'"':'')+'>'+items.join('')+'</'+tag+'>',next:i}}
/* จุดเข้าเดียว: ข้อความดิบ -> HTML ปลอดภัย · แคชผลล่าสุดกัน render ซ้ำเมื่อ React/patch เรียกถี่ */
const MD_CACHE=new Map<string,string>();
export function mdToHtml(text:string):string{const k=String(text??'');const hit=MD_CACHE.get(k);if(hit!==undefined)return hit;
 const html=mdBlocks(k.replace(/\r\n?/g,'\n').split('\n'));if(MD_CACHE.size>200)MD_CACHE.delete(MD_CACHE.keys().next().value as string);MD_CACHE.set(k,html);return html}
