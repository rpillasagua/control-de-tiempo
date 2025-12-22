
filename = r'c:\Users\jarroyo\Analisis_Descongelado-main\lib\technical-specs.ts'

with open(filename, 'r', encoding='utf-8') as f:
    text = f.read()

balance_curly = 0
balance_square = 0

for i, char in enumerate(text):
    if char == '{':
        balance_curly += 1
    elif char == '}':
        balance_curly -= 1
    elif char == '[':
        balance_square += 1
    elif char == ']':
        balance_square -= 1
    
    if balance_curly < 0:
        print(f"Negative curly balance at char {i}")
        break
    if balance_square < 0:
        print(f"Negative square balance at char {i}")
        break

print(f"Final Curly Balance: {balance_curly}")
print(f"Final Square Balance: {balance_square}")
