/**
 * ชิ้นส่วนของหน้าตั้งค่า: แถบหัว การ์ดผู้ใช้ และการ์ดบัญชี | ลำดับ attribute และโครง DOM ตรงกับไฟล์เดิมทุกไบต์
 * html(s) ฝังสตริง HTML จากชั้น m ตรงๆ (dangerouslySetInnerHTML) เพื่อผลตรงเดิม
 */
export const html = (s) => ({ dangerouslySetInnerHTML: { __html: s } });

export function SettingsBar({ backIconHTML }) {
  return h('div', { className: 'ev-page-bar' },
    h('button', { className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'close', 'aria-label': 'กลับ', ...html(backIconHTML) }),
    h('h2', null, 'ตั้งค่า'));
}

export function SettingsUser({ user, avatarText, avatarBg, avatarName, googleChipInner }) {
  return h('section', { className: 'ev-card ev-row', style: { gap: '14px' } },
    h('span', { className: 'ev-avatar', role: 'img', 'aria-label': avatarName, style: { '--av': avatarBg, '--sz': '56px' } }, avatarText),
    h('div', { className: 'grow' }, h('b', null, user.name), h('p', { className: 'ev-sub', style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, user.email)),
    user.provider === 'google' ? h('span', { className: 'ev-chip ev-chip-g', ...html(googleChipInner) }) : h('span', { className: 'ev-chip' }, 'อีเมล'));
}

export function SettingsAccount() {
  return h('section', { className: 'ev-card' }, h('b', null, 'บัญชี'),
    h('div', { className: 'ev-form', style: { marginTop: '12px' } },
      h('button', { className: 'ev-btn-ghost ev-btn-block', 'data-act': 'au-signout-ask' }, 'ออกจากระบบ'),
      h('button', { className: 'ev-btn-danger ev-btn-block', 'data-act': 'au-delete-ask' }, 'ลบบัญชี')));
}
