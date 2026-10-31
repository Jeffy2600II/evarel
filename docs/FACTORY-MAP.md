# แผนที่โรงงาน Frontend Evarel (Factory Map)

> สร้างอัตโนมัติด้วย `node tools/factory/mapper.mjs` เมื่อโค้ดเปลี่ยน ห้ามแก้มือ

## โครงสร้างภาพรวม 5 โซน

### โซน: [`web/pages`](web/pages)

| ชื่อกล่อง | โครงหน้า (Layer 1) | ชิ้นส่วนย่อย (Layer 2) | ถาดข้อมูล/สไตล์ (Layer 3) | บัตรประจำกล่อง |
|---|---|---|---|---|
| [`all`](web/pages/all) | [`AllPage.jsx`](web/pages/all/AllPage.jsx) | [`parts/`](web/pages/all/parts) | [`all.tray.js`](web/pages/all/all.tray.js) [`all.style.css`](web/pages/all/all.style.css) | [`BOX.md`](web/pages/all/BOX.md) |
| [`stats`](web/pages/stats) | [`StatsPage.jsx`](web/pages/stats/StatsPage.jsx) | [`parts/`](web/pages/stats/parts) | [`stats.tray.js`](web/pages/stats/stats.tray.js) [`stats.style.css`](web/pages/stats/stats.style.css) | [`BOX.md`](web/pages/stats/BOX.md) |

### โซน: [`web/shared`](web/shared)

| ชื่อกล่อง | โครงหน้า (Layer 1) | ชิ้นส่วนย่อย (Layer 2) | ถาดข้อมูล/สไตล์ (Layer 3) | บัตรประจำกล่อง |
|---|---|---|---|---|
| [`ai`](web/shared/ai) | [`AiPage.jsx`](web/shared/ai/AiPage.jsx) | [`parts/`](web/shared/ai/parts) | [`ai.tray.js`](web/shared/ai/ai.tray.js) [`ai.style.css`](web/shared/ai/ai.style.css) | [`BOX.md`](web/shared/ai/BOX.md) |
| [`aiShell`](web/shared/aiShell) | [`AiShellPage.jsx`](web/shared/aiShell/AiShellPage.jsx) | [`parts/`](web/shared/aiShell/parts) | [`aiShell.tray.js`](web/shared/aiShell/aiShell.tray.js) [`aiShell.style.css`](web/shared/aiShell/aiShell.style.css) | [`BOX.md`](web/shared/aiShell/BOX.md) |
| [`auth`](web/shared/auth) | [`AuthPage.jsx`](web/shared/auth/AuthPage.jsx) | [`parts/`](web/shared/auth/parts) | [`auth.tray.js`](web/shared/auth/auth.tray.js) [`auth.style.css`](web/shared/auth/auth.style.css) | [`BOX.md`](web/shared/auth/BOX.md) |
| [`calendar`](web/shared/calendar) | [`CalendarPage.jsx`](web/shared/calendar/CalendarPage.jsx) | [`parts/`](web/shared/calendar/parts) | [`calendar.tray.js`](web/shared/calendar/calendar.tray.js) [`calendar.style.css`](web/shared/calendar/calendar.style.css) | [`BOX.md`](web/shared/calendar/BOX.md) |
| [`detail`](web/shared/detail) | [`DetailPage.jsx`](web/shared/detail/DetailPage.jsx) | [`parts/`](web/shared/detail/parts) | [`detail.tray.js`](web/shared/detail/detail.tray.js) [`detail.style.css`](web/shared/detail/detail.style.css) | [`BOX.md`](web/shared/detail/BOX.md) |
| [`dialog`](web/shared/dialog) | [`DialogPage.jsx`](web/shared/dialog/DialogPage.jsx) | [`parts/`](web/shared/dialog/parts) | [`dialog.tray.js`](web/shared/dialog/dialog.tray.js) [`dialog.style.css`](web/shared/dialog/dialog.style.css) | [`BOX.md`](web/shared/dialog/BOX.md) |
| [`focus`](web/shared/focus) | [`FocusPage.jsx`](web/shared/focus/FocusPage.jsx) | [`parts/`](web/shared/focus/parts) | [`focus.tray.js`](web/shared/focus/focus.tray.js) [`focus.style.css`](web/shared/focus/focus.style.css) | [`BOX.md`](web/shared/focus/BOX.md) |
| [`form`](web/shared/form) | [`FormPage.jsx`](web/shared/form/FormPage.jsx) | [`parts/`](web/shared/form/parts) | [`form.tray.js`](web/shared/form/form.tray.js) [`form.style.css`](web/shared/form/form.style.css) | [`BOX.md`](web/shared/form/BOX.md) |
| [`item-row`](web/shared/item-row) | [`ItemRowPage.jsx`](web/shared/item-row/ItemRowPage.jsx) | [`parts/`](web/shared/item-row/parts) | [`item-row.tray.js`](web/shared/item-row/item-row.tray.js) [`item-row.style.css`](web/shared/item-row/item-row.style.css) | [`BOX.md`](web/shared/item-row/BOX.md) |
| [`nav`](web/shared/nav) | [`NavPage.jsx`](web/shared/nav/NavPage.jsx) | [`parts/`](web/shared/nav/parts) | [`nav.tray.js`](web/shared/nav/nav.tray.js) [`nav.style.css`](web/shared/nav/nav.style.css) | [`BOX.md`](web/shared/nav/BOX.md) |
| [`quota`](web/shared/quota) | [`QuotaPage.jsx`](web/shared/quota/QuotaPage.jsx) | [`parts/`](web/shared/quota/parts) | [`quota.tray.js`](web/shared/quota/quota.tray.js) [`quota.style.css`](web/shared/quota/quota.style.css) | [`BOX.md`](web/shared/quota/BOX.md) |
| [`settings`](web/shared/settings) | [`SettingsPage.jsx`](web/shared/settings/SettingsPage.jsx) | [`parts/`](web/shared/settings/parts) | [`settings.tray.js`](web/shared/settings/settings.tray.js) [`settings.style.css`](web/shared/settings/settings.style.css) | [`BOX.md`](web/shared/settings/BOX.md) |
| [`sheet`](web/shared/sheet) | [`SheetPage.jsx`](web/shared/sheet/SheetPage.jsx) | [`parts/`](web/shared/sheet/parts) | [`sheet.tray.js`](web/shared/sheet/sheet.tray.js) [`sheet.style.css`](web/shared/sheet/sheet.style.css) | [`BOX.md`](web/shared/sheet/BOX.md) |
| [`today`](web/shared/today) | [`TodayPage.jsx`](web/shared/today/TodayPage.jsx) | [`parts/`](web/shared/today/parts) | [`today.tray.js`](web/shared/today/today.tray.js) [`today.style.css`](web/shared/today/today.style.css) | [`BOX.md`](web/shared/today/BOX.md) |

### โซน: [`web/styles`](web/styles)

รายการไฟล์ในโซน:
- 📄 [`MOLD-TABLE.md`](web/styles/MOLD-TABLE.md)
- 📄 [`README.md`](web/styles/README.md)

### โซน: [`web/data`](web/data)

รายการไฟล์ในโซน:
- 📄 [`README.md`](web/data/README.md)
- 📄 [`ai.tray.js`](web/data/ai.tray.js)
- 📄 [`dates.tray.js`](web/data/dates.tray.js)

### โซน: [`tools/factory`](tools/factory)

รายการไฟล์ในโซน:
- 📄 [`HOUSE-RULES.md`](tools/factory/HOUSE-RULES.md)
- 📄 [`QA-GUIDE.md`](tools/factory/QA-GUIDE.md)
- 📄 [`README.md`](tools/factory/README.md)
- 📄 [`audit_css_values.py`](tools/factory/audit_css_values.py)
- 📄 [`checker.mjs`](tools/factory/checker.mjs)
- 📄 [`dep_matrix.mjs`](tools/factory/dep_matrix.mjs)
- 📁 [`example_box/`](tools/factory/example_box)
- 📄 [`m_progress.mjs`](tools/factory/m_progress.mjs)
- 📄 [`mapper.mjs`](tools/factory/mapper.mjs)
- 📄 [`rollback.mjs`](tools/factory/rollback.mjs)
- 📁 [`scorecard/`](tools/factory/scorecard)
- 📄 [`tuner.mjs`](tools/factory/tuner.mjs)
- 📄 [`xray.mjs`](tools/factory/xray.mjs)

