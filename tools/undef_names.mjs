// ตรวจชื่อที่ถูกใช้แต่ไม่มีนิยามและไม่ใช่ global ของเบราว์เซอร์ (evarel-ts-1h) ใช้โดย ts1d_deps_gate.mjs
// หยาบโดยตั้งใจ: นับทุกการประกาศในทุกระดับเป็น declared ทั้งโปรแกรม เพื่อลดผลบวกเท็จ จับกรณีนิยามระดับบนสุดหายไป
import { createRequire } from 'module'; import fs from 'fs';
const rq = createRequire('/app/conversations/6ab305110a4ed95a28bc31b7/repo/package.json'); const acorn = rq('acorn');

const kids = (n) => { const r = []; for (const k of Object.keys(n)) { const c = n[k]; if (Array.isArray(c)) c.forEach(x => x && typeof x.type === 'string' && r.push([k, x])); else if (c && typeof c.type === 'string') r.push([k, c]); } return r; };
const isProp = (p, k) => p && p.type === 'MemberExpression' && k === 'property' && !p.computed;
const isKey = (p, k) => p && p.type === 'Property' && k === 'key' && !p.computed && !p.shorthand;
const pat = (n, add) => { if (!n) return; if (n.type === 'Identifier') add(n.name); else if (n.type === 'ObjectPattern') n.properties.forEach(p => pat(p.value || p.argument, add)); else if (n.type === 'ArrayPattern') n.elements.forEach(e => pat(e, add)); else if (n.type === 'AssignmentPattern') pat(n.left, add); else if (n.type === 'RestElement') pat(n.argument, add); };

const BROWSER = ['window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage', 'history', 'screen', 'performance', 'fetch', 'indexedDB', 'caches', 'matchMedia', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'alert', 'confirm', 'prompt', 'scrollTo', 'scrollBy', 'innerWidth', 'innerHeight', 'Notification', 'FullCalendar', 'AbortController', 'URL', 'URLSearchParams', 'FormData', 'Intl', 'crypto', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'CSS', 'Event', 'CustomEvent', 'Image', 'Audio', 'Blob', 'File', 'FileReader', 'TextEncoder', 'TextDecoder', 'atob', 'btoa', 'structuredClone', 'queueMicrotask', 'visualViewport', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'arguments', 'undefined', 'ServiceWorker', 'WebSocket', 'XMLHttpRequest', 'Headers', 'Request', 'Response', 'BroadcastChannel', 'Worker', 'DOMParser', 'HTMLElement', 'Element', 'Node', 'NodeList', 'KeyboardEvent', 'MouseEvent', 'PointerEvent', 'TouchEvent', 'SpeechSynthesisUtterance', 'speechSynthesis', 'SpeechRecognition', 'webkitSpeechRecognition', 'EVAREL_API', 'EVAREL_BUILD', 'scrollY', 'scrollX', 'pageYOffset', 'pageXOffset', 'outerWidth', 'outerHeight', 'devicePixelRatio', 'self', 'top', 'parent', 'frames', 'name', 'status', 'event'];
const GLOBALS = new Set(Object.getOwnPropertyNames(globalThis).concat(BROWSER));

export function undefinedNames(dir) {
  const M = dir + '/js/m/'; const files = JSON.parse(fs.readFileSync(M + '_order.json', 'utf8')).order.map(o => o.file);
  const declared = new Set(); const used = new Map();
  for (const f of files) {
    const ast = acorn.parse(fs.readFileSync(M + f, 'utf8'), { ecmaVersion: 'latest', sourceType: 'script' });
    (function walk(x, p, k) {
      if (x.type === 'VariableDeclarator') pat(x.id, n => declared.add(n));
      if ((x.type === 'FunctionDeclaration' || x.type === 'ClassDeclaration') && x.id) declared.add(x.id.name);
      if (/Function/.test(x.type)) { (x.params || []).forEach(q => pat(q, n => declared.add(n))); if (x.id) declared.add(x.id.name); }
      if (x.type === 'CatchClause' && x.param) pat(x.param, n => declared.add(n));
      if (x.type === 'Identifier' && !isProp(p, k) && !isKey(p, k)) { if (!used.has(x.name)) used.set(x.name, new Set()); used.get(x.name).add(f.slice(0, 2)); }
      for (const [kk, c] of kids(x)) walk(c, x, kk);
    })(ast, null, null);
  }
  return [...used.entries()].filter(([n]) => !declared.has(n) && !GLOBALS.has(n)).map(([n, s]) => n + '@' + [...s].join('/'));
}
