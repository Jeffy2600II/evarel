// พิสูจน์ F6 (12-ui__primitives -> core/markdown): mdToHtml จาก core ให้ผลเหมือนของเดิมทุกกรณี และยังกัน XSS (เจาะตรงๆ ไม่พึ่งแค่ "เหมือนเดิม")
// ใช้: node tests/markdown_equiv.test.mjs <12-ui__primitives.js เดิม>
import { chromium } from 'playwright'; import fs from 'fs';
const OLD = fs.readFileSync(process.argv[2], 'utf8'), NEW = fs.readFileSync('app/web/js/m/12-ui__primitives.js', 'utf8'), CORE = fs.readFileSync('app/web/js/m/core/markdown.js', 'utf8');
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
await p.setContent('<!doctype html><body></body>');
const r = await p.evaluate(async ({ OLD, NEW, CORE }) => {
  const mk = s => URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
  const coreU = mk(CORE); const out = {};
  const cases = {
    plain: 'สวัสดี hello', empty: '', nul: null, undef: undefined, num: 42,
    h1: '# หัวข้อ', h6: '###### เล็ก', h7: '####### เกินหก', hClose: '## ปิดท้าย ##', hNoSpace: '#ไม่มีช่องว่าง',
    bold: '**หนา** และ __หนา__', ital: '*เอียง* และ _เอียง_', boldItal: '***หนาเอียง***', del: '~~ขีดฆ่า~~', mixed: '**a *b* c**',
    code: 'โค้ด `x < y` จบ', codeTick: '`` a ` b ``', fence: '```js\nconst a = 1 < 2;\n```', fenceNoLang: '```\nplain\n```', fenceTilde: '~~~py\nprint(1)\n~~~', fenceOpen: '```\nไม่ปิด',
    hr: '---\n***\n___', quote: '> อ้างอิง\n> สอง', quoteNest: '> ก\n> > ข', ul: '- a\n- b\n  - c', ol: '1. a\n2. b', olStart: '5. a\n6. b', task: '- [ ] a\n- [x] b', mixedList: '- a\n1. b',
    table: '| a | b |\n|---|---|\n| 1 | 2 |', tableAlign: '| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |', tableEsc: '| a \\| b | c |\n|---|---|\n| 1 | 2 |', tableNoEdge: 'a | b\n--|--\n1 | 2',
    link: '[ไทย](https://x.com/a?b=1&c=2)', linkBad: '[x](javascript:alert(1))', linkMail: '[m](mailto:a@b.co)', linkTel: '[t](tel:+66)', linkBare: 'ดู https://example.com/path จบ',
    crlf: 'a\r\nb\r\n\r\nc', cr: 'a\rb', para: 'บรรทัดหนึ่ง\nบรรทัดสอง\n\nย่อหน้าใหม่', thai: 'ภาษาไทย **หนา** `โค้ด`', escSym: '\\*ไม่เอียง\\* \\# \\|', amp: 'a & b < c > d " e \' f',
    long: Array.from({ length: 60 }, (_, i) => '- รายการ ' + i + ' **b' + i + '**').join('\n'),
  };
  // ชุด XSS: ต้องไม่มีแท็ก/แอตทริบิวต์อันตรายหลุดออกมาเป็น HTML จริง
  const xss = {
    script: '<script>alert(1)</script>', img: '<img src=x onerror=alert(1)>', svg: '<svg onload=alert(1)>', iframe: '<iframe src="javascript:alert(1)"></iframe>',
    inlineScript: 'ก **<script>x</script>** ข', inCode: '`<img src=x onerror=1>`', inFence: '```\n<script>1</script>\n```', inQuote: '> <script>1</script>', inList: '- <img src=x onerror=1>',
    inTable: '| <script>1</script> | b |\n|---|---|\n| <img src=x onerror=1> | 2 |', inHead: '# <script>1</script>', jsLink: '[a](javascript:alert(1))', dataLink: '[a](data:text/html;base64,PHNjcmlwdD4=)',
    vbLink: '[a](vbscript:x)', jsUpper: '[a](JaVaScRiPt:alert(1))', quoteBreak: '[a](https://x.com" onmouseover="alert(1))', imgMd: '![x](javascript:alert(1))',
    bareQuote: 'ดู https://a.com/"onmouseover="alert(1) จบ', bareQuoteNoSp: 'https://a.com/"onfocus="alert(1)"autofocus="', bareApos: "https://a.com/'onmouseover='alert(1)", htmlEntity: '&lt;script&gt;', attrBreak: '[x](https://a.com/"><script>1</script>)', bareBreak: 'https://a.com/"><script>1</script>', onclick: '<a href="x" onclick="1">k</a>',
  };
  const DANGER = /<\s*(script|iframe|object|embed|svg|img|style|link|meta|base|form|input|button|video|audio)\b|\son[a-z]+\s*=|javascript\s*:|vbscript\s*:|data\s*:text/i;
  for (const [name, src] of [['old', OLD], ['new', NEW]]) {
    for (const k of ['mdToHtml', 'empty', 'skeleton', 'header', 'pills', 'itemRow', 'agendaHTML', 'patch']) delete window[k];   // ล้างทุกชื่อที่ไฟล์ส่งออก ไม่ให้ค่าจากรอบ old ค้างไปปนรอบ new
    globalThis.S = { items: [] }; globalThis.render = () => { };
    const code = src.replace(/\.\/core\/markdown\.js/g, coreU) + '\n//' + name + Math.random();
    const m = await import(mk(code)); const res = {};
    res.exports = Object.keys(m).sort(); res.win = typeof window.mdToHtml; res.winOthers = ['empty', 'skeleton', 'header', 'pills', 'itemRow', 'agendaHTML', 'patch'].map(k => typeof window[k]);
    res.md = Object.fromEntries(Object.entries(cases).map(([k, v]) => [k, String(window.mdToHtml(v))]));
    res.xss = Object.fromEntries(Object.entries(xss).map(([k, v]) => [k, String(window.mdToHtml(v))]));
    res.leak = Object.entries(res.xss).filter(([k, h]) => { const t = document.createElement('div'); t.innerHTML = h; return !!t.querySelector('script,iframe,object,embed,svg,img,style,link,meta,base,form,input,button,video,audio,[onerror],[onload],[onclick],[onmouseover]') || [...t.querySelectorAll('a')].some(a => /^(javascript|vbscript|data):/i.test((a.getAttribute('href') || '').trim())); }).map(([k]) => k);
    res.same = window.mdToHtml('**x**') === window.mdToHtml('**x**');                                    // ผลซ้ำเท่ากัน (แคช)
    res.cacheStable = (() => { const a = window.mdToHtml('# k0'); for (let i = 0; i < 250; i++) window.mdToHtml('u' + i); return a === window.mdToHtml('# k0') })();   // แคชเกิน 200 แล้วล้าง ผลต้องเท่าเดิม
    res.cacheEvict = (() => { let calls = 0; const orig = String.prototype.split; String.prototype.split = function (...a) { if (a[0] === '\n') calls++; return orig.apply(this, a) };
      try { window.mdToHtml('# evict-probe'); const c0 = calls; window.mdToHtml('# evict-probe'); const hit = calls === c0;            // เรียกซ้ำทันที = โดนแคช (ไม่ split)
        for (let i = 0; i < 260; i++) window.mdToHtml('flood ' + i);                                                                  // ดันเกิน 200 รายการ
        const c1 = calls; window.mdToHtml('# evict-probe'); const recomputed = calls > c1;                                            // ถูกล้างออกจากแคชแล้ว = ต้องคำนวณใหม่
        return [hit, recomputed] } finally { String.prototype.split = orig } })();
    res.pure = (() => { const before = JSON.stringify(globalThis.S); window.mdToHtml('# x\n- a'); return before === JSON.stringify(globalThis.S) })();
    out[name] = res;
  }
  return out;
}, { OLD, NEW, CORE });
const o = r.old, n = r.new; let diff = 0, total = 0;
const cmp = (label, x, y) => { total++; const a = JSON.stringify(x), c = JSON.stringify(y); if (a !== c) { diff++; let i = 0; while (i < a.length && a[i] === c[i]) i++; console.log('ต่าง', label, '| ต่างที่ตำแหน่ง', i, '| เดิม:', a.slice(Math.max(0, i - 25), i + 60), '| ใหม่:', c.slice(Math.max(0, i - 25), i + 60)); } };
for (const k of Object.keys(o)) { if (k === 'md' || k === 'xss') for (const c of Object.keys(o[k])) cmp(k + ':' + c, o[k][c], n[k][c]); else cmp(k, o[k], n[k]); }
const distinct = new Set(Object.values(n.md)).size;
console.log(`เทียบ ${total} หมวด | ตรง ${total - diff} | ต่าง ${diff} | markdown ${Object.keys(n.md).length} กรณี (ผลต่างกัน ${distinct} แบบ) | XSS ${Object.keys(n.xss).length} กรณี หลุดจริง: ${JSON.stringify(n.leak)} (เดิมหลุด: ${JSON.stringify(o.leak)}) | exports ${n.exports.length} | window ${n.win} ${n.winOthers.join(',')} | pageerror ${errs.length}`);
await b.close(); process.exit(diff || errs.length || n.leak.length || o.leak.length || distinct < 40 || n.win !== 'function' || n.winOthers.some(t => t !== 'function') || n.exports.length !== 0 || !n.same || !n.cacheStable || JSON.stringify(n.cacheEvict) !== '[true,true]' || !n.pure ? 1 : 0);
