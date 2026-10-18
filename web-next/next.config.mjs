/* S4 next-pages: Next สร้างหน้าจริง (output export) — ignoreBuildErrors เพราะเครื่องยนต์ (app/web/js/m) เป็น window-shim โดยเจตนา
   การตรวจชนิดจริงอยู่ที่ tools/typecheck.mjs ของราก (baseline 0 จุด ผ่านประตูทุกไบต์) ไม่ใช่ของ Next */
export default { output: 'export', trailingSlash: false, images: { unoptimized: true }, typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true } };
