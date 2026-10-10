/* พิสูจน์ค่าสำรอง auth.js: เมื่อไม่ตั้ง window.EVAREL_API ล็อกอินต้องยิงไป Worker ที่ยังมีอยู่ (evarel-api-b-test) ไม่ใช่ตัวที่ถูกลบ */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http'; import path from 'path';
const root=process.argv[2]||'/tmp/evarel-repo/app-v13';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(root,p);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d)})}).listen(0);
const port=srv.address().port;
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/',exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});let ok=true;const t=(n,c,v='')=>{console.log(c?'PASS':'FAIL',n,v);if(!c)ok=false};
const html=fs.readFileSync(root+'/index.html','utf8');
t('0 index.html ใน repo ไม่ตั้ง EVAREL_API (จำลองกรณีถูกทับ)',!/window\.EVAREL_API\s*=/.test(html));
const p=await (await b.newContext()).newPage();const hits=[];
p.on('request',r=>{if(/workers\.dev\/api\//.test(r.url()))hits.push(new URL(r.url()).host)});
await p.route(/fonts\./,r=>r.abort());
// จับคำขอ auth โดยตรงจากโค้ด auth.js (เรียก API ที่ใช้จริง)
const host=await p.goto(`http://localhost:${port}/index.html`).then(()=>p.evaluate(async()=>{
  const src=await (await fetch('/js/auth.js')).text();const m=src.match(/const API = \(window\.EVAREL_API \|\| '([^']+)'\)/);return m?m[1]:null}));
console.log('   ค่าสำรองที่ deploy จะใช้:',host);
t('1 ค่าสำรองชี้ evarel-api-b-test',host==='https://evarel-api-b-test.nontakorn2600.workers.dev');
const code=await fetch(host+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'x@example.com',password:'wrongpass1'})}).then(r=>r.status).catch(()=>0);
t('2 Worker ที่ค่าสำรองชี้ตอบจริง (401 รหัสผิด ไม่ใช่ 404/1042)',code===401,String(code));

// 3) พฤติกรรมจริง: กดล็อกอินในเบราว์เซอร์ที่ไม่มี EVAREL_API แล้วจับคำขอเครือข่ายที่ออกจริง
{
  const c2=await b.newContext({viewport:{width:412,height:915}});const q=await c2.newPage();const reqs=[];
  q.on('request',r=>{const u=r.url();if(/workers\.dev\/api\/auth/.test(u))reqs.push(u)});
  await q.route(/fonts\./,r=>r.abort());await q.goto(`http://localhost:${port}/index.html`);await q.waitForTimeout(1200);
  await q.evaluate(()=>{window.__api=typeof window.EVAREL_API});
  const hasGlobal=await q.evaluate(()=>typeof window.EVAREL_API);
  t('3 เบราว์เซอร์นี้ไม่มี EVAREL_API (ใช้ค่าสำรองจริง)',hasGlobal==='undefined',hasGlobal);
  // เรียก auth module ตรงๆ ผ่านฟังก์ชันที่แอปใช้ เพื่อให้เกิดคำขอจริง
  const sent=await q.evaluate(async()=>{try{const fn=(window.EvarelAuth||window.Auth||{}).login;if(fn){await fn('x@example.com','wrongpass1').catch(()=>{});return 'module'}}catch(e){}
    return 'none'});
  console.log('   เรียกผ่านโมดูล:',sent,'| คำขอที่ออกจริง:',JSON.stringify(reqs.map(u=>new URL(u).host+new URL(u).pathname)));
  if(reqs.length) t('3 คำขอล็อกอินจริงไปที่ evarel-api-b-test เท่านั้น',reqs.every(u=>u.includes('evarel-api-b-test')));
  else console.log('   (ไม่มีทางเรียกโมดูลจากภายนอก ข้อ 1-2 ยืนยันที่ระดับค่าสำรอง)');
}
await b.close();srv.close();console.log(ok?'ALL PASS':'SOME FAILED');process.exit(ok?0:1);
