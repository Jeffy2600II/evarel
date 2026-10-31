import { esc } from "./dates.js";
const cloneOf = (x) => JSON.parse(JSON.stringify(x));
const toastHTML = (msg, undo) => `<span>${esc(msg)}</span>${undo ? '<button data-act="undo">\u0E22\u0E49\u0E2D\u0E19\u0E01\u0E25\u0E31\u0E1A</button>' : ""}`;
export {
  cloneOf,
  toastHTML
};
