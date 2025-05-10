/**
 * Enhanced animations and interactions for NXT Humans Reddit Data Collector
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize animations for elements
  initAnimations();
  
  // Add hover effects and animations
  addCardInteractions();
  
  // Add ripple effect to buttons
  initButtonRipples();
  
  // Add time filter interactions
  enhanceTimeFilter();
  
  // Add download item interactions
  enhanceDownloadItems();
});

/**
 * Initialize animations for elements on page load
 */
function initAnimations() {
  // Elements to animate on scroll
  const animateElements = document.querySelectorAll('.nxt-card, .time-filter-option, .nxt-btn');
  
  // Add staggered fade-in animation
  animateElements.forEach((el, index) => {
    // Add animation classes with increasing delays
    if (el.classList.contains('nxt-card')) {
      el.classList.add('fade-in');
      el.style.animationDelay = (index % 3) * 100 + 'ms';
    } else if (el.classList.contains('nxt-btn')) {
      el.classList.add('scale-in');
      el.style.animationDelay = (index % 3) * 100 + 200 + 'ms';
    } else if (el.classList.contains('time-filter-option')) {
      el.classList.add('fade-in');
      el.style.animationDelay = (index % 5) * 50 + 100 + 'ms';
    }
  });
}

/**
 * Add enhanced interactions to cards
 */
function addCardInteractions() {
  // Add tilt effect to cards
  const cards = document.querySelectorAll('.nxt-card');
  
  cards.forEach(card => {
    // Mouse move tilt effect
    card.addEventListener('mousemove', e => {
      // Get card dimensions and position
      const rect = card.getBoundingClientRect();
      const cardWidth = rect.width;
      const cardHeight = rect.height;
      
      // Calculate mouse position within card (as percentages from center)
      const mouseX = (e.clientX - rect.left) / cardWidth - 0.5;
      const mouseY = (e.clientY - rect.top) / cardHeight - 0.5;
      
      // Apply subtle tilt effect (max 1 degree)
      const tiltX = mouseY * 1;
      const tiltY = -mouseX * 1;
      
      // Apply transform
      card.style.transform = `translateY(-3px) perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });
    
    // Reset on mouse leave
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      
      // Trigger hover state for transition
      setTimeout(() => {
        card.style.transform = 'translateY(-3px)';
        
        // Remove transform after transition
        setTimeout(() => {
          card.style.transform = '';
        }, 300);
      }, 50);
    });
  });
}

/**
 * Initialize ripple effect for buttons
 */
function initButtonRipples() {
  const buttons = document.querySelectorAll('.nxt-btn');
  
  buttons.forEach(button => {
    button.addEventListener('click', e => {
      // Create ripple element
      const ripple = document.createElement('span');
      ripple.classList.add('btn-ripple');
      
      // Style ripple
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
      ripple.style.transform = 'scale(0)';
      ripple.style.transition = 'transform 0.6s, opacity 0.6s';
      ripple.style.pointerEvents = 'none';
      
      // Calculate position relative to button
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      
      // Position ripple
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - (size / 2)}px`;
      ripple.style.top = `${e.clientY - rect.top - (size / 2)}px`;
      
      // Add ripple to button
      button.appendChild(ripple);
      
      // Trigger animation
      setTimeout(() => {
        ripple.style.transform = 'scale(1)';
        ripple.style.opacity = '0';
      }, 10);
      
      // Remove ripple after animation
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
}

/**
 * Enhance time filter option interactions
 */
function enhanceTimeFilter() {
  const timeFilterOptions = document.querySelectorAll('.time-filter-option');
  
  timeFilterOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Add pulse animation when selected
      this.classList.add('pulse');
      
      setTimeout(() => {
        this.classList.remove('pulse');
      }, 500);
    });
  });
}

/**
 * Enhance download item interactions
 */
function enhanceDownloadItems() {
  // Use MutationObserver to watch for new download items
  const downloadList = document.getElementById('download-list');
  
  if (!downloadList) return;
  
  // Create a mutation observer
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // New nodes were added, add animations to them
        Array.from(mutation.addedNodes).forEach((node, index) => {
          if (node.nodeType === 1 && node.classList.contains('download-item')) {
            // Add fade-in animation to new download items
            node.classList.add('fade-in');
            node.style.animationDelay = index * 100 + 'ms';
            
            // Add interaction to download buttons
            const downloadButton = node.querySelector('.nxt-btn');
            if (downloadButton) {
              downloadButton.addEventListener('mouseenter', () => {
                const downloadIcon = node.querySelector('.download-icon');
                if (downloadIcon) {
                  downloadIcon.style.transform = 'scale(1.2)';
                }
              });
              
              downloadButton.addEventListener('mouseleave', () => {
                const downloadIcon = node.querySelector('.download-icon');
                if (downloadIcon) {
                  downloadIcon.style.transform = '';
                }
              });
            }
          }
        });
      }
    });
  });
  
  // Start observing
  observer.observe(downloadList, { childList: true });
}

/**
 * Enhance progress bar animation
 */
function enhanceProgressBar() {
  const progressBar = document.getElementById('progress-bar');
  
  if (!progressBar) return;
  
  // Use MutationObserver to watch for progress changes
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        // Add pulse animation when progress reaches 100%
        const width = progressBar.style.width;
        if (width === '100%') {
          progressBar.classList.add('pulse');
          
          setTimeout(() => {
            progressBar.classList.remove('pulse');
          }, 500);
        }
      }
    });
  });
  
  // Start observing
  observer.observe(progressBar, { attributes: true });
}