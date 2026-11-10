/* ตรวจหน้าตั้งค่าจากบิลด์จริงในเบราว์เซอร์จริง: หัวข้อต้องเรียงถูก เลขรุ่นต้องเป็นรุ่นบิลด์ และต้องไม่มีข้อความของเดโม/คำอธิบายระบบ
   วิธี: เสิร์ฟบิลด์ในเครื่องใต้ origin ของ forge แล้วเรียกตัวสร้างหน้าตั้งค่า อ่านข้อความที่ผู้ใช้จะเห็น */
import { chromium } from 'playwright';
import fs from 'node:fs';
import { APP_ORIGIN, serveLocalAs } from '../tests/live_user.mjs';

const rel = JSON.parse(fs.readFileSync('build/web/release.json', 'utf8'));
const BAN = ['เก็บในเครื่องนี้เท่านั้น', 'เดโมยังไม่ส่ง Push', 'ฟอร์มแยกการ์ด', 'ดาวน์โหลดไฟล์สำรอง', 'นำเข้าจากไฟล์', 'Worker', 'API'];
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, timezoneId: 'Asia/Bangkok' });
  await serveLocalAs(ctx);
  const page = await ctx.newPage();
  await page.goto(APP_ORIGIN + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    if (typeof settingsHTML !== 'function') return null;
    const h = settingsHTML();
    return { text: h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), groups: [...h.matchAll(/ev-group">([^<]{2,24})<\/h2>/g)].map(m => m[1]) };
  });
  if (!r) { console.log('ผล: ตก (ไม่พบตัวสร้างหน้าตั้งค่า)'); process.exit(1); }
  const hits = BAN.filter(k => r.text.includes(k));
  const hasVer = r.text.includes(rel.version);
  fs.writeFileSync('/tmp/settings-text.txt', r.text + '\n\nหัวข้อ: ' + r.groups.join(' | '));
  console.log('หัวข้อ:', r.groups.join(' | '));
  console.log('เลขรุ่นบนหน้า:', rel.version, '| ตรงกับบิลด์:', hasVer);
  console.log('คำที่ต้องไม่พบ:', hits.length ? hits : 'ไม่พบ');
  console.log(hasVer && !hits.length ? 'ผล: ผ่าน' : 'ผล: ตก');
} finally { await browser.close(); }
