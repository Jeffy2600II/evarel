// พิสูจน์ F3.3-g10: หน้าผู้ช่วย AI ที่รับ TYPES/fmtDate จาก core/ และที่เหลือผ่านถาด เรนเดอร์ HTML เท่าไฟล์เดิมทุกไบต์
// รวมทางที่ guard เดิมทำงาน (profileOf/whenText/AI ไม่มี) เพื่อพิสูจน์ว่าถาดไม่เข้มกว่าเดิม | ใช้: node tests/prove_ai_tray.mjs <ai.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/react/ai.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
async function render(bundle) {
  const ctx = await openAsUser(b, await makeTestUser('aiprove'), { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(3000);
  const out = await p.evaluate((code) => {
    const W = window, r = {}, day = k => W.ymd(W.addDays(new Date(), k));
    delete W.EvarelPages.ai; (0, eval)(code);
    const put = (k, fn) => { try { r[k] = fn(); } catch (e) { r[k] = 'ERR:' + e.message; } };
    const page = (chat) => W.EvarelPages.ai({ chat });
    const keepProfile = W.profileOf, keepWhen = W.whenText;
    W.AI = Object.assign(W.AI || {}, { notice: null, typing: false });
    put('ทักทาย (ไม่มีแชท)', () => page(null));
    put('ทักทาย (แชทว่าง)', () => page({ msgs: [] }));
    W.ST.USER = { name: 'สมชาย ใจดี', email: 'a@b.c', id: 'u1' }; put('ทักทาย มีชื่อผู้ใช้', () => page(null));
    W.profileOf = undefined; put('ทักทาย profileOf ไม่มี (ทาง guard)', () => page(null)); W.profileOf = keepProfile;
    const tool = (o) => Object.assign({ tool: 'item_create', status: 'pending', summary: '' }, o);
    const msgs = [
      { who: 'u', text: 'เพิ่มงานการบ้าน' },
      { who: 'a', text: 'ได้เลย **เพิ่มให้แล้ว**\n\n- ข้อ 1\n- ข้อ 2 `code`', vote: 'up', cards: [tool({ summary: 'เพิ่มการบ้านอังกฤษ' }), tool({ tool: 'item_delete' }), tool({ tool: 'memory_save', sensitive: true }), tool({ tool: 'memory_save', sensitive: false }), tool({ tool: 'memory_forget' }), tool({ status: 'saving' }), tool({ status: 'added' }), tool({ tool: 'memory_save', status: 'added' }), tool({ tool: 'memory_forget', status: 'added' }), tool({ status: 'failed' }), tool({ status: 'cancelled' }), tool({ tool: 'log_set' }), tool({ tool: 'skip_set' }), tool({ tool: 'reminder_set' }), tool({ tool: 'unknown_tool' })] },
      { who: 'u', text: 'อีกอัน' },
      { who: 'a', text: 'สรุปวันนี้', vote: 'down', card: { p: { title: 'การบ้าน <x>', type: 'task', start: day(1), time: '18:00' }, status: 'pending' } },
      { who: 'a', text: 'เสร็จ', card: { p: { title: 'นัด', type: 'event', start: day(2), time: '' }, status: 'added' } },
      { who: 'a', text: 'ยกเลิก', card: { p: { title: 'ทบทวน', type: 'habit', start: day(0), time: '07:00' }, status: 'cancelled' } },
    ];
    put('แชทมีการ์ดครบทุกสถานะ', () => page({ msgs }));
    W.AI.typing = true; put('แชท กำลังพิมพ์', () => page({ msgs })); W.AI.typing = false;
    W.AI.notice = { kind: 'error' }; put('แจ้ง error', () => page({ msgs })); 
    W.AI.notice = { kind: 'limit', reason: 'global' }; put('แจ้ง ระบบเต็ม', () => page({ msgs }));
    W.AI.notice = { kind: 'limit', reason: 'user', resetAt: new Date(Date.now() + 90 * 60e3).toISOString() }; put('แจ้ง ถึงขีดจำกัด', () => page({ msgs }));
    W.whenText = undefined; put('แจ้ง ถึงขีดจำกัด whenText ไม่มี (ทาง guard)', () => page({ msgs })); W.whenText = keepWhen;
    W.AI.notice = { kind: 'error' }; put('แจ้ง error ในหน้าทักทาย', () => page(null)); W.AI.notice = null;
    const keepAI = W.AI; W.AI = undefined; put('AI ไม่มีทั้งก้อน (ทาง guard)', () => page({ msgs: msgs.slice(0, 2) })); W.AI = keepAI;
    return r;
  }, bundle);
  await ctx.close(); return { out, errs };
}
const a = await render(OLD), c = await render(NEW);
const keys = Object.keys(a.out); let ok = 0; const bad = [];
for (const k of keys) { const x = a.out[k], y = c.out[k]; const real = typeof x === 'string' && !x.startsWith('ERR') && x.length > 150; (x === y && real) ? ok++ : bad.push(k + ' | ' + String(x).slice(0, 60) + ' | ' + String(y).slice(0, 60)); }
const hasMem = /\u0e08\u0e33\u0e41\u0e25\u0e49\u0e27|\u0e25\u0e37\u0e21\u0e41\u0e25\u0e49\u0e27/.test(c.out['แชทมีการ์ดครบทุกสถานะ'] || '');
const hasLim = /\u0e2a\u0e48\u0e07\u0e44\u0e14\u0e49\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07/.test(c.out['แจ้ง ถึงขีดจำกัด'] || '');
console.log('เทียบ', keys.length, 'กรณี | ตรงทุกไบต์', ok, '| ต่าง/ผิดปกติ', bad.length, bad.slice(0, 5));
console.log('เส้นทางสำคัญถูกเรนเดอร์จริง: การ์ดความจำ', hasMem, '| แจ้งขีดจำกัด', hasLim);
console.log('pageerror เดิม/ใหม่:', a.errs.length, c.errs.length);
await b.close(); process.exit(bad.length || c.errs.length || !hasMem || !hasLim ? 1 : 0);
