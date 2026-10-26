#!/usr/bin/env python3
"""audit_css_values.py : บัญชีค่าที่ใช้จริงใน CSS (F1.2) วัดจากไฟล์ตรงๆ ไม่คัดจากตัวเลขเก่า
ใช้: python3 app/tools/audit_css_values.py [--json out.json]
นับนอกคอมเมนต์ แยก (ก) ค่าที่ประกาศเป็นตัวแปรใน :root (ข) ค่าฝังตรงนอกการประกาศตัวแปร"""
import re,sys,json,collections,os
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','web','styles')
FILES=['app.css','design.css','extra.css']
def strip(s): return re.sub(r'/\*.*?\*/','',s,flags=re.S)
def split_decl(s):
    """ คืน (บรรทัดประกาศตัวแปร --x: ..., ส่วนที่เหลือ) """
    decl=re.findall(r'--[\w-]+\s*:[^;{}]*',s)
    rest=re.sub(r'--[\w-]+\s*:[^;{}]*','',s)
    return decl,rest
out={}
for f in FILES:
    s=strip(open(os.path.join(ROOT,f),encoding='utf8').read())
    decl,rest=split_decl(s)
    hx=lambda t:[h.lower() for h in re.findall(r'#[0-9a-fA-F]{3,8}\b',t)]
    px=lambda t:re.findall(r'(?<![\w.])-?\d+(?:\.\d+)?px\b',t)
    d_h,d_p=hx(' '.join(decl)),px(' '.join(decl))
    r_h,r_p=hx(rest),px(rest)
    out[f]={'ประกาศเป็นตัวแปร':{'ตัวแปร':len(decl),'hex':len(d_h),'px':len(d_p)},
            'ฝังตรง':{'hex':len(r_h),'hex_ไม่ซ้ำ':len(set(r_h)),'px':len(r_p),'px_ไม่ซ้ำ':len(set(r_p)),
                      'hex_บ่อยสุด':collections.Counter(r_h).most_common(8),'px_บ่อยสุด':collections.Counter(r_p).most_common(8)},
            'ใช้ var()':len(re.findall(r'var\(--',s))}
if '--json' in sys.argv:
    json.dump(out,open(sys.argv[sys.argv.index('--json')+1],'w',encoding='utf8'),ensure_ascii=False,indent=1)
for f,v in out.items():
    print(f); print('  ตัวแปรที่ประกาศ',v['ประกาศเป็นตัวแปร']['ตัวแปร'],'| ใช้ var()',v['ใช้ var()'])
    h=v['ฝังตรง']; print('  ฝังตรง: hex',h['hex'],f"(ไม่ซ้ำ {h['hex_ไม่ซ้ำ']}) px",h['px'],f"(ไม่ซ้ำ {h['px_ไม่ซ้ำ']})")
