/* เทียบ usageCardHTML/versionCardHTML/providerChip ของโค้ดเดิม (ตัวอ้างอิง = เนื้อไฟล์ 19-views__settings.ts จาก git ก่อนย้าย) กับ core/settingsviews
   เทียบ HTML ที่ได้ต้องตรงกันทุกไบต์ต่อกรณี (หน้าตาเหมือนเดิมทุกจุด = สัญญาของรอบนี้)
   ตัวอ้างอิงอ่านจาก git object ที่ commit ฐานระบุ (REF_COMMIT) ไม่ใช่จากดิสก์ (ไม่งั้นเทียบกับตัวเอง)
   quotaState/resetInAt/GLOGO ที่ตัวอ้างอิงใช้ มาจากโมดูล core จริงตัวเดียวกับฝั่งใหม่ (เทสต์ไม่ลอกตรรกะเอง)
   ใช้: node tests/settingsviews_equiv.test.mjs   ผล: exit 1 ถ้าต่างแม้กรณีเดียว
   ฉีดความผิดพิสูจน์ว่าเทสต์จับได้: INJECT=1..7 node tests/settingsviews_equiv.test.mjs (ต้อง exit 1 ทุกค่า) */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const REF_COMMIT = 'a6c2858';
const ref = execFileSync('git', ['show', REF_COMMIT + ':app/src/m/19-views__settings.ts'], { cwd: root, encoding: 'utf8' });
const cut = (a, b) => { const i = ref.indexOf(a); if (i < 0) throw new Error('ไม่พบ ' + a); const j = b ? ref.indexOf(b, i) : ref.length; if (j < 0) throw new Error('ไม่พบจบ ' + b); return ref.slice(i, j); };
const strip = (s) => s.replace(/:\s*any\b/g, '').replace(/as any/g, '');
const quota = await import('file://' + root + '/app/web/js/m/core/quota.js');
const av = await import('file://' + root + '/app/web/js/m/core/authviews.js');
const core = await import('file://' + root + '/app/web/js/m/core/settingsviews.js');
const inj = Number(process.env.INJECT || 0);
/* ทั้งสองฝั่งเรียก resetInAt(iso, Date.now()) — เส้นแบ่งนาทีอาจตัดระหว่างเทียบ -> ตรึงเวลาชั่วขณะให้สองฝั่งเป็นเวลาเดียวกัน */
const REAL_NOW = Date.now; const NOW = REAL_NOW(); Date.now = () => NOW;
try {
  /* ตัวอ้างอิง: ตัดวางจากไฟล์เดิม ให้ ST/quotaState/resetIn/GLOGO มาจากเทสต์ (โมดูล core จริง) */
  const refQS = inj === 6 ? (() => 'low') : quota.quotaState;
  const mkUsage = (q, refResetIn) => new Function('ST', 'quotaState', 'resetIn', strip(cut('function usageCardHTML(){', '\nconst providerChip=')) + '\nreturn usageCardHTML')({ QUOTA: q }, refQS, refResetIn || ((iso) => quota.resetInAt(iso, NOW)));
  const mkVer = (v) => new Function('ST', strip(cut('function versionCardHTML(){', '\nfunction versionPaint')) + '\nreturn versionCardHTML')({ APPVER: v });
  const refChip = new Function('GLOGO', strip(cut('const providerChip=', '\nfunction settingsHTMLClassic')) + '\nreturn providerChip')(inj === 7 ? '' : av.GLOGO);
  const chipNew = inj === 5 ? (() => { const f = core.providerChip; return (u) => u?.provider === 'google' ? '<span class="ev-chip">อีเมล</span>' : f(u); })() : core.providerChip;

  const Q = (calls, tokens, extra = {}) => ({ calls, tokens, ...extra });
  const CASES_Q = [
    ['null (กำลังโหลด)', null],
    ['unknown:true (ดูข้อมูลไม่ได้)', { unknown: true }],
    ['ไม่มี calls', {}],
    ['มี calls ไม่มี tokens', { calls: { used: 1, limit: 10, remaining: 9 } }],
    ['limit 0', Q({ used: 0, limit: 0, remaining: 0 }, { used: 0, limit: 0, remaining: 0 })],
    ['ok', Q({ used: 3, limit: 20, remaining: 17 }, { used: 120, limit: 2000, remaining: 1880 }, { resetAt: '2026-10-31T16:00:00.000Z' })],
    ['low (15%)', Q({ used: 17, limit: 20, remaining: 3 }, { used: 1700, limit: 2000, remaining: 300 }, { resetAt: '2026-10-31T16:00:00.000Z' })],
    ['low กรอบพอดี 20%', Q({ used: 16, limit: 20, remaining: 4 }, { used: 1600, limit: 2000, remaining: 400 }, { resetAt: '2026-10-31T16:00:00.000Z' })],
    ['out เพราะ calls remaining 0', Q({ used: 20, limit: 20, remaining: 0 }, { used: 100, limit: 2000, remaining: 1900 }, { resetAt: '2026-10-31T16:00:00.000Z' })],
    ['out เพราะ tokens remaining 0', Q({ used: 1, limit: 20, remaining: 19 }, { used: 2000, limit: 2000, remaining: 0 }, { resetAt: '2026-10-31T16:00:00.000Z' })],
    ['out เพราะ blocked', Q({ used: 1, limit: 20, remaining: 19 }, { used: 10, limit: 2000, remaining: 1990 }, { blocked: true, resetAt: '2026-10-31T16:00:00.000Z' })],
    ['used เกิน limit (เปอร์เซ็นต์ตัดที่ 100)', Q({ used: 99, limit: 20, remaining: -79 }, { used: 5, limit: 10, remaining: 5 }, { resetAt: '2026-10-31T16:00:00.000Z' })],
    ['resetAt ไม่ใช่วันที่', Q({ used: 1, limit: 20, remaining: 19 }, { used: 10, limit: 20, remaining: 10 }, { resetAt: 'ไม่ใช่วันที่' })],
    ['resetAt ในอดีต (ในอีกสักครู่)', Q({ used: 1, limit: 20, remaining: 19 }, { used: 10, limit: 20, remaining: 10 }, { resetAt: '2020-01-01T00:00:00.000Z' })],
    ['resetAt ข้ามเที่ยงคืน +7 ชม. (แสดง ชม./นาที)', Q({ used: 1, limit: 20, remaining: 19 }, { used: 10, limit: 20, remaining: 10 }, { resetAt: new Date(NOW + 90 * 60000).toISOString() })],
    ['เรียกซ้ำด้วย q เดิม (ไม่แก้ q)', Q({ used: 3, limit: 20, remaining: 17 }, { used: 120, limit: 2000, remaining: 1880 }, { resetAt: '2026-10-31T16:00:00.000Z' })],
  ];
  const CASES_V = [
    ['ว่าง', {}],
    ['มี version', { version: '2026.2.49' }],
    ['version + build', { version: '2026.2.49', build: 'a1b2c3d4' }],
    ['version + build + date', { version: '2026.2.49', build: 'a1b2c3d4', date: '2026-10-30' }],
    ['มี build ไม่มี version', { build: 'x' }],
    ['มี date ไม่มี version/build', { date: '2026-10-30' }],
  ];
  const CASES_C = [
    ['google', { provider: 'google' }],
    ['อีเมล', { provider: 'email' }],
    ['provider อื่น', { provider: 'apple' }],
    ['ไม่มี provider', {}],
    ['null', null],
    ['undefined', undefined],
  ];

  let n = 0, fail = 0;
  const t = (name, ok, detail = '') => { n++; if (!ok) { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); } };
  const safe = (fn) => { try { return fn(); } catch (e) { return 'THREW:' + (e && e.message); } };
  const same = (name, a, b) => t(name, a === b, a === b ? '' : '\n  ref=' + String(a).slice(0, 200) + '\n  new=' + String(b).slice(0, 200));
  for (const [name, q] of CASES_Q) {
    const qr = JSON.parse(JSON.stringify(q ?? null));
    const qb = inj === 1 ? Q({ used: 999, limit: 20, remaining: -979 }, { used: 120, limit: 2000, remaining: 1880 }) : inj === 2 ? (q == null ? { unknown: true } : JSON.parse(JSON.stringify(q))) : JSON.parse(JSON.stringify(q));
    const a = safe(() => mkUsage(qr, inj === 3 ? () => '(เวลาถูกฉีด)' : undefined)());
    const b = safe(() => core.usageCardHTML(qb));
    same('usageCardHTML ' + name, a, b);
  }
  for (const [name, v] of CASES_V) {
    const a = mkVer(JSON.parse(JSON.stringify(v)))();
    const b = core.versionCardHTML(inj === 4 ? { ...v, build: v.build ? 'zzz' : v.build } : JSON.parse(JSON.stringify(v)));
    same('versionCardHTML ' + name, a, b);
  }
  for (const [name, u] of CASES_C) {
    const a = refChip(JSON.parse(JSON.stringify(u ?? null)));
    const b = chipNew(JSON.parse(JSON.stringify(u ?? null)));
    same('providerChip ' + name, a, b);
  }
  /* q ที่ส่งเข้าไปต้องไม่ถูกแก้ (ตัวเรียกอาจถือ ST.QUOTA ตัวเดิมต่อ) */
  { const q = Q({ used: 3, limit: 20, remaining: 17 }, { used: 120, limit: 2000, remaining: 1880 }, { resetAt: '2026-10-31T16:00:00.000Z' }); const snap = JSON.stringify(q); core.usageCardHTML(q); t('usageCardHTML ไม่แก้ q ที่รับมา', JSON.stringify(q) === snap); }
  console.log((fail ? 'FAIL ' : 'PASS ') + n + ' ตรวจ' + (fail ? ' ตก ' + fail : ' ตรงทุกกรณี') + (inj ? ' (INJECT=' + inj + ')' : ''));
  process.exitCode = fail ? 1 : 0;
} finally { Date.now = REAL_NOW; }
