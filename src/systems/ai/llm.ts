/* LLM Gateway: Groq (หลัก) -> OpenRouter (สำรอง) ตาม 03-ai-agent.md §6 */
export const GROQ_MODEL = 'openai/gpt-oss-120b';
/* โมเดลฟรีบน OpenRouter เปลี่ยนบ่อย (ตัวเดิม gpt-oss-120b:free ถูกยกเลิกแล้ว — วัดจริง 10 ต.ค. 2026)
   ลำดับ: ตัวที่ผ่านทดสอบไทย+เครื่องมือ+คำนวณวัน ก่อน ตัวถัดไปเป็นสำรองของสำรอง */
export const OR_MODELS = ['nvidia/nemotron-3-super-120b-a12b:free', 'nvidia/nemotron-3-ultra-550b-a55b:free'];
const TIMEOUT_MS = 8000;
const OR_TIMEOUT_MS = 20000; // โมเดลสำรองช้ากว่า Groq (วัดจริง 2-3 วินาที ช้าสุดเคย 64 วินาที)

export type Msg = { role: 'system' | 'user' | 'assistant' | 'tool'; content?: string | null; tool_calls?: any[]; tool_call_id?: string };
export type LlmResult = { message: any; tokens: number; provider: 'groq' | 'openrouter' };

async function call(url: string, key: string, model: string, messages: Msg[], tools: any[], extra: any, f: typeof fetch, timeoutMs = TIMEOUT_MS): Promise<LlmResult | { status: number }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await f(url, {
      method: 'POST',
      signal: ctl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, tools, tool_choice: 'auto', max_tokens: 500, ...extra }),
    });
    if (!r.ok) return { status: r.status };
    const j: any = await r.json();
    const message = j?.choices?.[0]?.message;
    if (!message) return { status: 502 };
    return { message, tokens: Number(j?.usage?.total_tokens) || 0, provider: 'groq' };
  } catch {
    return { status: 599 }; // timeout / เครือข่าย
  } finally {
    clearTimeout(timer);
  }
}

export async function callLLM(env: any, messages: Msg[], tools: any[], opts: { skipGroq?: boolean } = {}): Promise<LlmResult> {
  const f: typeof fetch = env.CUSTOM_FETCH || globalThis.fetch;
  let lastStatus = 0;
  if (env.GROQ_API_KEY && !opts.skipGroq) {
    const r = await call('https://api.groq.com/openai/v1/chat/completions', env.GROQ_API_KEY, GROQ_MODEL, messages, tools, { reasoning_effort: 'low' }, f);
    if ('message' in r) return r;
    lastStatus = r.status;
    if (r.status >= 400 && r.status < 500 && r.status !== 429) throw new Error(`llm_bad_request_${r.status}`); // ความผิดของเรา ไม่ใช่โควตา — สลับก็ไม่หาย
  }
  if (env.OPENROUTER_API_KEY) {
    for (const model of OR_MODELS) {
      const r = await call('https://openrouter.ai/api/v1/chat/completions', env.OPENROUTER_API_KEY, model, messages, tools, {}, f, OR_TIMEOUT_MS);
      if ('message' in r) return { ...r, provider: 'openrouter' };
      lastStatus = r.status; // 404/429/5xx/timeout -> ลองตัวถัดไป
    }
  }
  throw new Error(`llm_unavailable_${lastStatus}`);
}
