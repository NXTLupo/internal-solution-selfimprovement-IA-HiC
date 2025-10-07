# 🎨 FLUX LoRA Studio - Local Apple Silicon M3 Launcher

## Overview

FLUX LoRA Studio now has **dual launch options** in the NXT Humans Workbench:

1. **Docker Version**: Traditional containerized version (limited functionality)
2. **Apple Silicon M3 Local**: Native local training with Kohya_ss (recommended)

## 🚀 How to Use

### Via Launchpad (Recommended)

1. **Start the workbench**: `./launch.sh`
2. **Open launchpad**: http://localhost:8000
3. **Find FLUX LoRA Studio card** and click:
   - **"Launch Docker Version"**: Runs containerized version
   - **"Launch Apple Silicon M3 (Local)"**: Runs native local version

### Manual Local Launch

```bash
# 1. Start Image Captioner dependency
cd internal-solutions-image-captioner
python app.py &

# 2. Start FLUX LoRA Studio locally
cd ../internal-solutions-flux-lora-studio
python run-local.py
```

## 🔄 What Changed

### 1. **Removed from Docker Compose**
- FLUX LoRA Studio service removed from `docker-compose-all.yml`
- Prevents port conflicts between Docker and local versions
- Docker volumes cleaned up

### 2. **Added Local Launcher API**
- New endpoint: `POST /api/launch-flux-local`
- Automatically checks dependencies (Image Captioner)
- Detects conflicts with Docker version
- Launches native Apple Silicon version

### 3. **Enhanced Launchpad UI**
- Two-button interface for FLUX LoRA Studio
- Real-time status updates
- Automatic dependency checking
- Conflict detection and resolution

## 🍎 Why Apple Silicon M3 Local?

**Docker Limitations on Apple Silicon:**
- ❌ No access to Metal Performance Shaders (MPS)
- ❌ Runs Linux container (not native macOS)
- ❌ Cannot use PyTorch MPS acceleration
- ❌ Limited memory optimization

**Local Advantages:**
- ✅ Direct Apple Silicon M3 hardware access
- ✅ Native PyTorch with MPS support
- ✅ Proper Python 3.10 environment
- ✅ Real Kohya_ss training with forum-tested configs
- ✅ Significantly faster training speeds

## 🎯 Smart Conflict Detection

The launcher automatically:

1. **Checks Image Captioner**: Ensures port 5005 dependency is running
2. **Detects Docker Version**: If Docker FLUX is running, shows warning
3. **Validates Environment**: Confirms Python 3.10 and Apple Silicon
4. **Prevents Conflicts**: Won't start if port 5006 is occupied by Docker

## 📊 Expected Performance

Based on GitHub forum results for Apple Silicon:

- **M1 Max (64GB)**: ~1.41s/it training speed
- **M3 MacBook Pro**: Similar or better performance expected
- **Memory Usage**: ~3GB for SD1.5, ~10GB for SDXL
- **Training Time**: 1500 steps in ~35 minutes

## 🛠 Troubleshooting

### "Docker Conflict" Error
```bash
# Stop Docker version first
docker stop nxthumans_ai_cx_workbench-flux-lora-studio-1
```

### "Image Captioner Not Available"
```bash
# Start the dependency
cd internal-solutions-image-captioner
python app.py
```

### "Python 3.10 Not Found"
```bash
# Install Python 3.10 for Apple Silicon
brew install python@3.10
```

## 🔗 Integration

- **Seamless Workbench Integration**: Still appears in launchpad
- **Shared Dependencies**: Uses existing Image Captioner service
- **Consistent Branding**: Maintains NXT Humans design
- **Real Training**: Generates actual .safetensors files

The local launcher provides the **best of both worlds**: easy one-click launching from the workbench with full Apple Silicon M3 optimization!