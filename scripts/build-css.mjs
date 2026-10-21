/* Path: scripts/build-css.mjs | Purpose: คอมไพล์ app/web/styles/app.css จาก design.css (CSS เดโมของ Master) + extra.css ด้วย Tailwind CLI จริง ไม่ใช้ Play CDN
   Used by: npm run build:css และ scripts/build-web.mjs | preflight ปิดตาม config เดโม ต้องมี @tailwind base เพื่อให้ตัวแปร --tw-* ออก (ไม่งั้น transform ทั้งโซ่เป็น none) */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => readFileSync(join(root, p), 'utf8');
const input = join(root, '.state/work/tailwind-input.css');
const out = join(root, 'app/web/styles/app.css');
mkdirSync(dirname(input), { recursive: true });
writeFileSync(input, '/* สร้างโดย scripts/build-css.mjs ห้ามแก้มือ แก้ที่ app/web/styles/design.css */\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n' + rd('app/web/styles/design.css') + '\n' + rd('app/web/styles/extra.css'));
execFileSync(process.execPath, [join(root, 'node_modules/tailwindcss/lib/cli.js'), '-i', input, '-o', out, '--config', join(root, 'tailwind.config.cjs')], { stdio: 'inherit' });
const built = readFileSync(out, 'utf8');
for (const must of ['--c-bg', '.ev-app', '.ev-sheet', '--tw-translate-x', '.ev-qchip']) if (!built.includes(must)) throw new Error('app.css ขาด ' + must + ' — build ผิด');
if (/@apply\s+[a-z\[!-]/.test(built.replace(/\/\*[\s\S]*?\*\//g, ''))) throw new Error('เหลือ @apply ที่ไม่ถูกแปลง');
console.log('app.css สร้างแล้ว', built.length, 'ไบต์');
