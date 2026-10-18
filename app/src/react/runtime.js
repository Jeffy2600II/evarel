// React runtime ร่วมของ Evarel: โหลดครั้งเดียว ทุกหน้าที่ย้ายเป็น React ใช้ร่วมกัน (ไม่ซ้ำ React ต่อหน้า)
// หน้าแต่ละหน้า (app/src/react/<ชื่อ>.jsx) ลงทะเบียนตัวเองที่ window.EvarelPages.<ชื่อ> เป็นฟังก์ชัน props -> string HTML
import { createElement, Fragment, useSyncExternalStore, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { createStore } from './store.js';
if (!window.EvarelReact) window.EvarelReact = { h: createElement, Fragment, renderToStaticMarkup, useSyncExternalStore, useEffect, createRoot, flushSync }; /* guard: execute ซ้ำจะสร้าง React ชุดสอง ทำ dispatcher ของชุดเดิมเป็น null */
// store หนึ่งอินสแตนซ์ต่อแอป อยู่ใน runtime ที่โหลดครั้งเดียว ทุกหน้า React ใช้ร่วมกัน (ถ้าวางใน bundle ต่อหน้า จะได้ store คนละตัว)
window.EvarelStore = window.EvarelStore || createStore();
window.EvarelPages = window.EvarelPages || {};
/* โหมด mount จริง (S4): EvarelPages.<name> คืน string สำหรับเทียบ/ตรวจ ส่วน EvarelComponents.<name> คือ component ที่ mount จริงด้วย createRoot
   กระแสงาน: 13-views คืน <main ... data-react-mount="today"></main> เปล่าเมื่อพร้อม mount จริง แลวาง props ไว้ที่ EvarelMount.pending
   render() ของ 23-render เรียก unmountAll() ก่อนเขียน innerHTML (ห้ามทับ DOM ที่ React ถืออยู่) แล้ว commit(root) หลัง innerHTML ก่อน countUp/growBars
   effect ของ component รันหลัง commit — FullCalendar จึง mount ใน useEffect และ destroy ตอน unmount ได้ตามเป้า task */
window.EvarelComponents = window.EvarelComponents || {};
window.EvarelMount = window.EvarelMount || {
  roots: {}, pending: null,
  ready(name) { return typeof (window.EvarelComponents || {})[name] === 'function' && typeof createRoot === 'function'; },
  // 13-views เรียกเมื่อจะขอโหมด mount จริง: คืนแอตทริบิวต์สำหรับ <main> และเก็บ props ไว้ให้ commit ใช้
  request(name, props) { this.pending = { name, props }; return ` data-react-mount="${name}"`; },
  unmountAll() { for (const k of Object.keys(this.roots)) { try { this.roots[k].unmount(); } catch (e) { console.warn('unmount ' + k, e); } delete this.roots[k]; } this.pending = null; },
  commit(rootEl) {
    const el = rootEl.querySelector('main[data-react-mount]');
    if (!el || !this.pending) return false;
    const { name, props } = this.pending; this.pending = null;
    if (!this.ready(name)) return false;
    const r = createRoot(el); this.roots[name] = r;
    /* flushSync: render ของ React เป็น batched async — ต้องจบในคำสั่งนี้เพื่อให้ countUp/growBars ของ 23-render เห็น DOM ครบ */
    /* flushSync บังคับ DOM จบในคำสั่งนี้ (countUp/growBars ต้องเห็น) — ทางเลือกสำรองเมื่อ flushSync ขัด hook บน React 19 */
    if (window.__NO_FLUSH) r.render(createElement(window.EvarelComponents[name], props));
    else flushSync(() => r.render(createElement(window.EvarelComponents[name], props)));
    return true;
  },
};
