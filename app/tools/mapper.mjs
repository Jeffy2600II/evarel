#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * mapper.mjs - ตัววาดแผนที่โรงงาน Frontend
 * สแกนโครงสร้างจริงของ app/ (pages, shared, styles, data, tools)
 * และวาดแผนที่ Markdown ที่มีลิงก์ไปยังไฟล์จริงอย่าง Deterministic (ไบต์ต่อไบต์ตรงกันเสมอ)
 */

function getDirTree(dirPath, relativeRoot = '') {
  const absPath = path.resolve(dirPath);
  if (!fs.existsSync(absPath)) return [];

  const items = fs.readdirSync(absPath).sort(); // Sort for determinism
  const tree = [];

  for (const item of items) {
    if (item.startsWith('.') || item === 'node_modules') continue;

    const fullPath = path.join(absPath, item);
    const relPath = path.join(relativeRoot, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      tree.push({
        name: item,
        type: 'dir',
        path: relPath,
        children: getDirTree(fullPath, relPath)
      });
    } else {
      tree.push({
        name: item,
        type: 'file',
        path: relPath,
        size: stat.size
      });
    }
  }

  return tree;
}

export function generateFactoryMap(rootDir = '.') {
  const absRootDir = path.resolve(rootDir);
  const zones = ['app/pages', 'app/shared', 'app/styles', 'app/data', 'app/tools'];

  let md = `# แผนที่โรงงาน Frontend Evarel (Factory Map)\n\n`;
  md += `> สร้างอัตโนมัติด้วย \`node app/tools/mapper.mjs\` เมื่อโค้ดเปลี่ยน ห้ามแก้มือ\n\n`;
  md += `## โครงสร้างภาพรวม 5 โซน\n\n`;

  for (const zone of zones) {
    const absZoneDir = path.join(absRootDir, zone);
    md += `### โซน: [\`${zone}\`](${zone})\n\n`;

    if (!fs.existsSync(absZoneDir)) {
      md += `*(ยังไม่มีโฟลเดอร์นี้)*\n\n`;
      continue;
    }

    const items = fs.readdirSync(absZoneDir).sort();
    if (items.length === 0) {
      md += `*(โฟลเดอร์ว่าง)*\n\n`;
      continue;
    }

    if (zone === 'app/pages') {
      const boxes = items.filter(i => {
        const full = path.join(absZoneDir, i);
        return !i.startsWith('.') && !i.startsWith('_') && i !== 'README.md' && fs.statSync(full).isDirectory();
      });

      if (boxes.length === 0) {
        md += `*(ยังไม่มีกล่องหน้าใน pages/)*\n\n`;
      } else {
        md += `| ชื่อกล่อง | โครงหน้า (Layer 1) | ชิ้นส่วนย่อย (Layer 2) | ถาดข้อมูล/สไตล์ (Layer 3) | บัตรประจำกล่อง |\n`;
        md += `|---|---|---|---|---|\n`;

        for (const box of boxes) {
          const boxDir = path.join(absZoneDir, box);
          const boxFiles = fs.readdirSync(boxDir).sort();
          
          const pageFile = boxFiles.find(f => f.toLowerCase().endsWith('page.jsx') || f.toLowerCase().endsWith('page.js'));
          const partsExist = boxFiles.includes('parts');
          const trayFile = boxFiles.find(f => f.endsWith('.tray.js'));
          const styleFile = boxFiles.find(f => f.endsWith('.style.css'));
          const boxMd = boxFiles.find(f => f.toLowerCase() === 'box.md');

          const pageLink = pageFile ? `[\`${pageFile}\`](${zone}/${box}/${pageFile})` : '❌ ขาด';
          const partsLink = partsExist ? `[\`parts/\`](${zone}/${box}/parts)` : '❌ ขาด';
          const trayLink = trayFile ? `[\`${trayFile}\`](${zone}/${box}/${trayFile})` : '❌ ขาด';
          const styleLink = styleFile ? ` [\`${styleFile}\`](${zone}/${box}/${styleFile})` : '';
          const cardLink = boxMd ? `[\`BOX.md\`](${zone}/${box}/${boxMd})` : '❌ ขาด';

          md += `| [\`${box}\`](${zone}/${box}) | ${pageLink} | ${partsLink} | ${trayLink}${styleLink} | ${cardLink} |\n`;
        }
        md += `\n`;
      }
    } else {
      md += `รายการไฟล์ในโซน:\n`;
      for (const item of items) {
        if (item.startsWith('.')) continue;
        const itemPath = `${zone}/${item}`;
        const isDir = fs.statSync(path.join(absZoneDir, item)).isDirectory();
        if (isDir) {
          md += `- 📁 [\`${item}/\`](${itemPath})\n`;
        } else {
          md += `- 📄 [\`${item}\`](${itemPath})\n`;
        }
      }
      md += `\n`;
    }
  }

  return md;
}

// CLI handler
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const outputPath = args[0] || 'docs/FACTORY-MAP.md';

  try {
    const mapContent = generateFactoryMap('.');
    const absOut = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(absOut), { recursive: true });
    fs.writeFileSync(absOut, mapContent, 'utf8');
    console.log(`✅ วาดแผนที่สำเร็จที่: ${outputPath}`);
  } catch (err) {
    console.error(`❌ เกิดข้อผิดพลาดในการวาดแผนที่: ${err.message}`);
    process.exit(1);
  }
}
