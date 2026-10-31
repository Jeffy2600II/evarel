/* พิสูจน์ F6 (11-ui__popover ส่วน HTML ของเมนู): popItemsHTML ที่ย้ายไป core/popover ให้ผลเหมือนโมดูลเดิมทุกกรณี
   เทียบพฤติกรรม openPop จริงบน DOM (innerHTML ซ้ายขวาที่วาง สถานะเปิด-ปิด) บนเบราว์เซอร์จริง ตำแหน่งคำนวณด้วย popPlace ของจริงทั้งสองฝั่ง
   ใช้: node tests/popover_equiv.test.mjs <11-ui__popover.js เดิม>
   ฉีดความผิดพิสูจน์ว่าเทสต์จับได้: INJECT=1..7 node tests/popover_equiv.test.mjs ... (ต้อง exit 1 ทุกค่า) */
import { chromium } from 'playwright'; import fs from 'fs'; import http from 'http';
const OLDM = fs.readFileSync(process.argv[2] || '/tmp/popover_m11_at_head.js', 'utf8');
const OLDCORE = fs.readFileSync(process.argv[3] || '/tmp/popover_core_at_head.js', 'utf8'); /* core รุ่น HEAD (มีแต่ popPlace) */
const NEWM = fs.readFileSync('app/web/js/m/11-ui__popover.js', 'utf8');
const NEWCORE = fs.readFileSync('app/web/js/m/core/popover.js', 'utf8');
const CORE_DATES = fs.readFileSync('app/web/js/m/core/dates.js', 'utf8');
const inj = Number(process.env.INJECT || 0);

function inject(src, which) {
  const R = (re, to) => { const n = src.replace(re, to); if (n === src) throw new Error('INJECT ' + which + ': ไม่เจอจุดฉีด'); return n; };
  if (which === 1) return R(/m === "-" \? "<hr>" :/, 'm === "-" ? "" :'); /* ขีดคั่นหาย */
  if (which === 2) return R(/m\.tone \? `data-tone="\$\{m\.tone\}"` : ""/, '""'); /* data-tone หาย */
  if (which === 3) return R(/m\.hint \? `<small>\$\{m\.hint\}<\/small>` : ""/, '""'); /* hint หาย */
  if (which === 4) return R(/esc\(m\.id \?\? ""\)/, '(m.id ?? "")'); /* ไม่ escape id */
  if (which === 5) return R(/\$\{icon\(m\.icon\)\}/, ''); /* ไอคอนหาย */
  if (which === 6) return R(/role="menuitem"/, 'role="menuitemx"'); /* role ผิด */
  if (which === 7) return R(/\.join\(""\)/, '.join(",")'); /* ต่อข้อความผิด */
  return src;
}
const NEWCOREi = inj ? inject(NEWCORE, inj) : NEWCORE;

const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end('<!doctype html><title>t</title>') }); await new Promise(r => srv.listen(0, '127.0.0.1', r));
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage({ viewport: { width: 412, height: 915 } }); const pageErrs = []; p.on('pageerror', e => pageErrs.push(e.message.slice(0, 150)));
await p.evaluate(() => { document.body.innerHTML = '<div id="pop" role="menu" hidden></div><div id="anchor1" style="position:absolute;left:100px;top:200px;width:40px;height:40px"></div><div id="anchor2" style="position:absolute;left:10px;top:800px;width:40px;height:40px"></div>' });
await p.goto('http://127.0.0.1:' + srv.address().port + '/');
await p.evaluate(() => { document.body.innerHTML = '<div id="pop" role="menu" hidden></div><div id="anchor1" style="position:absolute;left:100px;top:200px;width:40px;height:40px"></div><div id="anchor2" style="position:absolute;left:10px;top:800px;width:40px;height:40px"></div>' });
const HARNESS = `
window.icon = ic => '[icon:' + ic + ']';
window.closePop = () => { const pop = document.getElementById('pop'); pop.hidden = true; pop.dataset.open = 'false'; window.ST.popBtn = null };
`;
await p.evaluate(HARNESS);
const load = async (tag, mSrc, coreSrc) => {
  const err = await p.evaluate(async ({ mSrc, coreSrc, datesSrc, tag }) => {
    const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
    const datesU = mk(datesSrc);
    const D = await import(datesU); Object.assign(window, D); /* esc ของจริงบน window (ฝั่งเก่าอ่าน global esc) */
    let src = mSrc;
    if (coreSrc !== null) src = src.replace(/\.\/core\/popover\.js/g, mk(coreSrc.replace(/\.\/dates\.js/g, datesU) + '\n//core ' + tag));
    try { await import(mk(src + '\n//' + tag + Math.random())); return null } catch (e) { return (e && e.message || String(e)) + ' ||| ' + (e && e.stack || '').slice(0, 300) }
  }, { mSrc, coreSrc, datesSrc: CORE_DATES, tag });
  if (err) throw new Error('โหลดโมดูล ' + tag + ' ไม่ได้: ' + err);
};
const ITEMS = [
  [{ act: 'edit', icon: 'pen', label: 'แก้ไข', id: 12 }, '-', { act: 'del', icon: 'trash', label: 'ลบ', id: 'x"y', tone: 'danger' } /* id มี " ทำให้การลืม esc เห็นผลที่ DOM */, { act: 'share', label: 'แชร์', hint: 'ส่งลิงก์' }],
  [{ act: 'a', label: 'อันเดียว', id: '' }],
  ['-'],
  [],
];
const SCNS = [
  ['เมนูครบ (กลางจอมุมบน)', 'anchor1', ITEMS[0], { align: 'left' }],
  ['จัดขวา', 'anchor1', ITEMS[0], { align: 'right' }],
  ['จัดกึ่งกลาง', 'anchor1', ITEMS[0], { align: 'center' }],
  ['ใกล้ขอบล่าง (ต้องเปิดขึ้น)', 'anchor2', ITEMS[0], {}],
  ['เปิดซ้ำ anchor เดิม (ต้องปิด)', 'anchor1', ITEMS[0], { __toggle: true }],
  ['ขีดคั่นอย่างเดียว', 'anchor1', ITEMS[2], {}],
  ['เมนูว่าง', 'anchor1', ITEMS[3], {}],
];
let n = 0, fail = 0;
const t = (name, ok, detail = '') => { n++; if (!ok) { fail++; console.log('FAIL ' + name + (detail ? ' :: ' + String(detail).slice(0, 200) : '')) } };
const recs = {};
for (const [tag, mSrc, coreSrc] of [['old', OLDM, OLDCORE], ['new', NEWM, NEWCOREi]]) {
  await load(tag, mSrc, coreSrc);
  const list = [];
  for (const [name, anchorId, items, o] of SCNS) {
    const out = await p.evaluate(([aid, items, o, toggle]) => {
      const pop = document.getElementById('pop'), anchor = document.getElementById(aid);
      window.ST = { popBtn: null };
      if (toggle) { window.openPop(anchor, items, o); window.openPop(anchor, items, o); }
      else window.openPop(anchor, items, o);
      return { html: pop.innerHTML, hidden: pop.hidden, open: pop.dataset.open, left: pop.style.left, top: pop.style.top, origin: pop.style.transformOrigin, popBtn: window.ST.popBtn ? 'set' : null };
    }, [anchorId, items, o, !!o.__toggle]);
    list.push({ name, out });
  }
  recs[tag] = list;
}
for (let i = 0; i < SCNS.length; i++) {
  const A = JSON.stringify(recs.old[i].out), B = JSON.stringify(recs.new[i].out);
  t(SCNS[i][0], A === B, A.slice(0, 160) + ' vs ' + B.slice(0, 160));
}
t('ไม่มี pageerror', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | '));
console.log((fail ? 'FAIL ' : 'PASS ') + n + ' ตรวจ' + (fail ? ' ตก ' + fail : ' ตรงทุกกรณี') + (inj ? ' (INJECT=' + inj + ')' : ''));
await b.close(); srv.close();
process.exit(fail ? 1 : 0);
