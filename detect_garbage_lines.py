
import re

file_path = 'lib/technical-specs.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_scanning = False
suspicious_lines = []

# Regex strictly for object properties or structure
pattern_valid = re.compile(r'^\s*("|})(\s*:\s*(\{|\[|".*|[-0-9.]+|null|true|false))?,?$')
pattern_brace_open = re.compile(r'^\s*[\{\[]$')

for i, line in enumerate(lines):
    if "export const TECHNICAL_SPECS" in line:
        start_scanning = True
        continue
    
    if not start_scanning:
        continue
        
    if "};" in line and line.strip() == "};":
        # End of object, roughly
        start_scanning = False
        continue

    line_strip = line.strip()
    if not line_strip: continue
    
    if pattern_valid.match(line) or pattern_brace_open.match(line):
        continue
    
    suspicious_lines.append((i+1, line.strip()))

print(f"Suspicious lines inside TECHNICAL_SPECS: {len(suspicious_lines)}")
for i, l in suspicious_lines[:50]:
    print(f"Line {i}: {l[:100]}...")
