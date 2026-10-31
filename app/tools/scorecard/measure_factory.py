#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
measure_factory.py — วัดสถิติโรงงาน Frontend Evarel จากโครงสร้างจริงใน repo
ทุกตัวเลขในเอกสารประเมินมาจากสคริปต์นี้ (วัดใหม่ได้ทุกครั้ง ไม่เขียนมือ)
ใช้: python3 scripts/measure_factory.py [ROOT]
ผลลัพธ์: factory_stats.json + รายงานอ่านง่ายทาง stdout
"""
import json, os, re, shutil, subprocess, sys, tempfile

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
CODE_RE = re.compile(r"\.(jsx?|tsx?|css)$", re.I)
JS_RE = re.compile(r"\.(jsx?|tsx?)$", re.I)

def rel(p):
    return os.path.relpath(p, ROOT)

def read(p):
    with open(p, "r", encoding="utf-8", errors="replace") as f:
        return f.read()

def strip_comments(s):
    s = re.sub(r"/\*[\s\S]*?\*/", "", s)
    s = re.sub(r"//[^\n]*", "", s)
    return s

def line_count(s):
    return s.count("\n") + (0 if s.endswith("\n") or not s else 1)

def walk_files(d, predicate=lambda p: True):
    out = []
    for base, _dirs, files in os.walk(d):
        for f in files:
            p = os.path.join(base, f)
            if predicate(p):
                out.append(p)
    return sorted(out)

stats = {}

# ---------- 1) กล่อง 3 ชั้นใน app/pages และ app/shared ----------
CARD_RE = re.compile(
    r"<!-- MACHINE-READABLE-CARD-START -->\s*```json\s*([\s\S]*?)```\s*<!-- MACHINE-READABLE-CARD-END -->")

def inspect_box(boxdir):
    name = os.path.basename(boxdir)
    files = os.listdir(boxdir)
    lower = {f.lower(): f for f in files}
    pascal = "".join(w.capitalize() for w in re.split(r"[-_]", name))
    page = next((lower[k] for k in lower if k in (f"{pascal.lower()}page.jsx", f"{pascal.lower()}page.js", f"{pascal.lower()}page.tsx")), None)
    parts_dir = os.path.join(boxdir, "parts")
    tray = next((f for f in files if f.endswith((".tray.js", ".tray.ts", ".tray.jsx"))), None)
    style = next((f for f in files if f.endswith(".style.css")), None)
    boxmd_file = lower.get("box.md")
    boxmd = read(os.path.join(boxdir, boxmd_file)) if boxmd_file else None
    card = None
    if boxmd:
        m = CARD_RE.search(boxmd)
        if m:
            try:
                card = json.loads(m.group(1))
            except Exception:
                card = "INVALID"
    parts_files = walk_files(parts_dir) if os.path.isdir(parts_dir) else []
    # กฎ BOX-05: ห้าม window นอกถาด (วัดอิสระจาก checker เพื่อกันพลาด)
    win_hits = 0
    for p in walk_files(boxdir, lambda p: bool(JS_RE.search(p))):
        if p.endswith((".tray.js", ".tray.ts")):
            continue
        if re.search(r"\bwindow\s*[\.\[]", strip_comments(read(p))):
            win_hits += 1
    return {
        "name": name, "page": page, "parts_n": len(parts_files),
        "tray": tray, "style": style,
        "box_md": bool(boxmd_file), "card_json": card is not None and card != "INVALID",
        "checklist": bool(boxmd and ("แผ่นตรวจรับ" in boxmd or "Acceptance Checklist" in boxmd)),
        "window_outside_tray": win_hits,
        "has_version_number": bool(re.search(r"v?\d+", name)),
    }

boxes = {}
for zone in ("app/pages", "app/shared"):
    zdir = os.path.join(ROOT, zone)
    zone_boxes = []
    for d in sorted(os.listdir(zdir)):
        full = os.path.join(zdir, d)
        if not os.path.isdir(full) or d.startswith((".", "_")) or d == "README.md":
            continue
        # shared นับเฉพาะโฟลเดอร์ที่มีบัตร BOX.md (กติกาเดียวกับ checker)
        if zone.endswith("shared") and not os.path.exists(os.path.join(full, "BOX.md")):
            continue
        zone_boxes.append(inspect_box(full))
    boxes[zone] = zone_boxes

all_boxes = boxes["app/pages"] + boxes["app/shared"]
boxfile_list = []
for z in boxes:
    for b in boxes[z]:
        boxfile_list += walk_files(os.path.join(ROOT, z, b["name"]), lambda p: bool(CODE_RE.search(p)))
bl = [(rel(p), line_count(read(p)), os.path.getsize(p)) for p in boxfile_list]
box_stats = {
    "zones": {z: len(b) for z, b in boxes.items()},
    "total_boxes": len(all_boxes),
    "full_3layer": sum(1 for b in all_boxes if b["page"] and b["parts_n"] > 0 and b["tray"]),
    "with_style": sum(1 for b in all_boxes if b["style"]),
    "with_boxmd": sum(1 for b in all_boxes if b["box_md"]),
    "with_card_json": sum(1 for b in all_boxes if b["card_json"] is True),
    "with_checklist": sum(1 for b in all_boxes if b["checklist"]),
    "window_outside_tray_total": sum(b["window_outside_tray"] for b in all_boxes),
    "names_with_version_digits": [b["name"] for b in all_boxes if b["has_version_number"]],
}
box_stats["code_files"] = len(bl)
box_stats["max_lines_file"] = max(bl, key=lambda x: x[1]) if bl else None
box_stats["over_300_lines"] = [list(x) for x in bl if x[1] > 300]
box_stats["over_15kb"] = [list(x) for x in bl if x[2] > 15 * 1024]
box_stats["window_outside_tray_files"] = sorted({os.path.dirname(x[0]) for x in bl if False})  # placeholder
stats["boxes"] = box_stats

# ---------- 2) ชั้น engine / core / react ----------
def layer_dir(d):
    fs = walk_files(d, lambda p: bool(JS_RE.search(p)))
    sizes = [(os.path.basename(p), os.path.getsize(p), line_count(read(p))) for p in fs]
    return {
        "files": len(fs), "total_bytes": sum(s for _, s, _ in sizes),
        "max_file": list(max(sizes, key=lambda x: x[1])) if sizes else None,
        "over_15kb": [n for n, s, _ in sizes if s > 15 * 1024],
    }
stats["engine_app"] = layer_dir(os.path.join(ROOT, "app/src/app"))
eng_files = [os.path.basename(p) for p in walk_files(os.path.join(ROOT, "app/src/app"), lambda p: bool(re.search(r"\d{2}-", os.path.basename(p))))]
stats["engine_app"]["numbered_prefixes"] = len(set(re.match(r"\d{2}", f).group(0) for f in eng_files if re.match(r"\d{2}", f)))
stats["core"] = layer_dir(os.path.join(ROOT, "app/src/core"))
stats["react_layer"] = {k: v for k, v in layer_dir(os.path.join(ROOT, "app/src/react")).items() if k != "over_15kb"}
stats["react_layer"]["jsx_files"] = len(walk_files(os.path.join(ROOT, "app/src/react"), lambda p: p.endswith(".jsx")))

# ---------- 3) แม่พิมพ์: CSS ----------
# ค่าฝังตรงที่ผิดกติกา = hex/px "นอกบรรทัดประกาศตัวแปร" (--x: ...) เท่านั้น
css_stats = {}
sdir = os.path.join(ROOT, "app/web/styles")
for f in sorted(os.listdir(sdir)):
    if not f.endswith(".css"):
        continue
    s = strip_comments(read(os.path.join(sdir, f)))
    body_lines = [l for l in s.split("\n") if l.strip() and not re.match(r"^\s*--[\w-]+\s*:", l)]
    body = "\n".join(body_lines)
    css_stats[f] = {
        "vars_declared": len(re.findall(r"--[\w-]+\s*:", s)),
        "var_uses": len(re.findall(r"var\(", s)),
        "hex_in_vars": len(re.findall(r"#[0-9a-fA-F]{3,8}\b", s)) - len(re.findall(r"#[0-9a-fA-F]{3,8}\b", body)),
        "hex_outside_vars": len(re.findall(r"#[0-9a-fA-F]{3,8}\b", body)),
        "px_outside_vars": len(re.findall(r"\b\d+(?:\.\d+)?px\b", body)),
    }
stats["css"] = css_stats
mt = os.path.join(ROOT, "app/styles/MOLD-TABLE.md")
stats["mold_table"] = {"exists": os.path.exists(mt),
                       "vars_rows": len([l for l in read(mt).split("\n") if "`--" in l]) if os.path.exists(mt) else 0}

# ---------- 4) เครื่องมือ ----------
def tool_lines(d):
    out = {}
    for p in walk_files(d, lambda p: p.endswith((".mjs", ".py"))):
        out[rel(p)] = line_count(read(p))
    return out
stats["tools_factory"] = tool_lines(os.path.join(ROOT, "app/tools"))
stats["tools_root"] = tool_lines(os.path.join(ROOT, "tools"))
stats["scripts_root"] = [f for f in os.listdir(os.path.join(ROOT, "scripts")) if not f.startswith(".")]

# ---------- 5) CI ----------
yml = read(os.path.join(ROOT, ".github/workflows/web.yml"))
jobs = re.findall(r"^  (\w[\w-]*):\s*$", yml, re.M)
segs = re.split(r"\n  (?=\w[\w-]*:\s*$)", yml)
steps = {}
for seg in segs:
    m = re.match(r"  (\w[\w-]*):\s*$", seg)
    if m:
        steps[m.group(1)] = len(re.findall(r"^\s*- name:", seg, re.M))
factory_seg = yml.split("\n  factory:")[1].split("\n  deploy-forge:")[0] if "\n  factory:" in yml else ""
stats["ci"] = {"workflow": "web.yml", "jobs": jobs, "named_steps_per_job": steps,
               "factory_gates": [s.strip() for s in re.findall(r"- name: (.+)", factory_seg)]}

# ---------- 6) ทดสอบ ----------
tfiles = [f for f in os.listdir(os.path.join(ROOT, "tests")) if f.endswith(".mjs")]
stats["tests"] = {"files": len(tfiles), "equiv_suites": sum(1 for f in tfiles if "equiv" in f.lower())}

# ---------- 7) เอกสาร ----------
docs_md = walk_files(os.path.join(ROOT, "docs"), lambda p: p.endswith(".md"))
stats["docs"] = {"md_files": len(docs_md), "adr": len([p for p in docs_md if "/adr/" in p]),
                 "factory_step_docs": len([p for p in docs_md if "factory-steps" in p])}

# ---------- 8) git / release ----------
def git(*a):
    return subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True).stdout.strip()
stats["git"] = {"commits": git("rev-list", "--count", "HEAD"),
                "first": git("log", "--reverse", "--format=%ad", "--date=short", "HEAD").split("\n")[0],
                "last": git("log", "-1", "--format=%ad", "--date=short", "HEAD"),
                "branch": git("rev-parse", "--abbrev-ref", "HEAD")}
rel_json = json.loads(read(os.path.join(ROOT, "releases/current.json")))
stats["release"] = {"version": rel_json.get("version"), "date": rel_json.get("date"), "title": str(rel_json.get("title", ""))[:90]}

# ---------- 9) เครื่องมือรันสด (หลักฐานสด ณ วันวัด) ----------
tmpd = tempfile.mkdtemp()
def run_node(script, *args):
    r = subprocess.run(["node", script, *args], cwd=ROOT, capture_output=True, text=True, timeout=120)
    return {"code": r.returncode, "out": (r.stdout + r.stderr).strip()}
chk = run_node("app/tools/checker.mjs", "--all")
stats["live_checker"] = {"pass_boxes": chk["out"].count("[PASS]"), "fail_boxes": chk["out"].count("[FAIL]"), "exit": chk["code"]}
mp = run_node("app/tools/mapper.mjs", os.path.join(tmpd, "FM.md"))
fresh = os.path.exists(os.path.join(tmpd, "FM.md")) and read(os.path.join(tmpd, "FM.md")) == read(os.path.join(ROOT, "docs/FACTORY-MAP.md"))
stats["live_map"] = {"regenerated_ok": mp["code"] == 0, "committed_map_fresh": fresh}
prog = run_node("app/tools/m_progress.mjs")
stats["live_m_progress"] = prog["out"].split("\n")[0][:220]
xray = run_node("app/tools/xray.mjs", "today")
stats["live_xray_example"] = {"ok": xray["code"] == 0}
shutil.rmtree(tmpd, ignore_errors=True)

# ---------- 10) โซนอื่น ๆ (บริบท) ----------
for z in ("app/api", "app/db", "app/edge", "web-next/src", "web-shell/src", "app/data"):
    p = os.path.join(ROOT, z)
    stats.setdefault("other_zones", {})[z] = len(walk_files(p, lambda x: not x.endswith((".lock",)))) if os.path.isdir(p) else 0
stats["shared_root_files"] = [f for f in os.listdir(os.path.join(ROOT, "app/shared")) if os.path.isfile(os.path.join(ROOT, "app/shared", f))]

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "factory_stats.json"), "w", encoding="utf-8") as f:
    json.dump(stats, f, ensure_ascii=False, indent=1, default=str)

# ---------- รายงาน ----------
p = print
p("=" * 70); p("FACTORY MEASUREMENT REPORT —", ROOT); p("=" * 70)
b = stats["boxes"]
p(f"กล่อง: รวม {b['total_boxes']} (pages {b['zones']['app/pages']} + shared {b['zones']['app/shared']}) | ครบ 3 ชั้น {b['full_3layer']} | มี .style {b['with_style']} | BOX.md {b['with_boxmd']} (JSON อ่านได้ {b['with_card_json']} | แผ่นตรวจรับ {b['with_checklist']})")
p(f"กล่อง: ไฟล์โค้ด {b['code_files']} ไฟล์ | ใหญ่สุด {b['max_lines_file']} | เกิน 300 บรรทัด: {len(b['over_300_lines'])} | เกิน 15KB: {len(b['over_15kb'])} | window นอกถาด: {b['window_outside_tray_total']} | ชื่อมีเลขเวอร์ชัน: {b['names_with_version_digits'] or 'ไม่มี'}")
e = stats["engine_app"]; c = stats["core"]; r = stats["react_layer"]
p(f"engine app/src/app: {e['files']} ไฟล์ {e['total_bytes']:,}B ชั้น {stats['engine_app']['numbered_prefixes']} ใหญ่สุด {e['max_file']} | เกิน 15KB: {e['over_15kb']}")
p(f"core: {c['files']} ไฟล์ {c['total_bytes']:,}B | react: {r['files']} ไฟล์ (jsx {r['jsx_files']})")
p("CSS: " + " | ".join(f"{k}: ตัวแปร {v['vars_declared']} var() {v['var_uses']} hexนอกตัวแปร {v['hex_outside_vars']} pxนอกตัวแปร {v['px_outside_vars']}" for k, v in stats["css"].items()))
p(f"MOLD-TABLE: {stats['mold_table']['vars_rows']} แถวตัวแปร")
p(f"เครื่องมือ app/tools: {len(stats['tools_factory'])} ไฟล์ | root tools: {len(stats['tools_root'])} ไฟล์ | scripts: {len(stats['scripts_root'])}")
p(f"CI jobs: {stats['ci']['jobs']} ขั้นต่อ job: {stats['ci']['named_steps_per_job']}")
p(f"factory gates: {stats['ci']['factory_gates']}")
p(f"tests: {stats['tests']['files']} ไฟล์ (equiv {stats['tests']['equiv_suites']}) | docs md: {stats['docs']['md_files']} (adr {stats['docs']['adr']}, factory-steps {stats['docs']['factory_step_docs']})")
p(f"git: {stats['git']['commits']} commits ({stats['git']['first']} → {stats['git']['last']}) | release {stats['release']['version']} ({stats['release']['date']})")
p(f"สด: checker PASS {stats['live_checker']['pass_boxes']} FAIL {stats['live_checker']['fail_boxes']} exit {stats['live_checker']['exit']} | แผนที่สดใหม่: {stats['live_map']['committed_map_fresh']}")
p(f"m_progress: {stats['live_m_progress'][:150]}")
p(f"โซนอื่น: {stats['other_zones']} | ไฟล์ราก shared: {stats['shared_root_files']}")
