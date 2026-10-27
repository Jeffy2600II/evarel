// แถบนำทางล่างของ Evarel เป็น React (S4 s4f-shell-layers-auth): ปุ่มแท็บ 4 อัน + ปุ่ม + ตรงกลาง
// mount ที่ #nav โดยตรงผ่าน EvarelMount.mountAt (แพทเทิร์นเดียวกับ #aiBody) เทียบ template เดิมใน 23-render ทุกไบต์
// ไอคอนเป็น SVG string ของระบบเดิม — ฝังผ่าน dangerouslySetInnerHTML (แพทเทิร์น item-row) กันเขียน SVG ใหม่ไม่ตรงไบต์
import { takeNavConsts } from '../../data/nav.tray.js';
const { h, Fragment } = window.EvarelReact;
const W = () => window;
const raw = (html) => ({ __html: html });

function NavTabs(p) {
  const w = W();
  /* โครงเดิม: TABS.map -> li/button(data-tab + aria-current ถ้าแท็บปัจจุบัน, pill icon + label) แล้วแทรกปุ่ม + กลางลำดับ 2 */
  const items = [];
  takeNavConsts().TABS.forEach(([id, l, ic], k) => {
    if (k === 2) items.push(h('li', { key: 'add' }, h('button', { className: 'add', 'data-act': 'add', 'aria-label': 'เพิ่มรายการ', dangerouslySetInnerHTML: raw(w.icon('plus')) })));
    items.push(h('li', { key: id }, h('button', { 'data-tab': id, ...(p.tab === id ? { 'aria-current': 'page' } : null) }, [
      h('span', { key: 'pill', className: 'pill', dangerouslySetInnerHTML: raw(w.icon(ic)) }),
      l,
    ])));
  });
  return h(Fragment, null, items);
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.nav = (p) => window.EvarelReact.renderToStaticMarkup(h(NavTabs, p));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.nav = NavTabs;
