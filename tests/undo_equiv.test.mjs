/* พิสูจน์ F6 (08-core__undo ส่วนบริสุทธิ์): clone (สำเนาลึก) และโครง HTML ของ toast ที่ย้ายไป core/undo ให้ผลเหมือนโมดูลเดิมทุกกรณี
   เทียบพฤติกรรม toast จริงบน DOM (#toast) และความหมายของสำเนา (ลึกแบบ JSON รวมกรณีโยน) บนเบราว์เซอร์จริง
   ใช้: node tests/undo_equiv.test.mjs <08-core__undo.js เดิม>
   ฉีดความผิดพิสูจน์ว่าเทสต์จับได้: INJECT=1..7 node tests/undo_equiv.test.mjs ... (ต้อง exit 1 ทุกค่า) */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http';
const OLDM = fs.readFileSync(process.argv[2] || '/tmp/undo_m08_at_head.js', 'utf8');
const NEWM = fs.readFileSync('app/web/js/m/08-core__undo.js', 'utf8');
const NEWCORE = fs.readFileSync('app/web/js/m/core/undo.js', 'utf8');
const CORE_DATES = fs.readFileSync('app/web/js/m/core/dates.js', 'utf8');
const inj = Number(process.env.INJECT || 0);

function inject(src, which) {
  const R = (re, to) => { const n = src.replace(re, to); if (n === src) throw new Error('INJECT ' + which + ': ไม่เจอจุดฉีด'); return n; };
  if (which === 1) return R(/undo \? '<button data-act="undo"/, '!undo ? \'<button data-act="undo"'); /* ปุ่มย้อนกลับกลับเงื่อนไข */
  if (which === 2) return R(/<span>\$\{esc\(msg\)\}<\/span>/, '<span>${msg}</span>'); /* ไม่ escape ข้อความ */
  if (which === 3) return R(/JSON\.parse\(JSON\.stringify\(x\)\)/, 'JSON.stringify(x)'); /* clone คืนสตริง */
  if (which === 4) return R(/<span>/, '<div>'); /* แท็กผิด */
  if (which === 5) return R(/data-act="undo"/, 'data-act="undox"'); /* data-act ผิด */
  if (which === 6) return R(/JSON\.parse\(JSON\.stringify\(x\)\)/, '({ ...x })'); /* สำเนาตื้น */
  if (which === 7) return R(/\$\{undo \?/, '${!undo ?'); /* กลับเงื่อนไขอีกแบบ */
  return src;
}
const NEWCOREi = inj ? inject(NEWCORE, inj) : NEWCORE; /* จุดฉีดทั้งหมดอยู่ใน core */

const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end('<!doctype html><title>t</title>') }); await new Promise(r => srv.listen(0, '127.0.0.1', r));
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message.slice(0, 150)));
await p.goto('http://127.0.0.1:' + srv.address().port + '/');
await p.evaluate(() => { document.body.innerHTML = '<div id="toast" role="status"></div>' });
const HARNESS = `
window.TOAST_MS = 4000;
window.TODAY = '2026-10-31';
`;
await p.evaluate(HARNESS);
const load = async (tag, mSrc, coreSrc) => {
  const err = await p.evaluate(async ({ mSrc, coreSrc, datesSrc, tag }) => {
    const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
    const datesU = mk(datesSrc);
    const D = await import(datesU); Object.assign(window, D); /* esc ของจริงบน window (ฝั่งเก่าอ่าน global esc) */
    let src = mSrc;
    if (coreSrc !== null) src = src.replace(/\.\/core\/undo\.js/g, mk(coreSrc.replace(/\.\/dates\.js/g, datesU) + '\n//core ' + tag));
    try { await import(mk(src + '\n//' + tag + Math.random())); return null } catch (e) { return (e && e.message || String(e)) + ' ||| ' + (e && e.stack || '').slice(0, 300) }
  }, { mSrc, coreSrc, datesSrc: CORE_DATES, tag });
  if (err) throw new Error('โหลดโมดูล ' + tag + ' ไม่ได้: ' + err);
};
const ITEM = { id: 1, title: '<b>อ่าน</b> & "หนังสือ"', log: { '2026-10-31': 3 }, skip: {}, rem: [{ k: 'before', m: 0 }], nested: { deep: { arr: [1, 2, { x: null }] } } };
let n = 0, fail = 0;
const t = (name, ok, detail = '') => { n++; if (!ok) { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + String(detail).slice(0, 220) : '')) } };
const TOASTS = [['ข้อความธรรมดา', null], ['มีปุ่มย้อนกลับ', 'FN'], ['<img src=x onerror=alert(1)> ข้อความอันตราย', null], ['', null], ['ข้อความยาว ๆ ที่มี <b>แท็ก</b> & สัญลักษณ์ "พิเศษ" \'โน้ต\'', 'FN']]; /* 'FN' = ส่งฟังก์ชันย้อนกลับจริง (playwright ส่งฟังก์ชันเป็น argument ไม่ได้) */
const recs = {};
for (const [tag, mSrc, coreSrc] of [['old', OLDM, null], ['new', NEWM, NEWCOREi]]) {
  await load(tag, mSrc, coreSrc);
  const toasts = [];
  for (const [msg, undo] of TOASTS) {
    const out = await p.evaluate(([msg, undoMark]) => {
      const el = document.getElementById('toast'); el.innerHTML = ''; el.dataset.open = ''; el._undo = null;
      const undo = undoMark === 'FN' ? () => {} : null;
      window.toast(msg, undo);
      return { html: el.innerHTML, undo: el._undo ? 'fn' : null, open: el.dataset.open, ms: el.style.getPropertyValue('--toast-ms') };
    }, [msg, undo]);
    toasts.push(out);
  }
  const clones = await p.evaluate((item) => {
    const out = {};
    const c = window.clone(item); /* ความผิดที่ทำ clone คืนชนิดอื่น ต้องโดนตัวเทียบจับ ไม่ใช่ crash */
    out.json = typeof c === 'string' ? 'STR:' + c : JSON.stringify(c);
    out.deep = c && typeof c === 'object' ? (c.log !== item.log) : 'n/a'; /* สำเนาลึกต้องไม่ใช่อ็อบเจ็กต์เดิม */
    out.deepNested = c && typeof c === 'object' ? (c.nested.deep !== item.nested.deep) : 'n/a';
    let errTxt = ''; try { window.clone(undefined) } catch (e) { errTxt = e.message }
    out.undefErr = errTxt;
    out.null = JSON.stringify(window.clone(null));
    let arr = ''; try { arr = JSON.stringify(window.clone([1, [2, 3], { a: 4 }])) } catch (e) { arr = 'ERR ' + e.message }
    out.arr = arr;
    return out;
  }, ITEM);
  recs[tag] = { toasts, clones };
}
for (let i = 0; i < TOASTS.length; i++) t('toast | ' + TOASTS[i][0].slice(0, 24), JSON.stringify(recs.old.toasts[i]) === JSON.stringify(recs.new.toasts[i]), JSON.stringify(recs.old.toasts[i]) + ' vs ' + JSON.stringify(recs.new.toasts[i]));
t('clone | JSON เท่ากันทุกโครง', recs.old.clones.json === recs.new.clones.json, recs.old.clones.json + ' vs ' + recs.new.clones.json);
t('clone | ลึก (log เป็นอ็อบเจ็กต์ใหม่)', recs.old.clones.deep === recs.new.clones.deep && recs.old.clones.deep, JSON.stringify(recs.old.clones) + ' vs ' + JSON.stringify(recs.new.clones));
t('clone | ลึก (nested)', recs.old.clones.deepNested === recs.new.clones.deepNested && recs.old.clones.deepNested);
t('clone | undefined โยนเหมือนกัน', recs.old.clones.undefErr === recs.new.clones.undefErr, recs.old.clones.undefErr + ' vs ' + recs.new.clones.undefErr);
t('clone | null', recs.old.clones.null === recs.new.clones.null);
t('clone | อาร์เรย์ซ้อน', recs.old.clones.arr === recs.new.clones.arr);
t('ไม่มี pageerror', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | '));
console.log((fail ? 'FAIL ' : 'PASS ') + n + ' ตรวจ' + (fail ? ' ตก ' + fail : ' ตรงทุกกรณี') + (inj ? ' (INJECT=' + inj + ')' : ''));
await b.close(); srv.close();
process.exit(fail ? 1 : 0);
