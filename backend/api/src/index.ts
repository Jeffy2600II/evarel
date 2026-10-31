import { handleRequest } from './router';
import { Env } from './systems/items/routes';
import { runScheduler } from './systems/notify/scheduler';
import { makeSender } from './systems/notify/sender';

export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
    return handleRequest(request, env, ctx);
  },

  /* Cron ทุกนาที: ส่งแจ้งเตือนที่ถึงเวลา ห้ามโยนข้อผิดพลาดออก (cron ที่ล้มซ้ำจะถูกแพลตฟอร์มระงับ) */
  async scheduled(_event: unknown, env: Env, ctx?: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    const job = (async () => {
      try {
        if (!env.VAPID_KEYS_JSON) return;
        const r = await runScheduler(env as any, new Date(), { send: makeSender(env as any) });
        console.log('scheduler', JSON.stringify(r));
      } catch (e) {
        console.log('scheduler error', e instanceof Error ? e.message : 'unknown'); // ไม่ log ค่าลับ/ข้อมูลผู้ใช้
      }
    })();
    ctx?.waitUntil(job); await job;
  },
};
