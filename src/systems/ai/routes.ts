import { Env, errorResponse, jsonResponse } from '../items/routes';
import { extractBearer, verifyJWT } from '../../shared/auth';
import { runAgent } from './agent';
import { recall, saveFacts, forgetFact, isSensitive, Fact } from './memory';

const MAX_TEXT = 1000;

/* POST /api/ai/chat  body: { text, history:[{who,text}] }  -> { text, proposals, usage }
   ไม่เขียนฐานข้อมูลเลย: การเขียนจริงทำโดยแอปหลังผู้ใช้กดยืนยัน ผ่าน PUT /api/items เดิม (RLS ตรวจซ้ำอีกชั้น) */
export async function handleAiChat(request: Request, env: Env): Promise<Response> {
  const token = extractBearer(request);
  if (!token) return errorResponse('Missing authorization token', 401, env);
  let userId = '';
  try { userId = (await verifyJWT(token, env, (env as any).CUSTOM_FETCH)).sub; }
  catch (err: any) { return errorResponse(err?.message || 'Unauthorized', 401, env); }

  let body: any;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON', 400, env); }
  const text = String(body?.text ?? '').trim();
  if (!text) return errorResponse('text required', 400, env);
  if (text.length > MAX_TEXT) return errorResponse('text too long', 413, env);
  const history = Array.isArray(body?.history)
    ? body.history.filter((h: any) => h && (h.who === 'u' || h.who === 'a') && typeof h.text === 'string').slice(-8)
    : [];

  const f: typeof fetch = (env as any).CUSTOM_FETCH || globalThis.fetch;
  const base = env.SUPABASE_URL.replace(/\/+$/, '');
  // อ่านรายการด้วย JWT ของผู้ใช้เอง -> RLS กันข้อมูลคนอื่นให้อีกชั้น
  const h = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' };
  const [ir, memFacts] = await Promise.all([
    f(`${base}/rest/v1/items?select=*&limit=300`, { headers: h }),
    recall(env as any, userId, text), // ล้ม/ช้า = คืน [] ไม่ขวางแชท (timeout 2.5 วินาทีในตัว)
  ]);
  if (!ir.ok) return errorResponse('Failed to load items', 502, env);
  const rows: any[] = await ir.json();
  const items = rows.map((r) => ({ id: Number(r.id), type: r.type, title: r.title, subject: r.subject, time: r.time, timeEnd: r.timeEnd, track: r.track, target: r.target, repeat: r.repeat, start: r.start, end: r.end, log: {} as Record<string, number> }));

  try {
    const out = await runAgent(env, text, history, items, new Date(), memFacts);
    // memory_save ที่โดนตัวกรองอ่อนไหว: ติดป้ายให้แอปเตือนก่อนกดยืนยัน (ข้อมูลจะออกไปบริการภายนอก)
    const proposals = out.proposals.map((p) => (p.tool === 'memory_save' && isSensitive(String(p.args.fact)) ? { ...p, sensitive: true } : p));
    return jsonResponse({ text: out.text, proposals, usage: { rounds: out.rounds, tokens: out.tokens, provider: out.provider, memory: memFacts.length } }, 200, env);
  } catch (e: any) {
    const m = String(e?.message || '');
    if (m.startsWith('llm_unavailable')) return jsonResponse({ error: 'ai_unavailable', text: 'ตอนนี้ AI ใช้งานไม่ได้ชั่วคราว (โควตาเต็มหรือระบบขัดข้อง) ลองใหม่ภายหลังนะ', proposals: [] }, 503, env);
    return errorResponse('ai_error', 500, env);
  }
}

/* POST /api/ai/memory  body: { op:'save', fact, confirmSensitive? } | { op:'forget', id }
   เรียกหลังผู้ใช้กดยืนยันการ์ดเท่านั้น | ตรวจ JWT ทุกครั้ง | user id มาจากโทเคนที่ตรวจแล้ว ไม่รับจาก body */
export async function handleAiMemory(request: Request, env: Env): Promise<Response> {
  const token = extractBearer(request);
  if (!token) return errorResponse('Missing authorization token', 401, env);
  let userId = '';
  try { userId = (await verifyJWT(token, env, (env as any).CUSTOM_FETCH)).sub; }
  catch (err: any) { return errorResponse(err?.message || 'Unauthorized', 401, env); }
  let body: any;
  try { body = await request.json(); } catch { return errorResponse('Invalid JSON', 400, env); }

  if (body?.op === 'save') {
    const fact = String(body.fact ?? '').trim();
    if (!fact) return errorResponse('fact required', 400, env);
    // ข้อมูลอ่อนไหวออกนอกระบบได้เมื่อผู้ใช้ยืนยันซ้ำอย่างชัดเจนเท่านั้น
    if (isSensitive(fact) && body.confirmSensitive !== true) return jsonResponse({ ok: false, error: 'sensitive_needs_confirm' }, 409, env);
    const r = await saveFacts(env as any, userId, [fact]);
    return jsonResponse(r, r.ok ? 200 : 502, env);
  }
  if (body?.op === 'forget') {
    const r = await forgetFact(env as any, userId, String(body.id ?? ''));
    return jsonResponse(r, r.ok ? 200 : r.error === 'not_found' || r.error === 'bad_fact_id' ? 404 : 502, env);
  }
  return errorResponse('unknown op', 400, env);
}
