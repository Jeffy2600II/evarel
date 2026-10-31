/**
 * หน้าตั้งค่าของ Evarel (ชั้นที่ 1 ของกล่อง settings โซน shared เพราะ mount ผ่าน EvarelMount.mountAt)
 * ผลิต markup ให้โค้ดเดิมใส่ลง #page เอง: React ไม่ถือ DOM ของหน้านี้ จึงไม่ชนกับ page.innerHTML ของโมดูลอื่น
 * ข้อมูลทั้งหมดรับเป็น props เพื่อทดสอบได้ ไม่อ่านตัวแปร global เอง | ฟังก์ชันหน้าสตริงบิลด์สร้างให้ตามบัตร register (ไม่เรียก renderToStaticMarkup เอง)
 * h/Fragment บิลด์ฉีดให้ (scripts/build-react.mjs)
 */
import { SettingsBar, SettingsUser, SettingsAccount, html } from './parts/SettingsParts.jsx';
import { prepareSettings } from './settings.tray.js';

export default function SettingsPage(p) {
  const { user, notif, total, themeSegHTML, perfSegHTML, backIconHTML, avatarText, avatarBg, avatarName, showNotifyBtn, notifyBtnLabel } = p;
  return h(Fragment, null, [
    h(SettingsBar, { key: 'bar', backIconHTML }),
    h('div', { key: 'scroll', className: 'ev-page-scroll' }, [
      h(SettingsUser, { key: 'user', user, avatarText, avatarBg, avatarName, googleChipInner: p.googleChipInner }),
      h('section', { key: 'usage', className: 'ev-card', id: 'usageWrap', ...html(p.usageHTML) }),
      h('section', { key: 'theme', className: 'ev-card' }, h('b', null, 'ธีม'), h('div', { style: { marginTop: '12px' }, ...html(themeSegHTML) })),
      h('section', { key: 'perf', className: 'ev-card' }, h('b', null, 'อนิเมชั่น'), h('p', { className: 'ev-sub' }, 'อัตโนมัติจะลดเอฟเฟกต์เองเมื่อเครื่องไม่ลื่น'), h('div', { style: { marginTop: '12px' }, ...html(perfSegHTML) })),
      h('section', { key: 'notify', className: 'ev-card' },
        h('div', { className: 'ev-stat' }, h('div', null, h('b', null, 'การแจ้งเตือน'), h('p', { className: 'ev-sub' }, notif.note)), h('span', { className: 'ev-chip' }, notif.state)),
        showNotifyBtn ? h('button', { className: 'ev-btn-primary ev-btn-block', style: { marginTop: '12px' }, 'data-act': 'notify' }, notifyBtnLabel) : null,
        h('p', { className: 'ev-sub', style: { marginTop: '12px' } }, `ตั้งเวลาแจ้งเตือนไว้ ${total} รายการ (รายการใหม่เปิด "ตรงเวลา" ให้อัตโนมัติ และต้องมีเวลา) · เวลาที่ตั้งไว้บันทึกกับบัญชีของคุณและส่งถึงเครื่องนี้ตามเวลา`)),
      h('section', { key: 'ver', className: 'ev-card', id: 'appVerWrap', ...html(p.versionHTML) }),
      h(SettingsAccount, { key: 'acct' }),
    ]),
  ]);
}

/** บิลด์ห่อ prepare ให้เฉพาะเส้นทางสตริง window.EvarelPages.settings (ใช้โดย settingsHTML ที่มี try/catch ถอยไปเทมเพลต Classic)
 *  เส้นทาง mountAt (settingsOpen/settingsRepaint) สร้าง component ตรงๆ ไม่ผ่าน prepare จึงไม่ถูกตรวจรูปที่ถาด และจงใจไม่ตรวจในตัวหน้า
 *  เพราะเส้นทางนั้นไม่มี try หรือ error boundary: ข้อมูลผิดรูปจะโยนใน React render แล้วหน้าค้าง (แย่กว่าพฤติกรรมเดิม) */
export const prepare = prepareSettings;
