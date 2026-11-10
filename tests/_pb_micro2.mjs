import { chromium } from 'playwright'; import fs from 'fs';
const exe=(()=>{const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';return d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell'})();
const b=await chromium.launch({executablePath:exe});
async function t(name,url){
  const p=await b.newPage({viewport:{width:412,height:915}});
  await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  await p.goto('file:///tmp/evarel-repo/design/master-demo-v24.html'); await p.waitForTimeout(600);
  const r=await p.evaluate(async(u)=>{const st=document.createElement('style');st.textContent=`@font-face{font-family:'TestFam';font-style:normal;font-weight:400;src:url('${u}') format('woff2')}`;document.head.appendChild(st);await Promise.all([...document.fonts].map(f=>f.load().catch(()=>{})));await document.fonts.ready;const f=[...document.fonts].find(x=>x.family==='TestFam');return f?f.status:'ไม่ลงทะเบียน';},url);
  console.log(name,':',r);
  await p.close();
}
await t('E absolute file://', 'file:///tmp/evarel-repo/app/web/fonts/Anuphan-thai.woff2');
await t('F relative ../fonts/', '../fonts/Anuphan-thai.woff2');
await t('G relative design/fonts', 'fonts/Anuphan-thai.woff2');
await b.close();
