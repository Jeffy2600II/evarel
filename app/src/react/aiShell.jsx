// เปลือกหน้าผู้ช่วย AI (page bar, composer, drawer, ชิปโควตา) เป็น React จริง (S4 ไบต์ 6)
// Fragment ระดับบนสุด (ไม่มี wrapper) เพราะ #page เป็น flex column และ .ev-page-scroll ใช้ flex:1 — ใส่ wrapper จะบั๊กเลย์เอาต์ทันที
// เทียบ template เดิม aiShellHTML ใน 17-views__ai ทุกไบต์: ลำดับ attribute ตาม template, text node '\n ' ระหว่างบล็อกคงเดิม, data-flat/hidden เป็นค่าว่าง
// พฤติกรรมผูก DOM (quotaPaint เขียนชิป, aiAutosize ปรับ textarea, aiRenderDrawer เขียนรายการ) ทำงานกับ DOM ของ React ได้เพราะอ้างด้วย id
const { h, Fragment } = window.EvarelReact;
const W = () => window;

function AiShellContent(p) {
  const w = W();
  const ic = (n) => ({ dangerouslySetInnerHTML: { __html: w.icon(n) } });
  return h(Fragment, null, [
    h('div', { key: 'bar', className: 'ev-page-bar' }, [
      h('button', { key: 'h', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'ai-hist', 'aria-label': 'เมนูแชท', ...ic('list') }),
      h('h2', { key: 't', id: 'aiTitle', className: 'grow', role: 'button', tabIndex: 0, 'data-act': 'ai-curopts', 'aria-haspopup': 'menu', 'aria-label': 'ตัวเลือกแชทนี้' }, 'AI'),
      h('button', { key: 'n', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'ai-new', 'aria-label': 'แชทใหม่', ...ic('edit') }),
      h('button', { key: 'x', className: 'ev-icon-btn', 'data-flat': '', 'data-act': 'close', 'aria-label': 'ปิด', ...ic('x') }),
    ]),
    '\n ',
    h('div', { key: 'scroll', className: 'ev-page-scroll', id: 'aiScroll' }, h('div', { id: 'aiBody' })),
    '\n ',
    h('button', { key: 'q', type: 'button', className: 'ev-qchip', id: 'aiQuota', 'data-act': 'ai-quota', 'data-state': 'ok', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', hidden: true }),
    '\n ',
    h('form', { key: 'c', className: 'ev-composer', id: 'aiForm' }, [
      h('textarea', { key: 'ta', id: 'aiText', rows: 1, placeholder: p.placeholder, 'aria-label': 'ข้อความถึง AI' }),
      h('div', { key: 'cbar', className: 'ev-composer-bar' }, [
        h('button', { key: 'plus', type: 'button', className: 'ev-plus', 'data-act': 'ai-plus', 'aria-haspopup': 'menu', 'aria-expanded': false, 'aria-label': 'ตัวช่วยพิมพ์', ...ic('plus') }),
        h('button', { key: 'send', className: 'ev-send', 'data-empty': 'true', 'aria-label': 'ส่ง', ...ic('send') }),
      ]),
    ]),
    '\n ',
    h('div', { key: 'dsc', className: 'ev-drawer-scrim', id: 'dScrim', 'data-open': 'false', 'data-act': 'ai-hist' }),
    '\n ',
    h('aside', { key: 'dr', className: 'ev-drawer', id: 'drawer', 'data-open': 'false', 'aria-label': 'ประวัติแชท' }, [
      h('div', { key: 'dh', className: 'ev-drawer-head' }, [
        h('h2', { key: 'h2' }, 'Evarel AI'),
        h('label', { key: 's', className: 'ev-search', dangerouslySetInnerHTML: { __html: w.icon('search') + '<input id="dSearch" type="search" placeholder="ค้นหาแชท" aria-label="ค้นหาแชท">' } }),
      ]),
      h('div', { key: 'dl', className: 'ev-drawer-list', id: 'drawerList' }),
      h('div', { key: 'df', className: 'ev-drawer-foot' }, [
        h('button', { key: 'av', className: 'ev-avatar', type: 'button', 'data-act': 'settings', 'aria-label': 'ตั้งค่า', style: { '--av': p.avatarBg } }, p.avatarText),
        h('button', { key: 'nw', className: 'ev-btn-ink', 'data-act': 'ai-new', dangerouslySetInnerHTML: { __html: w.icon('plus') + 'แชทใหม่' } }),
      ]),
    ]),
  ]);
}

window.EvarelPages = window.EvarelPages || {};
window.EvarelPages.aiShell = (props) => window.EvarelReact.renderToStaticMarkup(h(AiShellContent, props));
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelComponents.aiShell = AiShellContent;
