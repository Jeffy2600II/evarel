import { TODAY } from './02-core__dates.js';
import { remFrom, applyProposalTo } from './core/aiproposal.js';
import { aiAskOf, memCallOf } from './core/ailive.js';
/* ===== MODULE: services/ai-live (AI จริง: เฉพาะโหมด Supabase) =====
   ตรรกะเรียกเครือข่าย (aiAsk memCall) อยู่ที่ core/ailive.ts แล้ว ที่นี่เหลือตัวห่อส่ง deps เข้าไป:
   api = SUPA_API, token = ST.Repo.token(), quotaFromChat อ่านจาก global ของ 16-services__ai-quota ตอนเรียก (16 ไม่ export ผ่านโมดูล คงพฤติกรรมเดิม), resetAt อ่านจาก ST.QUOTA สดทุกครั้ง
   คงลายเซ็นเดิม: aiAsk memCall remFrom applyProposal */
export { remFrom };
const applyProposal = (c) => applyProposalTo(S.items, c, { today: TODAY, id: Date.now() + Math.floor(Math.random() * 1000) });
const aiAsk = (text, history) => aiAskOf({ api: SUPA_API, token: () => ST.Repo.token(), quotaFromChat: (q, h) => quotaFromChat(q, h), quotaResetAt: () => ST.QUOTA?.resetAt })(text, history);
const memCall = (c) => memCallOf({ api: SUPA_API, token: () => ST.Repo.token() })(c);
Object.assign(window, { aiAsk, remFrom, memCall, applyProposal });
