import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Replace list.map((e) => Type.fromJson(e)).toList() 
    # with list.map<Type>((e) => Type.fromJson(e)).toList()
    
    # Regex to find: .map((e) => Type.fromJson(e)).toList()
    # It might use e, or item, etc.
    # Group 1: variable name (e, x, item)
    # Group 2: Type
    # Group 3: variable name (must match Group 1)
    
    # We'll use a simpler regex that matches any map with a fromJson call inside it
    # Pattern: \.map\(\(([^)]+)\) => ([A-Za-z0-9_]+)\.fromJson\([^)]+\)\)\.toList\(\)
    
    content = re.sub(
        r"\.map\(\(([^)]+)\)\s*=>\s*([A-Za-z0-9_]+)\.fromJson\(([^)]+)\)\)\.toList\(\)",
        r".map<\2>((\1) => \2.fromJson(\3)).toList()",
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
