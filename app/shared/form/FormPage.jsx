/**
 * ฟอร์มเพิ่ม/แก้ไขรายการของ Evarel (ชั้นที่ 1 ของกล่อง form โซน shared เพราะ mount ผ่าน Sheet component)
 * ลงทะเบียนสองชื่อ x สองรูป: typeBody (ขั้นเลือกประเภท) และ formBody (ฟอร์ม 4 ประเภท) ทั้ง Pages (สตริง) และ Components (mount) ตามบัตร register
 * ข้อมูลและร่างฟอร์มทั้งหมดมาจากถาด form.tray.js ที่เดียว กล่องนี้ไม่แตะ window | h/Fragment บิลด์ฉีดให้ (scripts/build-react.mjs)
 */
import { TypeBody } from './parts/TypeBody.jsx';
import { FormFields } from './parts/FormFields.jsx';

export { TypeBody };
export function FormBody() {
  return h('form', { className: 'ev-form', id: 'addForm', noValidate: true }, h(FormFields));
}

export default FormBody;
