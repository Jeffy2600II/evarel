// React runtime ร่วมของ Evarel: โหลดครั้งเดียว ทุกหน้าที่ย้ายเป็น React ใช้ร่วมกัน (ไม่ซ้ำ React ต่อหน้า)
// หน้าแต่ละหน้า (app/src/react/<ชื่อ>.jsx) ลงทะเบียนตัวเองที่ window.EvarelPages.<ชื่อ> เป็นฟังก์ชัน props -> string HTML
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
window.EvarelReact = { h: createElement, Fragment, renderToStaticMarkup };
window.EvarelPages = window.EvarelPages || {};
