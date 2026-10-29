// พิสูจน์ F3.2: ถาดมาตรฐานจับข้อมูลผิดรูปและชี้ชื่อกล่อง/ฟิลด์ได้ถูก ข้อมูลถูกรูปคืนค่าเดิมเป๊ะ
import { tray, T, TrayError } from '../app/shared/tray.js';
let ok = 0; const bad = [];
const t = (n, c) => (c ? ok++ : bad.push(n));
const throwsAt = (fn, box, path) => { try { fn(); return false; } catch (e) { return e instanceof TrayError && e.box === box && e.path === path; } };

const stats = tray('stats', {
  period: T.oneOf(['week', 'month']),
  today: T.string,
  items: T.arrayOf(T.shape({ id: T.string, type: T.oneOf(['habit', 'task']), log: T.any, note: T.optional(T.string) })),
  onPick: T.func,
});
const good = { period: 'week', today: '2026-10-26', items: [{ id: 'a', type: 'habit', log: {} }], onPick: () => {} };

// ข้อมูลถูกรูป: คืนอ็อบเจ็กต์เดิมเป๊ะ (เหมือนกันทุกไบต์ ไม่คัดลอก)
t('ถูกรูป คืนตัวเดิม', stats.take(good) === good);
t('optional ว่างผ่าน', stats.take({ ...good, items: [{ id: 'a', type: 'task', log: 1, note: undefined }] }) !== undefined);
t('optional มีค่าผ่าน', stats.take({ ...good, items: [{ id: 'a', type: 'task', log: 1, note: 'x' }] }) !== undefined);

// ฉีดข้อมูลผิดรูปทีละชนิด: ต้องชี้ถูกกล่อง+ฟิลด์
t('ชนิดผิด string', throwsAt(() => stats.take({ ...good, today: 20261026 }), 'stats', '$.today'));
t('ค่านอก oneOf', throwsAt(() => stats.take({ ...good, period: 'year' }), 'stats', '$.period'));
t('ฟิลด์หาย', throwsAt(() => stats.take({ period: 'week', items: [], onPick: () => {} }), 'stats', '$.today'));
t('func ผิดชนิด', throwsAt(() => stats.take({ ...good, onPick: 'x' }), 'stats', '$.onPick'));
t('array ผิดชนิด', throwsAt(() => stats.take({ ...good, items: {} }), 'stats', '$.items'));
t('ลึกในลิสต์ ชี้ index', throwsAt(() => stats.take({ ...good, items: [good.items[0], { id: 5, type: 'habit', log: 1 }] }), 'stats', '$.items[1].id'));
t('ลึกใน oneOf ของลิสต์', throwsAt(() => stats.take({ ...good, items: [{ id: 'a', type: 'zzz', log: 1 }] }), 'stats', '$.items[0].type'));
t('ทั้งก้อนเป็น null', throwsAt(() => stats.take(null), 'stats', '$'));
t('ทั้งก้อนเป็น array', throwsAt(() => stats.take([]), 'stats', '$'));
t('optional ผิดชนิดเมื่อมีค่า', throwsAt(() => stats.take({ ...good, items: [{ id: 'a', type: 'task', log: 1, note: 9 }] }), 'stats', '$.items[0].note'));

// ชื่อกล่องแยกกัน: ถาดสองใบไม่ปนกัน
const all = tray('all', { q: T.string });
t('ชื่อกล่องในข้อความ', (() => { try { all.take({ q: 1 }); } catch (e) { return e.message.includes('tray(all):') && !e.message.includes('stats'); } })());
t('ถาดสองใบอิสระ', all.take({ q: 'x' }).q === 'x' && stats.take(good) === good);
// ต้องระบุชื่อกล่อง
t('ไม่ใส่ชื่อกล่องโยน', (() => { try { tray('', {}); return false; } catch { return true; } })());
// ไม่แตะ window ตอน import
t('ไม่อ้าง window', !/\bwindow\b/.test(await (await import('node:fs/promises')).readFile(new URL('../app/shared/tray.js', import.meta.url), 'utf8').then(s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))));
console.log(`ผ่าน ${ok} ตก ${bad.length}`, bad.length ? bad : '');
process.exit(bad.length ? 1 : 0);
