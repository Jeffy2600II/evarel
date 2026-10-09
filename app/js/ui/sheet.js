/* Path: app/js/ui/sheet.js | split mechanically from app.js (no logic edits) */
import { scrim, sheetEl } from '../core/dom.js';
import { pushLayerState, syncLayer } from '../core/history.js';
import { icon } from './primitives.js';

export function openSheet(title, body) { pushLayerState('sheet');
  sheetEl.innerHTML = `<h2>${title}<button class="ev-icon-btn" data-act="close" aria-label="ปิด">${icon('x')}</button></h2>${body}`;
  sheetEl.dataset.open = scrim.dataset.open = 'true'; syncLayer();
}
export const closeSheet = () => {
  const wasOpen = sheetEl.dataset.open === 'true';
  sheetEl.dataset.open = scrim.dataset.open = 'false'; syncLayer();
  if (wasOpen && history.state?.layer === 'sheet') history.back();
};
