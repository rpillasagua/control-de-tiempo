
file_path = 'lib/technical-specs.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if '"code": "00236"' in line:
            print(f"00236 found at line {i+1}")
            start_line = i
        
        if 'start_line' in locals() and i - start_line < 50:
            if "preservative" in line:
                print(f"Line {i+1}: {line.strip()[:100]}...")
