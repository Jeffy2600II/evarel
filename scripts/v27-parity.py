#!/usr/bin/env python3
"""Path: scripts/v27-parity.py | Purpose: ตรวจความเท่ากันเชิงโครงสร้างระหว่างเดโม v27 กับแอปที่เสิร์ฟจริง โดยไม่เปิดเบราว์เซอร์
Master สั่ง 10 พ.ย. 2026: ห้ามเริ่มจากการกดทดสอบ ให้เริ่มจากโครงสร้าง/โค้ด แล้วค่อยตรวจผลรวมครั้งท้าย

ตรวจ 5 แกน (ทั้งหมดอ่านโค้ด ไม่รันหน้าเว็บ):
  1 SEAMS   : adapter ที่แอปใช้ต้องเป็นตัวจริง ไม่ใช่ Mock* (Repo/Auth/AiApi/Push)
  2 DATA    : ต้องไม่เก็บข้อมูลผู้ใช้ลง localStorage (เดโมทำได้ แอปจริงห้าม)
  3 API     : ทุก endpoint ที่แอปเรียก ต้องมีอยู่ใน backend/api/src/router.ts
  4 STRUCT  : จำนวนโมดูล/ฟังก์ชันของเดโม ต้องครบในแอปที่สร้าง
  5 REGRESS : ความสามารถที่ระบบเดิมมี ต้องไม่หายไปเงียบ ๆ (รายงานให้ตรวจ ไม่ตัดสินแทน)

ใช้: python3 scripts/v27-parity.py [--json]
ผล: exit 1 ถ้ามี FAIL (ใช้เป็นประตูกันการประกาศว่า "ทำครบ" ทั้งที่ยังไม่ครบ)
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEMO = ROOT / 'archive/design/Ordivel-v27.html'
APP = ROOT / 'web/app27/index.html'
ROUTER = ROOT / 'backend/api/src/router.ts'

# endpoint ที่แอปอาจเรียก (จับจาก apiFetch/fetch ในไฟล์แอป)
EP_RE = re.compile(r"""(?:apiFetch|fetch)\(\s*[`'"](?:API\s*\+\s*)?[`'"]?\s*\$\{?[^`'"]*?[`'"]?""")

# ความสามารถที่ระบบเดิม (engine) มี — ต้องมีร่องรอยในแอปใหม่ ไม่งั้นคือของหาย
REGRESS_KEYS = [
    ('live sync ข้ามแท็บ/เครื่อง', r'live-?sync|BroadcastChannel|storage\s*event'),
    ('ตรวจรุ่นใหม่/อัปเดตแอป', r'release\.json|updateReady|skipWaiting'),
    ('ส่งออก/นำเข้าข้อมูล', r'exportData|importData'),
    ('ลบบัญชี', r'deleteAccount|/auth/account'),
    ('แจ้งเตือนถึงเครื่อง', r'push/subscribe|registerPush'),
    ('ความจำ AI', r'/ai/memory|aiMemory'),
]


def read(p: Path) -> str:
    return p.read_text(encoding='utf8') if p.exists() else ''


def funcs(txt: str) -> set:
    return set(re.findall(r'\b(?:function|const|let)\s+([A-Za-z_$][\w$]{2,})', txt))


def main() -> int:
    demo = read(DEMO)
    app = read(APP)
    router = read(ROUTER)
    as_json = '--json' in sys.argv
    fails, warns, rows = [], [], []

    def check(axis: str, name: str, ok: bool, detail: str = '') -> None:
        rows.append({'axis': axis, 'name': name, 'ok': ok, 'detail': detail})
        if not ok:
            fails.append(f'[{axis}] {name} {detail}')

    # 0 ไฟล์ครบ
    for p in (DEMO, APP, ROUTER):
        check('FILE', f'มีไฟล์ {p.relative_to(ROOT)}', p.exists())

    # 1 SEAMS
    mock_left = sorted(set(re.findall(r'const\s+(\w+)\s*=\s*Mock\w+', app)))
    check('SEAMS', 'ไม่มี adapter ตัวจำลองเหลือในแอป', not mock_left, f'เหลือ: {", ".join(mock_left)}' if mock_left else '')
    for seam, pat in [('Repo', r'const Repo=\{[^}]*apiFetch'), ('Auth', r'const Auth=RealAuth'),
                      ('AiApi', r'apiFetch\(\'/ai/quota\'\)'), ('Push', r'registerPushReal')]:
        check('SEAMS', f'{seam} ต่อของจริง', bool(re.search(pat, app)))

    # 2 DATA (ข้อมูลผู้ใช้ห้ามอยู่ใน localStorage ของแอปจริง)
    bad_store = bool(re.search(r'LS\.setItem\(uk\(STORE_KEY\)', app))
    check('DATA', 'ไม่เก็บรายการผู้ใช้ใน localStorage', not bad_store,
          'ยังพบ LS.setItem(uk(STORE_KEY)) — ข้อมูลจะไม่ตรงกับเซิร์ฟเวอร์' if bad_store else '')

    # 3 API contract
    used = set(re.findall(r"apiFetch\(\s*'([^']+)'", app)) | set(re.findall(r"fetch\(API\s*\+\s*'([^']+)'", app))
    used = {u.split('?')[0] for u in used}
    routes = set(re.findall(r"path === '(/api/[^']+)'", router))
    routes |= set(re.findall(r"path\.startsWith\('(/api/[^']+)'\)", router))
    missing = sorted(u for u in used if f'/api{u}' not in routes and not any(f'/api{u}'.startswith(r) for r in routes))
    check('API', f'endpoint ที่แอปเรียกมีใน API ({len(used)} เส้น)', not missing, f'ขาด: {", ".join(missing)}' if missing else '')

    # 4 STRUCT
    mods_demo = re.findall(r'MODULE:\s*([\w/]+)', demo)
    mods_app = re.findall(r'MODULE:\s*([\w/]+)', app)
    check('STRUCT', f'จำนวนโมดูลครบ ({len(mods_demo)})', len(mods_app) >= len(mods_demo), f'แอปมี {len(mods_app)}')
    fd, fa = funcs(demo), funcs(app)
    # ฟังก์ชันที่ตั้งใจถอด (ตัวจำลองของเดโม) — ต้องประกาศไว้ ไม่ใช่เงียบ ๆ
    ALLOW_REMOVE = {'LocalAdapter': 'ตัวเก็บข้อมูลลง localStorage ถูกถอดตามดีไซน์ (ข้อมูลอยู่ที่เซิร์ฟเวอร์)',
                    'MockAuth': 'บัญชีจำลอง', 'MockAi': 'AI จำลอง',
                    'USERS_KEY': 'ที่เก็บบัญชีจำลอง', 'SESSION_KEY': 'session ของบัญชีจำลอง',
                    'AUTH_DELAY_MS': 'หน่วงเวลาปลอมของบัญชีจำลอง', 'readUsers': 'อ่านบัญชีจำลอง',
                    'writeUsers': 'เขียนบัญชีจำลอง', 'pubUser': 'แปลงบัญชีจำลอง',
                    'DEMO_GOOGLE': 'โปรไฟล์ Google ปลอม', 'newId': 'สร้าง id ปลอม',
                    'CODE_TTL_MS': 'อายুরหัสของบัญชีจำลอง', 'CODE_MAX_TRIES': 'จำนวนครั้งรหัสจำลอง',
                    'PENDING': 'รหัสยืนยันที่เก็บในเครื่อง', 'hashPw': 'แฮชรหัสฝั่งเครื่อง (ของจริงทำที่เซิร์ฟเวอร์)',
                    'issueCode': 'ออกรหัสยืนยันฝั่งเครื่อง', 'genCode': 'สร้างรหัสฝั่งเครื่อง', 'code': 'ตัวแปรรหัสของบัญชีจำลอง',
                    'buf': 'ตัวแปรภายในของ hashPw', 'DEMO': 'ธงโหมดเดโม',
                    'SIM_PRESETS': 'ชุดตัวเลขจำลองการใช้ AI', 'freshUsage': 'สร้างค่าการใช้ปลอม',
                    'mockUsage': 'อ่านค่าการใช้ปลอม', 'saveMockUsage': 'บันทึกค่าการใช้ปลอม',
                    'usageView': 'แปลงค่าการใช้ของเดโม', 'bkkDay': 'วันของเดโม',
                    'USAGE_KEY': 'กุญแจเก็บค่าการใช้ปลอม', 'AI_REPLY_MS': 'หน่วงคำตอบ AI ของเดโม',
                    'demoCodeNote': 'แบนเนอร์โชว์รหัสยืนยันบนจอ (ของจริงส่งทางอีเมล)'}
    lost = sorted(fd - fa - set(ALLOW_REMOVE))
    check('STRUCT', f'ฟังก์ชันเดโมอยู่ครบ ({len(fd)})', not lost, f'หาย {len(lost)}: {", ".join(lost[:8])}' if lost else '')

    # 5 REGRESS
    for label, pat in REGRESS_KEYS:
        hit = bool(re.search(pat, app, re.I))
        rows.append({'axis': 'REGRESS', 'name': label, 'ok': hit, 'detail': '' if hit else 'ไม่พบร่องรอยในแอปใหม่'})
        if not hit:
            warns.append(label)

    if as_json:
        print(json.dumps({'rows': rows, 'fails': fails, 'warns': warns}, ensure_ascii=False, indent=1))
    else:
        for r in rows:
            mark = 'PASS' if r['ok'] else ('FAIL' if r['axis'] != 'REGRESS' else 'WARN')
            print(f"{mark} {r['axis']:8s} {r['name']}{(' :: ' + r['detail']) if r['detail'] else ''}")
        print(f"\nสรุป: FAIL {len(fails)} · WARN {len(warns)}")
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
