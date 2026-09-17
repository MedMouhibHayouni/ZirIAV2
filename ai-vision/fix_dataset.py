import shutil, json
from pathlib import Path

for split in ["train", "val", "test"]:
    p = Path(f"data/full_dataset/{split}/Ble_dur_Rouille_jaune")
    if p.exists():
        shutil.rmtree(p)
        print(f"Removed {p}")

with open("models/classes_full.json") as f:
    manifest = json.load(f)
manifest["classes"] = [c for c in manifest["classes"] if c != "Ble_dur_Rouille_jaune"]
manifest["num_classes"] = len(manifest["classes"])
manifest["stats"].pop("Ble_dur_Rouille_jaune", None)
with open("models/classes_full.json", "w") as f:
    json.dump(manifest, f, indent=2)
print("Updated manifest:", manifest["num_classes"], "classes")
