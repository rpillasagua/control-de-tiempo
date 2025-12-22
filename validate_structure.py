
filename = r'c:\Users\jarroyo\Analisis_Descongelado-main\lib\technical-specs.ts'

stack = []

with open(filename, 'r', encoding='utf-8') as f:
    text = f.read()

for i, char in enumerate(text):
    if char in '{[':
        stack.append((char, i))
    elif char in '}]':
        if not stack:
            print(f"Error: Unexpected closer '{char}' at index {i}")
            break
        
        last_char, last_idx = stack.pop()
        
        if char == '}' and last_char != '{':
            print(f"Error: Mismatched braces at index {i}. Expected }} closing {{ from {last_idx}, found {last_char}")
            break
        if char == ']' and last_char != '[':
            print(f"Error: Mismatched brackets at index {i}. Expected ] closing [ from {last_idx}, found {last_char}")
            break

if stack:
    print(f"Error: Unclosed brackets/braces at end of file.")
    for char, idx in stack:
        print(f"  Unclosed '{char}' from index {idx}")
else:
    print("Structure seems correct (stack empty, no mismatches).")
