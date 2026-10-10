// ข้อมูลเดิมของ Master (คีย์ evarel-demo-v3 ไม่มี :uid) ต้องโผล่หลังล็อกอิน และต้นฉบับต้องไม่ถูกลบ
import { chromium } from 'playwright'; import fs from 'fs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe}), p=await b.newPage({viewport:{width:412,height:915}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.route(/fonts\./,r=>r.abort());
const U='http://localhost:8779/index.html', ok=(n,c,v='')=>console.log((c?'PASS ':'FAIL ')+n,v);
await p.goto(U); await p.waitForTimeout(600);
const mk=(id,t)=>({id,type:'habit',title:t,subject:'',time:'07:00',timeEnd:'',track:'check',target:1,unitName:'',repeat:{unit:'day',every:1,days:[]},start:'2026-10-01',end:'',log:{},skip:{},rem:[]});
const OLD=JSON.stringify({items:[mk(1,'วิ่งเช้า'),mk(2,'อ่านหนังสือ'),mk(3,'ดื่มน้ำ')]});
await p.evaluate(o=>{localStorage.clear();localStorage.setItem('evarel-demo-v3',o)},OLD);
await p.reload(); await p.waitForTimeout(1500);
// สร้างบัญชีด้วยอีเมลผ่านหน้าจริง
await p.click('[data-act="au-go"][data-id="signup"]'); await p.waitForTimeout(300);
await p.fill('#f-name','Master'); await p.fill('#f-email','master@example.com'); await p.fill('#f-password','Password123!');
await p.check('input[name="terms"]'); await p.click('button[type="submit"]'); await p.waitForTimeout(3200);
const st=await p.evaluate(()=>({own:JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('evarel-demo-v3:')))||'null'),orig:localStorage.getItem('evarel-demo-v3'),flag:localStorage.getItem('evarel-legacy-claimed')}));
ok('ข้อมูลเดิมถูกคัดลอกเข้าบัญชี 3 รายการ', st.own?.items?.length===3, st.own?.items?.length);
ok('ต้นฉบับยังอยู่ (ไม่ลบ)', st.orig===OLD);
ok('ตั้งธงแล้ว', !!st.flag);
const shown=await p.evaluate(()=>document.body.innerText);
ok('หน้าจอแสดงรายการเดิม', /วิ่งเช้า/.test(shown)||/อ่านหนังสือ/.test(shown));
// ผู้ใช้คนที่สอง ต้องไม่ได้ข้อมูลของคนแรก
await p.evaluate(()=>{localStorage.removeItem('evarel-demo-session')}); await p.reload(); await p.waitForTimeout(1500);
await p.click('[data-act="au-go"][data-id="signup"]'); await p.waitForTimeout(300);
await p.fill('#f-name','Other'); await p.fill('#f-email','other@example.com'); await p.fill('#f-password','Password123!');
await p.check('input[name="terms"]'); await p.click('button[type="submit"]'); await p.waitForTimeout(3200);
const k2=await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('evarel-demo-v3:')).length);
const sh2=await p.evaluate(()=>document.body.innerText);
ok('ผู้ใช้คนที่สองไม่ได้ข้อมูลของคนแรก', !/วิ่งเช้า/.test(sh2), 'คีย์ผู้ใช้ทั้งหมด '+k2);
ok('ไม่มี pageerror', errs.length===0, errs.join('|')); await b.close();
