/* ชั้นฐาน (ES module จริง): ไคลเอนต์บัญชีและซิงก์ข้อมูลผ่าน Worker — authErr ที่เก็บ session และ SupaCore/SupaAuth/SupaAdapter
   ตรรกะชุดเดียว: โมดูลเดิม 05-data__auth เรียกใช้ที่นี่ผ่านตัวห่อ คงพฤติกรรมตรงตัวทุกจุด (เทียบด้วย tests/authclient_equiv.test.mjs)
   สัญญา adapter: session():User|null · signInGoogle() · signInEmail(email,pw) · signUp({name,email,password}) · sendReset(email) · signOut() · deleteAccount()
   error ต้องโยก code: invalid_credentials | email_taken | network | unknown — ของจริง: เก็บ session เป็น httpOnly cookie, แฮชรหัสผ่านฝั่ง Server (Argon2/bcrypt) */
export const authErr = (code: string): Error => Object.assign(new Error(code), { code });

export const SUPA_SESS = 'evarel-session-v2';
export const nowS = (): number => Math.floor(Date.now() / 1000);
export const supaLoad = (): any => { try { const v = localStorage.getItem(SUPA_SESS); return v == null ? null : JSON.parse(v) } catch (err) { return null } }; /* คีย์ไม่มี = null (JSON.parse(null) เดิมให้ null เหมือนกัน) | JSON พัง = null */
export const supaSave = (t: any): void => localStorage.setItem(SUPA_SESS, JSON.stringify(t));
export const supaClear = (): void => localStorage.removeItem(SUPA_SESS);

export const SupaCore = (api: string) => {
  /** @param {string} path @param {{method?:string, body?:any, token?:string}} [opt] */
  const raw = async (path: string, { method = 'GET', body, token }: any = {}) => { let r; try { r = await fetch(`${api}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }) } catch (err) { throw authErr('network') }
    const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(authErr(j.code || (r.status === 401 ? 'invalid_credentials' : 'unknown')), { status: r.status }); return j };
  let refreshing: any = null;
  const token = async (): Promise<string> => { const s = supaLoad(); if (!s) throw authErr('unverified'); if (s.expires_at - nowS() > 60) return s.access_token;
    refreshing = refreshing || raw('/auth/refresh', { method: 'POST', body: { refresh_token: s.refresh_token } }).then((n: any) => { supaSave(n); return n }).catch((e: any) => { if (e.status === 401 || e.status === 400) supaClear(); throw e }).finally(() => { refreshing = null }); return (await refreshing).access_token };
  const userOf = (s: any) => ({ id: s.user.id, name: s.user.name || (s.user.email || '').split('@')[0], email: s.user.email, provider: s.user.provider || 'email' });
  return { raw, token, userOf } };

export const SUPA_HOST = 'https://vdbmwmmsfrgpaauzspup.supabase.co';

/* OAuth กลับจาก Google: token เดิมแขวนใน URL hash ซึ่งหายได้ง่าย (ล้างก่อนตรวจ → เน็ตวูบ = ต้องกด Google ใหม่)
   จึง "จอด" (park) ข้อมูลดิบไว้ที่ localStorage ให้สคริปต์หัวหน้า (inline ใน index.html/layout) จับตั้งแต่เฟรมแรก
   แล้ว takeOAuthReturn ค่อยอ่านจากที่จอดมาตรวจกับ /auth/session — สำเร็จค่อยล้าง ไม่สำเร็จคงไว้ให้รีโหลดหน้าถัดไปลองใหม่เอง
   OAUTH_ERR: กรณีผู้ใช้กดยกเลิกที่หน้า Google (Supabase ส่งกลับด้วย #error=access_denied) เก็บไว้แจ้งผู้ใช้แบบมีมารยาท */
export const OAUTH_PARK = 'evarel-oauth-park';
export const OAUTH_ERR = 'evarel-oauth-error';
export const oauthParkRead = (): any => { try { const v = localStorage.getItem(OAUTH_PARK); return v ? JSON.parse(v) : null } catch (err) { return null } };
export const oauthParkWrite = (p: any): void => { try { localStorage.setItem(OAUTH_PARK, JSON.stringify(p)) } catch (err) { /* เต็ม/โหมดส่วนตัว: hash ยังอยู่ใน URL จน takeOAuthReturn อ่านเอง */ } };
export const oauthParkClear = (): void => { try { localStorage.removeItem(OAUTH_PARK) } catch (err) { } };

export const SupaAuth = (api: string) => { const c = SupaCore(api); let pending: any = null; /* pending: ที่รอยืนยันรหัส 6 หลัก {email,type} */
  const take = (s: any) => { supaSave({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, user: s.user }); return c.userOf(s) };
  return {
    async session() { const s = supaLoad(); if (!s) return null; try { await c.token(); return c.userOf(supaLoad()) } catch (err) { console.warn('session', err); return null } },
    /* Google: เบราว์เซอร์ไปหน้า Google ผ่าน Supabase แล้วกลับมาพร้อม token ใน URL hash (ดู takeOAuthReturn) */
    async signInGoogle() { location.assign(`${SUPA_HOST}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(location.origin + location.pathname)}`); return new Promise(() => {}) },
    async takeOAuthReturn() {
      /* ผู้ใช้ยกเลิกที่หน้า Google: แจ้งโค้ด oauth_cancelled ให้ boot โชว์ข้อความ (แล้วยังลองเซสชันเดิมต่อได้) */
      let oauthErr = ''; try { oauthErr = sessionStorage.getItem(OAUTH_ERR) || ''; sessionStorage.removeItem(OAUTH_ERR) } catch (err) { }
      if (oauthErr) throw authErr(oauthErr === 'access_denied' ? 'oauth_cancelled' : 'oauth_failed');
      const h = new URLSearchParams(location.hash.replace(/^#/, ''));
      const inHash = !!h.get('access_token');
      const tok: any = inHash ? Object.fromEntries(h) : oauthParkRead(); /* อ่านจาก hash ก่อน แล้ว fallback ที่จอดไว้ */
      if (!tok || !tok.access_token) return null;
      if (inHash) { oauthParkWrite(tok); history.replaceState(null, '', location.pathname + location.search); } /* จอดก่อน แล้วล้าง token ออกจาก URL ทันที */
      /* expires_at: Supabase implicit flow ส่ง expires_in (วินาที) มาแทน — ถ้าไม่มี expires_at ให้คำนวณเอง ไม่งั้นทุกคำขอจะโดน refresh ฟุ่งเฟื่อง */
      const ex = Number(tok.expires_at) || (nowS() + (Number(tok.expires_in) || 0));
      const post = () => c.raw('/auth/session', { method: 'POST', body: { access_token: String(tok.access_token), refresh_token: String(tok.refresh_token || ''), expires_at: ex } });
      try {
        /* เน็ตกระตุก (fetch พัง/5xx): ลองอีกครั้งเดียวพอ — ล้มเหลวถาวร (4xx token เสีย) ล้างที่จอด กันวนถามทุกรีโหลด */
        let j: any; try { j = await post() } catch (err: any) { if (err && (err.code === 'network' || !(err.status < 500))) { await new Promise((r) => setTimeout(r, 500)); j = await post() } else throw err }
        oauthParkClear(); return take(j)
      } catch (err: any) {
        if (err && err.status && err.status < 500) oauthParkClear(); /* 4xx = token เสียถาวร เลิกพยายาม กันวนถามทุกรีโหลด */
        throw authErr('oauth_failed')
      } },
    async signInEmail(email: string, pw: string) { return take(await c.raw('/auth/login', { method: 'POST', body: { email, password: pw } })) },
    async signUp({ name, email, password }: any) { const j = await c.raw('/auth/signup', { method: 'POST', body: { name, email, password } }); if (j.status === 'verify') { pending = { email, type: 'signup' }; throw authErr('verify_needed') } return take(j) },
    async sendReset(email: string) { await c.raw('/auth/forgot', { method: 'POST', body: { email } }); pending = { email, type: 'recovery' } },
    async verifyCode(email: string, code: string, type: string) { return take(await c.raw('/auth/verify', { method: 'POST', body: { email, code, type } })) },
    async resend(email: string, type: string) { await c.raw('/auth/resend', { method: 'POST', body: { email, type } }) },
    async setPassword(password: string) { await c.raw('/auth/password', { method: 'POST', body: { password }, token: await c.token() }) },
    async signOut() { supaClear(); oauthParkClear() }, /* ล้าง OAuth ที่จอดไว้ด้วย กันเซสชันค้างหลังออกจากระบบ */
    async deleteAccount(pw: string) { await c.raw('/auth/account', { method: 'DELETE', body: { password: pw }, token: await c.token() }); supaClear() } } };

export const SupaAdapter = (api: string) => { const c = SupaCore(api); const call = async (path: string, o: any = {}) => { const t = await c.token(); const r = await fetch(`${api}${path}`, { ...o, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t } }); if (!r.ok) throw new Error(`${o.method || 'GET'} ${path} ${r.status}`); return r };
  return { token: c.token, async load() { return { items: (await (await call('/items')).json()).items } },
    async apply({ upserts, removes }: any) { await Promise.all([...upserts.map((it: any) => call(`/items/${it.id}`, { method: 'PUT', body: JSON.stringify(it) })), ...removes.map((id: any) => call(`/items/${id}`, { method: 'DELETE' }))]) } } };
