#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { checkBox } from './checker.mjs';

/**
 * xray.mjs - X-ray รายหน้า (Single-page Scanner)
 * สั่งตรวจวิเคราะห์เฉพาะหน้าเดียวอย่างละเอียดทันที โดยไม่ต้องสแกนทั้งโรงงาน
 */

export function xrayBox(targetBox) {
  let boxDir;
  if (fs.existsSync(targetBox) && fs.statSync(targetBox).isDirectory()) {
    boxDir = path.resolve(targetBox);
  } else if (fs.existsSync(path.join('app/pages', targetBox))) {
    boxDir = path.resolve('app/pages', targetBox);
  } else {
    throw new Error(`ไม่พบโฟลเดอร์กล่อง: '${targetBox}' (ค้นหาที่ '${targetBox}' หรือ 'app/pages/${targetBox}')`);
  }

  const checkResult = checkBox(boxDir);

  const filesInfo = [];
  function scanDir(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scanDir(full);
      } else {
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split('\n').length;
        const windowMatches = (content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').match(/\bwindow\s*[\.\[]/gi) || []).length;
        filesInfo.push({
          relPath: path.relative(boxDir, full),
          sizeBytes: stat.size,
          lines,
          windowCount: windowMatches
        });
      }
    });
  }

  scanDir(boxDir);

  return {
    boxName: checkResult.boxName,
    boxDir,
    passed: checkResult.passed,
    errors: checkResult.errors,
    warnings: checkResult.warnings,
    fileCount: filesInfo.length,
    files: filesInfo
  };
}

// CLI handler
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const target = args[0];

  if (!target || args.includes('--help') || args.includes('-h')) {
    console.log(`
ใช้งาน: node app/tools/xray.mjs <ชื่อกล่องหรือ path ของกล่อง>

ตัวอย่าง:
  node app/tools/xray.mjs stats
  node app/tools/xray.mjs app/pages/all
`);
    process.exit(0);
  }

  try {
    const report = xrayBox(target);
    console.log(`🔬 ผลการตรวจ X-ray รายหน้าสำหรับ: '${report.boxName}'`);
    console.log(`- ตำแหน่ง: ${report.boxDir}`);
    console.log(`- สถานะกติกา: ${report.passed ? '✅ ผ่านครบทุกข้อ' : '❌ ไม่ผ่านกติกา'}`);
    
    if (!report.passed) {
      console.log(`- รายการที่ไม่ผ่าน (${report.errors.length} ข้อ):`);
      report.errors.forEach(e => console.log(`   - ${e}`));
    }

    console.log(`- รายการไฟล์ในกล่อง (${report.fileCount} ไฟล์):`);
    report.files.forEach(f => {
      const winNotice = f.windowCount > 0 ? ` ⚠️ พบ window ${f.windowCount} จุด` : '';
      console.log(`   - 📄 ${f.relPath} (${f.lines} บรรทัด, ${f.sizeBytes} ไบต์)${winNotice}`);
    });
  } catch (err) {
    console.error(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    process.exit(1);
  }
}
