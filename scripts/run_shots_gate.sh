#!/usr/bin/env bash
# ประตูภาพ 30 ฉาก: ผ่านก็ต่อเมื่อเครื่องถ่ายภาพพิมพ์ "ALL OK 30" เองและนับ PASS ได้ 30 | EXIT=0 ที่ต่อท้ายด้วยเชลล์ไม่ใช่หลักฐาน (timeout ตัดกลางทางก็ได้ 0)
# ใช้: bash scripts/run_shots_gate.sh <ไฟล์log>   ผลสุดท้ายในบรรทัด GATE= PASS30 | INCOMPLETE n/30 | FAIL n
cd "$(dirname "$0")/.." || exit 2
LOG="${1:-/tmp/shots-gate.log}"; : > "$LOG"
timeout 1500 node tests/baseline_shots.mjs --compare docs/plan/baseline/shots >> "$LOG" 2>&1
P=$(grep -c '^PASS' "$LOG"); F=$(grep -c '^FAIL' "$LOG")
if [ "$F" -gt 0 ]; then echo "GATE=FAIL $F" >> "$LOG"
elif [ "$P" -eq 30 ] && grep -q 'ALL OK 30' "$LOG"; then echo "GATE=PASS30" >> "$LOG"
else echo "GATE=INCOMPLETE $P/30" >> "$LOG"; fi
