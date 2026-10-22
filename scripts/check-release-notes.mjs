#!/usr/bin/env node
/* Path: scripts/check-release-notes.mjs | Purpose: บังคับว่าทุกการปล่อยเว็บต้องมีโน้ตรุ่นใหม่ (releases/current.json เปลี่ยน)
   วิธีทำงาน: เทียบกับ git ไม่ใช่ไฟล์ในเครื่อง จึงเหมือนกันทั้งเครื่องผมและ GitHub Actions
   ใช้: node scripts/check-release-notes.mjs [<ฐานเทียบ> default = HEAD~1]
   ผ่านเมื่อ: (ก) code ใต้ app/ web-next/ scripts/ ไม่เปลี่ยน หรือ (ข) releases/current.json เปลี่ยน (version หรือ notes ต่างจากฐาน)
   Used by: .github/workflows/web.yml */
import { execFileSync } from 'node:child_process';
const base = process.argv[2] || 'HEAD~1';
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
let files;
try { files = git('diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean); }
catch { console.log('RELEASE-NOTES: ไม่มีฐานเทียบ (commit แรก?) ข้ามการตรวจ'); process.exit(0); }
const shipped = files.filter(f => /^(app\/web|app\/src|web-next\/src)\//.test(f));
if (!shipped.length) { console.log('RELEASE-NOTES: ไม่มีไฟล์ที่ส่งถึงผู้ใช้เปลี่ยน ไม่ต้องมีโน้ตใหม่'); process.exit(0); }
let before = null;
try { before = JSON.parse(git('show', `${base}:releases/current.json`)); } catch { /* ฐานยังไม่มีไฟล์ = ถือว่าเปลี่ยน */ }
const now = JSON.parse(git('show', 'HEAD:releases/current.json'));
const key = r => JSON.stringify([r && r.version, r && r.notes]);
if (key(before) === key(now)) {
  console.error(`RELEASE-NOTES FAIL: มีไฟล์ที่ส่งถึงผู้ใช้เปลี่ยน ${shipped.length} ไฟล์ (เช่น ${shipped[0]}) แต่ releases/current.json ไม่เปลี่ยน — ทุกอัปเดตต้องมีโน้ตรุ่น`);
  process.exit(1);
}
console.log(`RELEASE-NOTES OK: รุ่น ${now.version} มีโน้ต ${now.notes.length} ข้อ`);
