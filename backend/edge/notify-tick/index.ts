// จุดเข้า Edge Function (Supabase) | deploy: supabase functions deploy notify-tick --no-verify-jwt (ตรวจสิทธิ์เองด้วย x-cron-secret)
import { handle } from "./handler.ts";
Deno.serve((req) => handle(req, {
  CRON_SECRET: Deno.env.get("CRON_SECRET") ?? "",
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  VAPID_KEYS_JSON: Deno.env.get("VAPID_KEYS_JSON") ?? "",
  VAPID_CONTACT: Deno.env.get("VAPID_CONTACT") ?? "",
}));
