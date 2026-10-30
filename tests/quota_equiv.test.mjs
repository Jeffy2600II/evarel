// พิสูจน์ F6 (16-services__ai-quota -> core/quota): quotaState/quotaShort/resetClock/resetIn ให้ผลเหมือนของเดิมทุกกรณี (เวลาตายตัว) และชื่อที่ไฟล์ส่งออกผ่าน window ยังครบเป็นตัวเดียวกับที่โมดูลส่งออก
// ใช้: node tests/quota_equiv.test.mjs <16-services__ai-quota.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/m/16-services__ai-quota.js', 'utf8'), CORE = fs.readFileSync('app/web/js/m/core/quota.js', 'utf8'), DATES = fs.readFileSync('app/web/js/m/core/dates.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
await p.setContent('<!doctype html><body></body>');
const NAMES = ['limitBanner', 'aiLockInfo', 'QUOTA_LOW', 'QUOTA_POLL_MAX', 'QUOTA_UNKNOWN', 'quotaEnabled', 'quotaState', 'quotaShort', 'resetMs', 'resetClock', 'resetIn', 'quotaFetch', 'quotaPaint', 'quotaRefresh', 'quotaFromChat', 'quotaSheet', 'quotaSheetHTML'];
const r = await p.evaluate(async ({ OLD, NEW, CORE, DATES, NAMES }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const datesU = mk(DATES), coreU = mk(CORE.replace(/\.\/dates\.js/g, datesU)); const out = {};
  const Q = (cl, cr, tl, tr, extra) => ({ calls: { limit: cl, remaining: cr }, tokens: { limit: tl, remaining: tr }, ...extra });
  const quotas = {
    nul: null, undef: undefined, unknown: { unknown: true }, noCalls: { tokens: { limit: 1, remaining: 1 } }, noTokens: { calls: { limit: 1, remaining: 1 } },
    zeroCallLimit: Q(0, 0, 100, 50), zeroTokLimit: Q(10, 5, 0, 0), negLimit: Q(-5, 1, 100, 50), nanLimit: Q(NaN, 1, 100, 50), strLimit: Q('10', 5, 100, 50),
    full: Q(50, 50, 1000, 1000), mid: Q(50, 25, 1000, 500), lowCalls: Q(50, 10, 1000, 900), lowTok: Q(50, 40, 1000, 150), bothLow: Q(50, 5, 1000, 100),
    boundaryCalls: Q(50, 10, 1000, 1000), justAbove: Q(50, 11, 1000, 1000), boundaryTok: Q(50, 50, 1000, 200), tokLowerThanCalls: Q(50, 10, 1000, 190), tokEqCalls: Q(100, 20, 100, 20),
    outCalls: Q(50, 0, 1000, 1000), outTok: Q(50, 30, 1000, 0), outNeg: Q(50, -3, 1000, 100), blocked: Q(50, 40, 1000, 900, { blocked: true }), blockedOut: Q(50, 0, 1000, 0, { blocked: true }),
    one: Q(1, 1, 1, 1), oneUsed: Q(1, 0, 1, 1), big: Q(1e9, 5e8, 1e12, 5e11), frac: Q(3, 1.5, 10, 4.5), remMoreThanLimit: Q(10, 20, 100, 200), reasonTok: Q(50, 40, 1000, 0, { reason: 'tokens' }),
  };
  const isos = {
    nul: null, undef: undefined, empty: '', garbage: 'abc', num: 0, utcMid: '2026-10-30T00:00:00Z', utcNoon: '2026-10-30T12:34:56Z', nearMid: '2026-10-30T16:59:59Z', cross: '2026-10-30T17:00:00Z',
    plus7: '2026-10-30T05:09:00+07:00', minus5: '2026-10-30T05:09:00-05:00', ms: '2026-10-30T10:05:07.999Z', date: '2026-10-30', old: '1999-12-31T23:59:59Z', future: '2099-01-01T00:00:00Z', numStr: '1761800000000', zero: '1970-01-01T00:00:00Z',
  };
  const NOW = Date.parse('2026-10-30T08:00:00Z');
  const deltas = { past: -5000, now: 0, ms1: 1, s1: 1000, s59: 59000, m1: 60000, m1ms: 60001, m59: 59 * 60000, h1: 3600000, h1m1: 3660000, h1m59s59: 3600000 + 59 * 60000 + 59000, h2: 7200000, h5m30: 5 * 3600000 + 30 * 60000, d1: 86400000, huge: 1e12 };
  const DANGER = NAMES;
  for (const [name, src] of [['old', OLD], ['new', NEW]]) {
    for (const k of DANGER) delete window[k];                                            // ล้างทุกชื่อที่ไฟล์ส่งออก ไม่ให้ค่าจากรอบ old ค้างไปปนรอบ new
    const realNow = Date.now; Date.now = () => NOW;                                          // เวลาตายตัว resetIn ผูกเวลาปัจจุบัน
    globalThis.ST = { AI: { notice: null }, QUOTA: null, R: null }; globalThis.icon = () => '<i></i>'; globalThis.AI_LIVE = () => true; globalThis.pad = n => String(n).padStart(2, '0');
    globalThis.S = { items: [] }; globalThis.UI = {}; globalThis.render = () => { };
    try {
      let code = src.replace(/\.\/core\/quota\.js/g, coreU) + '\n//' + name + Math.random();
      const m = await import(mk(code)); const res = {};
      res.exports = Object.keys(m).sort(); res.winTypes = NAMES.map(k => typeof window[k]).join(',');
      res.low = window.QUOTA_LOW; res.poll = window.QUOTA_POLL_MAX; res.unknownFrozen = Object.isFrozen(window.QUOTA_UNKNOWN);
      res.state = Object.fromEntries(Object.entries(quotas).map(([k, v]) => [k, window.quotaState(v)]));
      res.short = Object.fromEntries(Object.entries(quotas).map(([k, v]) => { try { return [k, window.quotaShort(v)] } catch (e) { return [k, 'THROW:' + e.constructor.name] } }));
      res.clock = Object.fromEntries(Object.entries(isos).map(([k, v]) => [k, window.resetClock(v)]));
      res.ms = Object.fromEntries(Object.entries(isos).map(([k, v]) => [k, String(window.resetMs(v))]));
      res.inn = Object.fromEntries(Object.entries(deltas).map(([k, dl]) => [k, window.resetIn(new Date(NOW + dl).toISOString())]));
      res.innBad = Object.fromEntries(Object.entries(isos).map(([k, v]) => [k, window.resetIn(v)]));
      ST.QUOTA = quotas.outCalls; res.lockOut = JSON.stringify(window.aiLockInfo());
      ST.QUOTA = Q(50, 0, 1000, 0, { reason: 'tokens', resetAt: '2026-10-30T10:00:00Z' }); res.lockTok = JSON.stringify(window.aiLockInfo()); res.banner = window.limitBanner();
      ST.QUOTA = quotas.mid; res.lockNone = JSON.stringify(window.aiLockInfo()); ST.AI.notice = { kind: 'limit', reason: 'global' }; res.lockNotice = JSON.stringify(window.aiLockInfo()); res.bannerGlobal = window.limitBanner();
      res.sameTwice = window.quotaShort(quotas.mid) === window.quotaShort(quotas.mid) && window.resetIn(new Date(NOW + 9e5).toISOString()) === window.resetIn(new Date(NOW + 9e5).toISOString());
      res.pure = (() => { const q = JSON.parse(JSON.stringify(quotas.mid)); const before = JSON.stringify(q); window.quotaState(q); window.quotaShort(q); return before === JSON.stringify(q) })();
      res.winSame = NAMES.filter(k => typeof window[k] === 'function' && m[k] !== undefined && window[k] !== m[k]);
      out[name] = res;
    } finally { Date.now = realNow }
  }
  return out;
}, { OLD, NEW, CORE, DATES, NAMES });
const o = r.old, n = r.new; let diff = 0, total = 0;
const cmp = (label, x, y) => { total++; const a = JSON.stringify(x), c = JSON.stringify(y); if (a !== c) { diff++; let i = 0; while (i < a.length && a[i] === c[i]) i++; console.log('ต่าง', label, '| ที่', i, '| เดิม:', a.slice(Math.max(0, i - 25), i + 60), '| ใหม่:', c.slice(Math.max(0, i - 25), i + 60)); } };
for (const k of Object.keys(o)) { if (['state', 'short', 'clock', 'ms', 'inn', 'innBad'].includes(k)) for (const c of Object.keys(o[k])) cmp(k + ':' + c, o[k][c], n[k][c]); else cmp(k, o[k], n[k]); }
const dist = k => new Set(Object.values(n[k])).size;
console.log(`เทียบ ${total} หมวด | ตรง ${total - diff} | ต่าง ${diff} | ผลต่างกัน: state ${dist('state')} short ${dist('short')} clock ${dist('clock')} inn ${dist('inn')} | exports ${n.exports.length} | window ${n.winTypes.split(',').filter(t => t === 'function').length}/${n.winTypes.split(',').length} function | ชื่อต่างจากโมดูล ${JSON.stringify(n.winSame)} | pageerror ${errs.length}`);
await b.close();
process.exit(diff || errs.length || dist('state') < 4 || dist('short') < 4 || dist('clock') < 8 || dist('inn') < 5 || n.exports.length !== 0 || n.winTypes.split(',').some((t, i) => !['QUOTA_LOW', 'QUOTA_POLL_MAX', 'QUOTA_UNKNOWN'].includes(NAMES[i]) && t !== 'function') || n.low !== 0.2 || n.poll !== 600000 || !n.unknownFrozen || !n.sameTwice || !n.pure || n.winSame.length || JSON.stringify(o.exports) !== JSON.stringify(n.exports) ? 1 : 0);
