/* S4 next-pages ไบต์ N1: root layout แทน index.html เดิม — head ทุกบรรทัดตาม app/web/index.html เป๊ะ
   สิ่งที่ต่างจากเดิมโดยเจตนา: (1) EVAREL_API ฉีดตอน build ผ่าน NEXT_PUBLIC_EVAREL_API แทนการแก้ไฟล์หลัง build
   (2) ไม่มี script tag ของ js/m อีกต่อไป — เครื่องยนต์ทั้งหมดอยู่ในบันเดิลของ Next (src/lib/boot.ts) */
import type { ReactNode } from 'react';

export const metadata = { title: 'Evarel' };

/* รหัสเนื้อหาไฟล์ชื่อคงที่ ฝังตอน build (scripts/build-next.mjs) ใช้ต่อท้าย ?v= ให้ไฟล์ที่ SW แคชไว้ */
const V = process.env.NEXT_PUBLIC_EVAREL_ASSET_V || '';
const VER = process.env.NEXT_PUBLIC_EVAREL_VERSION || '';
const q = (u: string) => (V ? `${u}?v=${V}` : u);

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
      <meta name="theme-color" content="#4B2FF5" />
      <link rel="manifest" href="manifest.webmanifest" />
      <link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png" />
      <link rel="apple-touch-icon" href="icons/icon-192.png" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href={q('styles/app.css')} />
      <script id="ev-api" dangerouslySetInnerHTML={{ __html: `window.EVAREL_API = window.EVAREL_API || ${JSON.stringify(process.env.NEXT_PUBLIC_EVAREL_API || '')};window.__EV_BUILD__ = ${JSON.stringify(V)};window.__EV_VERSION__ = ${JSON.stringify(VER)};` }} />
    </head>
    <body>{children}</body>
    </html>
  );
}
