// พิสูจน์ F6 (ส่วนคำนวณของฟอร์มล็อกอิน -> core/authform: pwStrength, coolView, mailHint, resendToast):
// ตัวฟัง input/focusout และ paintCool ที่ยังอยู่ใน m/ ต้องเขียน DOM ได้เหมือนของเดิมทุกกรณี (เทียบ DOM จริงที่ถูกเขียน ไม่ใช่แค่ผลฟังก์ชัน)
// ยิงเหตุการณ์จริงบน DOM จริงของแต่ละฝั่ง | ใช้: node tests/authlogic_equiv.test.mjs <22-views__auth.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
const [, , A_OLD] = process.argv;
const rd = (p) => fs.readFileSync(p, 'utf8'); const W = 'app/web/js/app/';
const SRC = { old: rd(A_OLD), new: rd(W + '22-views__auth.js') };
const C = { authform: rd(W + 'core/authform.js'), uihtml: rd(W + 'core/uihtml.js'), authviews: rd(W + 'core/authviews.js'), constants: rd(W + 'core/constants.js'), dates: rd(W + 'core/dates.js') };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const errs = []; const ctx = await b.newContext();
const r = {};
for (const side of ['old', 'new']) {
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(side + ':' + e.message.slice(0, 140)));
  await p.setContent('<!doctype html><body><div id="auth"></div></body>');   // หนึ่งหน้าต่อฝั่ง: ตัวฟังของแต่ละฝั่งไม่ปนกัน
  r[side] = await p.evaluate(async ({ src, C }) => {
    const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
    const u = {}; u.constants = mk(C.constants); u.dates = mk(C.dates); u.authform = mk(C.authform); u.uihtml = mk(C.uihtml);
    u.authviews = mk(C.authviews.replace(/\.\/constants\.js/g, u.constants).replace(/\.\/dates\.js/g, u.dates).replace(/\.\/uihtml\.js/g, u.uihtml).replace(/\.\/authform\.js/g, u.authform));
    const REAL = { icon: (await import(u.constants)).icon, esc: (await import(u.dates)).esc }; Object.assign(globalThis, REAL);
    globalThis.$ = id => document.getElementById(id);
    globalThis.UI = { auth: { status: 'out', screen: 'signup', email: 'a@b.cc', cool: 0, codeType: 'signup' } };
    globalThis.ST = {}; globalThis.S = {}; globalThis.toast = m => (globalThis.__toasts.push(m)); globalThis.__toasts = [];
    globalThis.Auth = { resend: async () => { }, sendReset: async () => { } }; globalThis.stopLiveSync = () => { };
    for (const k of ['render', 'haptic', 'TODAY', 'SUPA_API', 'LAYERS', 'popLayer', 'closePop', 'destroyCal', 'empty']) if (!(k in globalThis)) globalThis[k] = k === 'LAYERS' ? [] : () => '';
    const code = src.replace(/\.\/core\/authform\.js/g, u.authform).replace(/\.\/core\/uihtml\.js/g, u.uihtml).replace(/\.\/core\/authviews\.js/g, u.authviews);
    await import(mk(code));
    const out = {};
    const host = document.body;
    // --- 1) มิเตอร์รหัสผ่าน: ยิง input จริง ---
    host.insertAdjacentHTML('beforeend', '<form class="ev-authform" data-kind="signup"><input id="f-password" name="password"><div id="pwMeter" data-lv="0"></div><span id="pwLabel"></span></form>');
    const inp = document.getElementById('f-password'), PWS = ['', 'a', 'abcdefg', 'abcdefgh', 'Abcdefgh', 'Abcdefg1', 'Abcdefg1!', 'Abcdefgh1234', 'Abcdefgh1234!', '12345678', '123456789012', 'ABCDEFGH', '        ', 'ก'.repeat(8), 'ก'.repeat(7), 'x'.repeat(200), 'Aa1!Aa1!Aa1!Aa1!', '!@#$%^&*()', 'a1', '1234567'];
    out.meter = PWS.map(pw => { inp.value = pw; inp.dispatchEvent(new Event('input', { bubbles: true })); return [document.getElementById('pwMeter').dataset.lv, document.getElementById('pwLabel').textContent]; });
    // ช่อง password ในฟอร์มอื่น (login) ต้องไม่แตะมิเตอร์
    host.insertAdjacentHTML('beforeend', '<form class="ev-authform" data-kind="login"><input id="f-password" name="password" value="Abcdefg1!"></form>');
    const before = document.getElementById('pwLabel').textContent; document.querySelectorAll('#f-password')[1].dispatchEvent(new Event('input', { bubbles: true })); out.loginNoMeter = before === document.getElementById('pwLabel').textContent;
    // --- 2) ล้าง aria-invalid เมื่อพิมพ์ ---
    host.insertAdjacentHTML('beforeend', '<form class="ev-authform" id="fx"><input id="ix" name="email" aria-invalid="true"><div id="e-email" class="ev-field-err">err</div></form>');
    const ix = document.getElementById('ix'); ix.dispatchEvent(new Event('input', { bubbles: true })); out.clearErr = [ix.getAttribute('aria-invalid'), document.getElementById('e-email').hidden, document.getElementById('e-email').innerHTML];
    // --- 3) คำแนะนำอีเมลพิมพ์ผิด: ยิง focusout จริง ---
    const MAILS = ['', ' ', 'a', 'a@', '@gmail.com', 'name@gmial.com', ' name@gmial.com ', 'NAME@GMIAL.COM', 'x@gmai.com', 'x@gamil.com', 'x@gmail.con', 'x@hotmial.com', 'x@gmail.com', 'x@y.zz', 'a@b@gmial.com', '<b>@gmial.com', 'ก@gmial.com', 'a&b@gmial.com', 'q"x@gmial.com', 'a@@gmial.com', 'a@constructor', 'a@__proto__', 'a@toString', 'a@hasOwnProperty'];
    host.insertAdjacentHTML('beforeend', '<form class="ev-authform" id="fm"><input id="im" name="email"><div id="e-email2"></div></form>');
    const im = document.getElementById('im'); out.hint = [];
    for (const em of MAILS) {
      const old = document.getElementById('e-email'); if (old) old.remove();
      document.getElementById('fm').insertAdjacentHTML('beforeend', '<div id="e-email" hidden></div>');
      im.value = em; im.dispatchEvent(new Event('focusout', { bubbles: true }));
      const bx = document.getElementById('e-email'); out.hint.push([bx.hidden, bx.dataset.tone || '', bx.innerHTML]);
    }
    // ช่องที่ไม่ใช่ email หรืออยู่นอกฟอร์ม auth ต้องไม่ถูกแตะ
    host.insertAdjacentHTML('beforeend', '<input id="io" name="other" value="x@gmial.com"><div id="e-email3"></div>'); document.getElementById('io').dispatchEvent(new Event('focusout', { bubbles: true })); out.otherUntouched = document.getElementById('e-email3').innerHTML === '';
    // --- 4) paintCool: ทุกค่า n x ทุกหน้า ---
    host.insertAdjacentHTML('beforeend', '<button id="resendBtn"></button>');
    out.cool = []; const rb = document.getElementById('resendBtn');
    for (const sc of ['code', 'sent', 'login', '', undefined]) for (const n of [0, 1, 5, 29, 30, 31, 999, -1, 0.5, NaN, undefined, null]) { UI.auth.screen = sc; UI.auth.cool = n; window.paintCool(); out.cool.push([rb.disabled, rb.innerHTML]); }
    // ไม่มีปุ่ม ต้องไม่พัง
    rb.remove(); UI.auth.cool = 5; try { window.paintCool(); out.coolNoBtn = 'ok' } catch (e) { out.coolNoBtn = 'THROW' }
    // --- 5) resendReset: ข้อความ toast และการรีเซ็ตตัวนับ ---
    host.insertAdjacentHTML('beforeend', '<button id="resendBtn"></button>'); out.resend = [];
    for (const sc of ['code', 'sent', 'login']) { UI.auth.screen = sc; UI.auth.cool = 0; UI.auth.email = 'a@b.cc'; __toasts.length = 0; await window.resendReset(); out.resend.push([__toasts.join('|'), UI.auth.cool]); window.stopCool(); }
    UI.auth.screen = 'code'; UI.auth.cool = 7; __toasts.length = 0; await window.resendReset(); out.resendBlocked = [__toasts.length, UI.auth.cool];
    out.names = ['paintCool', 'startCool', 'stopCool', 'resendReset', 'fieldErr', 'clearErrs', 'setBusy', 'renderAuthRoot', 'doSignOut', 'AUTH_VIEWS'].map(k => typeof window[k]).join(',');
    return out;
  }, { src: SRC[side], C });
  await p.close();
}
const o = r.old, n = r.new;
const cmp = [['มิเตอร์รหัสผ่าน (20 ค่า, ยิง input จริง)', JSON.stringify(o.meter) === JSON.stringify(n.meter)], ['ช่อง login ไม่แตะมิเตอร์', o.loginNoMeter === n.loginNoMeter && n.loginNoMeter === true], ['ล้างสถานะผิดพลาดเมื่อพิมพ์', JSON.stringify(o.clearErr) === JSON.stringify(n.clearErr)],
  ['คำแนะนำอีเมลพิมพ์ผิด (24 ค่า, ยิง focusout จริง)', JSON.stringify(o.hint) === JSON.stringify(n.hint)], ['ช่องอื่นไม่ถูกแตะ', o.otherUntouched === n.otherUntouched && n.otherUntouched === true],
  ['ปุ่มส่งซ้ำ paintCool (5 หน้า x 12 ค่า)', JSON.stringify(o.cool) === JSON.stringify(n.cool)], ['paintCool ไม่มีปุ่มไม่พัง', o.coolNoBtn === n.coolNoBtn && n.coolNoBtn === 'ok'],
  ['ส่งซ้ำ: toast + รีเซ็ตตัวนับ', JSON.stringify(o.resend) === JSON.stringify(n.resend)], ['ส่งซ้ำตอนนับอยู่ถูกบล็อก', JSON.stringify(o.resendBlocked) === JSON.stringify(n.resendBlocked)], ['ชนิดชื่อบน window', o.names === n.names]];
let diff = 0; for (const [k, ok] of cmp) { console.log((ok ? 'PASS' : 'FAIL') + ' ' + k); if (!ok) diff++; }
const hintsShown = n.hint.filter(h => h[0] === false).length, lvSet = new Set(n.meter.map(m => m[0])).size, labels = new Set(n.meter.map(m => m[1])).size;
console.log(`เทียบ ${cmp.length} หมวด | ตรง ${cmp.length - diff} | ต่าง ${diff} | คำแนะนำที่แสดง ${hintsShown}/24 | ระดับมิเตอร์ต่างกัน ${lvSet} แบบ ข้อความ ${labels} แบบ | cool ${n.cool.length} ค่า | pageerror ${errs.length}`);
if (diff) { for (const k of ['meter', 'hint', 'cool', 'resend']) { for (let i = 0; i < (o[k] || []).length; i++) if (JSON.stringify(o[k][i]) !== JSON.stringify(n[k][i])) { console.log('ต่างที่', k, i, JSON.stringify(o[k][i]).slice(0, 140), '|||', JSON.stringify(n[k][i]).slice(0, 140)); break; } } }
await b.close();
process.exit(diff || errs.length || hintsShown < 8 || lvSet < 4 || labels < 6 || n.cool.length < 60 ? 1 : 0);
