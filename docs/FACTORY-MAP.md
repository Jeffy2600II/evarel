# แผนที่โรงงาน Frontend Evarel (Factory Map)

> สร้างอัตโนมัติด้วย `node app/tools/mapper.mjs` เมื่อโค้ดเปลี่ยน ห้ามแก้มือ

## โครงสร้างภาพรวม 5 โซน

### โซน: [`app/pages`](app/pages)

| ชื่อกล่อง | โครงหน้า (Layer 1) | ชิ้นส่วนย่อย (Layer 2) | ถาดข้อมูล/สไตล์ (Layer 3) | บัตรประจำกล่อง |
|---|---|---|---|---|
| [`all`](app/pages/all) | [`AllPage.jsx`](app/pages/all/AllPage.jsx) | [`parts/`](app/pages/all/parts) | [`all.tray.js`](app/pages/all/all.tray.js) [`all.style.css`](app/pages/all/all.style.css) | [`BOX.md`](app/pages/all/BOX.md) |
| [`stats`](app/pages/stats) | [`StatsPage.jsx`](app/pages/stats/StatsPage.jsx) | [`parts/`](app/pages/stats/parts) | [`stats.tray.js`](app/pages/stats/stats.tray.js) [`stats.style.css`](app/pages/stats/stats.style.css) | [`BOX.md`](app/pages/stats/BOX.md) |

### โซน: [`app/shared`](app/shared)

| ชื่อกล่อง | โครงหน้า (Layer 1) | ชิ้นส่วนย่อย (Layer 2) | ถาดข้อมูล/สไตล์ (Layer 3) | บัตรประจำกล่อง |
|---|---|---|---|---|
| [`auth`](app/shared/auth) | [`AuthPage.jsx`](app/shared/auth/AuthPage.jsx) | [`parts/`](app/shared/auth/parts) | [`auth.tray.js`](app/shared/auth/auth.tray.js) [`auth.style.css`](app/shared/auth/auth.style.css) | [`BOX.md`](app/shared/auth/BOX.md) |
| [`calendar`](app/shared/calendar) | [`CalendarPage.jsx`](app/shared/calendar/CalendarPage.jsx) | [`parts/`](app/shared/calendar/parts) | [`calendar.tray.js`](app/shared/calendar/calendar.tray.js) [`calendar.style.css`](app/shared/calendar/calendar.style.css) | [`BOX.md`](app/shared/calendar/BOX.md) |
| [`detail`](app/shared/detail) | [`DetailPage.jsx`](app/shared/detail/DetailPage.jsx) | [`parts/`](app/shared/detail/parts) | [`detail.tray.js`](app/shared/detail/detail.tray.js) [`detail.style.css`](app/shared/detail/detail.style.css) | [`BOX.md`](app/shared/detail/BOX.md) |
| [`dialog`](app/shared/dialog) | [`DialogPage.jsx`](app/shared/dialog/DialogPage.jsx) | [`parts/`](app/shared/dialog/parts) | [`dialog.tray.js`](app/shared/dialog/dialog.tray.js) [`dialog.style.css`](app/shared/dialog/dialog.style.css) | [`BOX.md`](app/shared/dialog/BOX.md) |
| [`form`](app/shared/form) | [`FormPage.jsx`](app/shared/form/FormPage.jsx) | [`parts/`](app/shared/form/parts) | [`form.tray.js`](app/shared/form/form.tray.js) [`form.style.css`](app/shared/form/form.style.css) | [`BOX.md`](app/shared/form/BOX.md) |
| [`item-row`](app/shared/item-row) | [`ItemRowPage.jsx`](app/shared/item-row/ItemRowPage.jsx) | [`parts/`](app/shared/item-row/parts) | [`item-row.tray.js`](app/shared/item-row/item-row.tray.js) [`item-row.style.css`](app/shared/item-row/item-row.style.css) | [`BOX.md`](app/shared/item-row/BOX.md) |
| [`nav`](app/shared/nav) | [`NavPage.jsx`](app/shared/nav/NavPage.jsx) | [`parts/`](app/shared/nav/parts) | [`nav.tray.js`](app/shared/nav/nav.tray.js) [`nav.style.css`](app/shared/nav/nav.style.css) | [`BOX.md`](app/shared/nav/BOX.md) |
| [`quota`](app/shared/quota) | [`QuotaPage.jsx`](app/shared/quota/QuotaPage.jsx) | [`parts/`](app/shared/quota/parts) | [`quota.tray.js`](app/shared/quota/quota.tray.js) [`quota.style.css`](app/shared/quota/quota.style.css) | [`BOX.md`](app/shared/quota/BOX.md) |
| [`settings`](app/shared/settings) | [`SettingsPage.jsx`](app/shared/settings/SettingsPage.jsx) | [`parts/`](app/shared/settings/parts) | [`settings.tray.js`](app/shared/settings/settings.tray.js) [`settings.style.css`](app/shared/settings/settings.style.css) | [`BOX.md`](app/shared/settings/BOX.md) |
| [`sheet`](app/shared/sheet) | [`SheetPage.jsx`](app/shared/sheet/SheetPage.jsx) | [`parts/`](app/shared/sheet/parts) | [`sheet.tray.js`](app/shared/sheet/sheet.tray.js) [`sheet.style.css`](app/shared/sheet/sheet.style.css) | [`BOX.md`](app/shared/sheet/BOX.md) |
| [`today`](app/shared/today) | [`TodayPage.jsx`](app/shared/today/TodayPage.jsx) | [`parts/`](app/shared/today/parts) | [`today.tray.js`](app/shared/today/today.tray.js) [`today.style.css`](app/shared/today/today.style.css) | [`BOX.md`](app/shared/today/BOX.md) |

### โซน: [`app/styles`](app/styles)

รายการไฟล์ในโซน:
- 📄 [`MOLD-TABLE.md`](app/styles/MOLD-TABLE.md)
- 📄 [`README.md`](app/styles/README.md)

### โซน: [`app/data`](app/data)

รายการไฟล์ในโซน:
- 📄 [`README.md`](app/data/README.md)
- 📄 [`ai.tray.js`](app/data/ai.tray.js)
- 📄 [`dates.tray.js`](app/data/dates.tray.js)
- 📄 [`focus.tray.js`](app/data/focus.tray.js)

### โซน: [`app/tools`](app/tools)

รายการไฟล์ในโซน:
- 📄 [`HOUSE-RULES.md`](app/tools/HOUSE-RULES.md)
- 📄 [`QA-GUIDE.md`](app/tools/QA-GUIDE.md)
- 📄 [`README.md`](app/tools/README.md)
- 📄 [`audit_css_values.py`](app/tools/audit_css_values.py)
- 📄 [`checker.mjs`](app/tools/checker.mjs)
- 📄 [`dep_matrix.mjs`](app/tools/dep_matrix.mjs)
- 📁 [`docs/`](app/tools/docs)
- 📁 [`example_box/`](app/tools/example_box)
- 📄 [`mapper.mjs`](app/tools/mapper.mjs)
- 📄 [`rollback.mjs`](app/tools/rollback.mjs)
- 📄 [`tuner.mjs`](app/tools/tuner.mjs)
- 📄 [`xray.mjs`](app/tools/xray.mjs)

