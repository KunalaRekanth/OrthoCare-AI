import os
import json
import sys
from pathlib import Path

# Try to import Pillow (PIL)
try:
    from PIL import Image
except ImportError:
    print("Pillow library is required. Installing it now via pip...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "public" / "dataset"
OUTPUT_JSON = DATASET_DIR / "metadata.json"

def calculate_dhash(image_path: Path, hash_size=8) -> str:
    """
    Computes difference hash (dHash) for an image.
    dHash is highly resilient to resizing and minor color changes.
    """
    try:
        with Image.open(image_path) as img:
            # Convert to grayscale and resize to (hash_size + 1) x hash_size
            # 9x8 pixels allows us to do 8 comparisons per row across 8 rows (64 bits)
            img = img.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
            pixels = list(img.getdata())
            
            difference = []
            for row in range(hash_size):
                for col in range(hash_size):
                    pixel_left = pixels[row * (hash_size + 1) + col]
                    pixel_right = pixels[row * (hash_size + 1) + col + 1]
                    difference.append(pixel_left > pixel_right)
            
            # Convert binary list to hex string
            decimal_value = 0
            hex_string = []
            for index, value in enumerate(difference):
                if value:
                    decimal_value += 2**(index % 8)
                if (index % 8) == 7:
                    hex_string.append(hex(decimal_value)[2:].zfill(2))
                    decimal_value = 0
            return ''.join(hex_string)
    except Exception as e:
        print(f"Error hashing {image_path.name}: {e}")
        return ""

def guess_severity_and_suggestions(filename: str):
    """
    Guesses severity and suggestions based on file names.
    Users can edit the metadata.json later manually.
    """
    name_lower = filename.lower()
    
    if any(k in name_lower for k in ["severe", "trauma", "break", "tmj", "emergency"]):
        return {
            "severity": "severe",
            "condition": "Severe Orthodontic Issue",
            "score": 85,
            "suggestions": [
                "Immediate consultation with your orthodontist is strongly recommended.",
                "Seek emergency dental care if pain or bleeding is present.",
                "Do not attempt to fix or adjust the appliance yourself."
            ]
        }
    elif any(k in name_lower for k in ["moderate", "debond", "bracket", "gums", "bleeding"]):
        return {
            "severity": "moderate",
            "condition": "Moderate Orthodontic Issue",
            "score": 55,
            "suggestions": [
                "Schedule a clinical appointment with your orthodontist in the next 1-2 weeks.",
                "Avoid hard, crunchy, or sticky foods that might cause further damage.",
                "Maintain strict oral hygiene to avoid inflammation."
            ]
        }
    else:
        # Default minor
        return {
            "severity": "minor",
            "condition": "Minor Orthodontic Issue",
            "score": 25,
            "suggestions": [
                "Apply orthodontic wax to alleviate any rubbing or sharp spots.",
                "Continue standard tooth brushing and flossing daily.",
                "Mention this issue at your next scheduled appointment."
            ]
        }

def main():
    if not DATASET_DIR.exists():
        print(f"Creating dataset directory at {DATASET_DIR}")
        DATASET_DIR.mkdir(parents=True, exist_ok=True)
        
    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    images = [p for p in DATASET_DIR.iterdir() if p.suffix.lower() in image_extensions]
    
    if not images:
        print(f"\n[!] No images found in: {DATASET_DIR}")
        print("Please copy your 100 images into that folder and run this script again.")
        # Create a sample template so the app runs smoothly
        sample_data = [
            {
                "filename": "sample_case.jpg",
                "hash": "8f8f8f8f8f8f8f8f",
                "severity": "minor",
                "condition": "Sample Poking Wire",
                "score": 15,
                "suggestions": ["Apply orthodontic wax to poking wire", "Brush carefully"]
            }
        ]
        with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
            json.dump(sample_data, f, indent=2)
        print(f"Created a dummy metadata.json file at {OUTPUT_JSON}")
        return

    print(f"Processing {len(images)} images in {DATASET_DIR}...")
    
    dataset_metadata = []
    for img_path in images:
        img_hash = calculate_dhash(img_path)
        if not img_hash:
            continue
            
        defaults = guess_severity_and_suggestions(img_path.name)
        dataset_metadata.append({
            "filename": img_path.name,
            "hash": img_hash,
            **defaults
        })
        
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(dataset_metadata, f, indent=2)
        
    print(f"\n[+] Success! Processed {len(dataset_metadata)} images.")
    print(f"Saved metadata to: {OUTPUT_JSON}")
    print("You can open this JSON file to customize descriptions/suggestions for any image.")

if __name__ == "__main__":
    main()
