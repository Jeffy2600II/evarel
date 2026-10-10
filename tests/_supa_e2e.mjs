// E2E โหมด Supabase จริง: สมัคร -> เพิ่มรายการ -> ออก -> ล็อกอินใหม่ -> ข้อมูลยังอยู่ (ที่ฐานข้อมูลจริง ไม่ใช่ localStorage) -> ลืมรหัสถึงหน้ากรอกรหัส -> ลบบัญชี
import { chromium } from 'playwright'; import fs from 'fs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const API='https://evarel-api-b-test.nontakorn2600.workers.dev', APP='http://localhost:8779/index.html';
const em=`e2e-${Math.random().toString(36).slice(2,8)}@example.com`, pw='Passw0rd!'+Math.random().toString(36).slice(2,6);
const b=await chromium.launch({executablePath:exe}), ctx=await b.newContext({viewport:{width:412,height:915}}), p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.route(/fonts\./,r=>r.abort());
await ctx.addInitScript(a=>{window.EVAREL_API=a},API);
const ok=(n,c,v='')=>console.log((c?'PASS ':'FAIL ')+n,v);
const body=()=>p.evaluate(()=>document.body.innerText);
await p.goto(APP); await p.waitForTimeout(1500);
// สมัคร
await p.click('[data-act="au-go"][data-id="signup"]'); await p.waitForTimeout(300);
await p.fill('#f-name','E2E ทดสอบ'); await p.fill('#f-email',em); await p.fill('#f-password',pw);
await p.check('input[name="terms"]'); await p.click('button[type="submit"]'); await p.waitForTimeout(4500);
ok('สมัครแล้วเข้าแอปด้วยบัญชี Supabase จริง',(await p.evaluate(()=>document.body.dataset.auth))==='in',(await body()).slice(0,50).replace(/\n/g,' '));
ok('เก็บ session แบบใหม่ (ไม่ใช่ mock)',await p.evaluate(()=>!!localStorage.getItem('evarel-session-v2')&&!localStorage.getItem('evarel-demo-session')));
// เพิ่มรายการผ่านฟอร์ม
await p.click('[data-act="add"]'); await p.waitForTimeout(800);
await p.click('#sheet [data-act="dtype"][data-id="task"]').catch(()=>{}); await p.waitForTimeout(400);
await (await p.$('#sheet input[name="title"], #sheet input[type="text"], #sheet input')).fill('รายการ E2E');
await (await p.$('#sheet [data-act="dv-save"], #sheet [data-act="save"], #sheet .ev-btn-primary')).click(); await p.waitForTimeout(2500);
// อ่านจากฐานข้อมูลจริงโดยตรง
const tok=await p.evaluate(()=>JSON.parse(localStorage.getItem('evarel-session-v2')).access_token);
const rows=await (await fetch(API+'/api/items',{headers:{Authorization:'Bearer '+tok}})).json();
ok('รายการอยู่ที่ฐานข้อมูลจริงผ่าน API',Array.isArray(rows.items)&&rows.items.some(i=>i.title==='รายการ E2E'),'จำนวน '+rows.items?.length);
// ออก + ล้าง localStorage ทั้งหมด -> ล็อกอินใหม่ ต้องเห็นของเดิม (พิสูจน์ว่าไม่ได้มาจากเครื่อง)
await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1800);
await p.click('[data-act="au-go"][data-id="login"]'); await p.waitForTimeout(300);
await p.fill('#f-email',em); await p.fill('#f-password',pw); await p.click('button[type="submit"]'); await p.waitForTimeout(4500);
ok('ล็อกอินใหม่หลังล้างเครื่อง เห็นรายการเดิมจากเซิร์ฟเวอร์',/รายการ E2E/.test(await body()));
// ลืมรหัส -> หน้ากรอกรหัส 6 หลัก
await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
await p.click('[data-act="au-go"][data-id="login"]'); await p.waitForTimeout(300); await p.click('[data-act="au-go"][data-id="forgot"]'); await p.waitForTimeout(300);
await p.fill('#f-email',em); await p.click('button[type="submit"]'); await p.waitForTimeout(3000);
ok('ลืมรหัส -> หน้ากรอกรหัส 6 หลัก',/ใส่รหัส 6 หลัก/.test(await body()));
await p.fill('#f-code','12ab'); await p.click('button[type="submit"]'); await p.waitForTimeout(500);
ok('รหัสไม่ครบ 6 ตัวเลข -> ขึ้นข้อความ',/ใส่ตัวเลข 6 หลัก/.test(await body()));
await p.fill('#f-code','123456'); await p.click('button[type="submit"]'); await p.waitForTimeout(2500);
ok('รหัสมั่ว -> ขึ้นข้อความผิด/หมดอายุ',/รหัสไม่ถูกต้อง|รหัสหมดอายุ/.test(await body()),(await body()).match(/รหัส[^\n]{0,30}/)?.[0]);
// เก็บกวาด: ลบบัญชีผ่าน API
const s=await (await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,password:pw})})).json();
const del=await fetch(API+'/api/auth/account',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},body:JSON.stringify({password:pw})});
ok('ลบบัญชีทดสอบ',del.status===200,String(del.status));
ok('ไม่มี pageerror',errs.length===0,errs.slice(0,2).join('|')); await b.close();
