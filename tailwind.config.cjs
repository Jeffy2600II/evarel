/** Tailwind config ของแอปจริง — คัดจาก tailwind.config ใน design/master-demo-v29.html ตรงทั้งหมด
 *  (colors ชี้ CSS vars / radius card, sheet / maxWidth col / fontFamily / timing)
 *  ห้ามแก้ค่าตรงนี้เอง ต้องสั่งจาก Master — ถ้าเดโมเปลี่ยน ให้คัดใหม่จากเดโม
 *  preflight ปิดตาม config จริงของเดโม (วัดจากหน้าเดโมสด: tailwind.config={corePlugins:{preflight:false}})
 *  b29-auth: เปิด preflight ก่อนหน้าทำให้ reset ปุ่ม/ช่องกรอกต่างจากเดโม (placeholder สีต่าง พิกเซลตกหมดทุกจอกรอก)
 *  default vars --tw-* ที่ var-chain ต้องใช้ ใส่เองที่หัว design.css คัดจากผลลัพธ์จริงของ Play CDN (Play CDN ปล่อยบล็อกนี้แม้ปิด preflight)
 *  ปิดไว้ = --tw-translate-x ไม่มีค่า = transform ทั้ง chain กลายเป็น none (จับได้จริงจากประตูพาริตี sheet/pop/dialog ตกทั้งฉาก พิสูจน์ด้วย computed style)
 */
module.exports = {
  corePlugins: { preflight: false },
  content: [
    'app/src/**/*.{ts,tsx,js,jsx}',
    'app/web/js/react/*.js',
    'web-next/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--c-bg)', surface: 'var(--c-surface)', ink: 'var(--c-text)', muted: 'var(--c-muted)',
        line: 'var(--c-line)', fill: 'var(--c-fill)', accent: 'var(--c-accent)',
        'accent-soft': 'var(--c-accent-soft)', ok: 'var(--c-ok)', warn: 'var(--c-warn)',
        danger: 'var(--c-danger)', 'danger-soft': 'var(--c-danger-soft)', 'warn-soft': 'var(--c-warn-soft)',
      },
      borderRadius: { card: '26px', sheet: '32px' },
      maxWidth: { col: '480px' },
      fontFamily: { sans: ['IBM Plex Sans Thai', 'system-ui', 'sans-serif'] },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(.22,1,.36,1)',
        spring: 'cubic-bezier(.34,1.56,.64,1)',
      },
    },
  },
};
