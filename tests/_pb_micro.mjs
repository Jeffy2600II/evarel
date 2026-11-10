import { chromium } from 'playwright'; import fs from 'fs';
const exe=(()=>{const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';return d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell'})();
const b=await chromium.launch({executablePath:exe});
const p=await b.newPage({viewport:{width:412,height:915}});
await p.goto('file:///tmp/evarel-repo/design/master-demo-v24.html');
await p.waitForTimeout(800);
const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8')+'\n'+fs.readFileSync('/tmp/evarel-repo/app/web/styles/extra.css','utf8');
const blocks=(css.match(/@font-face\s*\{[^}]*\}/g)||[]).filter(x=>/font-family:\s*['"]?(Anuphan|Noto Sans Thai)['"]?/.test(x));
const abs=x=>x.replace(/url\(\s*['"]?\.\.\/fonts\//g,'url(http://localhost:8779/fonts/');
async function inject(name,content){
  const r=await p.evaluate(async(t)=>{const st=document.createElement('style');st.textContent=t;document.head.appendChild(st);await document.fonts.ready;return document.fonts.size+':'+[...document.fonts].filter(f=>f.family==='Anuphan').length;},content);
  console.log(name,r);
}
await inject('A บล็อกสกัด app.css (บล็อกเดียว)',abs(blocks[0]));
await inject('B บล็อก extra.css (บล็อกเดียว)',abs((fs.readFileSync('/tmp/evarel-repo/app/web/styles/extra.css','utf8').match(/@font-face\s*\{[^}]*\}/g)||[])[0]));
await inject('C บล็อก extra.css แบบไฟล์เดิม (../fonts/)',(fs.readFileSync('/tmp/evarel-repo/app/web/styles/extra.css','utf8').match(/@font-face\s*\{[^}]*\}/g)||[])[0]);
await inject('D joined ทั้งหมด',abs(blocks.join('\n')));
await b.close();
