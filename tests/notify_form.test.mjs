/* ประตูพฤติกรรมฟอร์มแจ้งเตือน ตามเดโม v24 (หมวดเตือนตรงเวลา) — login จริงผ่าน live_user.mjs ค่าคาดหวังมาจากเดโม design/master-demo-v24.html ไม่ใช่สเปกเดิม (สวิตช์+ชิป4) ที่เดโมเปลี่ยนแล้ว
   รัน: node tests/notify_form.test.mjs */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, API, APP_ORIGIN } from './live_user.mjs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find((x)=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe}); let pass=0, fail=0;
const t=async(n,fn)=>{try{await fn();pass++;console.log('PASS '+n)}catch(e){fail++;console.log('FAIL '+n+' :: '+String(e.message||e).slice(0,180))}};
const eq=(a,c,m='')=>{if(JSON.stringify(a)!==JSON.stringify(c))throw new Error(m+' ได้ '+JSON.stringify(a)+' ควรเป็น '+JSON.stringify(c))};
const user=await makeTestUser('remform');
const SEED=[{id:1760100000001,type:'task',title:'มีเวลา',subject:'',time:'09:00',timeEnd:'',track:'check',target:1,unitName:'',repeat:{unit:'none',every:1,days:[]},start:'2026-10-12',end:'',skip:{},rem:[{k:'before',m:0}],log:{}},
 {id:1760100000002,type:'task',title:'ไม่มีเวลา',subject:'',time:'',timeEnd:'',track:'check',target:1,unitName:'',repeat:{unit:'none',every:1,days:[]},start:'2026-10-12',end:'',skip:{},rem:[{k:'before',m:0}],log:{}},
 {id:1760100000003,type:'task',title:'ปิดเตือน',subject:'',time:'10:00',timeEnd:'',track:'check',target:1,unitName:'',repeat:{unit:'none',every:1,days:[]},start:'2026-10-12',end:'',skip:{},rem:[],log:{}}];
await seedItems(user.session,SEED);
async function fresh(){
  const ctx=await openAsUser(b,user,{colorScheme:'light'}); const p=await ctx.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(APP_ORIGIN+'/index.html'); await p.waitForSelector('[data-tab="all"]',{timeout:15000}); await p.waitForTimeout(2600); return p;
}
const openAdd=async(p,type='task')=>{await p.click('[data-act="add"]');await p.waitForTimeout(400);await p.click(`[data-act="dtype"][data-id="${type}"]`);await p.waitForSelector('#addForm',{timeout:6000});await p.waitForTimeout(450)};
const openRem=async(p)=>{await p.click('[data-act="dopen"][data-id="rem"]');await p.waitForTimeout(450)};
const chips=async(p)=>(await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').allTextContents()).map(s=>s.trim());
const pressed=async(p)=>(await p.locator('.ev-panel[data-key="rem"] [data-act="drem"][aria-pressed="true"]').allTextContents()).map(s=>s.trim());
const sumText=async(p)=>(await p.locator('[data-act="dopen"][data-id="rem"] small').first().innerText()).replace(/\s+/g,' ').trim();
const apiItems=async()=>{const r=await (await fetch(API+'/api/items',{headers:{Authorization:'Bearer '+user.session.access_token}})).json();return r.items};

let p=await fresh(); await openAdd(p);
await t('F1 แถวเตือน: ป้าย "เตือน" + สรุป "ตรงเวลา" ค่าเริ่มต้น (เดโม)',async()=>{eq(await sumText(p),'ตรงเวลา')});
await openRem(p);
await t('F2 แผงเดโม: ชิป 5 ตัว มี "ตรงเวลา" กดอยู่เป็นค่าเริ่มต้น ไม่มีสวิตช์',async()=>{eq(await chips(p),['ตรงเวลา','ก่อน 10 นาที','ก่อน 30 นาที','ก่อน 1 ชม.','ก่อน 1 วัน']);eq(await pressed(p),['ตรงเวลา']);eq(await p.locator('.ev-panel[data-key="rem"] .ev-switch').count(),0)});
await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').nth(1).click(); await p.waitForTimeout(300);
await t('F3 กด "ก่อน 10 นาที" -> สรุป "ตรงเวลา, ก่อน 10 นาที"',async()=>{eq(await pressed(p),['ตรงเวลา','ก่อน 10 นาที']);eq(await sumText(p),'ตรงเวลา, ก่อน 10 นาที')});
await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').nth(0).click(); await p.waitForTimeout(300);
await t('F4 ปลด "ตรงเวลา" คงล่วงหน้า สรุป "ก่อน 10 นาที"',async()=>{eq(await pressed(p),['ก่อน 10 นาที']);eq(await sumText(p),'ก่อน 10 นาที')});
await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').nth(1).click(); await p.waitForTimeout(300);
await t('F5 ปลดหมด -> สรุป "ปิดแจ้งเตือน" (ศัพท์เดโม)',async()=>{eq(await pressed(p),[]);eq(await sumText(p),'ปิดแจ้งเตือน')});
await p.locator('.ev-panel[data-key="rem"] [data-act="drem"]').nth(0).click(); await p.waitForTimeout(300);
await p.close();

/* คำใบ้เดโม: ไม่มีเวลา+เปิดเตือน -> แถบเตือนใส่เวลา มีปุ่ม "ปิดแจ้งเตือน" */
p=await fresh(); await openAdd(p); await p.fill('input[name="title"]','บังคับเวลา'); await openRem(p);
await t('F6 ไม่ใส่เวลา: แถบคำใบ้ + ปุ่ม "ปิดแจ้งเตือน" ปรากฏ (เดโม notifyIssue)',async()=>{const hint=await p.locator('[data-act="rem-off"]').count();eq(hint,1,'ไม่มีปุ่ม rem-off')});
await t('F7 กดบันทึกโดยไม่มีเวลา -> ไม่บันทึก ขึ้นข้อความให้ใส่เวลา',async()=>{await p.click('button[type="submit"][form="addForm"]');await p.waitForTimeout(500);const err=(await p.locator('.ev-form-err').allTextContents()).join(' ');eq(/เวลา/.test(err),true,'ข้อความ: '+err);eq((await apiItems()).length,3)});
await t('F8 กด "ปิดแจ้งเตือน" -> rem ว่าง คำใบ้หาย สรุปเป็นศัพท์เดโม',async()=>{await p.click('[data-act="rem-off"]');await p.waitForTimeout(400);eq(await sumText(p),'ปิดแจ้งเตือน');eq(await p.locator('[data-act="rem-off"]').count(),0)});
await p.fill('input[name="time"]','14:30'); await p.click('button[type="submit"][form="addForm"]'); await p.waitForTimeout(1200);
await t('F9 ปิดเตือนแล้วบันทึกได้ ไม่ต้องมีเวลา -> rem=[], time ถูกเก็บ',async()=>{const it=(await apiItems()).find(x=>x.title==='บังคับเวลา');eq(it&&it.rem,[]);eq(it&&it.time,'14:30')});
await p.close();

/* tbox เตือนตามเวลา (เดโม): ใส่เวลา-กดเพิ่ม-แท็ก-ลบแท็ก */
p=await fresh(); await openAdd(p); await p.fill('input[name="time"]','09:00'); await openRem(p);
await p.fill('#remTime','07:30'); await p.waitForTimeout(250); await p.click('[data-act="remadd"]'); await p.waitForTimeout(400);
await t('F10 เตือนตามเวลา: ใส่ 07:30 กดเพิ่ม -> แท็ก "07:30 น."',async()=>{eq((await p.locator('.ev-rem-tag').allTextContents()).map(s=>s.trim()),['07:30 น.'])});
await t('F11 แท็กลบได้ (ปุ่มลบในแท็ก)',async()=>{await p.locator('[data-act="remdel"]').first().click();await p.waitForTimeout(350);eq(await p.locator('.ev-rem-tag').count(),0)});
await p.close();

/* แถวเวลา TR เดโม: ป้าย + ตั้งเวลาแล้วมีปุ่มล้าง + ล้างได้ */
p=await fresh(); await openAdd(p,'task');
await t('F12-task แถวเวลาเป็นแบบเดโม "เวลา (ไม่บังคับ)" + คำใบ้ "ยังไม่ได้ตั้ง"',async()=>{const txt=(await p.locator('#addForm').innerText()).replace(/\s+/g,' ');eq(txt.includes('เวลา (ไม่บังคับ)'),true);eq(txt.includes('ยังไม่ได้ตั้ง'),true)});
await p.fill('input[name="time"]','08:00'); await p.waitForTimeout(400);
await t('F13 ตั้งเวลาแล้ว: ป้ายกล่องเป็น "08:00 น." และมีปุ่มล้าง ✕',async()=>{const tb=await p.locator('.ev-set-row').filter({hasText:'เวลา (ไม่บังคับ)'});eq(await tb.locator('.ev-tbox-t').innerText(),'08:00 น.');eq(await tb.locator('[data-tclear="time"]').count(),1)});
await p.click('[data-tclear="time"]'); await p.waitForTimeout(400);
await t('F14 กด ✕ -> เวลาล้าง กลับเป็น "＋ เพิ่มเวลา" + "ยังไม่ได้ตั้ง"',async()=>{const tb=await p.locator('.ev-set-row').filter({hasText:'เวลา (ไม่บังคับ)'});eq(await tb.locator('.ev-tbox-t').innerText(),'＋ เพิ่มเวลา');eq(await p.evaluate(()=>ST.D.time),'')});
await p.close();
for(const ty of ['habit','event']){
  p=await fresh(); await openAdd(p,ty);
  await t(`F12-${ty} ฟอร์ม ${ty} ใช้แถวเวลาแบบเดโม (tbox ไม่ใช่ input ธรรมดา)`,async()=>{eq(await p.locator('#addForm .ev-tbox').count()>=1,true);eq(await p.locator('#addForm .ev-tbox-h').count()>=1,true)});
  await p.close();
}

/* แก้ไขรายการเดิม */
p=await fresh(); await p.click('[data-tab="all"]'); await p.waitForTimeout(400);
await p.locator('[data-act="detail"]',{hasText:'ปิดเตือน'}).first().click(); await p.waitForTimeout(600);
await p.click('[data-act="d-more"]'); await p.waitForTimeout(400); await p.click('[data-act="m-edit"]'); await p.waitForSelector('#addForm',{timeout:6000}); await p.waitForTimeout(450);
await t('F15 แก้รายการ rem ว่าง -> สรุปศัพท์เดโม ไม่เติมกลับเอง',async()=>{eq(await sumText(p),'ปิดแจ้งเตือน')});
await t('F16 แก้รายการที่มีเวลา 10:00 -> กล่องเวลาแสดง "10:00 น."',async()=>{const tb=await p.locator('.ev-set-row').filter({hasText:'เวลา (ไม่บังคับ)'});eq(await tb.locator('.ev-tbox-t').innerText(),'10:00 น.')});
await p.close();
p=await fresh();
await t('F17 ไม่มี pageerror ตลอดวงจร',async()=>eq(p.errs,[]));
await b.close(); await user.cleanup();
console.log(`\nผ่าน ${pass} | ตก ${fail}`); process.exit(fail?1:0);
