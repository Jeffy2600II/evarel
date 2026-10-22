// หน้าตั้งค่าของ Evarel เขียนเป็น React (ชั้น 4 หน่วยแรก)
// ผลิต markup ให้โค้ดเดิมใส่ลง #page เอง: React ไม่ถือ DOM ของหน้านี้ จึงไม่ชนกับ page.innerHTML ของโมดูลอื่น
// ข้อมูลทั้งหมดรับเป็น props เพื่อทดสอบได้ ไม่อ่านตัวแปร global เอง
const { h, Fragment, renderToStaticMarkup } = window.EvarelReact;

const html = (s) => ({ dangerouslySetInnerHTML: { __html: s } });

function SettingsPage(p) {
  const { user, notif, total, themeSegHTML, perfSegHTML, backIconHTML, avatarText, avatarBg, avatarName, showNotifyBtn, notifyBtnLabel } = p;
  return h(Fragment, null, [
    h('div', { key: 'bar', className: 'ev-page-bar' },
      h('button', { className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'close', 'aria-label': 'กลับ', ...html(backIconHTML) }),
      h('h2', null, 'ตั้งค่า')),
    h('div', { key: 'scroll', className: 'ev-page-scroll' }, [
      h('section', { key: 'user', className: 'ev-card ev-row', style: { gap: '14px' } },
        h('span', { className: 'ev-avatar', role: 'img', 'aria-label': avatarName, style: { '--av': avatarBg, '--sz': '56px' } }, avatarText),
        h('div', { className: 'grow' }, h('b', null, user.name), h('p', { className: 'ev-sub', style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, user.email)),
        user.provider === 'google' ? h('span', { className: 'ev-chip ev-chip-g', ...html(p.googleChipInner) }) : h('span', { className: 'ev-chip' }, 'อีเมล')),
      h('section', { key: 'usage', className: 'ev-card', id: 'usageWrap', ...html(p.usageHTML) }),
      h('section', { key: 'theme', className: 'ev-card' }, h('b', null, 'ธีม'), h('div', { style: { marginTop: '12px' }, ...html(themeSegHTML) })),
      h('section', { key: 'perf', className: 'ev-card' }, h('b', null, 'อนิเมชั่น'), h('p', { className: 'ev-sub' }, 'อัตโนมัติจะลดเอฟเฟกต์เองเมื่อเครื่องไม่ลื่น'), h('div', { style: { marginTop: '12px' }, ...html(perfSegHTML) })),
      h('section', { key: 'notify', className: 'ev-card' },
        h('div', { className: 'ev-stat' }, h('div', null, h('b', null, 'การแจ้งเตือน'), h('p', { className: 'ev-sub' }, notif.note)), h('span', { className: 'ev-chip' }, notif.state)),
        showNotifyBtn ? h('button', { className: 'ev-btn-primary ev-btn-block', style: { marginTop: '12px' }, 'data-act': 'notify' }, notifyBtnLabel) : null,
        h('p', { className: 'ev-sub', style: { marginTop: '12px' } }, `ตั้งเวลาแจ้งเตือนไว้ ${total} รายการ (รายการใหม่เปิด "ตรงเวลา" ให้อัตโนมัติ และต้องมีเวลา) · เวลาที่ตั้งไว้บันทึกกับบัญชีของคุณและส่งถึงเครื่องนี้ตามเวลา`)),
      h('section', { key: 'ver', className: 'ev-card', id: 'appVerWrap', ...html(p.versionHTML) }),
      h('section', { key: 'acct', className: 'ev-card' }, h('b', null, 'บัญชี'),
        h('div', { className: 'ev-form', style: { marginTop: '12px' } },
          h('button', { className: 'ev-btn-ghost ev-btn-block', 'data-act': 'au-signout-ask' }, 'ออกจากระบบ'),
          h('button', { className: 'ev-btn-danger ev-btn-block', 'data-act': 'au-delete-ask' }, 'ลบบัญชี'))),
    ]),
  ]);
}

// จุดเข้าเดียวที่โค้ดเดิมเรียก: ส่ง props เข้ามา ได้ string HTML ของเนื้อหาในหน้า
window.EvarelPages.settings = (props) => renderToStaticMarkup(h(SettingsPage, props));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.settings = SettingsPage;
