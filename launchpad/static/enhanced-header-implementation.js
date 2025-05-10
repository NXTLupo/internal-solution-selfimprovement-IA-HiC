/**
 * Enhanced header implementation for NXT Humans
 * This script creates and inserts a modern, consistent header across all applications
 */

document.addEventListener('DOMContentLoaded', function() {
  // Create and insert the enhanced header
  insertEnhancedHeader();

  // Add scroll effects to header
  addHeaderScrollEffects();
});

/**
 * Insert enhanced header at the top of the page
 */
function insertEnhancedHeader() {
  // Get the current header if it exists
  const existingHeader = document.querySelector('.nxt-header');
  
  // Only proceed if we can find or replace an existing header
  if (!existingHeader) return;
  
  // Get application name from document title or meta tag
  let appName = document.title.split('|')[0] || "NXT Humans";
  appName = appName.trim();
  
  // Get application tagline from meta description if available
  const metaDescription = document.querySelector('meta[name="description"]');
  const appTagline = metaDescription ? metaDescription.getAttribute('content') : "AI-Powered Customer Experience Workbench";
  
  // Create the enhanced header HTML
  const headerHTML = `
    <div class="nxt-header-enhanced">
      <div class="nxt-header-container">
        <div class="nxt-brand">
          <img src="/static/nxt-humans-logo.png" alt="NXT Humans Logo" class="nxt-logo-enhanced">
          <div class="nxt-brand-text">
            <h1 class="nxt-brand-name">${appName}</h1>
            <p class="nxt-brand-tagline">${appTagline}</p>
          </div>
        </div>
        <nav class="nxt-nav">
          <a href="/" class="nxt-nav-item ${window.location.pathname === '/' ? 'active' : ''}">Home</a>
          <a href="/status" class="nxt-nav-item ${window.location.pathname === '/status' ? 'active' : ''}">Status</a>
        </nav>
        <div class="nxt-header-actions">
          <button class="nxt-action-button" id="refresh-header-btn">
            <span class="nxt-action-icon">↻</span>
            Refresh
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Replace the existing header
  existingHeader.outerHTML = headerHTML;
  
  // Add event listeners to the new header elements
  const refreshBtn = document.getElementById('refresh-header-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      // Add rotation animation
      this.classList.add('rotating');
      
      // Refresh the page after animation
      setTimeout(() => {
        window.location.reload();
      }, 600);
    });
  }
  
  // Add CSS for rotation animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes rotating {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .rotating {
      animation: rotating 0.6s linear;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Add scroll effects to the header
 */
function addHeaderScrollEffects() {
  const header = document.querySelector('.nxt-header-enhanced');
  if (!header) return;
  
  // Add scroll event listener
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      header.classList.add('header-scrolled');
    } else {
      header.classList.remove('header-scrolled');
    }
  });
  
  // Add CSS for scrolled header
  const style = document.createElement('style');
  style.textContent = `
    .header-scrolled {
      background: rgba(17, 30, 46, 0.95) !important;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
    }
    
    .header-scrolled .nxt-brand-name {
      font-size: 1.1rem;
      transition: all 0.3s ease;
    }
    
    .header-scrolled .nxt-brand-tagline {
      font-size: 0.8rem;
      transition: all 0.3s ease;
    }
    
    .header-scrolled .nxt-logo-enhanced {
      height: 36px;
      transition: all 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Apply the enhanced header to specific pages
 */
function applyHeaderToPages() {
  // Get all pages that need the enhanced header
  const applyToPages = ['index.html', 'status.html'];
  
  // Get current page filename
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Only apply to specific pages
  if (applyToPages.includes(currentPage)) {
    insertEnhancedHeader();
    addHeaderScrollEffects();
  }
}