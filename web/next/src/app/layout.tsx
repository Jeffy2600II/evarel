/* S4 next-pages ไบต์ N1: root layout แทน index.html เดิม — head ทุกบรรทัดตาม classic/index.html เป๊ะ
   สิ่งที่ต่างจากเดิมโดยเจตนา: (1) EVAREL_API ฉีดตอน build ผ่าน NEXT_PUBLIC_EVAREL_API แทนการแก้ไฟล์หลัง build
   (2) ไม่มี script tag ของ js/m อีกต่อไป — เครื่องยนต์ทั้งหมดอยู่ในบันเดิลของ Next (src/lib/boot.ts) */
import type { ReactNode } from 'react';

export const metadata = { title: 'Ordivel' };

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
      <meta name="theme-color" content="#181142" />
      <link rel="manifest" href="manifest.webmanifest" />
      <link rel="icon" href={q('icons/favicon.ico')} sizes="16x16 32x32 48x48" />
      <link rel="icon" type="image/svg+xml" href={q('icons/favicon.svg')} />
      <link rel="icon" type="image/png" sizes="128x128" href={q('icons/favicon-128.png')} />
      <link rel="icon" type="image/png" sizes="64x64" href={q('icons/favicon-64.png')} />
      <link rel="icon" type="image/png" sizes="32x32" href={q('icons/favicon-32.png')} />
      <link rel="icon" type="image/png" sizes="16x16" href={q('icons/favicon-16.png')} />
      <link rel="apple-touch-icon" sizes="180x180" href={q('icons/apple-touch-icon-180.png')} />
      <link rel="stylesheet" href={q('styles/app.css')} />
      <script id="ev-api" dangerouslySetInnerHTML={{ __html: `window.EVAREL_API = window.EVAREL_API || ${JSON.stringify(process.env.NEXT_PUBLIC_EVAREL_API || '')};window.__EV_BUILD__ = ${JSON.stringify(V)};window.__EV_VERSION__ = ${JSON.stringify(VER)};` }} />
    </head>
    <body>{children}</body>
    </html>
  );
}
