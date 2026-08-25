import kagglehub
import csv
import json
import os

path = kagglehub.dataset_download("dhrubangtalukdar/qs-world-university-rankings-2026-top-1500")
print("Path:", path)

files = os.listdir(path)
print("Files:", files)

for f in files:
    if f.endswith('.csv'):
        filepath = os.path.join(path, f)
        print(f"\n=== {f} ===")
        with open(filepath, 'r', encoding='utf-8') as fh:
            reader = csv.reader(fh)
            headers = next(reader)
            print("Columns:", headers)
            # Count rows
            rows = list(reader)
            print(f"Total rows: {len(rows)}")
            # Show first 3
            print("\nFirst 3 rows:")
            for i, row in enumerate(rows[:3]):
                print(f"Row {i}: {dict(zip(headers, row))}")
        break
