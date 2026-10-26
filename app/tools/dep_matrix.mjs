#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * dep_matrix.mjs - ทะเบียนใครใช้ใคร (Dependency Impact Registry)
 * ตอบคำถามว่า "ก่อนแก้ชิ้นไหน รู้ว่ากระเทือนหน้าไหนบ้าง"
 */

function getAllFiles(dir, exts = ['.js', '.jsx', '.ts', '.tsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        results = results.concat(getAllFiles(filePath, exts));
      }
    } else {
      if (exts.some(ext => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  });
  return results;
}

export function buildDependencyMatrix(rootDir = '.') {
  const absRoot = path.resolve(rootDir);
  const scanDirs = ['app/pages', 'app/shared', 'app/data', 'app/src/react', 'app/src/m'];
  
  const fileToDependents = new Map();

  function addDep(targetKey, sourceFileRel) {
    if (!targetKey) return;
    const key = targetKey.toLowerCase();
    if (!fileToDependents.has(key)) {
      fileToDependents.set(key, new Set());
    }
    fileToDependents.get(key).add(sourceFileRel);
  }

  const allFiles = [];
  scanDirs.forEach(d => {
    const full = path.join(absRoot, d);
    if (fs.existsSync(full)) {
      allFiles.push(...getAllFiles(full));
    }
  });

  allFiles.forEach(sourceFile => {
    const relSource = path.relative(absRoot, sourceFile);
    const content = fs.readFileSync(sourceFile, 'utf8');

    // 1. ES Import / Require
    const importRegex = /(?:import|from|require)\s*\(?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const spec = match[1];
      const base = path.basename(spec);
      const nameNoExt = base.replace(/\.(jsx?|tsx?|css)$/i, '');

      addDep(spec, relSource);
      addDep(base, relSource);
      addDep(nameNoExt, relSource);
    }

    // 2. Legacy window symbol references e.g. EvarelPages.today, VIEWS['today'], etc.
    const symbolMatches = content.match(/\b(?:EvarelPages|EvarelComponents|VIEWS)\.([a-zA-Z0-9_]+)\b|\bVIEWS\s*\[\s*['"]([^'"]+)['"]\s*\]/g);
    if (symbolMatches) {
      symbolMatches.forEach(sm => {
        const prop = sm.replace(/.*[\.\[\s'"]/, '').replace(/['"\]]/g, '');
        if (prop) {
          addDep(prop, relSource);
          addDep(`${prop}.jsx`, relSource);
        }
      });
    }

    // 3. Simple file basename match if mentioned in file
    const fileBase = path.basename(relSource);
    addDep(fileBase, relSource);
  });

  return {
    allFiles: allFiles.map(f => path.relative(absRoot, f)),
    fileToDependents
  };
}

export function queryImpact(target, rootDir = '.') {
  const { fileToDependents } = buildDependencyMatrix(rootDir);

  const cleanTarget = path.basename(target);
  const targetNoExt = cleanTarget.replace(/\.(jsx?|tsx?|css)$/i, '');

  const dependents = new Set([
    ...(fileToDependents.get(target.toLowerCase()) || []),
    ...(fileToDependents.get(cleanTarget.toLowerCase()) || []),
    ...(fileToDependents.get(targetNoExt.toLowerCase()) || [])
  ]);

  const impactedPages = new Set();
  const impactedOther = new Set();

  Array.from(dependents).forEach(dep => {
    if (dep.startsWith('app/pages/')) {
      const parts = dep.split('/');
      impactedPages.add(parts[2] || dep);
    } else {
      impactedOther.add(dep);
    }
  });

  return {
    target,
    cleanTarget,
    totalDependents: dependents.size,
    impactedPages: Array.from(impactedPages).sort(),
    allDependents: Array.from(dependents).sort()
  };
}

// CLI handler
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const target = args[0];

  if (!target) {
    console.log(`
ใช้งาน: node app/tools/dep_matrix.mjs <ไฟล์หรือโมดูลที่ต้องการสอบถาม>

ตัวอย่าง:
  node app/tools/dep_matrix.mjs item-row.jsx
  node app/tools/dep_matrix.mjs today
`);
    process.exit(0);
  }

  const result = queryImpact(target);
  console.log(`📊 ผลการวิเคราะห์ผลกระทบสำหรับ: '${result.target}'`);
  console.log(`- จำนวนไฟล์ที่เกี่ยวข้องทั้งหมด: ${result.totalDependents} ไฟล์`);
  console.log(`- หน้าใน app/pages/ ที่ได้รับผลกระทบ (${result.impactedPages.length} หน้า):`);
  if (result.impactedPages.length === 0) {
    console.log(`  *(ไม่พบหน้าใน app/pages ที่เรียกใช้โดยตรง)*`);
  } else {
    result.impactedPages.forEach(p => console.log(`  - 📄 ${p}`));
  }
  console.log(`- รายชื่อผู้เกี่ยวข้องทั้งหมด:`);
  if (result.allDependents.length === 0) {
    console.log(`  *(ไม่มีไฟล์ใดเรียกใช้)*`);
  } else {
    result.allDependents.forEach(d => console.log(`  - ${d}`));
  }
}
