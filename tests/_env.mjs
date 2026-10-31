/* ตัวช่วยกลางหาไฟล์ env ของประตูทดสอบ (31 ต.ค. 2026)
   เครื่องงานหลักเก็บ repo ไว้ที่ /app แต่เครื่องอื่นไม่มีสิทธิ์เขียน /app จึงใช้ repo-local .agents/.env ได้เหมือนกัน
   ลอง /app/.agents/.env ก่อนเสมอ ไม่เปลี่ยนพฤติกรรมเดิม | ไฟล์ env ถูก gitignore อยู่แล้ว (.env ทุกชั้น) */
import fs from 'fs'; import { fileURLToPath } from 'url'; import { dirname, join } from 'path';
const CANDIDATES = ['/app/.agents/.env', join(dirname(fileURLToPath(import.meta.url)), '..', '.agents', '.env')];
export const ENV_PATH = CANDIDATES.find(p => { try { fs.accessSync(p); return true } catch { return false } });
export function readEnvText() {
  if (!ENV_PATH) throw new Error('ไม่พบ .agents/.env ทั้งที่ /app/.agents/.env และ <repo>/.agents/.env (ดู docs/plan/factory-steps/F6-m-layer-order.md หัวข้อประตูภาพ)');
  return fs.readFileSync(ENV_PATH, 'utf-8');
}
