import { chromium } from 'playwright'; import fs from 'fs';
const exe=(()=>{const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';return d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell'})();
const b=await chromium.launch({executablePath:exe});
const p=await b.newPage({viewport:{width:412,height:915}});
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p.goto('file:///tmp/evarel-repo/design/master-demo-v24.html'); await p.waitForTimeout(600);
async function inj(name,content){
  const r=await p.evaluate(async(t)=>{const before=document.fonts.size;const st=document.createElement('style');st.textContent=t;document.head.appendChild(st);
    await Promise.all([...document.fonts].map(f=>f.load().catch(()=>{})));await document.fonts.ready;
    const rules=st.sheet?st.sheet.cssRules.length:-1;
    return JSON.stringify({before,after:document.fonts.size,rules,anu:[...document.fonts].filter(f=>f.family==='Anuphan').map(f=>f.status)});},content);
  console.log(name,r.slice(0,150));
}
const pretty=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8').match(/@font-face\s*\{[^}]*\}/g)[0];
const single="@font-face{font-family:'Anuphan';font-style:normal;font-weight:100 700;font-display:swap;src:url('file:///tmp/evarel-repo/app/web/fonts/Anuphan-thai.woff2') format('woff2');unicode-range:U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC}";
await inj('1 ปริ้นตี้ (มีบรรทัดว่าง)',pretty.replace(/url\(\s*['"]?\.\.\/fonts\//g,"url('file:///tmp/evarel-repo/app/web/fonts/"));
await inj('2 บรรทัดเดียว',single);
await inj('3 ปริ้ตตี้ไม่แก้ url',pretty);
await b.close();
