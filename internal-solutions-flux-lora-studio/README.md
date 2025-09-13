# 🎨 FLUX LoRA Studio - Local Kohya_ss Training

Real local LoRA training using Kohya_ss backend for **Apple Silicon M3 MacBook Pro** - no more fake Google Colab simulations!

## Features

- **Real Local Training**: Uses Kohya_ss for actual LoRA model training
- **Apple Silicon M3 Optimized**: Based on working GitHub forum configurations
- **Auto-Captioning**: Integrates with A11y Image Captioner service for automatic image captions
- **Caption Editing**: Click-to-edit captions before training
- **Real .safetensors Output**: Generates actual usable LoRA model files
- **Training Monitoring**: Real-time progress tracking and logs
- **Memory Optimized**: Automatic JPG conversion and Apple Silicon settings

## Quick Start

### Prerequisites

**CRITICAL: Apple Silicon M3 MacBook Pro Requirements**

1. **Python 3.10**: Must use Python 3.10 specifically (not 3.12)
   ```bash
   # Check your Python version
   python3.10 --version
   # If not installed: brew install python@3.10
   ```

2. **A11y Image Captioner Service**: Must be running on port 5005
   ```bash
   cd ../internal-solutions-image-captioner
   python app.py
   ```

3. **Git**: Required for Kohya_ss installation
4. **Sufficient Storage**: ~5GB for Kohya_ss and models
5. **Memory**: At least 16GB unified memory recommended

### Local Development

```bash
# Start the service
python run-local.py

# Open browser to http://localhost:5006
```

### Docker Usage

```bash
# Build and run
docker build -t flux-lora-studio .
docker run -p 5006:5006 \
  -v $(pwd)/datasets:/app/datasets \
  -v $(pwd)/models:/app/models \
  -v $(pwd)/kohya_ss:/app/kohya_ss \
  flux-lora-studio
```

## Training Workflow

1. **Upload Images**: Upload your training images (JPG, PNG, WebP)
2. **Auto-Caption**: System automatically generates captions using A11y Image Captioner
3. **Edit Captions**: Click any caption to edit it inline
4. **Configure Training**: Set project name, trigger word, and training parameters
5. **Start Training**: Click "Start Local LoRA Training" to begin Kohya_ss training
6. **Monitor Progress**: Watch real-time training logs and progress
7. **Download Model**: Get your real .safetensors file when complete

## Configuration Options

**Apple Silicon M3 Optimized Settings (Based on GitHub Forum)**

- **Training Steps**: 1000-3000 (1500 recommended for M3)
- **Network Dim**: 64-128 (64 recommended for M3 stability)
- **Network Alpha**: 32-192 (32 forum-tested for Apple Silicon)
- **Learning Rate**: 5e-5 to 1e-4 (1e-4 safe for M3, higher may cause NaN)
- **Resolution**: Always start with 512x512 on Apple Silicon
- **Batch Size**: Always 1 on Apple Silicon
- **Mixed Precision**: MUST be "no" (fp16 causes issues on Apple Silicon)
- **Image Format**: Automatically converts to JPG (PNG uses too much memory)

## Kohya_ss Integration

The system automatically:
- Clones Kohya_ss from GitHub
- Runs setup script for M1 Mac compatibility
- Configures training with tested parameters
- Manages virtual environment and dependencies
- Converts images to JPG format (recommended for memory efficiency)
- Creates .txt caption files in Kohya format

## API Endpoints

- `POST /api/upload-images`: Upload and process training images
- `POST /api/update-caption`: Update a specific image caption
- `POST /api/start-training`: Start local Kohya_ss training
- `GET /api/training-progress/{job_id}`: Get training progress
- `GET /api/download-model/{job_id}`: Download trained .safetensors model
- `POST /api/setup-kohya`: Setup Kohya_ss installation
- `GET /health`: Service health check

## File Structure

```
flux-lora-studio/
├── app.py                 # FastAPI backend
├── templates/index.html   # Web interface
├── requirements.txt       # Python dependencies
├── run-local.py          # Local development launcher
├── datasets/             # Training datasets
├── models/               # Generated LoRA models
├── kohya_ss/            # Kohya_ss installation
└── logs/                # Training logs
```

## Troubleshooting

### Apple Silicon M3 Specific Issues

#### Python Version Problems
- **Error**: "python3.10 not found"
- **Solution**: Install Python 3.10 specifically: `brew install python@3.10`
- **Critical**: Do NOT use Python 3.12 - it won't work with Kohya_ss

#### Training Fails with NaN Loss
- **Error**: Loss becomes NaN after 200-500 steps
- **Solution**: Lower learning rate to 5e-5 or even 1e-5
- **Forum Note**: Apple Silicon is very sensitive to learning rate

#### Memory Issues / Crashes
- **Error**: Out of memory during training
- **Solutions**:
  - Use only JPG images (PNG uses too much memory)
  - Start with 512x512 resolution, not higher
  - Enable `cache_latents_to_disk`
  - Ensure at least 16GB unified memory

#### Setup.sh Failures
- **Error**: xformers installation fails
- **Solution**: This is normal - xformers doesn't work on Apple Silicon
- **Action**: Continue with setup, the training will use `mem_eff_attn` instead

#### Black Images Generated
- **Error**: Training completes but generates black images
- **Causes**: Learning rate too high, or fp16 precision used
- **Solutions**: 
  - Lower learning rate to 5e-5
  - Ensure `mixed_precision=no`
  - Ensure `save_precision=float`

### General Issues

### Image Captioner Not Available
- Ensure A11y Image Captioner is running on port 5005
- Check that the service is accessible at http://localhost:5005/health

### Kohya_ss Setup Issues
- Ensure Git is installed
- Check internet connection for cloning repository
- Verify Python virtual environment creation permissions

### Training Failures
- Check training logs in the UI for specific errors
- Ensure sufficient disk space for model output
- Verify dataset images are valid

## Integration with NXT Humans Workbench

This service integrates with the broader NXT Humans AI CX Workbench:
- Uses the shared A11y Image Captioner service
- Follows NXT Humans branding and design standards
- Can be accessed through the central Launchpad when added to Docker Compose

## Real vs. Fake Training

This version provides **REAL** local training:
- ✅ Actual Kohya_ss training execution
- ✅ Real .safetensors model files
- ✅ Functional LoRA models for use in AI image generation
- ✅ Local processing with no external dependencies

Previous versions were **fake simulations**:
- ❌ Fake JSON model files
- ❌ No actual training
- ❌ Unusable output files