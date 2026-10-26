#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * rollback.mjs - แก้ย้อนรายกล่อง (Box Rollback Helper)
 * พังตรงไหนย้อนกล่องนั้นกล่องเดียว โดยไม่กระทบกล่องอื่น
 */

export function rollbackBox(targetBox, options = {}) {
  let boxDir;
  if (fs.existsSync(targetBox) && fs.statSync(targetBox).isDirectory()) {
    boxDir = path.resolve(targetBox);
  } else if (fs.existsSync(path.join('app/pages', targetBox))) {
    boxDir = path.resolve('app/pages', targetBox);
  } else {
    throw new Error(`ไม่พบโฟลเดอร์กล่อง: '${targetBox}' (ค้นหาที่ '${targetBox}' หรือ 'app/pages/${targetBox}')`);
  }

  const relBoxDir = path.relative(process.cwd(), boxDir);
  const boxName = path.basename(boxDir);

  // Check git status for files in this box directory
  let statusOutput = '';
  try {
    statusOutput = execSync(`git status --porcelain "${relBoxDir}"`, { encoding: 'utf8' }).trim();
  } catch (e) {
    throw new Error(`ไม่สามารถอ่าน git status ได้: ${e.message}`);
  }

  if (!statusOutput) {
    return {
      boxName,
      relBoxDir,
      actionTaken: 'none',
      message: `กล่อง '${boxName}' ไม่มีเปลี่ยนแปลงที่ยังไม่ได้ commit`
    };
  }

  // Restore modified files in box directory
  try {
    execSync(`git checkout HEAD -- "${relBoxDir}"`, { stdio: 'pipe' });
    execSync(`git clean -fd "${relBoxDir}"`, { stdio: 'pipe' });
  } catch (e) {
    throw new Error(`การสั่งย้อนกล่อง '${boxName}' ล้มเหลว: ${e.message}`);
  }

  return {
    boxName,
    relBoxDir,
    actionTaken: 'restored',
    message: `แก้ย้อนกล่อง '${boxName}' สำเร็จ (คืนค่าไฟล์ทั้งหมดใน ${relBoxDir})`
  };
}

// CLI handler
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const target = args[0];

  if (!target || args.includes('--help') || args.includes('-h')) {
    console.log(`
ใช้งาน: node app/tools/rollback.mjs <ชื่อกล่องหรือ path ของกล่อง>

ตัวอย่าง:
  node app/tools/rollback.mjs stats
  node app/tools/rollback.mjs app/pages/user-profile
`);
    process.exit(0);
  }

  try {
    const res = rollbackBox(target);
    console.log(`↺ [ROLLBACK] ${res.message}`);
  } catch (err) {
    console.error(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    process.exit(1);
  }
}
