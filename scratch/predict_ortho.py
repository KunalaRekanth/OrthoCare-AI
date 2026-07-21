import os
import json
import sys
from pathlib import Path
import torch
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image

# -- Paths --
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "public" / "dataset"
CLASS_MAPPING_FILE = DATASET_DIR / "class_mapping.json"
MODEL_FILE = DATASET_DIR / "ortho_model.pth"

def main():
    if len(sys.argv) < 2:
        print("Usage: python scratch/predict_ortho.py <path_to_image>")
        
        # Default to a random sample from dataset if no argument provided
        image_extensions = {".jpg", ".jpeg", ".png"}
        samples = [p for p in DATASET_DIR.iterdir() if p.suffix.lower() in image_extensions]
        if samples:
            sample_img = samples[0]
            print(f"No image path specified. Defaulting to sample: {sample_img.name}\n")
            img_path = sample_img
        else:
            sys.exit(1)
    else:
        img_path = Path(sys.argv[1])
        
    if not img_path.exists():
        print(f"Error: Image not found at {img_path}")
        sys.exit(1)
        
    if not MODEL_FILE.exists() or not CLASS_MAPPING_FILE.exists():
        print("Error: Trained model or class mapping files not found.")
        sys.exit(1)
        
    # 1. Load class mapping
    with open(CLASS_MAPPING_FILE, "r", encoding="utf-8") as f:
        mapping = json.load(f)
    idx_to_condition = mapping["idx_to_condition"]
    num_classes = len(idx_to_condition)
    
    # 2. Re-create and load model architecture
    print("Loading model...")
    model = models.mobilenet_v3_small()
    num_features = model.classifier[3].in_features
    model.classifier[3] = torch.nn.Linear(num_features, num_classes)
    
    model.load_state_dict(torch.load(MODEL_FILE, map_location=torch.device('cpu')))
    model.eval()
    
    # 3. Transform input image
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    try:
        image = Image.open(img_path).convert("RGB")
        tensor = transform(image).unsqueeze(0) # add batch dimension
    except Exception as e:
        print(f"Error processing image: {e}")
        sys.exit(1)
        
    # 4. Predict
    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
        confidence, predicted_idx = torch.max(probabilities, 0)
        
    predicted_class_idx = str(predicted_idx.item())
    condition_name = idx_to_condition[predicted_class_idx]
    
    print("\n" + "="*50)
    print(f"IMAGE: {img_path.name}")
    print(f"PREDICTED CONDITION: {condition_name}")
    print(f"CONFIDENCE: {confidence.item() * 100:.2f}%")
    
    # Fetch suggestions from metadata for this class if available
    try:
        metadata_file = DATASET_DIR / "metadata.json"
        if metadata_file.exists():
            with open(metadata_file, "r", encoding="utf-8") as f:
                records = json.load(f)
            # Find the first record matching this condition to display sample suggestions
            for r in records:
                if r.get("condition") == condition_name:
                    print("\nSUGGESTED TREATMENT / SOLUTIONS:")
                    for s in r.get("suggestions", []):
                        print(f"  • {s}")
                    break
    except Exception:
        pass
    print("="*50)

if __name__ == "__main__":
    main()
