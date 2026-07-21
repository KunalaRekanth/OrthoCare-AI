import os
import json
import sys
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── Dependency Setup ─────────────────────────────────────────────────────────
try:
    from PIL import Image
except ImportError:
    print("Pillow library is required. Installing now...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

try:
    import google.generativeai as genai
except ImportError:
    print("Google GenerativeAI library is required. Installing now...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "google-generativeai"])
    import google.generativeai as genai

# ── Paths ────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "public" / "dataset"
METADATA_FILE = DATASET_DIR / "metadata.json"

# ── API Key Configuration ───────────────────────────────────────────────────
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("\n[!] ERROR: GEMINI_API_KEY environment variable is not set.")
    print("Please set your API key by running this command in terminal:")
    print("   PowerShell: $env:GEMINI_API_KEY=\"your_key_here\"")
    print("   CMD:        set GEMINI_API_KEY=\"your_key_here\"")
    sys.exit(1)

genai.configure(api_key=api_key)

# ── Prompt Setup ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """
You are an expert orthodontic AI. You are shown an image of a teeth/mouth scan that has an orthodontic issue.
Analyze the image and return a JSON object with:
1. "condition": Short specific description of the issue (e.g., "Bracket debonding", "Poking wire", "Gingival inflammation", "Teeth crowding", "Dental trauma", etc.)
2. "severity": "minor", "moderate", or "severe"
3. "score": An integer from 1 to 100 representing concern severity
4. "suggestions": A JSON list of 2-3 practical, patient-friendly suggestions.

Return ONLY raw JSON matching this schema:
{
  "condition": "Condition name",
  "severity": "minor|moderate|severe",
  "score": 50,
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}
"""

def calculate_dhash(image_path: Path, hash_size=8) -> str:
    """Computes difference hash (dHash) for an image."""
    try:
        with Image.open(image_path) as img:
            img = img.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
            pixels = list(img.getdata())
            difference = []
            for row in range(hash_size):
                for col in range(hash_size):
                    pixel_left = pixels[row * (hash_size + 1) + col]
                    pixel_right = pixels[row * (hash_size + 1) + col + 1]
                    difference.append(pixel_left > pixel_right)
            
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

def analyze_image_with_gemini(image_path: Path) -> dict:
    """Sends image to Gemini for analysis."""
    try:
        # Load the image using PIL
        img = Image.open(image_path)
        
        # Initialize Gemini 2.0 Flash model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Call API
        response = model.generate_content(
            [
                img,
                "Identify the orthodontic or dental issue in this image, categorize its severity (minor/moderate/severe), and output suggestions as requested in instructions."
            ],
            generation_config={"response_mime_type": "application/json"},
            safety_settings=[
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
        )
        
        data = json.loads(response.text.strip())
        return data
    except Exception as e:
        print(f"API Error on {image_path.name}: {e}")
        return None

def process_single_image(image_path: Path, existing_record: dict) -> dict:
    """Processes a single image, calculating hash and querying Gemini if needed."""
    # Compute hash if missing
    img_hash = existing_record.get("hash") if existing_record else ""
    if not img_hash:
         img_hash = calculate_dhash(image_path)
         
    # Check if we already have a real analysis (not the default minor template)
    is_default = (
        not existing_record or 
        existing_record.get("condition") == "Minor Orthodontic Issue" or 
        existing_record.get("condition") == "Sample Poking Wire"
    )
    
    if not is_default and existing_record:
        # Keep existing custom label
        return existing_record

    # Call Gemini to analyze the image
    print(f"-> Querying Gemini Vision API for: {image_path.name}...")
    ai_result = analyze_image_with_gemini(image_path)
    
    if ai_result:
        return {
            "filename": image_path.name,
            "hash": img_hash,
            "condition": ai_result.get("condition", "Orthodontic Issue"),
            "severity": ai_result.get("severity", "minor").lower(),
            "score": ai_result.get("score", 30),
            "suggestions": ai_result.get("suggestions", ["Consult doctor"])
        }
    else:
        # Fallback to minor default if API fails
        return {
            "filename": image_path.name,
            "hash": img_hash,
            "condition": existing_record.get("condition", "Minor Orthodontic Issue") if existing_record else "Minor Orthodontic Issue",
            "severity": existing_record.get("severity", "minor") if existing_record else "minor",
            "score": existing_record.get("score", 25) if existing_record else 25,
            "suggestions": existing_record.get("suggestions", ["Continue standard hygiene"]) if existing_record else ["Continue standard hygiene"]
        }

def main():
    if not DATASET_DIR.exists():
        print(f"Dataset directory not found at {DATASET_DIR}")
        return

    # Load existing metadata to resume/avoid re-processing
    existing_data = {}
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                records = json.load(f)
                existing_data = {r["filename"]: r for r in records if "filename" in r}
        except Exception as e:
            print(f"Warning reading metadata.json: {e}")

    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    image_paths = [p for p in DATASET_DIR.iterdir() if p.suffix.lower() in image_extensions]
    
    if not image_paths:
        print(f"No images found in {DATASET_DIR}")
        return

    print(f"Found {len(image_paths)} images. Commencing AI labeling...")
    
    results = []
    
    # Process images concurrently to speed it up (rate limit permitting)
    # We use a max of 4 workers to prevent hit rate-limit (Gemini free tier has RPM limit of 15)
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(process_single_image, path, existing_data.get(path.name)): path 
            for path in image_paths
        }
        
        count = 0
        for future in as_completed(futures):
            path = futures[future]
            res = future.result()
            results.append(res)
            count += 1
            
            # Save incrementally after every 5 images
            if count % 5 == 0 or count == len(image_paths):
                with open(METADATA_FILE, "w", encoding="utf-8") as f:
                    json.dump(results, f, indent=2)
                print(f"[Progress] Saved {count}/{len(image_paths)} entries to metadata.json")
                
            # Sleep slightly to stay under API Rate Limits (RPM)
            time.sleep(1.0)

    print(f"\n[+] Success! Labeled database complete at: {METADATA_FILE}")

if __name__ == "__main__":
    main()
