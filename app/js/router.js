/* Path: app/js/router.js | split mechanically from app.js (no logic edits) */
import { syncLayer } from './core/history.js';
import { AIUI } from './core/state-ui.js';
import { UI } from './core/store.js';
import { ChatStore } from './services/chat-store.js';
import { closeMenu } from './ui/menu.js';
import { closeSheet } from './ui/sheet.js';
import { aiEl, drawerEl, drawerScrim, renderAI } from './views/ai.js';
import { call } from './core/bus.js';

/* ---------- Router ---------- */
export const ROUTES = ['today', 'all', 'schedule', 'stats', 'ai', 'settings'];
export const PAGE_TITLES = {
  today: 'Evarel · วันนี้',
  all: 'Evarel · รายการ',
  schedule: 'Evarel · ตารางเรียน',
  stats: 'Evarel · สถิติ',
  ai: 'Evarel · AI',
  settings: 'Evarel · ตั้งค่า'
};
export function parseHash() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  if (ROUTES.includes(h)) return h;
  history.replaceState({ app: true, idx: history.state?.idx || 0 }, '', '#/today');
  return 'today';
}
export function navigate(route) {
  if (ROUTES.includes(route)) {
    if (location.hash !== '#/' + route) {
      location.hash = '#/' + route;
    } else {
      handleRoute();
    }
  }
}
export function navBack() {
  if (history.state?.idx > 0 || (history.state?.app && history.length > 1)) {
    history.back();
  } else {
    history.replaceState({ app: true, idx: 0 }, '', '#/today');
    handleRoute();
  }
}
export function handleRoute() {
  const route = parseHash();

  if (route !== 'ai' && AIUI.open) {
    AIUI.open = false;
    syncLayer();
    AIUI.drawer = false;
    aiEl.dataset.open = 'false';
    drawerEl.dataset.open = 'false';
    drawerScrim.dataset.open = 'false';
    setTimeout(() => { if (!AIUI.open) { aiEl.hidden = true; aiEl.innerHTML = ''; } }, 300);
  }

  if (route === 'ai') {
    if (!AIUI.open) {
      closeMenu(true); closeSheet(); AIUI.open = true; AIUI.drawer = false; AIUI.q = '';
      if (!ChatStore.get(ChatStore.current())) ChatStore.setCurrent(null);
      aiEl.hidden = false; syncLayer(); renderAI(false);
      requestAnimationFrame(() => { aiEl.dataset.open = 'true'; });
    }
    document.title = PAGE_TITLES.ai;
    window.scrollTo(0, 0);
    return;
  }

  if (['today', 'all', 'schedule', 'stats', 'settings'].includes(route)) {
    UI.tab = route;
    call('render');
    document.title = PAGE_TITLES[route] || 'Evarel';
    window.scrollTo(0, 0);
  }
}
