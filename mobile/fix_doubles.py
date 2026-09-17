import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Pattern 1: (j['key'] ?? 0).toDouble()
    # Replace with: double.tryParse(j['key']?.toString() ?? '0') ?? 0.0
    content = re.sub(
        r"\(j\['([^']+)'\] \?\? ([0-9.]+)\)\.toDouble\(\)",
        r"(double.tryParse(j['\1']?.toString() ?? '\2') ?? \2)",
        content
    )

    # Pattern 2: (j['key'] ?? j['key2'] ?? 0).toDouble()
    content = re.sub(
        r"\(j\['([^']+)'\] \?\? j\['([^']+)'\] \?\? ([0-9.]+)\)\.toDouble\(\)",
        r"(double.tryParse((j['\1'] ?? j['\2'])?.toString() ?? '\3') ?? \3)",
        content
    )

    # Pattern 3: (e.value['key'] ?? 0).toDouble()
    content = re.sub(
        r"\(e\.value\['([^']+)'\] \?\? ([0-9.]+)\)\.toDouble\(\)",
        r"(double.tryParse(e.value['\1']?.toString() ?? '\2') ?? \2)",
        content
    )

    # Pattern 4: (e['key'] ?? 0).toDouble()
    content = re.sub(
        r"\(e\['([^']+)'\] \?\? ([0-9.]+)\)\.toDouble\(\)",
        r"(double.tryParse(e['\1']?.toString() ?? '\2') ?? \2)",
        content
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

for root, _, files in os.walk('lib/features'):
    for file in files:
        if file.endswith('.dart'):
            fix_file(os.path.join(root, file))
