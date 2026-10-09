/* Path: app/js/services/chat-store.js | split mechanically from app.js (no logic edits) */
import { CHAT_KEY, MAX_CHATS, MAX_MSGS } from '../core/constants.js';

export const ChatStore = {
  _load() { try { const d = JSON.parse(localStorage.getItem(CHAT_KEY)); return Array.isArray(d?.chats) ? d : { chats: [], current: null }; } catch { return { chats: [], current: null }; } },
  _save(d) { try { localStorage.setItem(CHAT_KEY, JSON.stringify(d)); } catch (e) { console.warn('บันทึกแชทไม่สำเร็จ', e); } },
  all() { return this._load().chats.sort((a, b) => b.updated - a.updated); },
  current() { return this._load().current; },
  setCurrent(id) { const d = this._load(); d.current = id; this._save(d); },
  get(id) { return this._load().chats.find(c => c.id === id) || null; },
  create() { const d = this._load(); const c = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title: '', created: Date.now(), updated: Date.now(), pinned: false, msgs: [] };
    d.chats.unshift(c); d.chats = d.chats.slice(0, MAX_CHATS); d.current = c.id; this._save(d); return c; },
  add(id, msg) { const d = this._load(), c = d.chats.find(x => x.id === id); if (!c) return null; c.msgs.push({ ...msg, t: Date.now() }); c.msgs = c.msgs.slice(-MAX_MSGS); c.updated = Date.now();
    if (!c.title && msg.role === 'user') c.title = msg.text.trim().replace(/\s+/g, ' ').slice(0, 40); this._save(d); return c; },
  patchLast(id, patch) { const d = this._load(), c = d.chats.find(x => x.id === id); if (!c || !c.msgs.length) return; Object.assign(c.msgs[c.msgs.length - 1], patch); this._save(d); },
  rename(id, title) { const d = this._load(), c = d.chats.find(x => x.id === id); if (c) { c.title = title.trim().slice(0, 60); this._save(d); } },
  pin(id) { const d = this._load(), c = d.chats.find(x => x.id === id); if (c) { c.pinned = !c.pinned; this._save(d); } },
  remove(id) { const d = this._load(); const gone = d.chats.find(x => x.id === id); d.chats = d.chats.filter(x => x.id !== id); if (d.current === id) d.current = null; this._save(d); return gone; },
  restore(chat) { const d = this._load(); if (!d.chats.some(x => x.id === chat.id)) { d.chats.push(chat); this._save(d); } },
};
