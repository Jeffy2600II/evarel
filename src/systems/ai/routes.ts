import { Env, errorResponse, jsonResponse } from '../items/routes';
import { extractBearer, verifyJWT } from '../../shared/auth';
import { runAgent } from './agent';

const MAX_TEXT = 1000;

/* POST /api/ai/chat  body: { text, history:[{who,text}] }  -> { text, proposals, usage }
   ไม่เขียนฐานข้อมูลเลย: การเขียนจริงทำโดยแอปหลังผู้ใช้กดยืนยัน ผ่าน PUT /api/items เดิม (RLS ตรวจซ้ำอีกชั้น) */
export async function handleAiChat(request: Request, env: Env): Promise<Response> {
  const token = extractBearer(request);
  if (!token) return errorResponse('Missing authorization token', 401, env);
  try { await verifyJWT(token, env, (env as any).CUSTOM_FETCH); }
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
  const ir = await f(`${base}/rest/v1/items?select=*&limit=300`, { headers: h });
  if (!ir.ok) return errorResponse('Failed to load items', 502, env);
  const rows: any[] = await ir.json();
  const items = rows.map((r) => ({ id: Number(r.id), type: r.type, title: r.title, subject: r.subject, time: r.time, timeEnd: r.timeEnd, track: r.track, target: r.target, repeat: r.repeat, start: r.start, end: r.end, log: {} as Record<string, number> }));

  try {
    const out = await runAgent(env, text, history, items);
    return jsonResponse({ text: out.text, proposals: out.proposals, usage: { rounds: out.rounds, tokens: out.tokens, provider: out.provider } }, 200, env);
  } catch (e: any) {
    const m = String(e?.message || '');
    if (m.startsWith('llm_unavailable')) return jsonResponse({ error: 'ai_unavailable', text: 'ตอนนี้ AI ใช้งานไม่ได้ชั่วคราว (โควตาเต็มหรือระบบขัดข้อง) ลองใหม่ภายหลังนะ', proposals: [] }, 503, env);
    return errorResponse('ai_error', 500, env);
  }
}
