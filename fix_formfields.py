import re
import os

SRC_DIR = 'D:/Dev/testing_fog/front-end/.claude/worktrees/elegant-faraday/src'
FORM_FIELDS_SRC = os.path.join(SRC_DIR, 'components', 'FormFields.jsx')

def find_jsx_files(directory):
    results = []
    for root, dirs, files in os.walk(directory):
        for fname in files:
            if fname.endswith('.jsx'):
                results.append(os.path.join(root, fname))
    return results

def get_relative_path(from_file):
    from_dir = os.path.dirname(from_file)
    to_file = os.path.join(SRC_DIR, 'components', 'FormFields')
    rel = os.path.relpath(to_file, from_dir).replace(os.sep, "/")
    if not rel.startswith('.'):
        rel = './' + rel
    return rel

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    crlf = chr(13) + chr(10)
    lf = chr(10)
    content = content.replace(crlf, lf)
    uses_text_input  = bool(re.search(r'<TextInput[s/>]', content))
    uses_select_comp = bool(re.search(r'<Select[s/>]', content))
    uses_textarea    = bool(re.search(r'<Textarea[s/>]', content))
    if not uses_text_input and not uses_select_comp and not uses_textarea:
        return False, []
    if uses_text_input:
        content = re.sub(r'<TextInput(?=[s/>])', '<CustomInput', content)
    if uses_select_comp:
        content = re.sub(r'<Select(?=[s/>])', '<CustomSelect', content)
        content = re.sub(r'</Select>', '</CustomSelect>', content)
    if uses_textarea:
        content = re.sub(r'<Textarea(?=[s/>])', '<CustomTextarea', content)
        content = re.sub(r'</Textarea>', '</CustomTextarea>', content)
    to_remove = {'TextInput', 'Select', 'Textarea'}
    def replace_flowbite_import(m):
        names_str = m.group(1)
        parts = [p.strip() for p in names_str.split(',') if p.strip()]
        remaining = [p for p in parts if p not in to_remove]
        if not remaining:
            return ''
        return 'import { ' + ', '.join(remaining) + ' } from' + ' ' + chr(34) + 'flowbite-react' + chr(34) + ';'
    content = re.sub(r'imports*{([^}]*)}s*froms*["']flowbite-react["'];?', replace_flowbite_import, content, flags=re.DOTALL)
    content = re.sub(r'
{3,}', chr(10)*2, content)
    used_custom = []
    if uses_text_input:  used_custom.append('CustomInput')
    if uses_select_comp: used_custom.append('CustomSelect')
    if uses_textarea:    used_custom.append('CustomTextarea')
    rel_path = get_relative_path(file_path)
    import_statement = 'import { ' + ', '.join(used_custom) + ' } from ' + chr(34) + rel_path + chr(34) + ';'
    q = chr(34)
    already_has = ('from ' + q + rel_path + q) in content or ("from '" + rel_path + "'") in content
    if not already_has:
        last_end = -1
        for m in re.finditer(r'froms+["'][^"']+["'];?s*$', content, re.MULTILINE):
            last_end = m.end()
        if last_end == -1:
            content = import_statement + chr(10) + content
        else:
            content = content[:last_end] + chr(10) + import_statement + content[last_end:]
    else:
        def update_ff_import(m):
            existing_names = m.group(1)
            existing = [s.strip() for s in existing_names.split(',') if s.strip()]
            all_needed = list(existing)
            for c in used_custom:
                if c not in all_needed:
                    all_needed.append(c)
            return 'import { ' + ', '.join(all_needed) + ' } from ' + chr(34) + rel_path + chr(34)
        content = re.sub(r'imports*{([^}]*)}s*froms*["']([^"']*FormFields)["']', update_ff_import, content)
    if content != original.replace(chr(13)+chr(10), chr(10)):
        with open(file_path, 'w', encoding='utf-8', newline=chr(10)) as f:
            f.write(content)
        return True, used_custom
    return False, []

files = find_jsx_files(SRC_DIR)
modified = []

for fp in sorted(files):
    if os.path.abspath(fp) == os.path.abspath(FORM_FIELDS_SRC):
        continue
    changed, replaced = process_file(fp)
    if changed:
        rel = os.path.relpath(fp, SRC_DIR).replace(os.sep, "/")
        modified.append({'file': rel, 'replaced': replaced})

print('')
print('=== Summary ===')
print('')
if not modified:
    print('No files were modified.')
else:
    print(f'Modified {len(modified)} file(s):')
    print('')
    for item in modified:
        print(f"  {item['file']}")
        print(f"    -> Replaced: {', '.join(item['replaced'])}")
print('')
print('Done.')