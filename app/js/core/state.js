/* Path: app/js/core/state.js | the 8 reassigned top-level variables of app.js live here (ES module imports are read-only) */
import { loadState } from '../core/store.js';
import { loadTimer } from '../core/timer.js';
export const ST = {
  S: loadState(),
  TIMER: loadTimer(),
  TICK: null,
  MENU_FOR: null,
  MENU_BTN: null,
  FOCUS_ID: null,
  FOCUS_RET: null,
  WAKE: null,
  D: {},
  updateShown: false,
};
