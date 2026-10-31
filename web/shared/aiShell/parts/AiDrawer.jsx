/**
 * ลิ้นชักแชทของเปลือก AI: หัวลิ้นชัก ปุ่มแชทใหม่/ค้นหา รายการแชท และท้ายลิ้นชัก (อวตาร ชื่อ ตั้งค่า) | โครง DOM ตรงไฟล์เดิมทุกไบต์
 * ชื่อผู้ใช้: p.userName ถ้าไม่มีลอง D.profileOf (guard เดิม: ถ้าชั้น m ยังไม่ตั้ง profileOf จะได้สตริงว่าง)
 */
export function AiDrawer({ D, avatarBg, avatarText, userName }) {
  const ic = (n) => ({ dangerouslySetInnerHTML: { __html: D.icon(n) } });
  return h('aside', { key: 'dr', className: 'ev-drawer', id: 'drawer', 'data-open': 'false', 'aria-label': 'เมนูแชท' }, [
  h('div', { key: 'dh', className: 'ev-drawer-head' }, [
    h('div', { key: 'top', className: 'ev-drawer-top' }, [
      h('h2', { key: 'h2' }, 'Evarel AI'),
      h('button', { key: 'x', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'ai-hist', 'aria-label': 'ปิดเมนูแชท', ...ic('x') }),
    ]),
    h('button', { key: 'nw', className: 'ev-navrow', 'data-tone': 'primary', 'data-act': 'ai-new', dangerouslySetInnerHTML: { __html: D.icon('edit') + '<span>แชทใหม่</span>' } }),
    h('button', { key: 'sr', className: 'ev-navrow', 'data-act': 'ai-search', dangerouslySetInnerHTML: { __html: D.icon('search') + '<span>ค้นหาแชท</span>' } }),
    h('label', { key: 's', className: 'ev-search', id: 'dSearchWrap', hidden: true, dangerouslySetInnerHTML: { __html: D.icon('search') + '<input id="dSearch" type="search" placeholder="ค้นหาแชท" aria-label="ค้นหาแชท">' } }),
  ]),
  h('div', { key: 'dl', className: 'ev-drawer-list', id: 'drawerList' }),
  h('div', { key: 'df', className: 'ev-drawer-foot' }, [
    h('button', { key: 'av', className: 'ev-avatar', type: 'button', 'data-act': 'settings', 'aria-label': 'ตั้งค่า', style: { '--av': avatarBg, '--sz': '38px' } }, avatarText),
    h('span', { key: 'nm', className: 'ev-foot-name' }, userName || (D.profileOf ? (D.profileOf().name || '') : '')),
    h('button', { key: 'gr', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'settings', 'aria-label': 'ตั้งค่า', ...ic('gear') }),
  ]),
]);
}
