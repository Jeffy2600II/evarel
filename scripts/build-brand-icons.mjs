/* สร้างชุดไอคอนของเว็บ/แอปจาก "ต้นฉบับเวกเตอร์" ใน brand/ (ไม่ใช่ภาพย่อจาก PNG)
   ที่มา: brand/1-ordinal/svg/appicon-night.svg — แบบ "ไนท์" (พื้นเข้ม) ไม่ใช่วงกลม (Master เลือก 3 พ.ย. 2026)
   หลักการ:
   - favicon ทุกขนาดเรนเดอร์ตรงจากเวกเตอร์ที่ขนาดจริง (คมทุกขนาด)
   - apple-touch-icon และไอคอนหน้าจอหลักต้องทึบ (iOS เติมพื้นดำเองถ้าโปร่งใส) จึงวางบนสีพื้นของแบรนด์
   - maskable ต้องเหลือขอบปลอดภัย ~80% ของกรอบ ไม่งั้นถูกตัดเป็นวงกลม/เหลี่ยมมนตอนติดตั้ง
   ใช้: node scripts/build-brand-icons.mjs
*/
import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_SVG = join(root, 'brand/1-ordinal/svg/appicon-night.svg');
const OUT = join(root, 'web/runtime/icons');
/* สีพื้นของแบรนด์ไนท์ (หัว/ท้ายของไล่เฉดใน SVG) */
const BASE = '#0B0920';

const svg = readFileSync(SRC_SVG);
const png = (size) => sharp(svg, { density: 384 }).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 });

const jobs = [];
/* 1) favicon ทุกขนาดที่เบราว์เซอร์ขอ (ตรงกับ <link> ใน layout) */
for (const s of [16, 32, 48, 64, 128, 256]) jobs.push(png(s).toFile(join(OUT, `favicon-${s}.png`)));
/* 2) ไอคอนหน้าจอหลัก/PWA + apple touch (ทึบ กันพื้นดำจาก iOS) */
for (const [s, name] of [[180, 'apple-touch-icon-180.png'], [192, 'icon-192.png'], [512, 'icon-512.png'], [1024, 'appicon-night-1024.png']]) {
  jobs.push(sharp(svg, { density: 384 }).resize(s, s).flatten({ background: BASE }).png({ compressionLevel: 9 }).toFile(join(OUT, name)));
}
/* 3) maskable: ย่อไอคอนเหลือ 76% กลางกรอบ เติมพื้นเต็มกรอบ -> ไม่โดนตัดตอนติดตั้งเป็นแอป */
const inner = Math.round(512 * 0.76);
const innerBuf = await sharp(svg, { density: 384 }).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
jobs.push(sharp({ create: { width: 512, height: 512, channels: 4, background: BASE } })
  .composite([{ input: innerBuf, gravity: 'center' }]).png({ compressionLevel: 9 }).toFile(join(OUT, 'maskable-night-512.png')));

await Promise.all(jobs);

/* 4) favicon.ico หลายขนาดในไฟล์เดียว — แต่ละเฟรมเรนเดอร์จากเวกเตอร์ที่ขนาดจริง */
const sizes = [16, 32, 48, 64, 128, 256];
const frames = [];
for (const s of sizes) frames.push({ size: s, buf: await sharp(svg, { density: 384 }).resize(s, s).png().toBuffer() });
/* เขียน ICO เอง (PNG-in-ICO) เพื่อคุมทุกเฟรมได้ ไม่พึ่งภาพย่อ */
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
const dir = Buffer.alloc(16 * sizes.length);
let offset = 6 + 16 * sizes.length;
sizes.forEach((s, i) => {
  const b = i * 16;
  dir.writeUInt8(s >= 256 ? 0 : s, b); dir.writeUInt8(s >= 256 ? 0 : s, b + 1);
  dir.writeUInt8(0, b + 2); dir.writeUInt8(0, b + 3);
  dir.writeUInt16LE(1, b + 4); dir.writeUInt16LE(32, b + 6);
  dir.writeUInt32LE(frames[i].buf.length, b + 8); dir.writeUInt32LE(offset, b + 12);
  offset += frames[i].buf.length;
});
writeFileSync(join(OUT, 'favicon.ico'), Buffer.concat([header, dir, ...frames.map((f) => f.buf)]));

/* 5) favicon.svg เวกเตอร์ + เก็บต้นฉบับของแบบไนท์ไว้ด้วย (ตรวจย้อนได้ว่าไฟล์มาจากไหน) */
copyFileSync(SRC_SVG, join(OUT, 'favicon.svg'));

/* 6) เก็บกวาดไอคอนชุดเก่าที่ไม่มีใครอ้างถึงแล้ว (violet / circle) */
for (const old of ['appicon-violet-1024.png', 'circle-violet-1024.png']) {
  const p = join(OUT, old);
  if (existsSync(p)) { unlinkSync(p); console.log('ลบไอคอนเก่า:', old); }
}
console.log('BRAND-ICONS OK: ชุดไนท์ (appicon-night) ครบ favicon 16-256 + ico + apple-touch + 192/512/1024 + maskable');
