import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

# Path to the docx file
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOCX_PATH = PROJECT_ROOT / "public" / "dataset" / "1 to 10 experiments.docx"

# If not found there, try other places
if not DOCX_PATH.exists():
    # Let's search under root
    matches = list(PROJECT_ROOT.glob("**/1 to 10 experiments.docx"))
    if matches:
        DOCX_PATH = matches[0]

def read_docx(docx_path):
    print(f"Reading Word Document: {docx_path}")
    try:
        with zipfile.ZipFile(docx_path) as docx:
            # Word files contain a file 'word/document.xml' containing all text
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # XML Namespaces
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            # Find all paragraph tags
            paragraphs = []
            for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                # Extract text runs
                texts = [node.text for node in para.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            
            return "\n".join(paragraphs)
    except Exception as e:
        return f"Error reading document: {e}"

if __name__ == "__main__":
    content = read_docx(DOCX_PATH)
    print("\n--- WORD DOCUMENT CONTENT ---")
    print(content)
    print("-----------------------------\n")
    
    # Save the extracted text to a text file for reference
    output_txt = PROJECT_ROOT / "scratch" / "extracted_experiments.txt"
    with open(output_txt, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Extracted content saved to {output_txt}")
