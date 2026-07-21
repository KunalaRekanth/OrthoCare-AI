import os
import json
import sys
import time
from pathlib import Path
import pandas as pd
import numpy as np

# -- Ensure PyTorch is available before proceeding --
try:
    import torch
    import torchvision
    import torchvision.transforms as transforms
    from torch.utils.data import Dataset, DataLoader
    import torch.nn as nn
    import torch.optim as optim
    from torchvision import models
except ImportError:
    print("Required packages (torch, torchvision) are not fully installed yet.")
    print("Please wait for the background pip command to finish.")
    sys.exit(1)

try:
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, confusion_matrix
except ImportError:
    print("Required package (scikit-learn) is not fully installed yet.")
    sys.exit(1)

from PIL import Image

# -- Paths --
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "public" / "dataset"
METADATA_FILE = DATASET_DIR / "metadata.json"
CLASS_MAPPING_FILE = DATASET_DIR / "class_mapping.json"
MODEL_OUTPUT_FILE = DATASET_DIR / "ortho_model.pth"

# -- Custom Dataset Class --
class OrthodonticDataset(Dataset):
    def __init__(self, dataframe, image_dir, transform=None):
        self.df = dataframe
        self.image_dir = image_dir
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = self.image_dir / row['filename']
        
        # Load image and convert to RGB
        try:
            image = Image.open(img_path).convert("RGB")
        except Exception as e:
            # Fallback to an empty image if file is corrupt
            print(f"Error loading image {row['filename']}: {e}")
            image = Image.new("RGB", (224, 224), (0, 0, 0))
            
        label = row['label_idx']
        
        if self.transform:
            image = self.transform(image)
            
        return image, label

def main():
    # 1. Load metadata
    if not METADATA_FILE.exists():
        print(f"Error: metadata.json not found at {METADATA_FILE}")
        sys.exit(1)
        
    print(f"Loading metadata from {METADATA_FILE}...")
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        records = json.load(f)
        
    # Create DataFrame
    df = pd.DataFrame(records)
    print(f"Found {len(df)} records in metadata.")
    
    # 2. Filter out non-existent files
    existing_records = []
    for _, row in df.iterrows():
        img_path = DATASET_DIR / row['filename']
        if img_path.exists():
            existing_records.append(row)
            
    df_clean = pd.DataFrame(existing_records)
    print(f"Verified {len(df_clean)} image files exist in {DATASET_DIR}.")
    
    if len(df_clean) == 0:
        print("Error: No valid images found. Cannot train.")
        sys.exit(1)
        
    # 3. Handle classes
    unique_conditions = sorted(df_clean['condition'].unique())
    num_classes = len(unique_conditions)
    print(f"Number of classes: {num_classes}")
    
    # Map conditions to indices
    condition_to_idx = {cond: i for i, cond in enumerate(unique_conditions)}
    idx_to_condition = {i: cond for i, cond in enumerate(unique_conditions)}
    
    # Save mapping for application use
    with open(CLASS_MAPPING_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "condition_to_idx": condition_to_idx,
            "idx_to_condition": idx_to_condition
        }, f, indent=2)
    print(f"Saved class mapping to {CLASS_MAPPING_FILE}")
    
    # Add label index column
    df_clean['label_idx'] = df_clean['condition'].map(condition_to_idx)
    
    # 4. Train-Test Split (80% Train, 20% Val)
    train_df, val_df = train_test_split(
        df_clean, 
        test_size=0.20, 
        random_state=42, 
        stratify=df_clean['label_idx']
    )
    print(f"Split: {len(train_df)} training samples, {len(val_df)} validation samples.")
    
    # 5. Transforms (Data Augmentation & Normalization)
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # 6. Dataloaders
    train_dataset = OrthodonticDataset(train_df, DATASET_DIR, transform=train_transform)
    val_dataset = OrthodonticDataset(val_df, DATASET_DIR, transform=val_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False, num_workers=0)
    
    # 7. Device Selection (Use CUDA if available)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # 8. Load Pretrained Model (MobileNetV3 Small)
    print("Loading pretrained MobileNetV3 Small model...")
    # Use weights parameter as required in modern torchvision
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    
    # Modify the final linear layer
    num_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(num_features, num_classes)
    model = model.to(device)
    
    # 9. Optimizer & Loss Function
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    # 10. Training Loop
    epochs = 10
    best_acc = 0.0
    print("\n--- Starting Training (10 Epochs) ---")
    
    for epoch in range(1, epochs + 1):
        start_time = time.time()
        
        # Training Phase
        model.train()
        running_loss = 0.0
        correct_train = 0
        total_train = 0
        
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total_train += labels.size(0)
            correct_train += predicted.eq(labels).sum().item()
            
        epoch_loss = running_loss / len(train_dataset)
        epoch_acc = correct_train / total_train
        
        # Validation Phase
        model.eval()
        val_loss = 0.0
        correct_val = 0
        total_val = 0
        
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item() * inputs.size(0)
                _, predicted = outputs.max(1)
                total_val += labels.size(0)
                correct_val += predicted.eq(labels).sum().item()
                
        epoch_val_loss = val_loss / len(val_dataset)
        epoch_val_acc = correct_val / total_val
        
        elapsed = time.time() - start_time
        print(f"Epoch {epoch}/{epochs} | "
              f"Train Loss: {epoch_loss:.4f} - Train Acc: {epoch_acc*100:.2f}% | "
              f"Val Loss: {epoch_val_loss:.4f} - Val Acc: {epoch_val_acc*100:.2f}% | "
              f"Time: {elapsed:.1f}s")
              
        # Save Best Model
        if epoch_val_acc > best_acc:
            best_acc = epoch_val_acc
            torch.save(model.state_dict(), MODEL_OUTPUT_FILE)
            print(f"  [+] New best model saved to {MODEL_OUTPUT_FILE} (Val Acc: {best_acc*100:.2f}%)")
            
    # 11. Final Evaluation & Detailed Report
    print("\n--- Training Complete! Loading Best Model for Evaluation ---")
    if MODEL_OUTPUT_FILE.exists():
        model.load_state_dict(torch.load(MODEL_OUTPUT_FILE))
    model.eval()
    
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for inputs, labels in val_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            _, predicted = outputs.max(1)
            
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.numpy())
            
    # Convert back to original condition names
    pred_names = [idx_to_condition[idx] for idx in all_preds]
    label_names = [idx_to_condition[idx] for idx in all_labels]
    
    print("\nClassification Report (Validation Set):")
    print(classification_report(label_names, pred_names, target_names=unique_conditions, zero_division=0))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(all_labels, all_preds))
    print(f"\nBest Validation Accuracy Achieved: {best_acc*100:.2f}%")

if __name__ == "__main__":
    main()
