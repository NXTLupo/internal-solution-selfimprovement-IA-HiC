/**
 * App GIF Controls - Reusable pause/play system for app header thumbnails
 * Elegant animated GIF controls for Intelligence Augmentation Suite apps
 */

class AppGifController {
  constructor() {
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupGifControls());
    } else {
      this.setupGifControls();
    }
  }

  setupGifControls() {
    // Look for app header thumbnails
    const thumbnailContainers = document.querySelectorAll('.ia-thumbnail-section');
    
    thumbnailContainers.forEach(container => {
      const thumbnail = container.querySelector('.ia-app-thumbnail');
      if (thumbnail && thumbnail.src.includes('.gif')) {
        this.setupGifThumbnail(container, thumbnail);
      }
    });
  }

  setupGifThumbnail(container, thumbnail) {
    const originalSrc = thumbnail.src;
    
    // Store the original source
    thumbnail.dataset.originalSrc = originalSrc;
    
    // Initially pause the GIF
    this.pauseGif(thumbnail);
    
    // Add hover event listeners to the container
    container.addEventListener('mouseenter', () => {
      this.playGif(thumbnail);
    });

    container.addEventListener('mouseleave', () => {
      this.pauseGif(thumbnail);
    });
  }

  playGif(thumbnail) {
    const originalSrc = thumbnail.dataset.originalSrc;
    if (originalSrc) {
      // Force reload to restart animation from beginning
      thumbnail.src = originalSrc + '?t=' + Date.now();
    }
  }

  pauseGif(thumbnail) {
    const originalSrc = thumbnail.dataset.originalSrc || thumbnail.src.split('?')[0];
    if (originalSrc) {
      // Create a new image to capture the first frame
      const img = new Image();
      img.onload = () => {
        try {
          // Create canvas to extract first frame
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.naturalWidth || 400;
          canvas.height = img.naturalHeight || 300;
          
          ctx.drawImage(img, 0, 0);
          const staticDataUrl = canvas.toDataURL('image/png');
          thumbnail.src = staticDataUrl;
        } catch (e) {
          // Fallback: use original source if canvas fails
          console.warn('Canvas extraction failed, using original GIF:', e);
          thumbnail.src = originalSrc;
        }
      };
      
      img.onerror = () => {
        // Fallback: use the original source
        console.warn('Failed to load GIF for processing:', originalSrc);
        thumbnail.src = originalSrc;
      };
      
      // Load the GIF to capture first frame
      img.src = originalSrc;
    }
  }
}

// Initialize the GIF controller when script loads
new AppGifController();