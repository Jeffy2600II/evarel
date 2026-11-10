src = open('archive/design/Ordivel-v27.html', encoding='utf8').read()
out = src

API_BLOCK = r"""
/* ================= WIRING v27 -> backend จริง (เพิ่มโดย Zenith 10 พ.ย. 2026) =================
   เดโม v27 ออกแบบจุดต่อไว้แล้ว: Repo (items) · Auth (บัญชี) · PUSH · AiApi
   บล็อกนี้แทนที่ตัวจำลองใน localStorage ด้วย API จริง โดยไม่แตะ UI/หน้าตาของเดโมเลย */
const API=(window.EVAREL_API||'https://ordivel-api-forge.nontakorn2600.workers.dev/api').replace(/\/+$/,'');
const TOK_KEY='ordivel-token';
const Tok={get(){try{return JSON.parse(LS.getItem(TOK_KEY)||'null')}catch(e){return null}},
  set(v){LS.setItem(TOK_KEY,JSON.stringify(v))},clear(){LS.removeItem(TOK_KEY)}};
async function apiFetch(path,opt={}){
  const doCall=t=>{const h={'Content-Type':'application/json',...(opt.headers||{})};if(t)h.Authorization='Bearer '+t;
    return fetch(API+path,{...opt,headers:h})};
  let t=Tok.get();let r=await doCall(t&&t.access_token);
  if(r.status===401&&t&&t.refresh_token){
    const rr=await fetch(API+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:t.refresh_token})});
    if(rr.ok){const fresh=await rr.json();Tok.set(fresh);r=await doCall(fresh.access_token)}
  }
  return r;
}
"""

REPO_OLD = "const Repo=LocalAdapter;/* เมื่อมี backend: const Repo=HttpAdapter('/api'); */"
REPO_NEW = r"""/* Repo = API จริง (สัญญาเดียวกับ HttpAdapter ของเดโม: GET /items · PUT/DELETE /items/:id) */
const Repo={async load(){const r=await apiFetch('/items');if(!r.ok)throw new Error('load '+r.status);const j=await r.json();return {items:Array.isArray(j.items)?j.items:[]}},
 async apply({upserts,removes}){const jobs=[...upserts.map(it=>apiFetch('/items/'+encodeURIComponent(it.id),{method:'PUT',body:JSON.stringify(it)})),
  ...removes.map(id=>apiFetch('/items/'+encodeURIComponent(id),{method:'DELETE'}))];
  const res=await Promise.all(jobs);const bad=res.find(r=>!r.ok);if(bad)throw new Error('save '+bad.status)}};"""

AUTH_OLD = "const Auth=MockAuth;/* backend จริง: const Auth=HttpAuth('/api'); แล้วให้ปุ่ม Google เรียก Google Identity Services เพื่อได้ idToken ส่งให้ Server ตรวจสอบ */"
AUTH_NEW = r"""/* Auth = บัญชีจริงผ่าน Worker (/api/auth/*) · เก็บ token ใน localStorage · ต่ออายุอัตโนมัติเมื่อ 401 */
const RealAuth={
 async session(){const t=Tok.get();if(!t)return null;
   const exp=Number(t.expires_at||0)*1000;
   if(exp&&Date.now()>exp-60000&&t.refresh_token){const r=await fetch(API+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:t.refresh_token})});
     if(r.ok){const fresh=await r.json();Tok.set(fresh);return fresh.user||t.user}Tok.clear();return null}
   return t.user||null},
 async signInEmail(email,password){const r=await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
   const j=await r.json().catch(()=>({}));
   if(j.status==='verify')return {pending:true,email:j.email||email};
   if(!r.ok)throw authErr(j.code||'unknown');
   Tok.set(j);return j.user},
 async signUp({name,email,password}){const r=await fetch(API+'/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw authErr(j.code||'unknown');
   if(j.access_token){Tok.set(j);return j.user}
   return {pending:true,email:j.email||email}},
 async verifyCode(email,code,type){const r=await fetch(API+'/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,code,type:type==='recovery'?'recovery':'signup'})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw authErr(j.code||'code_invalid');
   if(j.access_token){Tok.set(j);return j.user}
   return {verified:true,access_token:j.access_token,reset_token:j.reset_token}},
 async resend(email,type){await fetch(API+'/auth/resend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,type})});return {}},
 async sendReset(email){await fetch(API+'/auth/forgot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});return {pending:true,email}},
 async resetPassword(email,code,password){const r=await apiFetch('/auth/password',{method:'POST',body:JSON.stringify({email,code,password})});
   const j=await r.json().catch(()=>({}));if(!r.ok)throw authErr(j.code||'unknown');return j},
 async signOut(){Tok.clear()},
 async deleteAccount(){const r=await apiFetch('/auth/account',{method:'DELETE'});if(!r.ok)throw authErr('unknown');Tok.clear()},
 async signInGoogle(){throw authErr('google_off')}
};
const Auth=RealAuth;
 const SUPA_HOST='https://vdbmwmmsfrgpaauzspup.supabase.co';
 RealAuth.signInGoogle=()=>{location.assign(`${SUPA_HOST}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin+location.pathname)}`);return new Promise(()=>{})};
 RealAuth.takeOAuthReturn=async()=>{
   const h=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
   if(!h.get('access_token'))return null;
   const tok=Object.fromEntries(h);
   const ex=Number(tok.expires_at)||(Math.floor(Date.now()/1000)+(Number(tok.expires_in)||0));
   history.replaceState(null,'',location.pathname+location.search);
   const r=await fetch(API+'/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({access_token:String(tok.access_token),refresh_token:String(tok.refresh_token||''),expires_at:ex})});
   if(!r.ok)throw authErr('oauth_failed');
   const j=await r.json();Tok.set(j);return j.user};
"""

PUSH_HOOK = r"""
/* ปุ่ม/การลงทะเบียนเครื่อง: ใช้ endpoint จริงของ Worker (กุญแจ VAPID -> สมัคร -> บันทึก) */
async function registerPushReal(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window))return 'unsupported';
  if(Notification.permission==='denied')return 'denied';
  if(Notification.permission!=='granted'){const p=await Notification.requestPermission();if(p!=='granted')return 'not-asked'}
  const t=Tok.get();if(!t)return 'auth';
  const kr=await fetch(API+'/push/key');if(!kr.ok)return 'no-key';
  const {publicKey}=await kr.json();
  const b64=publicKey.replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(b64+'='.repeat((4-b64.length%4)%4));
  const u8=new Uint8Array([...raw].map(c=>c.charCodeAt(0)));
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(sub&&sub.options.applicationServerKey){const have=new Uint8Array(sub.options.applicationServerKey);
    const same=have.length===u8.length&&have.every((v,i)=>v===u8[i]);if(!same){await sub.unsubscribe();sub=null}}
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8});
  const sr=await apiFetch('/push/subscribe',{method:'POST',body:JSON.stringify(sub.toJSON())});
  if(sr.status===403)return 'limit';
  if(!sr.ok)return 'server';
  return 'ok';
}
const registerPush=()=>registerPushReal();
"""

def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit('ไม่พบจุดต่อ: '+label)
    return text.replace(old, new, 1)

out = must_replace(out, REPO_OLD, REPO_NEW, 'Repo')
out = must_replace(out, AUTH_OLD, AUTH_NEW, 'Auth')
if 'async function registerPush(){' in out:
    out = out.replace('async function registerPush(){','async function registerPushMock(){',1)
    out = out.replace('return \'ok\';\n}', 'return \'ok\';\n}\nconst registerPush=()=>registerPushReal();',1)
out = out.replace('USER=await Auth.session()', 'USER=(Auth.takeOAuthReturn?await Auth.takeOAuthReturn().catch(()=>null):null)||await Auth.session()', 1)
out = out.replace('</body>', '<script>'+'''
/* PWA: ลงทะเบียน service worker ของบิลด์ (จำเป็นต่อ Web Push + แคช) */
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
  addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{})});
}
'''+'</script></body>',1)
out = out.replace('<meta name=viewport', '<link rel="manifest" href="manifest.webmanifest">\n<meta name=viewport', 1)
out = out.replace('<title>Ordivel v26</title>','<title>Ordivel v27</title>',1)
# แทรกบล็อก API ก่อนบรรทัด Repo (หลัง patch แล้วต้องหาใหม่)
anchor = '/* Repo = API จริง'
i = out.find(anchor)
out = out[:i] + API_BLOCK + '\n' + out[i:]
# แทรกฟังก์ชันลงทะเบียนเครื่องจริงไว้ก่อนสิ้นสุดสคริปต์แรก
j = out.find('window.__ordivel') 
out = out.replace('const PUSH_KEY=\'evarel-push-sub\';', 'const PUSH_KEY=\'evarel-push-sub-v2\';'+PUSH_HOOK, 1)
open('web/app27/index.html','w',encoding='utf8').write(out)
print('สร้าง web/app27/index.html:', len(out), 'ตัวอักษร')
