import { TODAY } from './02-core__dates.js';
import { authErr, SUPA_SESS, nowS, supaLoad, supaSave, supaClear, SupaCore, SUPA_HOST, SupaAuth, SupaAdapter } from './core/authclient.js';
/* ===== MODULE: data/auth — จุดต่อระบบบัญชี: เปลี่ยน `Auth` ตัวเดียว (UI ไม่รู้ว่าล็อกอินทำงานอย่างไร) =====
   ตรรกะไคลเอนต์ (authErr SUPA_SESS nowS supaLoad supaSave supaClear SupaCore SUPA_HOST SupaAuth SupaAdapter) อยู่ที่ core/authclient.ts แล้ว
   ที่นี่ส่งออกชื่อเดิมต่อ และคงส่วนที่ผูกกับเวลาโหลด: อ่าน window.EVAREL_API สร้าง Auth กับ ST.Repo */
export { authErr, SUPA_SESS, nowS, supaLoad, supaSave, supaClear, SupaCore, SUPA_HOST, SupaAuth, SupaAdapter };
export const SUPA_API = typeof window !== 'undefined' && window.EVAREL_API ? String(window.EVAREL_API).replace(/\/+$/, '') + '/api' : null;
if (!SUPA_API)
    throw new Error('EVAREL_API ไม่ถูกตั้งค่า: แอปทำงานได้เฉพาะเมื่อเชื่อม API จริง');
export const Auth = SupaAuth(SUPA_API);
ST.Repo = SupaAdapter(SUPA_API);
/* ===== ui/profile (v24): อวาตาร์สร้างอัตโนมัติจากชื่อ/อีเมล — ตรรกะอยู่ที่ core/avatar.ts แล้ว (AV_HUES THAI_LEAD hashStr profileOfUser avatarHTMLOf firstNameOf)
   ที่นี่เหลือตัวห่ออ่าน ST.USER ส่งเข้า core และคงชื่อบน window/การ export เดิมทุกชื่อ ===== */
import { AV_HUES, THAI_LEAD, hashStr, profileOfUser, avatarHTMLOf, firstNameOf } from './core/avatar.js';
export { AV_HUES, THAI_LEAD, hashStr };
const profileOf = () => profileOfUser(ST.USER);
const initial = () => profileOf().letter;
const firstName = () => firstNameOf(ST.USER);
export function avatarHTML(o = {}) { return avatarHTMLOf(ST.USER, o); }
export const S = { items: [] };
export const UI = { tab: 'today', date: TODAY, auth: { status: 'loading', screen: 'welcome', email: '', cool: 0 }, type: 'all', period: 'week', cal: null, lastW: {}, calView: 'dayGridMonth', calSel: TODAY, calDate: null, weekOff: 0, weekDir: 0, fdate: TODAY, error: null, loading: true, animate: true, pop: null, lastP: 0 };
export const find = id => S.items.find(x => x.id == id);
/* moved by move_defs (evarel-ts-1f) */
export const AI_LIVE = () => !!SUPA_API;
Object.assign(window, { authErr, SUPA_SESS, nowS, supaLoad, supaSave, supaClear, SupaCore, SUPA_HOST, SupaAuth, SupaAdapter, SUPA_API, Auth, initial, profileOf, avatarHTML, firstName, AV_HUES, THAI_LEAD, hashStr, S, UI, find, AI_LIVE });
