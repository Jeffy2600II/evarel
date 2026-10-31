// รัน handler ในเครื่องด้วย Deno.serve เพื่อทดสอบกับ Supabase จริง (ไม่ใช่ไฟล์ที่ deploy) | ใช้: deno run --allow-all --port=8799 serve_local.ts
import { handle } from "./handler.ts";
const port = Number((Deno.args.find((a) => a.startsWith("--port=")) ?? "--port=8799").split("=")[1]);
Deno.serve({ port }, (req) => handle(req, {
  CRON_SECRET: Deno.env.get("CRON_SECRET") ?? "", SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", VAPID_KEYS_JSON: Deno.env.get("VAPID_KEYS_JSON") ?? "",
}));
