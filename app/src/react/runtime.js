// React runtime ร่วมของ Evarel: โหลดครั้งเดียว ทุกหน้าที่ย้ายเป็น React ใช้ร่วมกัน (ไม่ซ้ำ React ต่อหน้า)
// หน้าแต่ละหน้า (app/src/react/<ชื่อ>.jsx) ลงทะเบียนตัวเองที่ window.EvarelPages.<ชื่อ> เป็นฟังก์ชัน props -> string HTML
import { createElement, Fragment, useSyncExternalStore } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStore } from './store.js';
window.EvarelReact = { h: createElement, Fragment, renderToStaticMarkup, useSyncExternalStore };
// store หนึ่งอินสแตนซ์ต่อแอป อยู่ใน runtime ที่โหลดครั้งเดียว ทุกหน้า React ใช้ร่วมกัน (ถ้าวางใน bundle ต่อหน้า จะได้ store คนละตัว)
window.EvarelStore = window.EvarelStore || createStore();
window.EvarelPages = window.EvarelPages || {};
