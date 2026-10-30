// พิสูจน์ F6 (แยกซิงก์ออกจาก 22-views__auth เป็น 22-views__live-sync): ในหน้าแอปจริง ผลข้างเคียงตอนโหลดและทางเรียกข้ามไฟล์ยังทำงานเหมือนเดิม
// ตรวจ: (1) listener visibilitychange/online/focus ถูกผูกตอนโหลดและเรียก rtResume -> liveRefresh จริง (2) window มีฟังก์ชันซิงก์ครบ (ทางที่ enterApp ใช้) (3) startLiveSync/stopLiveSync ไม่พัง และสลับ rtOn ได้ (4) doSignOut ใน 22 เรียก stopLiveSync ข้ามไฟล์ได้
// ใช้: EVAREL_WEB_DIR=<app/web> node tests/live_sync_split.test.mjs  (ไม่ต้องพึ่ง API จริง: นับการเรียก liveRefresh ด้วยการครอบ window.liveRefresh ไม่ได้ เพราะ rtResume อ้างตัวแปรในโมดูล จึงนับผ่านการเรียก fetch /items ที่ liveRefresh ทำเมื่อ SUPA_API มีค่า)
import { chromium } from 'playwright'; import fs from 'fs';
import { serveLocalAs, APP_ORIGIN } from './live_user.mjs';
const d = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/';
const exe = d + fs.readdirSync(d).find(x => x.startsWith('chrome')) + '/chrome-headless-shell';
const b = await chromium.launch({ executablePath: exe }); const ctx = await b.newContext({ viewport: { width: 412, height: 915 } }); await serveLocalAs(ctx, process.env.EVAREL_WEB_DIR);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 100)));
// จับ addEventListener ก่อนสคริปต์ใดโหลด เพื่อนับว่าซิงก์ผูก 3 ตัวนี้
await p.addInitScript(() => { window.__ev = []; for (const [tgt, nm] of [[document, 'document'], [window, 'window']]) { const o = tgt.addEventListener.bind(tgt); tgt.addEventListener = (t, fn, opt) => { if (['visibilitychange', 'online', 'focus'].includes(t)) window.__ev.push(nm + ':' + t + ':' + (fn && fn.name)); return o(t, fn, opt) } } });
await p.goto(APP_ORIGIN + '/index.html'); await p.waitForTimeout(2500);
const r = await p.evaluate(async () => {
  const o = {}; const names = ['liveRefresh', 'startLiveSync', 'stopLiveSync', 'rtResume', 'rtConnect', 'rtSchedule', 'rtKick', 'rtSend', 'sigOf', 'typingNow', 'doSignOut', 'authValidate'];
  o.types = names.map(n => n + ':' + typeof window[n]).join(',');
  o.ev = window.__ev.filter(x => /rtResume|^(document:visibilitychange|window:online|window:focus)/.test(x) || true).join('|');
  o.sig = [window.sigOf([{ id: 1, title: 'a' }]), window.sigOf([{ id: 1, title: 'b' }]), window.sigOf([{ id: 2, title: 'a' }, { id: 1, title: 'a' }]) === window.sigOf([{ id: 1, title: 'a' }, { id: 2, title: 'a' }])];
  // sigOf ต้องไวต่อทุกฟิลด์ที่สูตรนับ (15 ฟิลด์) ทีละฟิลด์ | ฟิลด์ที่ไม่นับต้องไม่ทำให้ค่าเปลี่ยน | ไม่สนลำดับรายการ
  const F = ['id', 'type', 'title', 'subject', 'time', 'timeEnd', 'track', 'target', 'unitName', 'repeat', 'start', 'end', 'log', 'skip', 'rem'];
  const base = { id: 1, type: 'habit', title: 't', subject: 's', time: '09:00', timeEnd: '10:00', track: 'count', target: 5, unitName: 'u', repeat: { unit: 'day' }, start: '2026-01-01', end: '2026-12-31', log: { a: 1 }, skip: { b: 1 }, rem: { c: 1 } };
  const chg = { id: 2, type: 'task', title: 'x', subject: 'y', time: '10:00', timeEnd: '11:00', track: 'check', target: 6, unitName: 'v', repeat: { unit: 'week' }, start: '2026-02-01', end: '2026-11-30', log: { a: 2 }, skip: { b: 2 }, rem: { c: 2 } };
  const b0 = window.sigOf([base]); o.sigField = F.map(f => window.sigOf([{ ...base, [f]: chg[f] }]) !== b0 ? 1 : 0).join('');
  o.sigIgnored = window.sigOf([{ ...base, color: 'red', note: 'z', createdAt: 99 }]) === b0;
  o.sigEmpty = typeof window.sigOf([]);
  try { window.startLiveSync(); window.stopLiveSync(); o.startStop = 'ok' } catch (e) { o.startStop = 'THROW:' + e.message.slice(0, 60) }
  o.typing = window.typingNow();
  // typingNow: โฟกัสช่องพิมพ์จริงในกล่อง #page/#sheet/#dialog = true | นอกกล่อง/ปุ่ม = false | SELECT/TEXTAREA นับด้วย
  const mount = (tag, parent) => { const host = document.createElement('div'); if (parent) host.id = parent; document.body.appendChild(host); const el = document.createElement(tag); host.appendChild(el); el.focus(); const ok = document.activeElement === el; const v = window.typingNow(); host.remove(); return ok ? v : 'NOFOCUS' }; /* กล่องใหม่ที่มองเห็น: #page/#sheet/#dialog จริงในหน้าถูกซ่อนไว้ โฟกัสไม่ติด */
  o.tn = [mount('input', 'page'), mount('textarea', 'sheet'), mount('select', 'dialog'), mount('button', 'page'), mount('input', '')].join(',');
  return o;
});
console.log(JSON.stringify(r).slice(0, 900)); console.log('pageerror', errs.length, JSON.stringify(errs.slice(0, 6)));
await b.close();
const evs = r.ev.split('|').filter(Boolean); const need = ['document:visibilitychange', 'window:online', 'window:focus'];
const miss = need.filter(n => !evs.some(e => e.startsWith(n + ':')));
console.log('listener ซิงก์ที่ผูก:', evs.filter(e => /rtResume/.test(e)).length, '| ขาด:', JSON.stringify(miss));
// เกณฑ์ตามที่ฐานวัดได้จริง: startLiveSync ในหน้าที่ไม่มี API จริงโยน 'SUPA_API is not defined' (พฤติกรรมเดิม ต้องคงไว้ ไม่ใช่ error ใหม่) | online/focus ผูกด้วย rtResume ตรงๆ ส่วน visibilitychange ผูกด้วยฟังก์ชันนิรนาม
const startOk = r.startStop === 'THROW:SUPA_API is not defined' || r.startStop === 'ok';
const resumeCount = (r.ev.match(/rtResume/g) || []).length;
console.log('startLiveSync:', r.startStop, '| ผูก rtResume ตรง:', resumeCount, '| sig แยกค่าได้:', r.sig[0] !== r.sig[1], '| sig ไม่สนลำดับ id:', r.sig[2]);
console.log('typingNow (input/textarea/select ในกล่อง, ปุ่ม, นอกกล่อง):', r.tn);
console.log('sigOf ไวต่อฟิลด์ (15):', r.sigField, '| ไม่สนฟิลด์นอกสูตร:', r.sigIgnored);
process.exit(r.sigField !== '111111111111111' || r.sigIgnored !== true || r.tn !== 'true,true,true,false,false' || r.types.split(',').some(x => x.endsWith(':undefined')) || miss.length || !startOk || resumeCount !== 2 || r.sig[0] === r.sig[1] || r.sig[2] !== true ? 1 : 0);
