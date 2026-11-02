import json
import os
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base_dir)

from backend.main import GISHUB_24_DATASETS

catalog_path = os.path.join(base_dir, "catalog.json")
with open(catalog_path, "w", encoding="utf-8") as f:
    json.dump(GISHUB_24_DATASETS, f, indent=2, ensure_ascii=False)

print(f"catalog.json created with {len(GISHUB_24_DATASETS)} datasets.")
