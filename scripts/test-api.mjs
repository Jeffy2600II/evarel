// รันชุดทดสอบของ Worker (app/api/src) ทั้งหมดในที่เดียว ไม่ผูกกับเครื่องใดเครื่องหนึ่ง
// ออกด้วยรหัส 1 ถ้ามีไฟล์ใดตก หรือไม่พบไฟล์ทดสอบที่ควรมี
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'app/api/src');
const files = [
  'shared/auth.test.mjs', 'shared/ratelimit.test.mjs',
  'systems/ai/memory.test.mjs', 'systems/ai/quota-read.test.mjs', 'systems/ai/quota-wire.test.mjs',
  'systems/ai/quota.test.mjs', 'systems/ai/routes.test.mjs',
  'systems/items/abuse.test.mjs', 'systems/items/routes.test.mjs',
  'systems/auth/codes.test.mjs', 'systems/auth/account.test.mjs',
];
let pass = 0; const bad = [];
for (const f of files) {
  const p = join(root, f);
  if (!existsSync(p)) { bad.push(`ไม่พบ ${f}`); continue; }
  const env = f.endsWith('account.test.mjs') ? { ...process.env, ACCOUNT_MODE: 'own' } : process.env;
  const r = spawnSync('node', [p], { encoding: 'utf8', env, timeout: 150000 });
  const n = ((r.stdout || '') + (r.stderr || '')).split('\n').filter((l) => /^(PASS|✓)/.test(l)).length;
  pass += n;
  if (r.status !== 0) bad.push(`ตก ${f}`);
}
console.log(`ผ่าน ${pass} ข้อ | ปัญหา: ${bad.length ? bad.join(', ') : 'ไม่มี'}`);
process.exit(bad.length ? 1 : 0);
