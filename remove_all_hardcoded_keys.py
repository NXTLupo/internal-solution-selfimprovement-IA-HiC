#!/usr/bin/env python3
"""
Remove all hardcoded API keys from the codebase
Replaces them with environment variable references
"""

import os
import re
from pathlib import Path

def remove_hardcoded_keys(file_path):
    """Remove hardcoded API keys from a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes_made = False

        # Patterns to replace
        patterns = [
            # OpenAI keys
            (r'"sk-proj-[A-Za-z0-9\-_]+?"', 'os.environ.get("OPENAI_API_KEY", "")'),
            (r"'sk-proj-[A-Za-z0-9\-_]+?'", "os.environ.get('OPENAI_API_KEY', '')"),
            (r'=\s*"sk-proj-[A-Za-z0-9\-_]+?"', '= os.environ.get("OPENAI_API_KEY", "")'),
            (r"=\s*'sk-proj-[A-Za-z0-9\-_]+?'", "= os.environ.get('OPENAI_API_KEY', '')"),

            # Anthropic keys
            (r'"sk-ant-[A-Za-z0-9\-_]+?"', 'os.environ.get("ANTHROPIC_API_KEY", "")'),
            (r"'sk-ant-[A-Za-z0-9\-_]+?'", "os.environ.get('ANTHROPIC_API_KEY', '')"),
            (r'=\s*"sk-ant-[A-Za-z0-9\-_]+?"', '= os.environ.get("ANTHROPIC_API_KEY", "")'),
            (r"=\s*'sk-ant-[A-Za-z0-9\-_]+?'", "= os.environ.get('ANTHROPIC_API_KEY', '')"),

            # Google/Gemini keys
            (r'"AIza[A-Za-z0-9\-_]+?"', 'os.environ.get("GEMINI_API_KEY", "")'),
            (r"'AIza[A-Za-z0-9\-_]+?'", "os.environ.get('GEMINI_API_KEY', '')"),
            (r'=\s*"AIza[A-Za-z0-9\-_]+?"', '= os.environ.get("GEMINI_API_KEY", "")'),
            (r"=\s*'AIza[A-Za-z0-9\-_]+?'", "= os.environ.get('GEMINI_API_KEY', '')"),
        ]

        for pattern, replacement in patterns:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                changes_made = True
                content = new_content

        # Special handling for default parameter assignments
        content = re.sub(
            r'default_key\s*=\s*["\']sk-ant-[^"\']+["\']',
            'default_key = ""',
            content
        )
        if 'default_key = ""' in content and 'default_key = ""' not in original_content:
            changes_made = True

        # Write back if changes were made
        if changes_made:
            # Check if we need to add import os
            if 'os.environ.get' in content and 'import os' not in content:
                lines = content.split('\n')
                # Find where to insert import os
                import_index = 0
                for i, line in enumerate(lines):
                    if line.startswith('import ') or line.startswith('from '):
                        import_index = i + 1
                    elif import_index > 0:
                        break
                lines.insert(import_index, 'import os')
                content = '\n'.join(lines)

            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

    return False

def main():
    """Main function to process all Python files."""
    print("Scanning for hardcoded API keys...")

    # Directories to exclude
    exclude_dirs = {'.git', 'node_modules', '.history', '__pycache__', 'venv', '.venv', 'tests', 'backup'}

    # Find all Python files
    root_path = Path('.')
    python_files = []

    for py_file in root_path.rglob('*.py'):
        # Check if file is in excluded directory
        if any(excluded in py_file.parts for excluded in exclude_dirs):
            continue
        python_files.append(py_file)

    print(f"Found {len(python_files)} Python files to check")

    # Process each file
    files_modified = []
    for py_file in python_files:
        if remove_hardcoded_keys(py_file):
            files_modified.append(py_file)
            print(f"[MODIFIED] {py_file}")

    print(f"\n{'='*60}")
    print(f"Processed {len(python_files)} files")
    print(f"Modified {len(files_modified)} files")

    if files_modified:
        print("\nFiles with removed API keys:")
        for f in files_modified:
            print(f"  - {f}")

        print("\n[WARNING] Important: Make sure the following environment variables are set in your .env file:")
        print("  - OPENAI_API_KEY")
        print("  - ANTHROPIC_API_KEY")
        print("  - GEMINI_API_KEY")
    else:
        print("\n[OK] No hardcoded API keys found!")

if __name__ == "__main__":
    main()