import { chromium } from 'playwright'; import fs from 'fs';
const vals={}; for(let l of fs.readFileSync('/app/.agents/.env','utf8').split('\n')){l=l.trim().replace(/^export /,'');const i=l.indexOf('=');if(i>0){let v=l.slice(i+1).trim();if(v.startsWith("$'")&&v.endsWith("'"))v=v.slice(2,-1);vals[l.slice(0,i)]=v}}
const K=vals.SUPABASE_SERVICE_KEY, SB='https://vdbmwmmsfrgpaauzspup.supabase.co', API='https://evarel-api-b-test.nontakorn2600.workers.dev', APP='http://localhost:8779/index.html';
const j=async(m,u,b,h={})=>{const r=await fetch(u,{method:m,headers:{'Content-Type':'application/json',...h},body:b?JSON.stringify(b):undefined});const t=await r.text();try{return JSON.parse(t)}catch{return t}};
const em=`g-${Math.random().toString(36).slice(2,7)}@example.com`, pw='Passw0rd!x1';
const adm={apikey:K,Authorization:'Bearer '+K};
const u=await j('POST',SB+'/auth/v1/admin/users',{email:em,password:pw,email_confirm:true,user_metadata:{full_name:'ผู้ใช้ Google'}},adm);
const tk=await j('POST',SB+'/auth/v1/token?grant_type=password',{email:em,password:pw},{apikey:K});
const d=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1243/', exe=d+fs.readdirSync(d).find(x=>x.startsWith('chrome'))+'/chrome-headless-shell';
const b=await chromium.launch({executablePath:exe}), ctx=await b.newContext({viewport:{width:412,height:915}}), p=await ctx.newPage();
await p.route(/fonts\./,r=>r.abort()); await ctx.addInitScript(a=>{window.EVAREL_API=a},API);
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=(n,c,v='')=>console.log((c?'PASS ':'FAIL ')+n,v);
// 1 กดปุ่ม Google -> ไปที่ Supabase authorize (ดัก request ไม่ตามไป Google จริง)
let target=''; await p.route(/supabase\.co\/auth\/v1\/authorize/,r=>{target=r.request().url();r.abort()});
await p.goto(APP); await p.waitForTimeout(1500); await p.click('[data-act="au-google"]'); await p.waitForTimeout(1200);
ok('ปุ่ม Google พาไป Supabase authorize + provider=google',/authorize\?provider=google/.test(target),target.slice(0,110));
ok('redirect_to กลับมาที่แอปเอง',decodeURIComponent(target).includes('redirect_to=http://localhost:8779/index.html'));
// 2 กลับจาก Google พร้อม token ใน hash
await p.goto(APP+`#access_token=${tk.access_token}&refresh_token=${tk.refresh_token}&expires_at=${tk.expires_at}&token_type=bearer`); await p.waitForTimeout(3500);
ok('เข้าแอปได้ด้วย token ที่กลับมา',(await p.evaluate(()=>document.body.dataset.auth))==='in');
ok('ล้าง token ออกจาก URL แล้ว',!(await p.evaluate(()=>location.hash)).includes('access_token'),await p.evaluate(()=>location.href));
ok('เก็บ session',await p.evaluate(()=>!!localStorage.getItem('evarel-session-v2')));
// 3 token ปลอมใน hash -> ห้ามเข้า
const ctx2=await b.newContext({viewport:{width:412,height:915}}), p2=await ctx2.newPage(); await ctx2.addInitScript(a=>{window.EVAREL_API=a},API); await p2.route(/fonts\./,r=>r.abort());
await p2.goto(APP+'#access_token=aaa.bbb.ccc&refresh_token=x&expires_at=9999999999'); await p2.waitForTimeout(3000);
ok('token ปลอมใน URL -> ไม่เข้าแอป',(await p2.evaluate(()=>document.body.dataset.auth))!=='in',await p2.evaluate(()=>document.body.dataset.auth));
ok('ไม่มี pageerror',errs.length===0,errs.slice(0,2).join('|'));
await j('DELETE',SB+'/auth/v1/admin/users/'+u.id,null,adm); await b.close();
