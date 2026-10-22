/* Behavior probe v4: เทียบพฤติกรรมจริง เดโม vs app/web(รุ่นเก่า) vs build/web(Next ตัวรันจริง) */
import { chromium } from '/tmp/evarel-repo/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from '/tmp/evarel-repo/tests/live_user.mjs';

const out = {};
const snap = () => {
  const pages = [...document.querySelectorAll('.ev-page')];
  const navEl = document.querySelector('.ev-nav');
  const c = navEl ? getComputedStyle(navEl) : null;
  return {
    pages: pages.length,
    kinds: pages.map(e => (e.dataset.open === 'true' ? 'O' : 'c') + (e.hidden ? 'h' : 'v')),
    hist: history.length,
    lock: document.body.dataset.lock || '',
    navH: navEl ? Math.round(navEl.getBoundingClientRect().height) : -1,
    navAnimName: c ? c.animationName : '',
    hasEvKeyframes: [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r instanceof CSSKeyframesRule && /barup|pgIn|sheetIn|ringin/.test(r.name)); } catch (e) { return false; } }),
  };
};

async function bootDemo() {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 412, height: 915 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 50)));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.route(/cdn\.jsdelivr\.net\/npm\/fullcalendar/, r => r.fulfill({ contentType: 'application/javascript', body: readFileSync('/tmp/evarel-repo/build/web/vendor/fullcalendar.min.js', 'utf8') }));
  await p.addInitScript(() => { Math.random = () => 0.5; const D = Date, fixed = new D('2026-10-09T10:00:00+07:00'); D.now = () => fixed.getTime(); });
  await p.goto('http://localhost:8779/design/Evarel%20v24.html');
  await p.waitForTimeout(800);
  await p.evaluate(() => localStorage.clear());
  await p.evaluate(() => { const u = { id: 'u_test', name: 'Nontakorn', email: 'demo.u@evarel.app' }; localStorage.setItem('ev:user', JSON.stringify(u)); localStorage.setItem('ev:token', 't'); });
  await p.reload(); await p.waitForTimeout(2600);
  return { b, p, errs };
}

async function bootApp(webDir) {
  process.env.EVAREL_WEB_DIR = webDir;
  const b = await chromium.launch();
  const user = await makeTestUser('behv');
  const ctx = await openAsUser(b, user);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 50)));
  await p.addInitScript(() => { Math.random = () => 0.5; const D = Date, fixed = new D('2026-10-09T10:00:00+07:00'); D.now = () => fixed.getTime(); });
  await p.goto(APP_ORIGIN + '/index.html');
  await p.waitForTimeout(3000);
  return { b, p, ctx, errs };
}

async function drive(tag, ctx) {
  const { p } = ctx;
  const r = {};
  r.boot = await p.evaluate(snap);
  try { await p.evaluate(() => openAI()); await p.waitForTimeout(1000); r.afterAI = await p.evaluate(snap); } catch (e) { r.aiErr = String(e).slice(0, 50); }
  try { await p.evaluate(() => ACTIONS.settings()); await p.waitForTimeout(1000); r.afterSet = await p.evaluate(snap); } catch (e) { r.setErr = String(e).slice(0, 50); }
  r.stack2 = ((r.afterSet?.pages) || 0) >= 2;
  try { await p.evaluate(() => history.back()); await p.waitForTimeout(1000); r.afterBack = await p.evaluate(snap); } catch (e) {}
  r.backPopsOne = r.stack2 && r.afterBack && r.afterBack.pages === r.afterAI.pages && (r.afterBack.kinds||[])[r.afterBack.kinds.length-1] === 'Ov';
  r.errs = (ctx.errs || []).slice(0, 2);
  out[tag] = r;
  await ctx.b.close();
}

await drive('demo', await bootDemo());
await drive('app_vanilla', await bootApp('/tmp/evarel-repo/app/web'));
await drive('app_next', await bootApp('/tmp/evarel-repo/build/web'));
console.log('BEHPROBE ' + JSON.stringify(out));
