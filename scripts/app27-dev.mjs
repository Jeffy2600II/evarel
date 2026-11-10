#!/usr/bin/env node
/* รอบแกะ-ประกอบเร็วของแอป v27 (ไม่ต้องรอ Next build ~90 วินาที)
   วิธีใช้: node scripts/app27-dev.mjs [--serve] [--port 8779]
   - รัน scripts/app27-patch.py สร้าง web/app27/index.html จากเดโม
   - ประกอบ .state/app27-dev/ = index.html + sw.js + icons + manifest + release.json
   - --serve เปิดเซิร์ฟเวอร์ที่พอร์ต 8779 (พอร์ตที่ API อนุญาต origin ไว้) ให้ทดสอบได้ทันที */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const serve = args.includes('--serve');
const port = (args[args.indexOf('--port') + 1] || '8779');
execFileSync('python3', [join(root, 'scripts/app27-patch.py')], { cwd: root, stdio: 'inherit' });
const OUT = join(root, '.state/app27-dev');
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
cpSync(join(root, 'web/app27/index.html'), join(OUT, 'index.html'));
for (const a of ['sw.js', 'manifest.webmanifest']) { const src = join(root, 'web/runtime', a); if (existsSync(src)) cpSync(src, join(OUT, a)); }
const icons = join(root, 'web/runtime/icons'); if (existsSync(icons)) cpSync(icons, join(OUT, 'icons'), { recursive: true });
cpSync(join(root, 'releases/current.json'), join(OUT, 'release.json'));
console.log(`ประกอบเสร็จ: ${OUT} (${readFileSync(join(OUT, 'index.html'), 'utf8').length} ตัวอักษร)`);
if (serve) { console.log(`เปิด http://localhost:${port}/`); execFileSync('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1', '--directory', OUT], { stdio: 'inherit' }); }
