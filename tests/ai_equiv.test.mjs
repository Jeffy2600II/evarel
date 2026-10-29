/* เทียบเนื้อหน้าผู้ช่วย AI: ฉบับ string เดิม (17-views__ai aiBodyHTML) กับฉบับ React จริง (shared/ai/AiPage.jsx AiContent)
   เกณฑ์: DOM จริงเท่ากันทุกไบต์ (browser-serialized innerHTML) ทั้งสองฝั่ง กันความต่างที่เป็นแค่รูปเขียน attribute/style
   ครอบกรณี: หน้าทักทาย (ไม่มีแชท/แชทเปล่า), บับเบิลผู้ใช้, การ์ดเดี่ยว pending/added/cancelled,
   การ์ดเครื่องมือทุกสถานะ (pending ปุ่ม mem/ปกติ/danger, saving, added ทั้ง mem สองเครื่องมือและปกติ, failed, cancelled, sensitive)
   รัน: node tests/ai_equiv.test.mjs  (ต้องมีเซิร์ฟเวอร์ 8779 เสิร์ฟ app/web) */
import { chromium } from 'playwright'; import fs from 'fs';
import { makeTestUser, openAsUser, APP_ORIGIN } from './live_user.mjs';
let pass = 0, fail = 0; const ok = (n, c, v = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (v ? ' :: ' + v : '')); };
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe });
const user = await makeTestUser('aiequiv');
try {
  const ctx = await openAsUser(b, user, { colorScheme: 'light' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(APP_ORIGIN + '/index.html');
  /* รอ lazy loader (19-views__settings) ไล่โหลด react ทุกหน้าจน ai พร้อม สูงสุด ~10 วินาที */
  const aiReady = await (async () => { for (let i = 0; i < 50; i++) { if (await p.evaluate(() => !!window.EvarelComponents?.ai)) return true; await p.waitForTimeout(200); } return false; })();
  if (!aiReady) { ok('React ai โหลดแล้ว (EvarelComponents.ai)', false, 'ยังไม่โหลด ตรวจ loadReactSettings'); }
  else {
    ok('React ai โหลดแล้ว (EvarelComponents.ai)', true);
    const out = [];
    const run = async (name, CH) => {
      const r = await p.evaluate(({ name, CH }) => {
        const w = window;
        w.ST.CH = CH;
        const chat = CH.list.find(c => c.id === CH.cur) || null;
        const a = document.createElement('div'); a.innerHTML = w.aiBodyHTML(); document.body.appendChild(a);
        const bEl = document.createElement('div'); document.body.appendChild(bEl);
        const root = w.EvarelReact.createRoot(bEl);
        w.EvarelReact.flushSync(() => root.render(w.EvarelReact.h(w.EvarelComponents.ai, { chat })));
        /* React mount เขียน style ผ่าน CSSOM (ช่องว่างหลัง : และ ; ท้าย) ขณะ classic เก็บ string เดิม
           ผล computed style เท่ากันทุกประการ — เทียบค่า semantic ของ style แทน raw เฉพาะจุดนี้ ส่วนอื่นทุกไบต์ (แพทเทิร์นเดียวกับ --i ใน itemrow_equiv) */
        const normStyle = (h) => h.replace(/style="([^"]*)"/g, (m, v) => 'style="' + v.split(';').map(x => x.trim()).filter(Boolean).map(x => x.replace(/:\s+/, ':')).sort().join(';') + '"');
        const A = normStyle(a.innerHTML), B = normStyle(bEl.innerHTML);
        a.remove(); bEl.remove(); root.unmount();
        return { name, same: A === B, A: A.slice(0, 500), B: B.slice(0, 500) };
      }, { name, CH });
      ok(r.name, r.same, r.same ? '' : `\n A=${r.A}\n B=${r.B}`);
      if (!r.same) out.push(r);
    };
    const empty = { list: [], cur: null };
    const mk = (id, msgs, extra = {}) => ({ id, title: 'แชท ' + id, t: 1, pinned: false, msgs, ...extra });
    const TD = new Date().toISOString().slice(0, 10);
    await run('hello: ไม่มีแชทเลย', empty);
    await run('hello: แชทเปล่า (msgs ว่าง)', { list: [mk(1, [])], cur: 1 });
    await run('ผู้ใช้พูดคนเดียว 2 ข้อความ', { list: [mk(1, [{ who: 'u', text: 'สวัสดี' }, { who: 'u', text: 'ทำอะไรได้บ้าง <b>ทดสอบ</b> & "คำถาม"' }])], cur: 1 });
    await run('AI ตอบธรรมดา ไม่มีการ์ด', { list: [mk(1, [{ who: 'u', text: 'สรุปวันนี้' }, { who: 'a', text: 'วันนี้ทำแล้ว 0 จาก 0 รายการ' }])], cur: 1 });
    const card = (status, p = {}) => ({ status, p: { type: 'task', title: 'การบ้านอังกฤษ', start: TD, time: '18:00', repeat: { unit: 'none', every: 1, days: [] }, track: 'check', ...p } });
    await run('การ์ดเดี่ยว pending', { list: [mk(1, [{ who: 'a', text: 'เข้าใจแล้ว ตรวจรายละเอียดก่อนเพิ่มนะ', card: card('pending') }])], cur: 1 });
    await run('การ์ดเดี่ยว added (มีเวลา)', { list: [mk(1, [{ who: 'a', text: 'จัดการแล้ว', card: card('added') }])], cur: 1 });
    await run('การ์ดเดี่ยว cancelled (ไม่มีเวลา)', { list: [mk(1, [{ who: 'a', text: 'ยกเลิกนะ', card: card('cancelled', { time: '', type: 'event' }) }])], cur: 1 });
    const tc = (tool, status, sensitive) => ({ tool, status, sensitive: !!sensitive, summary: tool === 'memory_save' ? 'จำเรื่องนี้' : '' });
    await run('การ์ดเครื่องมือครบสถานะ', {
      list: [mk(1, [
        { who: 'a', text: 'มีหลายอย่างให้ดู', cards: [
          tc('memory_save', 'pending', true), tc('item_delete', 'pending'), tc('memory_forget', 'pending', true),
          tc('memory_save', 'added'), tc('memory_forget', 'added'), tc('item_add', 'added'),
          tc('item_update', 'saving'), tc('item_delete', 'failed'), tc('item_add', 'cancelled'),
        ] },
      ])], cur: 1,
    });
    await run('การ์ดเครื่องมือไม่มี summary (ใช้ป้ายชื่อเครื่องมือ)', { list: [mk(1, [{ who: 'a', text: 'ลบให้นะ', cards: [tc('item_delete', 'pending')] }])], cur: 1 });
    await run('บทสนทนายาวคละผู้ใช้ AI การ์ดเดี่ยวและเครื่องมือ', {
      list: [mk(1, [
        { who: 'u', text: 'สวัสดี ช่วยหน่อย' }, { who: 'a', text: 'มีอะไรให้ช่วย บอกได้เลย', cards: [tc('memory_save', 'added')] },
        { who: 'u', text: 'เพิ่มงาน อ่านหนังสือ 20:00' }, { who: 'a', text: 'เข้าใจแล้ว ตรวจรายละเอียดก่อนเพิ่มนะ', card: card('pending', { title: 'อ่านหนังสือ', time: '20:00' }) },
        { who: 'u', text: 'โอเค' }, { who: 'a', text: 'ได้เลย' },
      ])], cur: 1,
    });
    ok('ไม่มี pageerror ระหว่างทดสอบ', errs.length === 0, errs.join(' | ').slice(0, 200));
  }
} finally { await b.close(); }
console.log(`เทียบ ai ${pass} ผ่าน | ${fail} ตก`);
process.exit(fail ? 1 : 0);
