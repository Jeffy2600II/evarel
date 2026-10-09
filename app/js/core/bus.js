/* Path: app/js/core/bus.js | registry for upward calls (breaks UI <-> router/main import cycles) */
const REG = Object.create(null);
export const register = (name, fn) => { REG[name] = fn; };
export const call = (name, ...args) => REG[name](...args);
