
filename = r'c:\Users\jarroyo\Analisis_Descongelado-main\lib\technical-specs.ts'
with open(filename, 'rb') as f:
    for i, line in enumerate(f):
        if i == 84297:  # 0-indexed, so line 84298
            print(f"Line {i+1}: {line}")
            print(f"Hex: {line.hex()}")
            break
