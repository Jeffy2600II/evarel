/**
 * ช่องพิมพ์ของเปลือก AI (dock): ชิปโควตา textarea ปุ่มตัวช่วยพิมพ์ และปุ่มส่ง | โครง DOM ตรงไฟล์เดิมทุกไบต์
 * aria-expanded ของปุ่ม plus เป็น boolean false (ต่างจากปุ่ม more ที่เป็นสตริง) คงตามต้นฉบับ ไม่ทำให้สม่ำเสมอ
 * พฤติกรรมผูก DOM (quotaPaint เขียนชิป, aiAutosize ปรับ textarea) อ้างด้วย id จึงทำงานกับ DOM ของ React ได้
 */
export function AiDock({ D, placeholder }) {
  const ic = (n) => ({ dangerouslySetInnerHTML: { __html: D.icon(n) } });
  return h('div', { key: 'dock', className: 'ev-aidock' },
h('form', { key: 'c', className: 'ev-composer', id: 'aiForm' }, [
    h('div', { key: 'lim', id: 'aiLimit', hidden: true }),
    h('textarea', { key: 'ta', id: 'aiText', rows: 1, placeholder, 'aria-label': 'ข้อความถึง AI' }),
    h('div', { key: 'cbar', className: 'ev-composer-bar' }, [
      h('button', { key: 'plus', type: 'button', className: 'ev-plus', 'data-act': 'ai-plus', 'aria-haspopup': 'menu', 'aria-expanded': false, 'aria-label': 'ตัวช่วยพิมพ์', ...ic('plus') }),
      h('button', { key: 'send', className: 'ev-send', 'data-empty': 'true', 'aria-label': 'ส่ง', ...ic('send') }),
    ]),
  ]));
}
