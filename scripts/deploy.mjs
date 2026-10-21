#!/usr/bin/env node
/* Evarel deploy (เขียนใหม่ 21 ต.ค. 2026 — สคริปต์เดิมหายหลัง sandbox รีสตาร์ท)
   วิธีใช้: node scripts/deploy.mjs forge|production
   หน้าที่: ตรวจ build/web ให้ฉีด API ถูกเส้นทางแล้ว -> เรียก wrangler deploy ด้วย token จาก .env
   กติกา: production ต้องพิมพ์ --confirm-production ต่อท้ายจึงจะทำจริง (กันพลาดแตะ prod)
   บันทึกใน git ถาวร ห้ามลบอีก */
import { readFileSync, existsSync, writeFileSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = process.env.EVAREL_ENV_FILE || '/app/.agents/.env';

/* อ่าน .env เอาค่าเดียวต่อคีย์ (บรรทัดซ้ำใช้ตัวสุดท้าย กัน error 9106 แบบครั้งก่อน) */
function readEnvOne(key) {
  if (!existsSync(ENV_FILE)) return '';
  const lines = readFileSync(ENV_FILE, 'utf8').split('\n');
  let v = '';
  for (const l of lines) { const m = l.match(new RegExp(`^${key}=(.*)$`)); if (m) v = m[1].trim(); }
  return v;
}

const mode = process.argv[2];
if (mode !== 'forge' && mode !== 'production') {
  console.error('ใช้: node scripts/deploy.mjs forge|production'); process.exit(2);
}
if (mode === 'production' && process.argv[3] !== '--confirm-production') {
  console.error('production ต้อง --confirm-production (งานปกติห้ามแตะ production)'); process.exit(2);
}

const API_BASE = 'https://api.cloudflare.com/client/v4';
const token = readEnvOne('CF_API_TOKEN') || readEnvOne('CLOUDFLARE_API_TOKEN');
if (!token) { console.error('ไม่พบ CF_API_TOKEN ใน .env'); process.exit(1); }

/* account id: ใช้ค่าจาก .env ก่อน ถ้าไม่มีค่อยถาม API ด้วย token */
let accountId = readEnvOne('CLOUDFLARE_ACCOUNT_ID');
if (!accountId) {
  const r = JSON.parse(execFileSync('curl', ['-s', '-m', '20', `${API_BASE}/accounts`,
    '-H', `Authorization: Bearer ${token}`]).toString());
  if (!r.success || !r.result?.length) { console.error('ถาม account id ไม่สำเร็จ', JSON.stringify(r.errors)); process.exit(1); }
  accountId = r.result[0].id;
  console.log(`account id (ถามจาก API): ${accountId}`);
}

/* ตรวจ build ก่อน: ต้องมีไฟล์และ API URL ถูกเส้นทางปลายทาง */
const buildDir = resolve(ROOT, 'build/web');
if (!existsSync(resolve(buildDir, 'index.html'))) { console.error('ไม่มี build/web/index.html — รัน build ก่อน'); process.exit(1); }
const expectApi = mode === 'forge' ? 'evarel-api-forge' : 'evarel-api';
const sw = readFileSync(resolve(buildDir, 'sw.js'), 'utf8');
if (!sw.includes(expectApi)) { console.error(`build นี้ฉีด API ไม่ตรงเส้นทาง (ต้องการ ${expectApi}) — รัน build:web:${mode} ก่อน`); process.exit(1); }

/* deploy ด้วย wrangler (assets จาก wrangler.toml ของ app/web) */
const args = ['wrangler', 'deploy', '--config', resolve(ROOT, 'app/web/wrangler.toml'), '--env', mode];
console.log(`deploy ${mode} -> wrangler (${args.join(' ')})`);
const out = execFileSync('npx', args, {
  cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
  env: { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId },
});
console.log(out);
console.log(`DEPLOY-OK ${mode}`);
