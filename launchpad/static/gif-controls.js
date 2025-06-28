/**
 * GIF Controls - Pause/Play animated GIFs on hover
 * Elegant animated GIF thumbnails for Intelligence Augmentation Suite
 */

class GifController {
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
    const enterpriseCards = document.querySelectorAll('.enterprise-card');
    
    enterpriseCards.forEach(card => {
      const thumbnail = card.querySelector('.app-thumbnail');
      if (thumbnail && thumbnail.src.includes('.gif')) {
        this.setupGifThumbnail(card, thumbnail);
      }
    });
  }

  setupGifThumbnail(card, thumbnail) {
    const originalSrc = thumbnail.src;
    
    // Store the original source
    thumbnail.dataset.originalSrc = originalSrc;
    
    // Initially pause the GIF by reloading it (resets to first frame)
    this.pauseGif(thumbnail);
    
    // Add hover event listeners
    card.addEventListener('mouseenter', () => {
      this.playGif(thumbnail);
    });

    card.addEventListener('mouseleave', () => {
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
      // Create a new image to load the GIF and stop at first frame
      const img = new Image();
      img.onload = () => {
        // This technique stops the GIF at its current frame
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 300;
        
        try {
          ctx.drawImage(img, 0, 0);
          const staticDataUrl = canvas.toDataURL('image/png');
          thumbnail.src = staticDataUrl;
        } catch (e) {
          // Fallback: just reload the original (may still animate but better than broken)
          thumbnail.src = originalSrc;
        }
      };
      
      img.onerror = () => {
        // Fallback: use the original source
        thumbnail.src = originalSrc;
      };
      
      // Load the GIF to capture first frame
      img.src = originalSrc;
    }
  }
}

// Initialize the GIF controller
new GifController();