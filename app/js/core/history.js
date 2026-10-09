/* Path: app/js/core/history.js | split mechanically from app.js (no logic edits) */
import { ST } from './state.js';
import { sheetEl } from './dom.js';
import { AIUI } from './state-ui.js';

export function pushLayerState(layer) {
  if (!history.state?.layer) {
    const idx = (history.state?.idx || 0) + 1;
    history.pushState({ app: true, idx, layer }, '');
  } else {
    history.replaceState({ ...(history.state || {}), app: true, layer }, '');
  }
}
export const syncLayer = () => { document.body.dataset.layer = ST.FOCUS_ID ? 'focus' : (AIUI?.open) ? 'ai' : sheetEl.dataset.open === 'true' ? 'sheet' : ''; };
