/* พิสูจน์ store กลางบนเบราว์เซอร์จริง (s4f-store-react): ตัวตรวจชนิดและหน่วยทดสอบไม่จับ ReferenceError ตอนรัน (บทเรียน liveRefresh) จึงต้องกดจริงแล้วอ่านผล
   ตรวจ: window.EvarelStore มีหนึ่งอินสแตนซ์ | render() จริงทำให้ผู้ฟังถูกเรียกและ version เพิ่ม | กดติ๊กจริงหนึ่งครั้ง = notify อย่างน้อยหนึ่งครั้ง | unsubscribe หยุดจริง | ไม่มี pageerror
   ใช้: node tests/store_live.test.mjs  (พอร์ต 8779 ต้องตอบ 200)  exit 1 ถ้าข้อใดตก */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, seedItems, APP_ORIGIN } from './live_user.mjs';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe }); const user = await makeTestUser('storelive'); const res = [], t = (name, ok, detail = '') => res.push({ name, ok: !!ok, detail });
try {
  const mk = (id, title) => ({ id, type: 'habit', title, subject: '', time: '', timeEnd: '', track: 'check', target: 1, unitName: '', repeat: { unit: 'day', every: 1, days: [] }, start: '2026-10-01', end: '', skip: {}, rem: [], log: {} });
  await seedItems(user.session, [mk(9301, 'ทดสอบสโตร์')]);
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3800);
  const has = await p.evaluate(() => ({ store: typeof window.EvarelStore, sub: typeof window.EvarelStore?.subscribe, snap: typeof window.EvarelStore?.getSnapshot, uses: typeof window.EvarelReact?.useSyncExternalStore }));
  t('มี EvarelStore และ useSyncExternalStore บน window', has.store === 'object' && has.sub === 'function' && has.snap === 'function' && has.uses === 'function', JSON.stringify(has));
  await p.evaluate(() => { window.__n = 0; window.__off = window.EvarelStore.subscribe(() => { window.__n++ }); window.__v0 = window.EvarelStore.getSnapshot() });
  await p.evaluate(() => window.render()); await p.waitForTimeout(100);
  const a = await p.evaluate(() => ({ n: window.__n, dv: window.EvarelStore.getSnapshot() - window.__v0 }));
  t('render() จริงหนึ่งครั้ง = ผู้ฟังถูกเรียกหนึ่งครั้ง และ version เพิ่มหนึ่ง', a.n === 1 && a.dv === 1, JSON.stringify(a));
  await p.evaluate(() => { window.__n = 0 });
  await p.click('[data-act="check"][data-id="9301"]'); await p.waitForTimeout(600);
  const c = await p.evaluate(() => window.__n);
  t('กดติ๊กจริงหนึ่งครั้ง: ผู้ฟังถูกเรียกอย่างน้อยหนึ่งครั้ง (commit -> render -> notify)', c >= 1, 'n=' + c);
  await p.evaluate(() => { window.__off(); window.__n = 0 }); await p.evaluate(() => window.render()); await p.waitForTimeout(100);
  t('unsubscribe แล้ว render ไม่เรียกผู้ฟังอีก', (await p.evaluate(() => window.__n)) === 0);
  await p.evaluate(() => { window.EvarelStore.subscribe(() => { throw new Error('ผู้ฟังพังโดยตั้งใจ') }) }); await p.evaluate(() => window.render()); await p.waitForTimeout(100);
  t('ผู้ฟังที่ throw ไม่ทำให้ render ล้ม (หน้ายังอยู่)', (await p.evaluate(() => !!document.querySelector('#app main, #app .ev-main, #app li'))));
  t('ไม่มี pageerror ตลอดกระบวนการ', errs.length === 0, errs.join(' | '));
} finally { await b.close(); console.log('cleanup', await user.cleanup()); }
for (const r of res) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' | ' + r.detail)); const bad = res.filter(r => !r.ok); console.log(`สรุป: ผ่าน ${res.length - bad.length}/${res.length}`); process.exit(bad.length ? 1 : 0);
