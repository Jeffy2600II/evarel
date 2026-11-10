import { chromium } from 'playwright'; import fs from 'fs';
const exe=(()=>{const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';return d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell'})();
const b=await chromium.launch({executablePath:exe});
const css=fs.readFileSync('/tmp/evarel-repo/app/web/styles/app.css','utf8')+'\n'+fs.readFileSync('/tmp/evarel-repo/app/web/styles/extra.css','utf8');
const blocks=(css.match(/@font-face\s*\{[^}]*\}/g)||[]).filter(x=>/font-family:\s*['"]?(Anuphan|Noto Sans Thai)['"]?/.test(x));
const FONT_CSS=blocks.join('\n').replace(/url\(\s*['"]?\.\.\/fonts\//g,"url('file:///tmp/evarel-repo/app/web/fonts/");
const DEMO='file:///tmp/evarel-repo/design/master-demo-v24.html';
async function shot(fonts){
  const p=await b.newPage({viewport:{width:412,height:915},colorScheme:'light',timezoneId:'Asia/Bangkok'});
  await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  await p.goto(DEMO); await p.waitForTimeout(800);
  await p.evaluate(()=>localStorage.clear());
  const u={id:'u_test',name:'Nontakorn',email:'demo.user@gmail.com',provider:'google'};
  await p.evaluate((u)=>{localStorage.setItem('evarel-demo-users',JSON.stringify([u]));localStorage.setItem('evarel-demo-session','u_test');localStorage.setItem('evarel-demo-v3:u_test',JSON.stringify({items:[]}))},u);
  await p.reload(); await p.waitForTimeout(2600);
  if(fonts){ await p.addStyleTag({content:FONT_CSS}); await p.evaluate(async()=>{ await Promise.all([...document.fonts].map(f=>f.load().catch(()=>{}))); }); await p.waitForTimeout(400); }
  const buf=await p.screenshot();
  await p.close();
  return buf;
}
const withF=await shot(true); fs.writeFileSync('/tmp/self_with.png',withF);
const noF=await shot(false); fs.writeFileSync('/tmp/self_without.png',noF);
await b.close();
console.log('ครบ');
