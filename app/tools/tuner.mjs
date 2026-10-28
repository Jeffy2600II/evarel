#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * tuner.mjs - เบ้าจูนสร้างกล่องโรงงาน 3 ชั้น
 * ใช้สร้างโฟลเดอร์กล่องใหม่ตามแบบแผน Frontend Factory
 */

function toPascalCase(str) {
  return str
    .replace(/[-_]([a-z])/g, (_, g) => g.toUpperCase())
    .replace(/^[a-z]/, (g) => g.toUpperCase());
}

function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

export function validateBoxName(name) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { valid: false, reason: 'ชื่อกล่องห้ามเป็นค่าว่าง' };
  }
  const cleanName = name.trim();
  
  // ห้ามมีเลขเวอร์ชัน เช่น v1, v2, _v1, -v2, 1, 2, 123
  if (/v\d+|\d+/i.test(cleanName)) {
    return { valid: false, reason: `ชื่อกล่อง '${cleanName}' ปฏิเสธการมีเลขเวอร์ชัน (เช่น v1, v2 หรือตัวเลข)` };
  }
  
  // รูปแบบชื่อต้องเป็นตัวอักษรภาษาอังกฤษ คั่นด้วย - หรือ _
  if (!/^[a-zA-Z][a-zA-Z-_]*$/.test(cleanName)) {
    return { valid: false, reason: `ชื่อกล่อง '${cleanName}' ต้องเป็นอักขระภาษาอังกฤษและเครื่องหมายคั่นเท่านั้น` };
  }
  
  return { valid: true, cleanName: toKebabCase(cleanName) };
}

export function createBox(boxNameInput, options = {}) {
  const checkResult = validateBoxName(boxNameInput);
  if (!checkResult.valid) {
    throw new Error(checkResult.reason);
  }
  
  const boxName = checkResult.cleanName;
  const pascalName = toPascalCase(boxName);
  
  let targetDir;
  if (options.targetDir) {
    targetDir = path.resolve(options.targetDir);
  } else if (options.quarantine) {
    targetDir = path.resolve(process.cwd(), 'app/pages/_quarantine', boxName);
  } else {
    targetDir = path.resolve(process.cwd(), 'app/pages', boxName);
  }
  
  if (fs.existsSync(targetDir)) {
    throw new Error(`กล่อง '${boxName}' มีอยู่แล้วที่ตำแหน่ง: ${targetDir}`);
  }
  /* ชื่อกล่องห้ามซ้ำข้ามโซน (ผลบิลด์ชื่อ <ชื่อ>.js เดียวกันจะเขียนทับกัน) | โซนกล่องคือ pages/ กับ shared/ */
  for (const zone of ['app/pages', 'app/shared']) {
    const other = path.resolve(process.cwd(), zone, boxName);
    if (other !== targetDir && fs.existsSync(path.join(other, 'BOX.md'))) throw new Error(`กล่อง '${boxName}' มีอยู่แล้วในโซน ${zone} (ชื่อห้ามซ้ำข้ามโซน)`);
  }
  
  const partsDir = path.join(targetDir, 'parts');
  fs.mkdirSync(partsDir, { recursive: true });
  
  // 1. ชั้นโครงหน้า (<Name>Page.jsx)
  const pageFile = path.join(targetDir, `${pascalName}Page.jsx`);
  const pageContent = `import React from 'react';
import { get${pascalName}Data } from './${boxName}.tray.js';
import { ${pascalName}Part } from './parts/${pascalName}Part.jsx';

/**
 * โครงหน้าหลักของกล่อง ${boxName} (ชั้นที่ 1)
 */
export function ${pascalName}Page() {
  const data = get${pascalName}Data();
  return (
    <div className="box-${boxName}">
      <h2>{data.title}</h2>
      <${pascalName}Part data={data} />
    </div>
  );
}

export default ${pascalName}Page;
`;

  // 2. ชั้นชิ้นส่วนย่อย (parts/<Name>Part.jsx)
  const partFile = path.join(partsDir, `${pascalName}Part.jsx`);
  const partContent = `import React from 'react';

/**
 * ชิ้นส่วนย่อยของกล่อง ${boxName} (ชั้นที่ 2)
 */
export function ${pascalName}Part({ data }) {
  return (
    <div className="${boxName}-part">
      <p>{data.description}</p>
    </div>
  );
}
`;

  // 3. ชั้นถาดข้อมูล (<name>.tray.js) & สีเฉพาะหน้า (<name>.style.css)
  const trayFile = path.join(targetDir, `${boxName}.tray.js`);
  const trayContent = `/**
 * ถาดข้อมูลของกล่อง ${boxName} (ชั้นที่ 3)
 * กำหนดรูปทรงและสถานะข้อมูล ห้ามดึงข้อมูลนอกถาด
 */
export function get${pascalName}Data() {
  return {
    title: '${pascalName} Page',
    description: 'ถาดข้อมูลสำหรับกล่อง ${boxName}',
    items: ['item1', 'item2']
  };
}
`;

  const styleFile = path.join(targetDir, `${boxName}.style.css`);
  const styleContent = `/* สีและสไตล์เฉพาะหน้าของกล่อง ${boxName} */
.box-${boxName} {
  padding: var(--sp-4, 16px);
  color: var(--c-ink-a, #333);
}
`;

  // บัตรประจำกล่อง และ แผ่นตรวจรับ (BOX.md)
  const boxMdFile = path.join(targetDir, 'BOX.md');
  const boxMdContent = `# บัตรประจำกล่อง: ${boxName}

## ส่วนสั้นสำหรับคนอ่าน
- **ชื่อกล่อง**: ${boxName}
- **ประเภท**: หน้า (Page Box)
- **โครงสร้าง**: สามชั้น (Page, parts/, tray)

<!-- MACHINE-READABLE-CARD-START -->
\`\`\`json
{
  "name": "${boxName}",
  "pascalName": "${pascalName}",
  "version": "1.0.0",
  "created_by": "tuner",
  "layers": {
    "page": "${pascalName}Page.jsx",
    "parts": ["parts/${pascalName}Part.jsx"],
    "tray": "${boxName}.tray.js",
    "style": "${boxName}.style.css"
  },
  "register": {
    "pages": [{ "name": "${boxName}" }]
  },
  "rules": {
    "max_file_lines": 300,
    "max_file_kb": 15,
    "allow_direct_window": false
  }
}
\`\`\`
<!-- MACHINE-READABLE-CARD-END -->

## แผ่นตรวจรับประจำกล่อง (Acceptance Checklist)
ติ๊ก [x] เฉพาะข้อที่พิสูจน์แล้วจริง พร้อมหลักฐานต่อท้ายข้อ (เบ้าจูนไม่ติ๊กให้ล่วงหน้า)
- [ ] ผ่านการตรวจกติกาจากเครื่องตรวจ (\`node app/tools/checker.mjs\`)
- [ ] บัตรประจำกล่องตรงไฟล์จริง (\`layers\` และ \`register\`)
- [ ] ลงทะเบียนในแอปแล้ว (บิลด์เติมรายการหน้าและแคช sw.js ให้เอง ตรวจด้วย \`node scripts/build-react.mjs --check\`)
- [ ] HTML ที่เรนเดอร์ตรงของเดิม และภาพตรงภาพอ้างอิง (ถ้าเป็นหน้าที่ย้ายมาจากของเดิม)

## สนามซ้อม (Sandbox)
สามารถใช้ข้อมูลจำลองจาก \`${boxName}.tray.js\` เพื่อทดสอบการแสดงผลโดยไม่ต้องเชื่อมต่อของจริง
`;

  fs.writeFileSync(pageFile, pageContent, 'utf8');
  fs.writeFileSync(partFile, partContent, 'utf8');
  fs.writeFileSync(trayFile, trayContent, 'utf8');
  fs.writeFileSync(styleFile, styleContent, 'utf8');
  fs.writeFileSync(boxMdFile, boxMdContent, 'utf8');

  return {
    boxName,
    targetDir,
    createdFiles: [
      path.relative(process.cwd(), pageFile),
      path.relative(process.cwd(), partFile),
      path.relative(process.cwd(), trayFile),
      path.relative(process.cwd(), styleFile),
      path.relative(process.cwd(), boxMdFile)
    ]
  };
}

// CLI handler
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
ใช้งาน: node app/tools/tuner.mjs <ชื่อกล่อง> [--quarantine] [--target <path>]

ตัวอย่าง:
  node app/tools/tuner.mjs user-profile
  node app/tools/tuner.mjs report-viewer --quarantine
`);
    process.exit(0);
  }

  let boxName = null;
  let quarantine = false;
  let targetDir = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--quarantine') {
      quarantine = true;
    } else if (args[i] === '--target' && args[i + 1]) {
      targetDir = args[++i];
    } else if (!args[i].startsWith('-')) {
      boxName = args[i];
    }
  }

  try {
    const result = createBox(boxName, { quarantine, targetDir });
    console.log(`✅ สร้างกล่อง '${result.boxName}' สำเร็จที่ ${result.targetDir}`);
    console.log('ไฟล์ที่สร้าง:');
    result.createdFiles.forEach(f => console.log(`  - ${f}`));
  } catch (err) {
    console.error(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    process.exit(1);
  }
}
