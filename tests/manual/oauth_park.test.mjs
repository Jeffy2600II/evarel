/* OAuth กลับจาก Google (2026.2.65): พฤติกรรม takeOAuthReturn ใหม่ — จอด (park) token ก่อนตรวจ กัน token หาย
   Node ล้วน ไม่เปิดเบราว์เซอร์ ไม่ยิงเน็ต: จำลอง localStorage/sessionStorage/location/history/fetch ครบ
   ทดสอบไฟล์ที่เสิร์ฟจริง web/runtime/js/engine/core/authclient.js (ผล compile ของ core/authclient.ts)
   ใช้: node tests/oauth_park.test.mjs */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0; const t = (name, ok, detail = '') => { if (ok) pass++; else fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' :: ' + detail)); };
const AUTHCLIENT = path.join(root, 'web/runtime/js/engine/core/authclient.js');
t('มีไฟล์ authclient.js ที่คอมไพล์แล้ว', fs.existsSync(AUTHCLIENT));

/* ==== ชุดจำลองสภาพเบราว์เซอร์ (รีเซ็ตได้ทุกฉาก) ==== */
let LS = {}, SS = {}, HASH = '', replacedURL = null, calls = [], rules = [];
const mkStore = (map) => ({ getItem: (k) => (k in map ? map[k] : null), setItem: (k, v) => { map[k] = String(v) }, removeItem: (k) => { delete map[k] } });
globalThis.localStorage = mkStore(LS); globalThis.sessionStorage = mkStore(SS);
globalThis.location = { get hash() { return HASH }, origin: 'https://app.test', pathname: '/', search: '' };
globalThis.history = { replaceState(_s, _t, u) { replacedURL = u; HASH = u.includes('#') ? '#' + u.split('#')[1] : '' } };
globalThis.fetch = async (_url, init) => {
  const u = String(_url), r = rules.find((x) => u.includes(x.path));
  calls.push({ path: r ? r.path : u, body: init && init.body ? JSON.parse(init.body) : null });
  if (!r) throw new TypeError('no rule for ' + u);
  if (r.netfail) throw new TypeError('network down');
  return new Response(r.text !== undefined ? r.text : JSON.stringify(r.json ?? {}), { status: r.status || 200, headers: { 'Content-Type': 'application/json' } });
};
const reset = () => { LS = {}; SS = {}; HASH = ''; replacedURL = null; calls = []; rules = [];
  Object.assign(globalThis.localStorage, mkStore(LS)); Object.assign(globalThis.sessionStorage, mkStore(SS)); };
const mod = await import(AUTHCLIENT);
const NOWS = Math.floor(Date.now() / 1000);
const SESSION_OK = { access_token: 'AT1', refresh_token: 'RT1', expires_at: NOWS + 3600, user: { id: 'u1', email: 'a@b.c', name: 'ผู้ใช้ Google', provider: 'google' } };
const ses = (o) => JSON.stringify({ access_token: 'AT0', refresh_token: 'RT0', expires_at: NOWS + 3600, user: { id: 'u0', email: 'old@b.c', name: 'เดิม', provider: 'email' }, ...o });

/* ฉาก 1: กลับจาก Google พร้อม token ใน hash → จอดก่อน ล้าง hash ตรวจสำเร็จ เก็บเซสชัน ล้างที่จอด คืนผู้ใช้ */
reset(); rules = [{ path: '/auth/session', json: SESSION_OK }];
HASH = '#access_token=AT1&refresh_token=RT1&expires_in=3600&token_type=bearer';
let u1 = null, e1 = null; try { u1 = await mod.SupaAuth('https://api.test/api').takeOAuthReturn() } catch (err) { e1 = err }
t('hash มี token → เข้าสู่ระบบสำเร็จ คืนผู้ใช้ provider google', !!u1 && u1.provider === 'google' && u1.email === 'a@b.c', e1 && e1.message);
t('ล้าง token ออกจาก URL แล้ว (replaceState ไม่มี hash)', replacedURL === '/' + '' && HASH === '', `replaced=${replacedURL} hash=${HASH}`);
t('token ถูกล้างหลังสำเร็จ และเซสชันถูกบันทึก', LS['evarel-oauth-park'] == null && JSON.parse(LS['evarel-session-v2']).user.id === 'u1', 'park=' + LS['evarel-oauth-park']);
t('expires_at คำนวณจาก expires_in (ไม่ส่ง 0 ให้เซิร์ฟเวอร์)', calls.length === 1 && Math.abs(calls[0].body.expires_at - (NOWS + 3600)) <= 2, 'ส่ง ' + (calls[0] && calls[0].body.expires_at));
t('ตรวจกับเซิร์ฟเวอร์สาย /auth/session จริง', calls.length === 1 && /\/auth\/session$/.test(calls[0].path), JSON.stringify(calls));

/* ฉาก 2: เน็ตกระตุกครั้งแรก → ลองใหม่เองแล้วสำเร็จ */
reset(); rules = [{ path: '/auth/session', netfail: true }, { path: '/auth/session', json: SESSION_OK }];
/* กติกา find() หยิบตัวแรกเสมอ — จำลองโดยสลับกติกาผ่านตัวนับ */
let n = 0; const origFetch = globalThis.fetch; globalThis.fetch = async (u2, i2) => { n++; if (n === 1) throw new TypeError('network down'); return origFetch(u2, i2) };
rules = [{ path: '/auth/session', json: SESSION_OK }];
HASH = '#access_token=AT1&refresh_token=RT1&expires_in=3600';
u1 = null; e1 = null; try { u1 = await mod.SupaAuth('https://api.test/api').takeOAuthReturn() } catch (err) { e1 = err }
globalThis.fetch = origFetch;
t('เน็ตวูบ 1 ครั้ง → ลองใหม่เองแล้วเข้าสู่ระบบสำเร็จ', !!u1 && u1.id === 'u1', e1 && e1.message);

/* ฉาก 3: เซิร์ฟเวอร์ตอบ 401 (token เสียถาวร) → โยน oauth_failed + ล้างที่จอด (กันวนถามทุกรีโหลด) */
reset(); rules = [{ path: '/auth/session', status: 401, json: { code: 'unverified' } }];
HASH = '#access_token=BAD&refresh_token=RT';
e1 = null; try { await mod.SupaAuth('https://api.test/api').takeOAuthReturn() } catch (err) { e1 = err }
t('token ปลอม → oauth_failed ไม่เข้าแอป', !!e1 && e1.code === 'oauth_failed', e1 && e1.code);
t('token เสียถาวร → ล้างที่จอดทิ้ง ไม่วนลองใหม่เอง', LS['evarel-oauth-park'] == null, 'park=' + LS['evarel-oauth-park']);

/* ฉาก 4: เน็ตล่มทั้งสองครั้ง → oauth_failed + token ยังจอดอยู่ (รีโหลดถัดไปลองใหม่เอง) + เซสชันเดิมไม่ถูกทับ */
reset(); LS['evarel-session-v2'] = ses({}); rules = [{ path: '/auth/session', status: 500, json: { code: 'unknown' } }];
globalThis.fetch = async () => { throw new TypeError('network down') };
HASH = '#access_token=AT1&refresh_token=RT1';
e1 = null; try { await mod.SupaAuth('https://api.test/api').takeOAuthReturn() } catch (err) { e1 = err }
globalThis.fetch = origFetch;
t('เน็ตล่มหนัก → oauth_failed', !!e1 && e1.code === 'oauth_failed', e1 && e1.code);
t('เน็ตล่มหนัก → token ยังจอดอยู่ รีโหลดถัดไปลองใหม่เองได้', !!LS['evarel-oauth-park'] && JSON.parse(LS['evarel-oauth-park']).access_token === 'AT1');
t('เซสชันเดิมไม่ถูกทับตอนตรวจไม่สำเร็จ', JSON.parse(LS['evarel-session-v2']).user.id === 'u0');

/* ฉาก 5: token จอดไว้แล้ว (กลับมาโดย hash หาย) → อ่านจากที่จอดแล้วตรวจต่อให้จนสำเร็จ */
reset(); LS['evarel-oauth-park'] = JSON.stringify({ access_token: 'AT1', refresh_token: 'RT1', expires_in: 3600 });
rules = [{ path: '/auth/session', json: SESSION_OK }];
u1 = null; e1 = null; try { u1 = await mod.SupaAuth('https://api.test/api').takeOAuthReturn() } catch (err) { e1 = err }
t('token ที่จอดไว้ → ตรวจต่อให้จนเข้าสู่ระบบสำเร็จ', !!u1 && u1.provider === 'google', e1 && e1.message);
t('สำเร็จแล้วล้างที่จอด', LS['evarel-oauth-park'] == null);

/* ฉาก 6: ผู้ใช้กดยกเลิกที่หน้า Google (#error=access_denied ถูกสคริปต์หัวหน้าเก็บไว้) → oauth_cancelled */
reset(); SS['evarel-oauth-error'] = 'access_denied';
e1 = null; try { await mod.SupaAuth('https://api.test/api').takeOAuthReturn() } catch (err) { e1 = err }
t('ยกเลิกที่หน้า Google → oauth_cancelled', !!e1 && e1.code === 'oauth_cancelled', e1 && e1.code);

/* ฉาก 7: ไม่มีทั้ง hash ทั้งที่จอด → null เหมือนเดิม (คงพฤติกรรมเทสเทียบ oauth-no-token) */
reset();
u1 = 'sentinel'; e1 = null; try { u1 = await mod.SupaAuth('https://api.test/api').takeOAuthReturn() } catch (err) { e1 = err }
t('ไม่มี token อะไรเลย → คืน null ตามเดิม', u1 === null, 'ได้ ' + JSON.stringify(u1));

/* ฉาก 8: ออกจากระบบ → ล้างทั้งเซสชันและที่จอด (กันเซสชันค้าง) */
reset(); LS['evarel-oauth-park'] = '{"access_token":"AT1"}'; LS['evarel-session-v2'] = ses({});
await mod.SupaAuth('https://api.test/api').signOut();
t('ออกจากระบบ → ล้างเซสชันและ token ที่จอดครบ', LS['evarel-oauth-park'] == null && LS['evarel-session-v2'] == null);

/* ฉาก 9: expires_at มีใน hash อยู่แล้ว → ส่งตรง ไม่คำนวณซ้ำ */
reset(); rules = [{ path: '/auth/session', json: SESSION_OK }];
HASH = '#access_token=AT1&refresh_token=RT1&expires_at=' + (NOWS + 7200);
try { await mod.SupaAuth('https://api.test/api').takeOAuthReturn() } catch (err) { }
t('expires_at ใน hash → ส่งตรงค่าเดิม', calls.length === 1 && calls[0].body.expires_at === NOWS + 7200, 'ส่ง ' + (calls[0] && calls[0].body.expires_at));

console.log(fail ? `\nผล: ตก ${fail} ข้อ` : `\nผล: ผ่านทุกข้อ (${pass} ข้อ)`); process.exit(fail ? 1 : 0);
