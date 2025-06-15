# Flickr8k Dataset Setup Guide

## Overview
The Image Caption Generator requires the Flickr8k dataset for training and evaluation. The pre-trained models (`mymodel.h5` and `tokenizer.pkl`) have already been downloaded and are ready to use.

## Dataset Information
- **Dataset**: Flickr8k
- **Source**: [Kaggle - Flickr8k Dataset](https://www.kaggle.com/adityajn105/flickr8k)
- **Size**: ~1GB (8,091 images + captions)
- **Images**: 8,091 JPEG images
- **Captions**: 5 captions per image (40,455 total captions)

## Quick Start (Models Already Available)
✅ **The trained models are already downloaded and ready to use!**
- `mymodel.h5` (82MB) - Trained MobileNetV2 + LSTM caption model
- `tokenizer.pkl` (340KB) - Flickr8k tokenizer

You can start using the Image Caption Generator immediately at: http://localhost:5005

## Optional: Download Full Dataset (For Training/Research)

If you want to access the full dataset for training or research purposes:

### Method 1: Kaggle CLI (Recommended)
```bash
# Install Kaggle CLI
pip install kaggle

# Set up Kaggle API credentials
# 1. Go to https://www.kaggle.com/account
# 2. Create API token (downloads kaggle.json)
# 3. Place in ~/.kaggle/kaggle.json
# 4. Set permissions: chmod 600 ~/.kaggle/kaggle.json

# Download dataset
cd flickr8k/
kaggle datasets download -d adityajn105/flickr8k
unzip flickr8k.zip
```

### Method 2: Manual Download
1. Visit: https://www.kaggle.com/adityajn105/flickr8k
2. Click "Download" (requires Kaggle account)
3. Extract to `flickr8k/` directory

### Expected Directory Structure
```
internal-solutions-image-captioner/
├── mymodel.h5              ✅ Downloaded
├── tokenizer.pkl           ✅ Downloaded
├── app.py                  ✅ Ready
├── requirements.txt        ✅ Ready
├── templates/              ✅ Ready
├── static/                 ✅ Ready
└── flickr8k/              📁 Optional for full dataset
    ├── Images/            📁 8,091 JPEG images
    ├── captions.txt       📄 Caption data
    └── ...
```

## Dataset Details

### Images
- **Format**: JPEG
- **Count**: 8,091 images
- **Content**: Various everyday scenes, people, animals, objects
- **Size**: ~1GB total

### Captions
- **File**: `captions.txt`
- **Format**: CSV with columns: image,caption
- **Count**: 40,455 captions (5 per image)
- **Language**: English
- **Style**: Descriptive, natural language

### Sample Caption Data
```
1000268201_693b08cb0e.jpg,A child in a pink dress is climbing up a set of stairs in an entry way .
1000268201_693b08cb0e.jpg,A girl going into a wooden building .
1000268201_693b08cb0e.jpg,A little girl climbing into a wooden playhouse .
```

## Model Training Information

The provided models were trained with:
- **Architecture**: MobileNetV2 (feature extraction) + LSTM (caption generation)
- **Vocabulary Size**: ~8,424 unique words
- **Max Caption Length**: 34 words
- **Training Split**: ~6,000 images for training, ~1,000 for validation, ~1,000 for testing
- **Epochs**: Multiple epochs with early stopping
- **Optimizer**: Adam
- **Loss Function**: Categorical crossentropy

## Usage Notes

### Current Status
✅ **Fully Functional**: The Image Caption Generator is ready to use with the downloaded models
✅ **Multiple Image Support**: Upload up to 10 images simultaneously
✅ **Web Interface**: Streamlit-inspired design with drag-and-drop
✅ **API Endpoints**: RESTful API for programmatic access

### Model Performance
- **Confidence**: 85% confidence for trained model predictions
- **Speed**: ~1-3 seconds per image (depending on hardware)
- **Quality**: Trained on diverse Flickr8k scenes and objects

### API Endpoints
- `GET /` - Web interface
- `GET /health` - Service health check
- `POST /caption` - Multiple image captioning
- `POST /caption-single` - Single image captioning (backward compatibility)

## Troubleshooting

### Model Loading Issues
If you see warnings about missing models, ensure:
1. `mymodel.h5` is in the root directory (82MB file)
2. `tokenizer.pkl` is in the root directory (340KB file)
3. Files are not corrupted (re-download if needed)

### Memory Issues
- MobileNetV2 is optimized for memory efficiency
- For very large batches, consider processing fewer images at once
- Docker container should have at least 2GB RAM allocated

### Dataset Download Issues
- Ensure Kaggle account is verified
- Check API credentials are properly configured
- Large dataset may take time to download (1GB+)

## License and Attribution

### Dataset License
- **Flickr8k Dataset**: Research and educational use
- **Original Paper**: "From image descriptions to visual denotations" (Hodosh et al.)
- **Kaggle Dataset**: https://www.kaggle.com/adityajn105/flickr8k

### Model License
- **Pre-trained Models**: Based on original repository by Sajid030
- **Repository**: https://github.com/Sajid030/image-caption-generator
- **Usage**: Educational and research purposes

## Next Steps

1. ✅ **Start Using**: Visit http://localhost:5005 to test image captioning
2. 📊 **Monitor Performance**: Check health endpoint for model status
3. 🔧 **Customize**: Modify prompts or add new features as needed
4. 📚 **Optional**: Download full dataset for research or retraining