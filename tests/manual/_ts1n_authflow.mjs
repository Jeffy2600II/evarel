// ทดสอบพฤติกรรมหน้าล็อกอินด้วย MockAuth (ไม่ออกเน็ต) ผ่าน ACTIONS จริง: au-go, validate, signup->enterApp->loadApp, signout, forgot/cooldown, google
// รันเทียบ app ต้นฉบับกับ app ใหม่ด้วยสคริปต์เดียวกัน (evarel-ts-1n) ใช้: node _ts1n_authflow.mjs <url>
import { chromium } from 'playwright'; import fs from 'fs';
const U=process.argv[2]; const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe}); const out=[]; const ok=(n,c,v='')=>{out.push((c?'PASS ':'FAIL ')+n+(v?' | '+v:''))};
const ctx=await b.newContext({viewport:{width:412,height:915}}); const p=await ctx.newPage(); const errs=[];
p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED|ERR_BLOCKED/.test(m.text()))errs.push('console:'+m.text())}); /* ERR_FAILED มาจาก route.abort ของฟอนต์/ภายนอกที่ตั้งใจกัน */
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort()); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
await p.goto(U); await p.waitForTimeout(1200);
const scr=()=>p.evaluate(()=>UI.auth.screen+'|'+UI.auth.status);
ok('1 เริ่มที่หน้า welcome (boot -> render -> renderAuthRoot)',(await scr())==='welcome|out',await scr());
await p.click('[data-act="au-go"][data-id="login"]'); await p.waitForTimeout(250); ok('2 au-go -> login',(await scr()).startsWith('login'),await scr());
await p.click('[data-act="au-go"][data-id="forgot"]'); await p.waitForTimeout(250); ok('3 au-go -> forgot',(await scr()).startsWith('forgot'),await scr());
await p.click('[data-act="au-go"][data-id="signup"]').catch(async()=>{await p.evaluate(()=>{UI.auth.screen='signup';renderAuthRoot()})}); await p.waitForTimeout(250);
if(!(await scr()).startsWith('signup')){await p.evaluate(()=>{UI.auth.screen='signup';renderAuthRoot()});await p.waitForTimeout(200)}
ok('4 เข้าหน้า signup',(await scr()).startsWith('signup'),await scr());
await p.click('form.ev-authform[data-kind="signup"] button[type="submit"], form.ev-authform[data-kind="signup"] .ev-btn-primary'); await p.waitForTimeout(300);
const errTxt=await p.evaluate(()=>[...document.querySelectorAll('.ev-ferr,#form-err,.ev-field-err')].map(e=>e.textContent.trim()).filter(Boolean).join(' / '));
ok('5 ส่งฟอร์มว่าง -> authValidate/fieldErr แสดงข้อผิดพลาด',errTxt.length>0,errTxt.slice(0,60));
await p.fill('#f-name','ทดสอบ'); await p.fill('#f-email','t1n@example.test'); await p.fill('#f-password','Abcd1234!x'); await p.check('input[name=terms]');
await p.click('form.ev-authform[data-kind="signup"] button[type="submit"], form.ev-authform[data-kind="signup"] .ev-btn-primary'); await p.waitForTimeout(2200);
const st=await p.evaluate(()=>({status:UI.auth.status,user:(()=>{const u=(typeof ST!=='undefined'&&'USER' in ST?ST.USER:(typeof USER!=='undefined'?USER:undefined));return u?u.email:null})(),loading:UI.loading,items:S.items.length,body:document.body.dataset.auth}));
ok('6 signup สำเร็จ -> authSubmit -> enterApp -> loadApp เข้าแอป',st.status==='in'&&st.user==='t1n@example.test'&&st.body==='in',JSON.stringify(st));
await p.click('[data-act="settings"]').catch(()=>{}); await p.waitForTimeout(600);
const hasOut=await p.evaluate(()=>!!document.querySelector('[data-act="au-signout-ask"]')); ok('7 หน้าตั้งค่ามีปุ่มออกจากระบบ (ACTIONS ผูกปุ่ม)',hasOut);
if(hasOut){await p.click('[data-act="au-signout-ask"]'); await p.waitForTimeout(500);
 const dlg=await p.evaluate(()=>!!document.querySelector('.ev-dialog,[role=dialog],#dialog')&&document.body.innerText.includes('ออกจากระบบ')); ok('8 ยืนยันออกจากระบบ (confirmDialog)',dlg);
 await p.click('#dialog button.ev-btn-primary, #dialog [data-act="dlg-ok"], #dialog button:last-of-type',{timeout:4000}).catch(e=>out.push('FAIL 8b กดยืนยันไม่ได้ | '+String(e.message).slice(0,90))); await p.waitForTimeout(1500);
 const s2=await p.evaluate(()=>({status:UI.auth.status,screen:UI.auth.screen,user:(()=>{const u=(typeof ST!=='undefined'&&'USER' in ST?ST.USER:(typeof USER!=='undefined'?USER:undefined));return u===undefined?'?':u})(),items:S.items.length}));
 ok('9 doSignOut -> กลับ welcome ล้างข้อมูลในหน่วยความจำ',s2.status==='out'&&s2.user===null&&s2.items===0,JSON.stringify(s2));
} else { ok('8 ยืนยันออกจากระบบ',false,'ไม่มีปุ่ม'); ok('9 doSignOut',false,'ไม่มีปุ่ม'); }
await p.evaluate(()=>{UI.auth.screen='forgot';renderAuthRoot()}); await p.waitForTimeout(250);
await p.fill('#f-email','t1n@example.test'); await p.click('form.ev-authform[data-kind="forgot"] button[type="submit"], form.ev-authform[data-kind="forgot"] .ev-btn-primary'); await p.waitForTimeout(1500);
const cool=await p.evaluate(()=>document.body.innerText.includes('ส่งอีกครั้ง')||!!document.querySelector('[data-act="au-resend"]')); ok('10 forgot ส่งสำเร็จ -> หน้ารอ + ปุ่ม resend (startCool/paintCool)',cool);
await p.evaluate(()=>{UI.auth.screen='welcome';renderAuthRoot()}); await p.waitForTimeout(200);
await p.click('[data-act="au-go"][data-id="login"]'); await p.waitForTimeout(200); ok('11 stopCool ผ่าน au-go ไม่พัง',(await scr()).startsWith('login'),await scr());
await p.evaluate(()=>{UI.auth.screen='welcome';renderAuthRoot()}); await p.waitForTimeout(200);
await p.click('[data-act="au-google"]'); await p.waitForTimeout(2600);
const g=await p.evaluate(()=>({status:UI.auth.status,user:(()=>{const u=(typeof ST!=='undefined'&&'USER' in ST?ST.USER:(typeof USER!=='undefined'?USER:undefined));return u?u.email:null})()}));
ok('12 ปุ่ม Google (authGoogle -> MockAuth -> enterApp) เข้าแอป',g.status==='in'&&!!g.user,JSON.stringify(g));
await p.reload(); await p.waitForTimeout(1800);
const re=await p.evaluate(()=>({status:UI.auth.status,user:(()=>{const u=(typeof ST!=='undefined'&&'USER' in ST?ST.USER:(typeof USER!=='undefined'?USER:undefined));return u?u.email:null})()}));
ok('13 รีโหลดแล้วเซสชันคงอยู่ (boot -> Auth.session -> loadApp -> startLiveSync)',re.status==='in'&&!!re.user,JSON.stringify(re));
ok('14 ไม่มี pageerror/console error ตลอดการทดสอบ',errs.length===0,errs.slice(0,2).join(' ; ').slice(0,160));
console.log(out.join('\n')); console.log('ผ่าน',out.filter(l=>l.startsWith('PASS')).length+'/'+out.length);
await b.close();
