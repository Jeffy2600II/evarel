#!/usr/bin/env node
/* Path: scripts/sort-tests.mjs | Purpose: จำแนกไฟล์ใน tests/ เป็นกลุ่มตาม dependency จริง (CI/helper/standalone)
   ใช้ครั้งเดียวตอนจัดระเบียบโครงสร้าง (2026-11-05) — พิมพ์รายชื่อต่อกลุ่มเพื่อใช้ git mv ต่อ */
import fs from 'node:fs';
const files = fs.readdirSync('tests').filter(f => f.endsWith('.mjs'));
const CI = new Set([
  'no-email-guessing.test.mjs','aiproposal_equiv.test.mjs','calendar_equiv.test.mjs','core_equiv.test.mjs',
  'settingsviews_equiv.test.mjs','stats_html_equiv.test.mjs','today_equiv.test.mjs','build_integrity.test.mjs',
  'domains.test.mjs','m_core_import.test.mjs','avatar_equiv.test.mjs','undo_equiv.test.mjs','push_equiv.test.mjs',
  'popover_equiv.test.mjs','form_equiv.test.mjs','timer_equiv.test.mjs','quota_equiv.test.mjs','calstats_equiv.test.mjs',
]);
const imported = new Map(); const importsSibling = new Set();
for (const f of files) {
  const s = fs.readFileSync('tests/' + f, 'utf8');
  const specs = [...s.matchAll(/from\s+['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g)].map(m => m[1] || m[2]);
  for (const sp of specs) {
    importsSibling.add(f);
    const b = sp.split('/').pop();
    if (!imported.has(b)) imported.set(b, new Set());
    imported.get(b).add(f);
  }
}
const isImported = f => imported.has(f) && imported.get(f).size > 0;
const keep = [], equiv = [], history = [], manual = [];
for (const f of files) {
  const standalone = !CI.has(f) && !isImported(f) && !importsSibling.has(f);
  if (CI.has(f) || isImported(f) || importsSibling.has(f)) { keep.push(f); continue; }
  if (/^(v7|v11|v12|v13|_legacy_inject|_live13|_v13)/.test(f)) history.push(f);
  else if (/_equiv\.test\.mjs$/.test(f)) equiv.push(f);
  else manual.push(f);
}
for (const [name, list] of [['KEEP-ROOT', keep], ['EQUIV', equiv], ['HISTORY', history], ['MANUAL', manual]]) {
  console.log(`\n=== ${name} (${list.length}) ===`);
  console.log(list.join('\n'));
}
