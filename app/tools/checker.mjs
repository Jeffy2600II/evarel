#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * checker.mjs - เครื่องตรวจกติการะดับกล่องและโรงงาน
 * บังคับกฎแกน 6 ข้อ (BOX-01 ถึง BOX-06)
 */

const MAX_FILE_LINES = 300;
const MAX_FILE_BYTES = 15 * 1024; // 15 KB

function toPascalCase(str) {
  return str
    .replace(/[-_]([a-z0-9])/gi, (_, g) => g.toUpperCase())
    .replace(/^[a-z]/, (g) => g.toUpperCase());
}

/**
 * ตรวจสอบกล่องหนึ่งกล่องตามกฎแกน 6 ข้อ
 * @param {string} boxDir - Path ของโฟลเดอร์กล่อง
 * @returns {object} ผลการตรวจ { boxName, passed: boolean, errors: string[], warnings: string[] }
 */
export function checkBox(boxDir) {
  const errors = [];
  const warnings = [];
  const absBoxDir = path.resolve(boxDir);
  
  if (!fs.existsSync(absBoxDir) || !fs.statSync(absBoxDir).isDirectory()) {
    return {
      boxName: path.basename(boxDir),
      passed: false,
      errors: [`[BOX-01] ไม่พบโฟลเดอร์กล่อง: ${boxDir}`],
      warnings: []
    };
  }

  let folderName = path.basename(absBoxDir);
  let boxName = folderName;
  let boxMdContent = null;
  let boxMdFile = null;

  // อ่าน BOX.md ก่อนเพื่อระบุชื่อกล่องที่แท้จริงหากตั้งชื่อโฟลเดอร์ต่างกัน
  const filesInDir = fs.readdirSync(absBoxDir);
  boxMdFile = filesInDir.find(f => f.toLowerCase() === 'box.md');
  if (boxMdFile) {
    try {
      boxMdContent = fs.readFileSync(path.join(absBoxDir, boxMdFile), 'utf8');
      const match = boxMdContent.match(/"name"\s*:\s*"([^"]+)"/);
      if (match && match[1]) {
        boxName = match[1];
      }
    } catch (e) {
      // ignore
    }
  }

  const pascalName = toPascalCase(boxName);

  // --- [BOX-03] Naming & Versioning ---
  if (/v\d+|\d+/i.test(folderName) || /v\d+|\d+/i.test(boxName)) {
    errors.push(`[BOX-03] ชื่อกล่อง '${folderName}' ห้ามมีเลขเวอร์ชันหรือตัวเลข`);
  }

  // --- [BOX-01] Box Structure (3 Layers) ---
  const pageFile = filesInDir.find(f => f.toLowerCase() === `${pascalName.toLowerCase()}page.jsx` || f.toLowerCase() === `${pascalName.toLowerCase()}page.js` || f.toLowerCase() === `${pascalName.toLowerCase()}page.tsx`);
  const partsDirExists = filesInDir.includes('parts') && fs.statSync(path.join(absBoxDir, 'parts')).isDirectory();
  const trayFile = filesInDir.find(f => f.endsWith('.tray.js') || f.endsWith('.tray.ts') || f.endsWith('.tray.jsx'));

  if (!pageFile) {
    errors.push(`[BOX-01] ขาดชั้นที่ 1: ไม่พบไฟล์โครงหน้าหลัก '${pascalName}Page.jsx' (หรือ .js/.tsx)`);
  } else if (pageFile !== `${pascalName}Page.jsx` && pageFile !== `${pascalName}Page.js` && pageFile !== `${pascalName}Page.tsx`) {
    errors.push(`[BOX-03] ชื่อไฟล์โครงหน้า '${pageFile}' ต้องตรงกับแบบ '${pascalName}Page.jsx'`);
  }

  if (!partsDirExists) {
    errors.push(`[BOX-01] ขาดชั้นที่ 2: ไม่พบโฟลเดอร์ชิ้นส่วนเฉพาะ 'parts/'`);
  }

  if (!trayFile) {
    errors.push(`[BOX-01] ขาดชั้นที่ 3: ไม่พบไฟล์ถาดข้อมูล '${boxName}.tray.js' (ลงท้ายด้วย .tray.js)`);
  } else if (trayFile !== `${boxName}.tray.js` && trayFile !== `${boxName}.tray.ts` && trayFile !== `${boxName}.tray.jsx`) {
    errors.push(`[BOX-03] ชื่อไฟล์ถาดข้อมูล '${trayFile}' ต้องตรงกับแบบ '${boxName}.tray.js'`);
  }

  // --- [BOX-02] Card & Acceptance Checklist ---
  if (!boxMdFile) {
    errors.push(`[BOX-02] ขาดบัตรประจำกล่อง: ไม่พบไฟล์ 'BOX.md'`);
  } else if (boxMdContent) {
    const hasMachineReadableCard = boxMdContent.includes('MACHINE-READABLE-CARD-START') || (boxMdContent.startsWith('---') && boxMdContent.includes('---'));
    if (!hasMachineReadableCard) {
      errors.push(`[BOX-02] บัตรประจำกล่อง 'BOX.md' ขาดส่วนข้อมูลที่เครื่องอ่านได้ (MACHINE-READABLE-CARD-START หรือ YAML frontmatter)`);
    }

    const hasAcceptanceChecklist = boxMdContent.includes('แผ่นตรวจรับ') || boxMdContent.includes('Acceptance Checklist');
    if (!hasAcceptanceChecklist) {
      errors.push(`[BOX-02] บัตรประจำกล่อง 'BOX.md' ขาดส่วนแผ่นตรวจรับประจำกล่อง (Acceptance Checklist)`);
    }
  }

  // Scan all code files inside box recursively
  function getAllCodeFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllCodeFiles(filePath));
      } else {
        if (/\.(jsx?|tsx?|css)$/i.test(file) && file.toLowerCase() !== 'box.md') {
          results.push(filePath);
        }
      }
    });
    return results;
  }

  const allCodeFiles = getAllCodeFiles(absBoxDir);

  allCodeFiles.forEach(filePath => {
    const relPath = path.relative(absBoxDir, filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    const bytes = fs.statSync(filePath).size;

    // --- [BOX-04] Size Limit / Overflow ("กล่องล้น") ---
    if (lines.length > MAX_FILE_LINES) {
      errors.push(`[BOX-04] ไฟล์ '${relPath}' กล่องล้น: มีจำนวน ${lines.length} บรรทัด (เกินเกณฑ์ ${MAX_FILE_LINES} บรรทัด)`);
    }
    if (bytes > MAX_FILE_BYTES) {
      errors.push(`[BOX-04] ไฟล์ '${relPath}' กล่องล้น: มีขนาด ${bytes} ไบต์ (เกินเกณฑ์ ${MAX_FILE_BYTES} ไบต์)`);
    }

    // --- [BOX-05] Data Isolation (No direct window access outside tray) ---
    if (!filePath.endsWith('.tray.js') && !filePath.endsWith('.tray.ts')) {
      const cleanContent = fileContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      if (/\bwindow\s*[\.\[]/i.test(cleanContent)) {
        errors.push(`[BOX-05] ไฟล์ '${relPath}' ฝ่าฝืนกฎแยกข้อมูล: มีการเข้าถึง 'window' โดยตรงนอกถาดข้อมูล`);
      }
    }

    // --- [BOX-06] No Cross-Box Direct Imports ---
    // ตัดสินจากพาธที่ resolve แล้ว: import แบบสัมพัทธ์ที่ไปตกในกล่องพี่น้อง (โฟลเดอร์อื่นใต้ parent เดียวกับกล่องนี้) ถือว่าข้ามกล่อง
    // รูปแบบที่จับ: import X from '..', import '..', export ... from '..', import('..'), require('..')
    if (/\.(jsx?|tsx?)$/i.test(filePath)) {
      const specs = new Set();
      const patterns = [
        /\b(?:import|export)\s+[^'";]*?\sfrom\s*['"]([^'"]+)['"]/g,
        /\bimport\s*['"]([^'"]+)['"]/g,
        /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
      ];
      patterns.forEach(re => { let m; while ((m = re.exec(fileContent)) !== null) specs.add(m[1]); });
      const pagesRoot = path.dirname(absBoxDir);
      specs.forEach(importPath => {
        let crosses = false;
        if (importPath.startsWith('.')) {
          const target = path.resolve(path.dirname(filePath), importPath);
          const inThisBox = target === absBoxDir || target.startsWith(absBoxDir + path.sep);
          const inPagesRoot = target.startsWith(pagesRoot + path.sep);
          crosses = inPagesRoot && !inThisBox;
        } else if (importPath.includes('app/pages/') || importPath.includes('/pages/')) {
          crosses = true;
        }
        if (crosses) {
          errors.push(`[BOX-06] ไฟล์ '${relPath}' ฝ่าฝืนกฎการนำเข้าข้ามกล่อง: import ตรงจาก '${importPath}'`);
        }
      });
    }
  });

  return {
    boxName,
    passed: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * ตรวจสอบทุกกล่องใน app/pages/
 */
export function checkAllBoxes(pagesDir = 'app/pages') {
  const absPagesDir = path.resolve(pagesDir);
  if (!fs.existsSync(absPagesDir)) {
    return { passed: true, results: [] };
  }

  const dirs = fs.readdirSync(absPagesDir).filter(f => {
    if (f.startsWith('.') || f.startsWith('_') || f === 'README.md') return false;
    const full = path.join(absPagesDir, f);
    return fs.statSync(full).isDirectory();
  });

  const results = dirs.map(d => checkBox(path.join(absPagesDir, d)));
  const allPassed = results.every(r => r.passed);

  return {
    passed: allPassed,
    results
  };
}

// CLI handler
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
ใช้งาน: node app/tools/checker.mjs [path-to-box | --all]

ตัวอย่าง:
  node app/tools/checker.mjs app/pages/stats
  node app/tools/checker.mjs --all
`);
    process.exit(0);
  }

  let target = args[0] || '--all';
  let overallPassed = true;

  if (target === '--all') {
    console.log('🔍 กำลังตรวจทุกกล่องใน app/pages/ ...');
    const { passed, results } = checkAllBoxes();
    overallPassed = passed;
    if (results.length === 0) {
      console.log('ℹ️ ยังไม่มีกล่องใน app/pages/ ให้ตรวจ');
    } else {
      results.forEach(res => {
        if (res.passed) {
          console.log(`✅ [PASS] ${res.boxName}`);
        } else {
          console.log(`❌ [FAIL] ${res.boxName}:`);
          res.errors.forEach(e => console.log(`   - ${e}`));
        }
      });
    }
  } else {
    console.log(`🔍 กำลังตรวจกล่องที่ ${target} ...`);
    const res = checkBox(target);
    overallPassed = res.passed;
    if (res.passed) {
      console.log(`✅ [PASS] กล่อง ${res.boxName} ผ่านกติกาครบทุกข้อ`);
    } else {
      console.log(`❌ [FAIL] กล่อง ${res.boxName} ไม่ผ่านกติกา (${res.errors.length} ข้อผิดพลาด):`);
      res.errors.forEach(e => console.log(`   - ${e}`));
    }
  }

  process.exit(overallPassed ? 0 : 1);
}
