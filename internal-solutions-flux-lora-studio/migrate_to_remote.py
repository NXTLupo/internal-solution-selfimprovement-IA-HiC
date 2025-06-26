#!/usr/bin/env python3
"""
Migration script to switch FLUX LoRA Studio to remote training mode
This replaces the local training backend with Google Colab integration
"""

import shutil
import os
from pathlib import Path

def migrate_to_remote_training():
    """Switch to remote training backend"""
    print("🚀 Migrating FLUX LoRA Studio to Remote Training Mode...")
    
    # Backup original app.py
    if Path("app.py").exists():
        shutil.copy("app.py", "app_local_backup.py")
        print("✅ Backed up original app.py as app_local_backup.py")
    
    # Replace with remote training version
    if Path("app_remote.py").exists():
        shutil.copy("app_remote.py", "app.py")
        print("✅ Switched to remote training backend")
    else:
        print("❌ Remote training backend not found!")
        return False
    
    # Update requirements to remove heavy dependencies
    remote_requirements = """fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
pydantic==2.5.0
pydantic-settings==2.1.0
aiofiles==23.2.1
jinja2==3.1.2
requests==2.31.0
pillow==10.1.0
aiohttp==3.9.1

# Optional for YAML config generation
pyyaml>=6.0
"""
    
    # Backup original requirements
    if Path("requirements.txt").exists():
        shutil.copy("requirements.txt", "requirements_local_backup.txt")
        print("✅ Backed up original requirements.txt")
    
    # Write new lightweight requirements
    with open("requirements.txt", "w") as f:
        f.write(remote_requirements)
    print("✅ Updated requirements.txt for remote training")
    
    # Create remote training documentation
    remote_readme = """# FLUX LoRA Studio - Remote Training

## Overview
FLUX LoRA Studio now uses **Google Colab** for training, eliminating the need for local GPU setup!

## Key Benefits
- ✅ **Zero Local Setup**: No CUDA, PyTorch, or heavy dependencies required
- ✅ **Free GPU Access**: T4 GPU available with free Google Colab
- ✅ **Pro GPU Options**: A100/V100 GPUs available with Colab Pro/Pro+
- ✅ **Cloud Training**: Train anywhere with just a browser
- ✅ **Automatic Captioning**: Still powered by A11y Image Captioner
- ✅ **Professional Results**: Same high-quality LoRA models

## Quick Start
1. Process your dataset using the web interface
2. Download the prepared dataset package
3. Open the Google Colab notebook
4. Upload dataset and start training!

## Google Colab Notebook
🔗 **Training Notebook**: https://colab.research.google.com/drive/1r09aImgL1YhQsJgsLWnb67-bjTV88-W0

## Local vs Remote Comparison

| Feature | Local Training | Remote Training |
|---------|---------------|-----------------|
| Setup Required | Complex (GPU, CUDA, PyTorch) | None |
| GPU Requirement | Local NVIDIA GPU | Google Colab GPU |
| Training Time | Depends on GPU | 20-60 minutes |
| Cost | Hardware cost | Free (or $10/month Pro) |
| Maintenance | User manages | Google manages |
| Accessibility | Local only | Anywhere with internet |

## Migration Complete
Your FLUX LoRA Studio is now configured for remote training via Google Colab!

The A11y Image Captioner service remains unchanged and continues to provide
professional-quality automatic captions for your training images.
"""
    
    with open("REMOTE_TRAINING_README.md", "w") as f:
        f.write(remote_readme)
    print("✅ Created REMOTE_TRAINING_README.md")
    
    # Remove heavy training dependencies if they exist
    dirs_to_remove = ["src", "__pycache__"]
    for dir_name in dirs_to_remove:
        if Path(dir_name).exists():
            shutil.rmtree(dir_name)
            print(f"✅ Removed {dir_name} directory")
    
    # Remove heavy training files
    files_to_remove = [
        "install_training_deps.py",
        "TRAINING_SETUP.md"
    ]
    for file_name in files_to_remove:
        if Path(file_name).exists():
            os.remove(file_name)
            print(f"✅ Removed {file_name}")
    
    print("\n🎉 Migration to Remote Training Complete!")
    print("\n📋 Next Steps:")
    print("1. Restart the service: docker compose restart flux-lora-studio")
    print("2. Open the web interface")
    print("3. Upload your training images")
    print("4. Download the dataset package")
    print("5. Open Google Colab and start training!")
    print("\n🔗 Colab Notebook: https://colab.research.google.com/drive/1r09aImgL1YhQsJgsLWnb67-bjTV88-W0")
    
    return True

if __name__ == "__main__":
    success = migrate_to_remote_training()
    if success:
        print("\n✨ FLUX LoRA Studio is now ready for remote training!")
    else:
        print("\n❌ Migration failed. Check the error messages above.")