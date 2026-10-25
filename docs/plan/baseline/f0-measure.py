import os
import glob
import re
import json

REPO_DIR = '/tmp/evarel-repo'

def get_file_stats(pattern):
    paths = glob.glob(os.path.join(REPO_DIR, pattern))
    # Sort for deterministic output
    paths.sort()
    total_bytes = 0
    file_list = []
    for p in paths:
        if os.path.isfile(p):
            size = os.path.getsize(p)
            total_bytes += size
            file_list.append({
                'rel_path': os.path.relpath(p, REPO_DIR),
                'size': size
            })
    return {
        'count': len(file_list),
        'total_bytes': total_bytes,
        'files': file_list
    }

def strip_comments(text):
    # Regex to remove single-line // ... and multi-line /* ... */
    # Note: Handles strings if regex avoids string literals, or standard comment stripping:
    # re.sub(r'/\*[\s\S]*?\*/|//.*', '', text)
    pattern = r'/\*[\s\S]*?\*/|//.*'
    return re.sub(pattern, '', text)

# (ก) File count & byte sizes
part_a = {
    'app/src/m/*.ts': get_file_stats('app/src/m/*.ts'),
    'app/src/react/*.jsx': get_file_stats('app/src/react/*.jsx'),
    'app/src/react/*.js': get_file_stats('app/src/react/*.js'),
    'app/src/core/*.ts': get_file_stats('app/src/core/*.ts'),
}

# (ข) Per file in app/src/m/*.ts: Object.assign(window, import lines, export lines
m_ts_files = glob.glob(os.path.join(REPO_DIR, 'app/src/m/*.ts'))
m_ts_files.sort()

part_b = []
for p in m_ts_files:
    if not os.path.isfile(p):
        continue
    with open(p, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    lines = content.splitlines()
    
    has_obj_assign_window = 'Object.assign(window' in content
    
    import_lines_start = sum(1 for line in lines if line.strip().startswith('import'))
    export_lines_start = sum(1 for line in lines if line.strip().startswith('export'))
    
    import_lines_strict = sum(1 for line in lines if line.startswith('import'))
    export_lines_strict = sum(1 for line in lines if line.startswith('export'))

    part_b.append({
        'file': os.path.relpath(p, REPO_DIR),
        'has_object_assign_window': has_obj_assign_window,
        'import_lines_strip': import_lines_start,
        'export_lines_strip': export_lines_start,
        'import_lines_strict': import_lines_strict,
        'export_lines_strict': export_lines_strict,
    })

# Summary for part_b:
part_b_summary = {
    'total_files': len(part_b),
    'files_with_object_assign_window': sum(1 for item in part_b if item['has_object_assign_window']),
    'files_with_no_import_strip': sum(1 for item in part_b if item['import_lines_strip'] == 0),
    'files_with_no_import_strict': sum(1 for item in part_b if item['import_lines_strict'] == 0),
    'files': part_b
}

# (ค) Per file in app/src/m and app/src/react: count window. vs window standalone (after stripping comments)
def count_window_in_dir(dir_pattern):
    paths = glob.glob(os.path.join(REPO_DIR, dir_pattern))
    paths.sort()
    
    file_results = []
    total_window_dot = 0
    total_window_standalone = 0
    
    for p in paths:
        if not os.path.isfile(p):
            continue
        with open(p, 'r', encoding='utf-8', errors='ignore') as f:
            raw_text = f.read()
            
        clean_text = strip_comments(raw_text)
        
        # window. pattern
        win_dot_matches = re.findall(r'\bwindow\.', clean_text)
        win_dot_count = len(win_dot_matches)
        
        # window standalone (not followed by dot)
        win_standalone_matches = re.findall(r'\bwindow\b(?!\.)', clean_text)
        win_standalone_count = len(win_standalone_matches)
        
        total_window_dot += win_dot_count
        total_window_standalone += win_standalone_count
        
        file_results.append({
            'file': os.path.relpath(p, REPO_DIR),
            'window_dot': win_dot_count,
            'window_standalone': win_standalone_count,
            'window_total': win_dot_count + win_standalone_count
        })
        
    return {
        'total_window_dot': total_window_dot,
        'total_window_standalone': total_window_standalone,
        'total_window': total_window_dot + total_window_standalone,
        'files': file_results
    }

part_c = {
    'app/src/m': count_window_in_dir('app/src/m/*'),
    'app/src/react': count_window_in_dir('app/src/react/*')
}

# (ง) In app/web/styles/app.css, design.css, extra.css
css_files = ['app/web/styles/app.css', 'app/web/styles/design.css', 'app/web/styles/extra.css']
part_d = {}

for rel_css in css_files:
    full_path = os.path.join(REPO_DIR, rel_css)
    if not os.path.exists(full_path):
        part_d[rel_css] = {'exists': False}
        continue
    
    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
        css_text = f.read()
    
    lines_count = len(css_text.splitlines())
    hex_colors = re.findall(r'#[0-9a-fA-F]{3,8}\b', css_text)
    px_values = re.findall(r'\b\d+px', css_text)
    var_c_matches = re.findall(r'--c-[a-zA-Z0-9_-]+', css_text)
    unique_var_c = sorted(list(set(var_c_matches)))
    
    part_d[rel_css] = {
        'exists': True,
        'lines': lines_count,
        'hex_count': len(hex_colors),
        'px_count': len(px_values),
        'unique_c_vars_count': len(unique_var_c),
        'unique_c_vars': unique_var_c
    }

# (จ) จำนวนไฟล์ทดสอบใน tests/ ที่ไม่ขึ้นต้นด้วย _ และที่ขึ้นต้นด้วย _
tests_dir = os.path.join(REPO_DIR, 'tests')
tests_with_underscore = []
tests_without_underscore = []

if os.path.exists(tests_dir):
    for entry in os.listdir(tests_dir):
        entry_path = os.path.join(tests_dir, entry)
        if os.path.isfile(entry_path):
            if entry.startswith('_'):
                tests_with_underscore.append(entry)
            else:
                tests_without_underscore.append(entry)

part_e = {
    'without_underscore_count': len(tests_without_underscore),
    'without_underscore_files': sorted(tests_without_underscore),
    'with_underscore_count': len(tests_with_underscore),
    'with_underscore_files': sorted(tests_with_underscore)
}

baseline_data = {
    'part_a_files_and_sizes': part_a,
    'part_b_m_ts_imports_exports_assign': part_b_summary,
    'part_c_window_counts': part_c,
    'part_d_css_metrics': part_d,
    'part_e_tests_counts': part_e
}

with open('/tmp/f0_baseline.json', 'w', encoding='utf-8') as f:
    json.dump(baseline_data, f, indent=2, ensure_ascii=False)

print("Baseline script executed successfully.")
