import os
import json
from pathlib import Path

# This script deterministically assigns a variety of realistic orthodontic issues 
# to the 499 images in your dataset. It does NOT require any API key and runs instantly.

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "public" / "dataset"
METADATA_FILE = DATASET_DIR / "metadata.json"

# List of realistic orthodontic cases to assign
DIVERSE_CASES = [
    # MINOR CASES
    {
        "condition": "Archwire-related: Poking wire",
        "severity": "minor",
        "score": 18,
        "suggestions": [
            "Apply orthodontic wax to the sharp wire tip.",
            "Schedule a standard appointment to get the wire trimmed.",
            "Avoid touching the area with your tongue to prevent irritation."
        ]
    },
    {
        "condition": "Soft tissue injuries: Cheek ulcer",
        "severity": "minor",
        "score": 22,
        "suggestions": [
            "Apply orthodontic wax to the bracket rubbing your cheek.",
            "Rinse mouth with warm salt water to promote healing.",
            "Use topical oral anesthetic gel if painful."
        ]
    },
    {
        "condition": "Ligature-related: Lost elastic ligature",
        "severity": "minor",
        "score": 15,
        "suggestions": [
            "This is a minor issue; the bracket ring has disengaged.",
            "Keep the area clean and mention it at your next regular visit.",
            "If the archwire becomes loose, contact your clinic."
        ]
    },
    {
        "condition": "Appliance adaptation: Salivation & soreness",
        "severity": "minor",
        "score": 12,
        "suggestions": [
            "This is normal during the initial adaptation phase.",
            "Sip cool water and practice speaking aloud.",
            "The soreness should resolve in 3-5 days."
        ]
    },
    # MODERATE CASES
    {
        "condition": "Bracket-related: Complete debond",
        "severity": "moderate",
        "score": 45,
        "suggestions": [
            "Schedule an appointment within the next 2 weeks for rebonding.",
            "Avoid hard, sticky, or chewy foods that can displace the bracket further.",
            "If the bracket is loose on the wire, secure it with wax."
        ]
    },
    {
        "condition": "Periodontal issues: Gingival inflammation",
        "severity": "moderate",
        "score": 52,
        "suggestions": [
            "Reinforce strict brushing and flossing around brackets.",
            "Use an antiseptic mouthwash or warm salt water rinse.",
            "Consult your hygienist if bleeding persists beyond a week."
        ]
    },
    {
        "condition": "Pain-related: Excessive activation pain",
        "severity": "moderate",
        "score": 40,
        "suggestions": [
            "Take over-the-counter pain relievers if necessary.",
            "Stick to a soft food diet (yogurt, soup, mashed potatoes).",
            "Consult your doctor if severe pain persists beyond 5 days."
        ]
    },
    {
        "condition": "Caries/enamel: White spot lesions",
        "severity": "moderate",
        "score": 58,
        "suggestions": [
            "Requires immediate improvement in plaque removal.",
            "Use a high-fluoride toothpaste or remineralizing paste.",
            "Avoid sugary and acidic drinks completely."
        ]
    },
    {
        "condition": "Twin Block: Dislodged bite block",
        "severity": "moderate",
        "score": 48,
        "suggestions": [
            "Schedule an adjustment appointment for block reconstruction.",
            "Stop wearing the appliance if it causes occlusal interference or pain.",
            "Keep the appliance safe in its case until repaired."
        ]
    },
    # SEVERE CASES
    {
        "condition": "Trauma-related: Fixed appliance injury",
        "severity": "severe",
        "score": 85,
        "suggestions": [
            "Contact your orthodontist immediately for emergency repair.",
            "If there is bleeding or cut, apply direct pressure with clean gauze.",
            "Stick to liquid diet until evaluated by a specialist."
        ]
    },
    {
        "condition": "Fixed appliance: Breakage of telescopic rod",
        "severity": "severe",
        "score": 78,
        "suggestions": [
            "Schedule an emergency clinic visit immediately.",
            "Do not try to bend, force, or cut the telescopic rod yourself.",
            "Cover any protruding metal parts with a large ball of wax."
        ]
    },
    {
        "condition": "TMJ discomfort: Joint locking & acute pain",
        "severity": "severe",
        "score": 82,
        "suggestions": [
            "Temporarily reduce mandibular advancement if adjustable.",
            "Apply a warm compress to the jaw joint area.",
            "Schedule an urgent consultation to assess TMJ stress."
        ]
    },
    {
        "condition": "Aspiration risk: Swallowed bracket/component",
        "severity": "severe",
        "score": 95,
        "suggestions": [
            "Seek immediate medical attention or visit an emergency room.",
            "Monitor for respiratory symptoms (coughing, difficulty breathing).",
            "Do not attempt to self-treat."
        ]
    }
]

def main():
    if not METADATA_FILE.exists():
        print(f"Error: metadata.json does not exist. Please place your images in {DATASET_DIR} and run generate_dataset_hashes.py first.")
        return

    try:
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            metadata = json.load(f)
    except Exception as e:
        print(f"Error reading metadata: {e}")
        return

    print(f"Assorted {len(metadata)} images found in database. Assigning diverse diagnoses...")

    for idx, item in enumerate(metadata):
        # Use a deterministic hash/index combination to assign one of our diverse cases
        # This ensures the same image always gets the same problem assigned to it
        filename_hash = sum(ord(c) for c in item["filename"])
        case_idx = filename_hash % len(DIVERSE_CASES)
        assigned_case = DIVERSE_CASES[case_idx]

        item["condition"] = assigned_case["condition"]
        item["severity"] = assigned_case["severity"]
        item["score"] = assigned_case["score"]
        item["suggestions"] = assigned_case["suggestions"]

    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[+] Success! All {len(metadata)} images have been assigned diverse, realistic orthodontic problems.")
    print("No API Key was required. You can test your app now!")

if __name__ == "__main__":
    main()
