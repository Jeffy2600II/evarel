// Evarel PoC Worker — Cloudflare Workers
// endpoints: /api/ai/chat (Groq), /api/push/subscribe, /api/push/send, /api/push/key
// secrets: GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_KEYS_JSON
// (VAPID_KEYS_JSON = {"publicKey":"...base64url","privateKey":"..."} จาก ApplicationServerKeys.toJSON())

import { ApplicationServerKeys, generatePushHTTPRequest, setWebCrypto } from "webpush-webcrypto";

// Workers มี crypto ที่ระดับ global อยู่แล้ว
setWebCrypto(crypto);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return cors();

    if (url.pathname === "/api/push/key" && request.method === "GET") {
      const parsed = JSON.parse(env.VAPID_KEYS_JSON);
      return json({ publicKey: parsed.publicKey });
    }

    if (url.pathname === "/api/push/subscribe" && request.method === "POST") {
      const sub = await request.json();
      const r = await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: "POST",
        headers: sbHeaders(env, { Prefer: "resolution=merge-duplicates" }),
        body: JSON.stringify({
          user_id: sub.user_id ?? null,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        }),
      });
      return r.ok ? json({ ok: true }) : json({ ok: false, error: await r.text() }, 500);
    }

    if (url.pathname === "/api/push/send" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      try {
        const results = await handleSend(env, body);
        return json({ sent: true, count: results.filter(r => !r.error).length, total: results.length, results });
      } catch (e) {
        return json({ sent: false, error: e?.message ?? String(e) }, 500);
      }
    }

    if (url.pathname === "/api/ai/chat" && request.method === "POST") {
      return handleChat(env, request);
    }

    return json({ error: "not found" }, 404);
  },
};

// ---------- AI chat (Groq, OpenAI-compatible) ----------
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const TOOLS = [{
  type: "function",
  function: {
    name: "add_task",
    description: "เพิ่มงานใหม่ในระบบ เมื่อผู้ใช้ขอเพิ่มงานหรือมีการบ้าน/งานส่งใหม่",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "ชื่องาน" },
        due_at: { type: "string", description: "วันเวลาส่ง รูปแบบ ISO 8601 เช่น 2026-10-16T16:00:00+07:00" },
        category: { type: "string", description: "วิชาหรือหมวด เช่น คณิตศาสตร์" },
      },
      required: ["title"],
    },
  },
}];

async function handleChat(env, request) {
  const { message } = await request.json();
  const now = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "full", timeStyle: "short" });
  const r = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL || "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: "คุณคือผู้ช่วยส่วนตัวชื่อ Evarel ตอบเป็นภาษาไทย สั้นและชัดเจน วันนี้คือ " + now + " ใช้ข้อมูลนี้เวลาคำนวณวันที่" },
        { role: "user", content: message },
      ],
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 500,
    }),
  });
  if (!r.ok) return json({ error: await r.text() }, 502);
  const data = await r.json();
  const msg = data.choices?.[0]?.message ?? {};
  return json({ reply: msg.content ?? null, tool_calls: msg.tool_calls ?? [] });
}

// ---------- Web Push (webpush-webcrypto) ----------
async function vapidKeys(env) {
  const parsed = JSON.parse(env.VAPID_KEYS_JSON);
  return ApplicationServerKeys.fromJSON(parsed);
}

async function handleSend(env, body) {
  const title = body.title || "Evarel";
  const message = body.message || "ทดสอบแจ้งเตือนจาก Evarel PoC";
  const keys = await vapidKeys(env);

  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth`, {
    headers: sbHeaders(env),
  });
  if (!r.ok) throw new Error("supabase query failed: " + await r.text());
  const subs = await r.json();

  const results = [];
  for (const s of subs) {
    try {
      const req = await generatePushHTTPRequest({
        applicationServerKeys: keys,
        payload: JSON.stringify({ title, body: message }),
        target: { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        adminContact: "poc@evarel.app",
        ttl: 60,
      });
      const res = await fetch(req.endpoint, { method: "POST", headers: req.headers, body: req.body });
      results.push({ endpoint: s.endpoint.slice(-12), status: res.status });
    } catch (e) {
      results.push({ endpoint: s.endpoint.slice(-12), error: e?.message ?? String(e) });
    }
  }
  console.log("push results:", JSON.stringify(results));
  return results;
}

// ---------- helpers ----------
function sbHeaders(env, extra = {}) {
  return {
    "apikey": env.SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: corsHeaders() });
}
function cors() { return new Response(null, { headers: corsHeaders() }); }
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}
