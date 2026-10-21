// เทสต์พฤติกรรม 9 ฟีเจอร์ AI จริงบนหน้าแอป (ไม่ใช่ mock): ai-more ai-search ai-copy ai-vote ai-usage usage-refresh ai-retry ai-retry-global rem-off
// วิธี: openAsUser (ผู้ใช้ทดสอบ API forge จริง) -> inject แชท+ข้อความลง ST ตรง ๆ -> คลิกปุ่มจริงผ่าน DOM -> วัดผลลัพธ์ใน DOM/สถานะ
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser } from './live_user.mjs';
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe});
const user=await makeTestUser('aiact');
let pass=0,fail=0; const fails=[];
const t=(name,ok,info='')=>{ if(ok){pass++;console.log('PASS',name)} else {fail++;fails.push(name);console.log('FAIL',name,info)} };

const ctx=await openAsUser(b,user,{colorScheme:'light'});
/* stub clipboard ให้ ai-copy ทดสอบได้ใน headless (บันทึกค่าที่ถูกเขียน) */
await ctx.addInitScript(()=>{ let clip=''; Object.defineProperty(navigator,'clipboard',{value:{writeText:v=>{clip=String(v);return Promise.resolve()},readText:()=>Promise.resolve(clip)},configurable:true}); window.__clip=()=>clip; });
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('https://evarel-app-forge.nontakorn2600.workers.dev/index.html');
await p.waitForTimeout(2600);

/* ฉากตั้งต้น: เปิดหน้า AI + ใส่แชทปัจจุบันพร้อมข้อความ AI 1 ที (ไม่ต้องเรียก AI จริง ประหยัดโควตา) */
await p.evaluate(()=>{
  ST.CH={list:[{id:'c1',title:'แชททดสอบ',pinned:false,msgs:[{role:'ai',text:'สวัสดีครับ นี่คือคำตอบทดสอบ',vote:null,time:Date.now()}]}],cur:'c1'};
  openAI();
});
await p.waitForTimeout(1200);

/* 1) ai-copy: คลิกปุ่มคัดลอกจริง -> ข้อความ msg ถูกเขียนลง clipboard + toast คัดลอกแล้ว */
await p.click('[data-act="ai-copy"]');
await p.waitForTimeout(600);
t('ai-copy', await p.evaluate(()=>window.__clip()==='สวัสดีครับ นี่คือคำตอบทดสอบ'), 'clip='+(await p.evaluate(()=>window.__clip())));

/* 2) ai-vote: กดชอบ -> aria-pressed ติด, กดซ้ำ -> ปลด, กดไม่ชอบ -> สถานะย้าย */
await p.click('[data-act="ai-vote"][data-id="0:up"]');
await p.waitForTimeout(400);
let v=await p.evaluate(()=>ST.CH.list[0].msgs[0].vote);
t('ai-vote ติด', v==='up', 'vote='+v);
await p.click('[data-act="ai-vote"][data-id="0:up"]');
await p.waitForTimeout(400);
v=await p.evaluate(()=>ST.CH.list[0].msgs[0].vote);
t('ai-vote ปลด', v===null, 'vote='+v);
await p.click('[data-act="ai-vote"][data-id="0:down"]');
await p.waitForTimeout(400);
v=await p.evaluate(()=>ST.CH.list[0].msgs[0].vote);
t('ai-vote ย้าย', v==='down', 'vote='+v);

/* 3) ai-more: เมนูเพิ่มเติมข้อความเปิด (popover โผล่) */
const moreBtn=await p.$('[data-act="ai-more"]');
if(moreBtn){ await moreBtn.click(); await p.waitForTimeout(400);
  t('ai-more', await p.evaluate(()=>!!document.getElementById('pop')));
  await p.evaluate(()=>closePop?.()); await p.waitForTimeout(200);
}else t('ai-more',false,'ไม่มีปุ่ม ai-more บนหน้า');

/* 4) ai-search: เปิดลิ้นชักก่อนแล้วสลับช่องค้น + focus */
await p.click('[data-act="ai-hist"]');
await p.waitForTimeout(900);
await p.click('[data-act="ai-search"]');
await p.waitForTimeout(400);
let sw=await p.evaluate(()=>{const w=document.getElementById('dSearchWrap');return w&&!w.hidden&&document.activeElement?.id==='dSearch'});
t('ai-search เปิด', sw);
await p.click('[data-act="ai-search"]');
await p.waitForTimeout(300);
sw=await p.evaluate(()=>{const w=document.getElementById('dSearchWrap');return w&&w.hidden});
t('ai-search ปิด', sw);

/* 5) ai-usage: ตามเดโมปุ่มอยู่ในแถบขีดจำกัด (limitBanner) — ปิดลิ้นชักที่ค้างจากฉากก่อน ตั้งโควตาเต็ม แล้วคลิก รายละเอียด จริง */
await p.evaluate(()=>{const dr=document.getElementById('drawer');if(dr&&dr.dataset.open==='true')ACTIONS['ai-hist']?.()});
await p.waitForTimeout(600);
await p.evaluate(()=>{const n=new Date(Date.now()+7*3600000);n.setUTCHours(0,0,0,0);ST.QUOTA={resetAt:new Date(+n+86400000-7*3600000).toISOString(),blocked:true,calls:{used:40,limit:40,remaining:0},tokens:{used:60000,limit:60000,remaining:0}};quotaPaint()});
await p.waitForTimeout(500);
await p.locator('#aiLimit [data-act="ai-usage"]').click();
await p.waitForTimeout(900);
let usage=await p.evaluate(()=>!!document.getElementById('usageSheet')&&!!ST.QUOTA);
t('ai-usage', usage, 'usageSheet/QUOTA ไม่ครบ');

/* 6) usage-refresh: ตามเดโมปุ่มโผล่เมื่อโควตา unknown — ปิด sheet เดิม ตั้ง unknown เปิดใหม่ แล้วคลิก ลองใหม่ จริง -> ดึงค่าจริงกลับมา */
await p.evaluate(()=>{ACTIONS.close?.()});
await p.waitForTimeout(600);
/* คลิกใน evaluate ทันทีที่ปุ่มโผล่ (action ai-usage จะดึงโควตาจริงพร้อมกัน ทำให้ปุ่มถูกวาดใหม่หายไปก่อนคลิกภายนอก) */
await p.evaluate(()=>{ST.QUOTA={unknown:true};ACTIONS['ai-usage']?.();const b=document.querySelector('[data-act="usage-refresh"]');if(!b)throw new Error('ไม่มีปุ่ม usage-refresh ใน usageSheet');b.click();});
await p.waitForTimeout(1800);
t('usage-refresh', await p.evaluate(()=>!!ST.QUOTA&&!ST.QUOTA.unknown&&ST.QUOTA.calls&&ST.QUOTA.calls.limit>0),'QUOTA ยังไม่กลับเป็นค่าจริง');
await p.evaluate(()=>ACTIONS.close?.()); await p.waitForTimeout(300);

/* 7) ai-retry: notice แบบ error + draft ว่าง -> กดส่งอีกครั้ง -> notice+draft ถูกล้าง (ไม่เรียก AI เพราะ draft ว่าง) */
await p.evaluate(()=>{ST.AI.notice={kind:'error'};ST.AI.draft='';aiRefresh()});
await p.waitForTimeout(400);
await p.click('[data-act="ai-retry"]');
await p.waitForTimeout(500);
t('ai-retry', await p.evaluate(()=>ST.AI.notice===null&&!ST.AI.draft), 'notice='+JSON.stringify(await p.evaluate(()=>ST.AI.notice)));

/* 8) ai-retry-global: notice แบบ global -> ปุดแจ้ง -> notice หายและ quotaPaint ทำงาน */
await p.evaluate(()=>{ST.AI.notice={kind:'limit',reason:'global',resetAt:null};quotaPaint()});
await p.waitForTimeout(500);
await p.click('#aiLimit [data-act="ai-retry-global"]');
await p.waitForTimeout(400);
t('ai-retry-global', await p.evaluate(()=>ST.AI.notice===null),'notice ไม่ถูกล้าง');

/* 9) rem-off: ฟอร์มมีคำเตือน notifyIssue -> ปิดแจ้งเตือน -> D.rem ว่างและ DOM คำเตือนหาย */
await p.evaluate(()=>{openForm('task')});
await p.waitForTimeout(600);
await p.evaluate(()=>{Object.assign(ST.D,{title:'ทดสอบ',date:new Date().toISOString().slice(0,10),time:'',rem:[{k:'before',m:10}]});renderForm()});
await p.waitForTimeout(400);
const off=await p.$('[data-act="rem-off"]');
if(off){ await off.click(); await p.waitForTimeout(400);
  t('rem-off', await p.evaluate(()=>Array.isArray(ST.D.rem)&&ST.D.rem.length===0));
}else t('rem-off',false,'ไม่มีปุ่ม rem-off (notifyIssue ไม่เปิด)');

t('pageerror 0', errs.length===0, errs.slice(0,2).join(' | '));
console.log(`\nผลรวม: PASS ${pass} FAIL ${fail}`);
if(fails.length)console.log('ตก:',fails.join(', '));
console.log(fail===0?'ALL PASS':'HAS FAIL');
await b.close(); process.exit(fail===0?0:1);
