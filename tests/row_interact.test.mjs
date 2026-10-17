/* ตัวทดสอบการโต้ตอบของแถวรายการ (itemRow): กดปุ่มจริงบน DOM แล้วอ่านผลจากสถานะ S และ DOM หลังกด
   ประตู 7 ชุดไม่กดปุ่มในแถวเลย จึงใช้ตัวนี้จับกรณีที่ markup ถูกต้องแต่ปุ่มทำงานผิด
   ใช้: node tests/row_interact.test.mjs  (ต้องมี http.server พอร์ต 8779 เสิร์ฟ app/web ตอบ 200)
   ผล: JSON ต่อสถานการณ์ { name, ok, detail } และสรุปผ่าน/ตก exit 1 ถ้ามีข้อใดตก */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN, todayBangkok } from './live_user.mjs';
import { SEED_ITEMS } from './seed_items.mjs';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('rowint');
const res = [], t = (name, ok, detail = '') => res.push({ name, ok: !!ok, detail });
try {
  const TD = todayBangkok();
  // รายการที่เกิดทุกวัน 3 ชนิดเพื่อให้ปรากฏหน้า "วันนี้" แน่นอน
  const mk = (id, title, track, extra) => ({ id, type: 'habit', title, subject: '', time: '', timeEnd: '', track, target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, start: '2026-10-01', end: '', skip: {}, rem: [], log: {}, ...extra });
  await seedItems(user.session, [mk(9001, 'ติ๊กทดสอบ', 'check'), mk(9002, 'นับทดสอบ', 'count', { target: 3, unitName: 'ข้อ' }), mk(9003, 'จับเวลาทดสอบ', 'timer', { target: 30, unitName: 'นาที' })]);
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3800);
  const log = id => p.evaluate(([id, d]) => (S.items.find(i => i.id === id) || {}).log?.[d] ?? 0, [id, TD]);
  const press = async (sel) => { try { await p.click(sel, { timeout: 4000 }); return true } catch (e) { t('กดปุ่มไม่ได้: ' + sel, false, String(e.message).split('\n')[0]); return false } };
  const until = (id, want) => p.waitForFunction(([id, d, want]) => ((S.items.find(i => i.id === id) || {}).log?.[d] ?? 0) === want, [id, TD, want], { timeout: 8000 }).catch(() => null);
  const row = id => p.evaluate(id => { const li = [...document.querySelectorAll('li.ev-list-item')].find(l => l.querySelector(`[data-id="${id}"]`)); return li ? { state: li.dataset.state, checked: li.querySelector('.ev-check')?.getAttribute('aria-checked') ?? null, sub: li.querySelector('.ev-sub')?.textContent ?? '', decDisabled: li.querySelector('[data-act="dec"]')?.disabled ?? null, incDisabled: li.querySelector('[data-act="inc"]')?.disabled ?? null, hasTimerBtn: !!li.querySelector('[data-act="timeropen"]') } : null }, id);
  t('หน้าวันนี้แสดงแถวครบ 3 ชนิด', (await row(9001)) && (await row(9002)) && (await row(9003)), JSON.stringify([await row(9001), await row(9002), await row(9003)]));
  // ติ๊ก check
  const c0 = await row(9001); await press('[data-act="check"][data-id="9001"]'); await until(9001, 1); await p.waitForTimeout(250);
  const c1 = await row(9001); t('ติ๊ก: aria-checked true + state done + log เป็น target', c1?.checked === 'true' && c1?.state === 'done' && (await log(9001)) === 1, JSON.stringify({ c0, c1, log: await log(9001) }));
  await press('[data-act="check"][data-id="9001"]'); await until(9001, 0); await p.waitForTimeout(250);
  const c2 = await row(9001); t('ติ๊กซ้ำ: กลับเป็น todo และ log 0', c2?.checked === 'false' && c2?.state === 'todo' && (await log(9001)) === 0, JSON.stringify({ c2, log: await log(9001) }));
  // count + / −
  const n0 = await row(9002); t('count เริ่มต้น: ปุ่มลดปิดเมื่อ 0', n0?.decDisabled === true && n0?.incDisabled === false && /0\/3/.test(n0.sub), JSON.stringify(n0));
  await press('[data-act="inc"][data-id="9002"]'); await until(9002, 1); await press('[data-act="inc"][data-id="9002"]'); await until(9002, 2); await p.waitForTimeout(250);
  const n2 = await row(9002); t('count กด + สองครั้ง: log 2, แสดง 2/3, ปุ่มลดเปิด', (await log(9002)) === 2 && /2\/3/.test(n2.sub) && n2.decDisabled === false, JSON.stringify({ n2, log: await log(9002) }));
  await press('[data-act="dec"][data-id="9002"]'); await until(9002, 1); await p.waitForTimeout(250);
  const n1 = await row(9002); t('count กด −: log 1, แสดง 1/3', (await log(9002)) === 1 && /1\/3/.test(n1.sub), JSON.stringify({ n1, log: await log(9002) }));
  // timer เปิดหน้าจับเวลา
  const tm = await row(9003); t('timer มีปุ่มเล่น', tm?.hasTimerBtn === true, JSON.stringify(tm));
  await press('[data-act="timeropen"][data-id="9003"]'); await p.waitForTimeout(900);
  const opened = await p.evaluate(() => ({ focus: !!document.querySelector('.ev-focus, [data-focus], #focusLayer, .ev-timer'), url: location.hash, layers: document.querySelectorAll('[role="dialog"], .ev-layer, .ev-sheet').length }));
  t('timer กดแล้วเปิดหน้าจับเวลา/ชั้นใหม่', opened.focus || opened.layers > 0, JSON.stringify(opened));
  // ปิดหน้าจับเวลาก่อน ไม่งั้น dialog บังปุ่มอื่น
  await press('#page [data-act="close"]'); await p.waitForFunction(() => !document.querySelector('#page[data-open="true"]'), null, { timeout: 5000 }).catch(() => null); await p.waitForTimeout(400);
  t('ปิดหน้าจับเวลาด้วยปุ่มกลับได้', await p.evaluate(() => !document.querySelector('#page[data-open="true"]')), '');
  // วันอนาคต: ปุ่มต้อง disabled
  await press('[data-act="wk"][data-id="1"]'); await p.waitForTimeout(700); await p.evaluate(() => document.querySelector('.ev-week button').click()); await p.waitForTimeout(700);
  const fut = await p.evaluate(() => ({ chk: [...document.querySelectorAll('.ev-check')].map(e => e.disabled), inc: [...document.querySelectorAll('[data-act="inc"]')].map(e => e.disabled) }));
  t('วันอนาคต: มีปุ่มให้ตรวจ และทุกปุ่มติ๊ก/บวก disabled', fut.chk.length + fut.inc.length > 0 && [...fut.chk, ...fut.inc].every(x => x === true), JSON.stringify(fut));
  t('ไม่มี pageerror', errs.length === 0, JSON.stringify(errs));
} finally { await b.close(); console.log('cleanup', await user.cleanup()); }
for (const r of res) console.log((r.ok ? 'PASS' : 'FAIL'), r.name, r.ok ? '' : '| ' + r.detail);
const bad = res.filter(r => !r.ok).length; console.log(`สรุป: ผ่าน ${res.length - bad}/${res.length}`); process.exit(bad ? 1 : 0);
