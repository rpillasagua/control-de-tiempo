
import os
from pypdf import PdfReader

def read_all_pdfs(directory):
    output_file = r"c:\Users\jarroyo\Analisis_Descongelado-main\all_pdfs_content.txt"
    
    with open(output_file, "w", encoding="utf-8") as f:
        # List all PDF files
        files = [file for file in os.listdir(directory) if file.lower().endswith('.pdf')]
        files.sort() # Sort numerical/alphabetical
        
        for filename in files:
            path = os.path.join(directory, filename)
            try:
                reader = PdfReader(path)
                f.write(f"\n--- START OF {filename} ---\n")
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        f.write(text)
                        f.write("\n")
                f.write(f"\n--- END OF {filename} ---\n")
                print(f"Processed {filename}")
            except Exception as e:
                f.write(f"\nError reading {filename}: {e}\n")
                print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    directory = r"c:\Users\jarroyo\Analisis_Descongelado-main\fichas"
    read_all_pdfs(directory)
