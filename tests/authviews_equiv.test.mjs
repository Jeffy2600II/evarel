// พิสูจน์ F6 (ตัวสร้าง HTML ของหน้า auth -> core/authviews): AUTH_VIEWS ทุกหน้า + AUTH_SPLASH + ตัวสร้างเล็ก 7 ตัว ให้สตริงเหมือนของเดิมตรงตัวอักษร
// ทุกกรณีของสถานะ UI.auth (อีเมลมีอักขระ HTML/ไทย/ว่าง/ตัวเลข, codeType ทั้งสองค่าและค่าแปลก) | ชื่อบน window ครบเหมือนเดิม
// ใช้: node tests/authviews_equiv.test.mjs <22-views__auth.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
const [, , A_OLD] = process.argv;
const rd = (p) => fs.readFileSync(p, 'utf8'); const W = 'app/web/js/m/';
const SRC = { old: rd(A_OLD), new: rd(W + '22-views__auth.js') };
const CORE = { authform: rd(W + 'core/authform.js'), uihtml: rd(W + 'core/uihtml.js'), authviews: rd(W + 'core/authviews.js'), constants: rd(W + 'core/constants.js'), dates: rd(W + 'core/dates.js') };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.setContent('<!doctype html><body></body>');
const SCREENS = ['welcome', 'login', 'signup', 'forgot', 'sent', 'code', 'newpw'];
const SMALL = ['GLOGO', 'EV_MARK', 'RINGS', 'authBack', 'gBtn', 'legal', 'eyeBtn', 'EMAIL_X', 'submitBtn', 'AUTH_VIEWS', 'AUTH_SPLASH'];
const r = await p.evaluate(async ({ SRC, CORE, SCREENS, SMALL }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  // core ที่ import กันเอง: authviews ต้องชี้ไปโมดูลที่โหลดจริง (constants/dates/uihtml/authform)
  const u = {}; u.constants = mk(CORE.constants); u.dates = mk(CORE.dates); u.authform = mk(CORE.authform);
  u.uihtml = mk(CORE.uihtml);
  u.authviews = mk(CORE.authviews.replace(/\.\/constants\.js/g, u.constants).replace(/\.\/dates\.js/g, u.dates).replace(/\.\/uihtml\.js/g, u.uihtml).replace(/\.\/authform\.js/g, u.authform));
  const EMAILS = ['', ' ', 'a@b.cc', 'name@gmail.com', '<script>alert(1)</script>@x.com', 'a&b@c.dd', '"q"@x.com', "o'brien@x.com", 'ไทย@อีเมล.คอม', undefined, null, 0, 123, 'a'.repeat(200) + '@x.co', '<b>&amp;</b>', '`${x}`@t.co'];
  const TYPES = ['recovery', 'signup', '', undefined, null, 'RECOVERY', 'x'];
  const out = {};
  for (const [name, src] of [['old', SRC.old], ['new', SRC.new]]) {
    for (const k of SMALL) delete window[k];
    const REAL = { icon: (await import(u.constants)).icon, esc: (await import(u.dates)).esc }; for (const k of Object.keys(REAL)) globalThis[k] = REAL[k];
    for (const k of ['$', 'ST', 'UI', 'S', 'Auth', 'toast', 'render', 'SUPA_API', 'haptic', 'TODAY']) if (!(k in globalThis)) globalThis[k] = k === 'ST' || k === 'UI' || k === 'S' ? { auth: {}, USER: null } : (() => '');
    document.addEventListener = () => {};
    const code = src.replace(/\.\/core\/authform\.js/g, u.authform).replace(/\.\/core\/uihtml\.js/g, u.uihtml).replace(/\.\/core\/authviews\.js/g, u.authviews) + '\n//' + name + Math.random();
    const m = await import(mk(code)); const res = {};
    res.winTypes = SMALL.map(k => typeof window[k]).join(',');
    res.small = { authBack: ['login', '', undefined, '<x>', 'ก'].map(x => window.authBack(x)), gBtn: ['เข้า', '', undefined, '<b>'].map(x => window.gBtn(x)), eyeBtn: ['f-password', '', undefined, '"q"'].map(x => window.eyeBtn(x)), submitBtn: ['ส่ง', '', undefined, '<i>&'].map(x => window.submitBtn(x)), consts: [window.GLOGO, window.EV_MARK, window.RINGS, window.legal, window.EMAIL_X, window.AUTH_SPLASH] };
    const views = [];
    for (const em of EMAILS) for (const ct of TYPES) {
      window.UI.auth = { email: em, codeType: ct, status: 'ok', screen: 'x' };
      for (const sc of SCREENS) { try { views.push(window.AUTH_VIEWS[sc]()) } catch (e) { views.push('THROW:' + e.constructor.name) } }
    }
    res.views = views; res.keys = Object.keys(window.AUTH_VIEWS).join(','); res.exports = Object.keys(m).sort();
    // อ่านสถานะตอนเรียก ไม่ใช่ตอนโหลด: เปลี่ยน UI.auth หลังโหลดแล้วผลต้องเปลี่ยนตาม
    window.UI.auth = { email: 'first@a.bb', codeType: 'recovery' }; const a1 = window.AUTH_VIEWS.sent(), c1 = window.AUTH_VIEWS.code();
    window.UI.auth = { email: 'second@a.bb', codeType: 'signup' }; const a2 = window.AUTH_VIEWS.sent(), c2 = window.AUTH_VIEWS.code();
    res.live = [a1.includes('first@a.bb'), a2.includes('second@a.bb'), a1 !== a2, c1 !== c2, c1.includes('first@a.bb'), c2.includes('second@a.bb')].join(',');
    res.nonEmpty = views.filter(v => v && !v.startsWith('THROW')).length; res.distinct = new Set(views).size;
    out[name] = res;
  }
  return out;
}, { SRC, CORE, SCREENS, SMALL });
const o = r.old, n = r.new;
const cmp = [['จำนวนหน้าที่สร้าง', o.views.length === n.views.length], ['HTML ทุกหน้า x ทุกสถานะ ตรงตัวอักษร', JSON.stringify(o.views) === JSON.stringify(n.views)], ['ตัวสร้างเล็ก 4 ตัว + ค่าคงที่ 6', JSON.stringify(o.small) === JSON.stringify(n.small)], ['คีย์ AUTH_VIEWS', o.keys === n.keys], ['ชื่อบน window (ชนิด)', o.winTypes === n.winTypes], ['อ่านสถานะตอนเรียก ไม่ใช่ตอนโหลด', o.live === n.live && n.live === 'true,true,true,true,true,true']];
let diff = 0; for (const [k, ok] of cmp) { console.log((ok ? 'PASS' : 'FAIL') + ' ' + k); if (!ok) diff++; }
console.log(`เทียบ ${cmp.length} หมวด | ตรง ${cmp.length - diff} | ต่าง ${diff} | HTML ${n.views.length} ชิ้น (ไม่ว่าง ${n.nonEmpty}, ต่างกัน ${n.distinct} แบบ) | ชื่อบน window ${n.winTypes.split(',').filter(t => t !== 'undefined').length}/${SMALL.length} | pageerror ${errs.length}`);
if (diff) for (let i = 0; i < o.views.length; i++) if (o.views[i] !== n.views[i]) { let k = 0; while (o.views[i][k] === n.views[i][k]) k++; console.log('ต่างที่ #' + i + ' ตำแหน่ง ' + k + ' เดิม=' + JSON.stringify(o.views[i].slice(Math.max(0, k - 40), k + 70)) + ' ใหม่=' + JSON.stringify(n.views[i].slice(Math.max(0, k - 40), k + 70))); break; }
await b.close();
process.exit(diff || errs.length || n.views.length < 700 || n.distinct < 60 || n.nonEmpty < 700 || n.winTypes.split(',').filter(t => t !== 'undefined').length !== SMALL.length ? 1 : 0);
