/* ===== MODULE: data/auth — จุดต่อระบบบัญชี: เปลี่ยน `Auth` ตัวเดียว (UI ไม่รู้ว่าล็อกอินทำงานอย่างไร) =====
   สัญญา adapter: session():User|null · signInGoogle() · signInEmail(email,pw) · signUp({name,email,password}) · sendReset(email) · signOut() · deleteAccount()
   error ต้องโยก code: invalid_credentials | email_taken | network | unknown — ของจริง: เก็บ session เป็น httpOnly cookie, แฮชรหัสผ่านฝั่ง Server (Argon2/bcrypt) */
const USERS_KEY='evarel-demo-users',SESSION_KEY='evarel-demo-session',AUTH_DELAY_MS=700;
const authErr=code=>Object.assign(new Error(code),{code});
const readUsers=()=>{try{return JSON.parse(localStorage.getItem(USERS_KEY))||[]}catch(err){console.warn('users',err);return []}};
const writeUsers=u=>localStorage.setItem(USERS_KEY,JSON.stringify(u));
const pubUser=u=>({id:u.id,name:u.name,email:u.email,provider:u.provider});
async function hashPw(p){try{const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('evarel-demo:'+p));return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(err){console.warn('subtle unavailable',err);let h=5381;for(const ch of p)h=(h*33)^ch.charCodeAt(0);return 'weak'+(h>>>0)}}
const DEMO_GOOGLE={name:'Nontakorn',email:'demo.user@gmail.com'};
const newId=()=>'u_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const MockAuth={
 async session(){const id=localStorage.getItem(SESSION_KEY),u=id&&readUsers().find(x=>x.id===id);return u?pubUser(u):null},
 async signInGoogle(){await wait(AUTH_DELAY_MS);const us=readUsers();let u=us.find(x=>x.email===DEMO_GOOGLE.email);if(!u){u={id:newId(),...DEMO_GOOGLE,provider:'google'};us.push(u);writeUsers(us)}localStorage.setItem(SESSION_KEY,u.id);return pubUser(u)},
 async signInEmail(email,pw){await wait(AUTH_DELAY_MS);const e=email.trim().toLowerCase(),u=readUsers().find(x=>x.email===e&&x.provider==='email');if(!u||u.hash!==await hashPw(pw))throw authErr('invalid_credentials');localStorage.setItem(SESSION_KEY,u.id);return pubUser(u)},
 async signUp({name,email,password}){await wait(AUTH_DELAY_MS);const e=email.trim().toLowerCase(),us=readUsers();if(us.some(x=>x.email===e))throw authErr('email_taken');const u={id:newId(),name,email:e,provider:'email',hash:await hashPw(password)};us.push(u);writeUsers(us);localStorage.setItem(SESSION_KEY,u.id);return pubUser(u)},
 async sendReset(email){await wait(AUTH_DELAY_MS)},
 async signOut(){localStorage.removeItem(SESSION_KEY)},
 async deleteAccount(){const id=localStorage.getItem(SESSION_KEY);writeUsers(readUsers().filter(x=>x.id!==id));[STORE_KEY,CHATS_KEY,TIMER_KEY].forEach(k=>localStorage.removeItem(`${k}:${id}`));localStorage.removeItem(SESSION_KEY)}};
const HttpAuth=base=>{const call=(p,o={})=>fetch(`${base}${p}`,{credentials:'include',headers:{'Content-Type':'application/json'},...o}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw authErr(j.code||'unknown');return j}).catch(err=>{throw err.code?err:authErr('network')});
 const post=(p,b)=>call(p,{method:'POST',body:b?JSON.stringify(b):undefined});
 return {session:()=>fetch(`${base}/auth/me`,{credentials:'include'}).then(r=>r.ok?r.json():null),signInGoogle:idToken=>post('/auth/google',{idToken}),signInEmail:(email,password)=>post('/auth/login',{email,password}),signUp:b=>post('/auth/signup',b),sendReset:email=>post('/auth/forgot',{email}),signOut:()=>post('/auth/logout'),deleteAccount:()=>call('/auth/me',{method:'DELETE'})}};

/* ===== Supabase จริงผ่าน Worker (เปิดใช้เมื่อตั้ง window.EVAREL_API) — ไม่มีกุญแจ Supabase ในเบราว์เซอร์ ===== */
const SUPA_SESS='evarel-session-v2',nowS=()=>Math.floor(Date.now()/1000);
const supaLoad=()=>{try{return JSON.parse(localStorage.getItem(SUPA_SESS))}catch(err){return null}},supaSave=t=>localStorage.setItem(SUPA_SESS,JSON.stringify(t)),supaClear=()=>localStorage.removeItem(SUPA_SESS);
const SupaCore=api=>{
 const raw=async(path,{method='GET',body,token}={})=>{let r;try{r=await fetch(`${api}${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined})}catch(err){throw authErr('network')}
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(authErr(j.code||(r.status===401?'invalid_credentials':'unknown')),{status:r.status});return j};
 let refreshing=null;
 const token=async()=>{const s=supaLoad();if(!s)throw authErr('unverified');if(s.expires_at-nowS()>60)return s.access_token;
  refreshing=refreshing||raw('/auth/refresh',{method:'POST',body:{refresh_token:s.refresh_token}}).then(n=>{supaSave(n);return n}).catch(e=>{if(e.status===401||e.status===400)supaClear();throw e}).finally(()=>{refreshing=null});return (await refreshing).access_token};
 const userOf=s=>({id:s.user.id,name:s.user.name||(s.user.email||'').split('@')[0],email:s.user.email,provider:s.user.provider||'email'});
 return {raw,token,userOf}};
const SUPA_HOST='https://vdbmwmmsfrgpaauzspup.supabase.co';
const SupaAuth=api=>{const c=SupaCore(api);let pending=null;/* pending: ที่รอยืนยันรหัส 6 หลัก {email,type} */
 const take=s=>{supaSave({access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at,user:s.user});return c.userOf(s)};
 return {
  async session(){const s=supaLoad();if(!s)return null;try{await c.token();return c.userOf(supaLoad())}catch(err){console.warn('session',err);return null}},
  /* Google: เบราว์เซอร์ไปหน้า Google ผ่าน Supabase แล้วกลับมาพร้อม token ใน URL hash (ดู takeOAuthReturn) */
  async signInGoogle(){location.assign(`${SUPA_HOST}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin+location.pathname)}`);return new Promise(()=>{})},
  async takeOAuthReturn(){const h=new URLSearchParams(location.hash.replace(/^#/,''));if(!h.get('access_token'))return null;
   history.replaceState(null,'',location.pathname+location.search);/* ล้าง token ออกจาก URL ทันที */
   const j=await c.raw('/auth/session',{method:'POST',body:{access_token:h.get('access_token'),refresh_token:h.get('refresh_token')||'',expires_at:+h.get('expires_at')||0}});return take(j)},
  async signInEmail(email,pw){return take(await c.raw('/auth/login',{method:'POST',body:{email,password:pw}}))},
  async signUp({name,email,password}){const j=await c.raw('/auth/signup',{method:'POST',body:{name,email,password}});if(j.status==='verify'){pending={email,type:'signup'};throw authErr('verify_needed')}return take(j)},
  async sendReset(email){await c.raw('/auth/forgot',{method:'POST',body:{email}});pending={email,type:'recovery'}},
  async verifyCode(email,code,type){return take(await c.raw('/auth/verify',{method:'POST',body:{email,code,type}}))},
  async resend(email,type){await c.raw('/auth/resend',{method:'POST',body:{email,type}})},
  async setPassword(password){await c.raw('/auth/password',{method:'POST',body:{password},token:await c.token()})},
  async signOut(){supaClear()},
  async deleteAccount(pw){await c.raw('/auth/account',{method:'DELETE',body:{password:pw},token:await c.token()});supaClear()}}};
const SupaAdapter=api=>{const c=SupaCore(api);const call=async(path,o={})=>{const t=await c.token();const r=await fetch(`${api}${path}`,{...o,headers:{'Content-Type':'application/json',Authorization:'Bearer '+t}});if(!r.ok)throw new Error(`${o.method||'GET'} ${path} ${r.status}`);return r};
 return {token:c.token,async load(){return {items:(await (await call('/items')).json()).items}},
  async apply({upserts,removes}){await Promise.all([...upserts.map(it=>call(`/items/${it.id}`,{method:'PUT',body:JSON.stringify(it)})),...removes.map(id=>call(`/items/${id}`,{method:'DELETE'}))])}}};
const SUPA_API=typeof window!=='undefined'&&window.EVAREL_API?String(window.EVAREL_API).replace(/\/+$/,'')+'/api':null;
const Auth=SUPA_API?SupaAuth(SUPA_API):MockAuth;if(SUPA_API)ST.Repo=SupaAdapter(SUPA_API);
const initial=()=>((ST.USER?.name||ST.USER?.email||'?').trim()[0]||'?').toUpperCase();

const S={items:[]};
const UI={tab:'today',date:TODAY,auth:{status:'loading',screen:'welcome',email:'',cool:0},type:'all',period:'week',cal:null,lastW:{},calView:'dayGridMonth',calSel:TODAY,calDate:null,weekOff:0,weekDir:0,fdate:TODAY,error:null,loading:true,animate:true,pop:null,lastP:0};
const find=id=>S.items.find(x=>x.id==id);

/* moved by move_defs (evarel-ts-1f) */
const AI_LIVE=()=>!!SUPA_API;
