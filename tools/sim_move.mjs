// sim_move.mjs: จำลองผลการย้ายนิยามระดับบนสุดไปไฟล์อื่น โดยไม่แตะโค้ด (ใช้ก่อนลงมือจริง)
// ใช้: node sim_move.mjs <mdir> "ชื่อ=ไฟล์ปลายทาง(ขึ้นต้น เช่น 08)" ... [--end]
// หลักการ: อ่านกราฟระดับชื่อจาก deps.manifest.json ของ mdir/.. ย้ายชื่อแล้วคำนวณเส้นย้อนทิศ วงจร และอ้างตอนโหลดใหม่
import fs from 'fs'; import path from 'path';
const mdir = process.argv[2]; const moves = process.argv.slice(3).filter(a => a.includes('=') && !a.startsWith('--file='));
const man = JSON.parse(fs.readFileSync(path.join(mdir, '..', '..', 'deps.manifest.json'), 'utf8'));
const order = JSON.parse(fs.readFileSync(path.join(mdir, '_order.json'), 'utf8')).order.map(o => o.file);
const fileMoves = process.argv.slice(3).filter(a => a.startsWith('--file=')).map(a => a.slice(7));
for (const fm of fileMoves) { const [p, pos] = fm.split(':'); const i = order.findIndex(f => f.startsWith(p)); if (i < 0) throw new Error('ไม่พบไฟล์ ' + p); const [f] = order.splice(i, 1); if (pos === 'END') order.push(f); else { const j = order.findIndex(x => x.startsWith(pos)); if (j < 0) throw new Error('ไม่พบไฟล์ปลายทาง ' + pos); order.splice(j, 0, f); } }
const F = (p) => order.find(f => f.startsWith(p)); const idx = Object.fromEntries(order.map((f, i) => [f, i]));
const sym = JSON.parse(fs.readFileSync(path.join(mdir, '..', '..', '_sim_symbols.json'), 'utf8'));
// sym: { ชื่อ: { decl: ไฟล์, users: [ไฟล์...], atLoadUsers: [ไฟล์...] } }
const where = {}; for (const [n, v] of Object.entries(sym)) { if (n !== '__topUses') where[n] = v.decl; }
for (const mv of moves) { const [n, p] = mv.split('='); const t = F(p); if (!t) throw new Error('ไม่พบไฟล์ ' + p); if (!(n in where)) throw new Error('ไม่พบชื่อ ' + n); where[n] = t; }
const E = {}; for (const f of order) E[f] = new Set();
const fwdLoad = [];
// เส้นสร้างจาก deps ของนิยาม (ไฟล์ปัจจุบันของนิยามนั้น -> ไฟล์ปัจจุบันของสิ่งที่มันอ้าง) ไม่ใช้ users ระดับไฟล์เดิม
// เพราะ users จะนับเส้นจากไฟล์เดิมของนิยามที่ถูกย้ายไปแล้วซ้ำ ทำให้ประเมินเส้นสูงเกินจริง (พบและแก้ใน ts-1n)
const top = sym.__topUses || {};
for (const [n, v] of Object.entries(sym)) { if (n === '__topUses') continue; for (const d of (v.deps || [])) { const a = where[n], b = where[d]; if (a && b && a !== b) E[a].add(b); } }
for (const [f, names] of Object.entries(top)) for (const d of names) { const b = where[d]; if (b && f !== b) E[f].add(b); }
const back = []; for (const f of order) for (const g of E[f]) if (idx[g] > idx[f]) back.push(`${f.slice(0, 2)}>${g.slice(0, 2)}`);
const ix = {}, lw = {}, on = new Set(), st = [], comps = []; let c = 0; const G = Object.fromEntries(order.map(f => [f, [...E[f]]]));
const sc = (v) => { ix[v] = lw[v] = c++; st.push(v); on.add(v); for (const w of G[v]) { if (!(w in ix)) { sc(w); lw[v] = Math.min(lw[v], lw[w]); } else if (on.has(w)) lw[v] = Math.min(lw[v], ix[w]); } if (lw[v] === ix[v]) { const comp = []; let w; do { w = st.pop(); on.delete(w); comp.push(w); } while (w !== v); comps.push(comp); } };
for (const v of order) if (!(v in ix)) sc(v);
const big = comps.filter(x => x.length > 1).sort((a, b) => b.length - a.length);
console.log(JSON.stringify({ moves, backEdges: back.length, back, cycles: big.map(x => x.length), forwardAtLoad: fwdLoad }));
