
filename = r'c:\Users\jarroyo\Analisis_Descongelado-main\lib\technical-specs.ts'
with open(filename, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i == 84297:
            print(f"Line content: {repr(line)}")
            break
