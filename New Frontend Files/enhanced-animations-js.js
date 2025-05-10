/**
 * Enhanced animations and interactions for NXT Humans Workbench
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize ScrollReveal for element animations
  initScrollReveal();
  
  // Add hover effects and animations
  addCardInteractions();
  
  // Add particle background to hero section
  initParticleBackground();
  
  // Add smooth scrolling
  initSmoothScrolling();
  
  // Add number counter animation for workflow steps
  initNumberCounters();
  
  // Add ripple effect to buttons
  initButtonRipples();
});

/**
 * Initialize ScrollReveal for element animations on scroll
 */
function initScrollReveal() {
  // Check if ScrollReveal is available (we're using a fallback if not)
  const hasScrollReveal = typeof ScrollReveal === 'function';
  
  // Elements to animate on scroll
  const animateElements = document.querySelectorAll('.app-card, .workflow-step, .service-urls, .url-item');
  
  if (hasScrollReveal) {
    // Use ScrollReveal if available
    const sr = ScrollReveal({
      origin: 'bottom',
      distance: '20px',
      duration: 800,
      delay: 0,
      easing: 'cubic-bezier(0.5, 0, 0, 1)',
      reset: false
    });
    
    sr.reveal('.app-card', { interval: 100 });
    sr.reveal('.workflow-step', { interval: 200 });
    sr.reveal('.service-urls', { delay: 200 });
    sr.reveal('.url-item', { interval: 50, delay: 300 });
  } else {
    // Fallback animation using CSS classes
    let delay = 0;
    
    animateElements.forEach((el, index) => {
      // Add animation classes with increasing delays
      if (el.classList.contains('app-card')) {
        delay = 100 * (index % 3);
      } else if (el.classList.contains('workflow-step')) {
        delay = 200 * (index % 3);
      } else if (el.classList.contains('service-urls')) {
        delay = 200;
      } else if (el.classList.contains('url-item')) {
        delay = 300 + (50 * (index % 4));
      }
      
      el.classList.add('fade-in');
      el.style.animationDelay = delay + 'ms';
    });
  }
}

/**
 * Add enhanced interactions to cards and elements
 */
function addCardInteractions() {
  // Add tilt effect to app cards
  const appCards = document.querySelectorAll('.app-card');
  
  appCards.forEach(card => {
    // Mouse move tilt effect
    card.addEventListener('mousemove', e => {
      // Get card dimensions and position
      const rect = card.getBoundingClientRect();
      const cardWidth = rect.width;
      const cardHeight = rect.height;
      
      // Calculate mouse position within card (as percentages from center)
      const mouseX = (e.clientX - rect.left) / cardWidth - 0.5;
      const mouseY = (e.clientY - rect.top) / cardHeight - 0.5;
      
      // Apply subtle tilt effect (max 2 degrees)
      const tiltX = mouseY * 2;
      const tiltY = -mouseX * 2;
      
      // Apply transform
      card.style.transform = `translateY(-8px) perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });
    
    // Reset on mouse leave
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      
      // Trigger hover state for transition
      setTimeout(() => {
        card.classList.add('hover-transition');
        card.style.transform = 'translateY(-8px)';
        
        // Remove class after transition
        setTimeout(() => {
          card.classList.remove('hover-transition');
        }, 300);
      }, 50);
    });
  });
  
  // Add hover effect to URL items
  const urlItems = document.querySelectorAll('.url-item');
  urlItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      const urlValue = item.querySelector('.url-value');
      if (urlValue) {
        urlValue.classList.add('text-gradient');
      }
    });
    
    item.addEventListener('mouseleave', () => {
      const urlValue = item.querySelector('.url-value');
      if (urlValue) {
        urlValue.classList.remove('text-gradient');
      }
    });
  });
}

/**
 * Initialize particle background for hero section
 */
function initParticleBackground() {
  const heroContainer = document.querySelector('.hero-container');
  
  if (!heroContainer) return;
  
  // Create canvas for particles
  const canvas = document.createElement('canvas');
  canvas.classList.add('particle-canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '0';
  canvas.style.opacity = '0.4';
  
  // Insert canvas as first child of hero container
  heroContainer.insertBefore(canvas, heroContainer.firstChild);
  
  // Set canvas dimensions
  canvas.width = heroContainer.offsetWidth;
  canvas.height = heroContainer.offsetHeight;
  
  // Get canvas context
  const ctx = canvas.getContext('2d');
  
  // Particle settings
  const particleCount = 50;
  const particles = [];
  const colors = ['rgba(1, 196, 200, 0.5)', 'rgba(41, 141, 255, 0.4)', 'rgba(156, 106, 255, 0.3)'];
  
  // Create particles
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedX: Math.random() * 0.2 - 0.1,
      speedY: Math.random() * 0.2 - 0.1
    });
  }
  
  // Animation function
  function animateParticles() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw particles
    particles.forEach(particle => {
      // Update position
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      // Bounce off edges
      if (particle.x < 0 || particle.x > canvas.width) {
        particle.speedX = -particle.speedX;
      }
      
      if (particle.y < 0 || particle.y > canvas.height) {
        particle.speedY = -particle.speedY;
      }
      
      // Draw particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
    });
    
    // Continue animation
    requestAnimationFrame(animateParticles);
  }
  
  // Start animation
  animateParticles();
  
  // Update canvas dimensions on window resize
  window.addEventListener('resize', () => {
    canvas.width = heroContainer.offsetWidth;
    canvas.height = heroContainer.offsetHeight;
  });
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initSmoothScrolling() {
  // Find all anchor links
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  
  anchorLinks.forEach(link => {
    link.addEventListener('click', e => {
      // Prevent default behavior
      e.preventDefault();
      
      // Get target element
      const targetId = link.getAttribute('href');
      
      // Skip if it's just "#"
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      
      // Scroll to element if it exists
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Account for header height
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Initialize number counter animation for workflow steps
 */
function initNumberCounters() {
  const stepNumbers = document.querySelectorAll('.step-number');
  
  // Intersection Observer to trigger animation when elements come into view
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Add animation class to numbers when they come into view
        entry.target.classList.add('animate-number');
        
        // Unobserve once triggered
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  // Observe each step number
  stepNumbers.forEach(number => {
    observer.observe(number);
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
