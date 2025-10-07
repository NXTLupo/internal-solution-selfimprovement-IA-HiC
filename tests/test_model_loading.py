#!/usr/bin/env python3
"""
Test script for loading the h5 model on Apple Silicon M3
"""

import os
import sys
import platform

def test_model_loading():
    """Test if we can load the model file"""
    
    print("🔍 System Information:")
    print(f"   Platform: {platform.platform()}")
    print(f"   Machine: {platform.machine()}")
    print(f"   Python: {sys.version}")
    
    model_path = "/Users/jonathanlupo/Documents/NXT HUMANS_AI_CX_WORKBENCH/internal-solutions-image-captioner/mymodel.h5"
    
    print(f"\n📂 Checking model file: {model_path}")
    
    if not os.path.exists(model_path):
        print("❌ Model file not found!")
        return False
    
    file_size = os.path.getsize(model_path)
    print(f"   File size: {file_size / (1024*1024):.1f} MB")
    
    try:
        import tensorflow as tf
        print(f"   TensorFlow version: {tf.__version__}")
        print(f"   Keras version: {tf.keras.__version__}")
        
        # Check if we're on Apple Silicon
        if platform.machine() == "arm64":
            print("   🍎 Apple Silicon detected")
        
        print("\n🔄 Attempting to load model...")
        
        # Try method 1: Direct loading
        try:
            model = tf.keras.models.load_model(model_path)
            print("✅ Method 1 (direct): SUCCESS")
            print(f"   Model type: {type(model)}")
            if hasattr(model, 'summary'):
                print("   Model has summary method")
            return True
        except Exception as e1:
            print(f"❌ Method 1 (direct): FAILED - {e1}")
        
        # Try method 2: Load without compiling
        try:
            model = tf.keras.models.load_model(model_path, compile=False)
            print("✅ Method 2 (no compile): SUCCESS")
            print(f"   Model type: {type(model)}")
            return True
        except Exception as e2:
            print(f"❌ Method 2 (no compile): FAILED - {e2}")
        
        # Try method 3: Load with custom objects
        try:
            model = tf.keras.models.load_model(model_path, compile=False, custom_objects={})
            print("✅ Method 3 (custom objects): SUCCESS")
            print(f"   Model type: {type(model)}")
            return True
        except Exception as e3:
            print(f"❌ Method 3 (custom objects): FAILED - {e3}")
        
        print("\n❌ All loading methods failed")
        return False
        
    except ImportError as e:
        print(f"❌ TensorFlow import failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing H5 Model Loading on Apple Silicon")
    print("=" * 50)
    
    success = test_model_loading()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Model loading test PASSED")
        print("💡 The model should work in the Docker container")
    else:
        print("⚠️ Model loading test FAILED")
        print("💡 This explains the Docker container issue")
        print("💡 Try downloading a compatible model or retraining")