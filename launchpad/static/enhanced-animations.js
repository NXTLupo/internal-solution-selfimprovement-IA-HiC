/**
 * Enhanced animations and interactions for NXT Humans Workbench
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize element animations 
  initElementAnimations();
  
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
  
  // Add scroll to top button
  addScrollToTopButton();
  
  // Add hero subtitle animation
  addHeroSubtitleAnimation();
});

/**
 * Initialize animations for elements on page load and scroll
 */
function initElementAnimations() {
  // Get all animated elements
  const animatedElements = document.querySelectorAll('.fade-in, .scale-in');
  
  // Configure the Intersection Observer
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  // Create observer that will trigger animations when elements come into view
  const elementObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Add visible class to start the animation
        entry.target.classList.add('visible');
        
        // Unobserve after animation starts
        elementObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe all animated elements
  animatedElements.forEach(element => {
    elementObserver.observe(element);
  });
  
  // Add subtle parallax effect to hero section
  const heroSection = document.querySelector('.hero-container');
  const heroContent = document.querySelector('.hero-content');
  
  if (heroSection && heroContent) {
    window.addEventListener('scroll', () => {
      const scrollValue = window.scrollY;
      if (scrollValue < 600) {
        heroContent.style.transform = `translateY(${scrollValue * 0.2}px)`;
      }
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
      
      // Add highlight effect
      const glowX = ((e.clientX - rect.left) / rect.width) * 100;
      const glowY = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.background = `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.8) 100%)`;
    });
    
    // Reset on mouse leave
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.background = 'var(--glass-background)';
      
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
  
  // Add interactive hover effects to workflow steps
  const workflowSteps = document.querySelectorAll('.workflow-step');
  
  workflowSteps.forEach((step, index) => {
    step.addEventListener('mouseenter', () => {
      // Highlight current step
      step.classList.add('active-step');
      
      // Update other steps opacity
      workflowSteps.forEach((otherStep, otherIndex) => {
        if (otherIndex !== index) {
          otherStep.style.opacity = '0.6';
        }
      });
    });
    
    step.addEventListener('mouseleave', () => {
      // Remove highlight
      step.classList.remove('active-step');
      
      // Reset all steps opacity
      workflowSteps.forEach(otherStep => {
        otherStep.style.opacity = '1';
      });
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
  
  // Add pulse effect to the launch all button
  const launchAllBtn = document.getElementById('launch-all-btn');
  
  if (launchAllBtn) {
    const createPulseEffect = () => {
      const pulse = document.createElement('span');
      pulse.classList.add('btn-pulse');
      launchAllBtn.appendChild(pulse);
      
      setTimeout(() => {
        pulse.remove();
      }, 1000);
    };
    
    // Create pulse effect periodically
    setInterval(createPulseEffect, 3000);
  }
  
  // Add live animation to status indicators
  const statusIndicators = document.querySelectorAll('.status-indicator');
  
  statusIndicators.forEach(indicator => {
    // Create a subtle pulse animation
    if (indicator.classList.contains('status-running')) {
      setInterval(() => {
        indicator.classList.add('pulse-animation');
        setTimeout(() => {
          indicator.classList.remove('pulse-animation');
        }, 1000);
      }, 2000);
    }
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
      
      // Make sure button has position relative
      if (window.getComputedStyle(button).position === 'static') {
        button.style.position = 'relative';
      }
      button.style.overflow = 'hidden';
      
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
 * Add scroll to top button
 */
function addScrollToTopButton() {
  const button = document.createElement('button');
  button.innerHTML = '<span>↑</span>';
  button.classList.add('scroll-top-button');
  document.body.appendChild(button);
  
  // Show/hide button based on scroll position
  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
      button.classList.add('visible');
    } else {
      button.classList.remove('visible');
    }
  });
  
  // Scroll to top on click
  button.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
  
  // Add styles for scroll-to-top button
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .scroll-top-button {
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--cyan-primary), #298DFF);
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      cursor: pointer;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s ease, transform 0.3s ease, background 0.3s ease;
      z-index: 100;
    }
    
    .scroll-top-button.visible {
      opacity: 1;
      transform: translateY(0);
    }
    
    .scroll-top-button:hover {
      background: linear-gradient(135deg, #01D8DC, #3E9CFF);
      transform: translateY(-5px);
    }
    
    /* Animation styles for visibility transitions */
    .fade-in, .scale-in {
      opacity: 0;
      transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .fade-in {
      transform: translateY(20px);
    }
    
    .scale-in {
      transform: scale(0.92);
    }
    
    .fade-in.visible, .scale-in.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    
    /* Button pulse animation */
    .btn-pulse {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--cyan-primary), #298DFF);
      opacity: 0.5;
      z-index: -1;
      animation: btnPulse 1s cubic-bezier(0, 0, 0.2, 1) forwards;
    }
    
    @keyframes btnPulse {
      0% {
        transform: scale(1);
        opacity: 0.7;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }
    
    /* Status indicator pulse */
    .pulse-animation {
      animation: statusPulse 1s ease;
    }
    
    @keyframes statusPulse {
      0% {
        box-shadow: 0 0 0 0 rgba(12, 206, 107, 0.7);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(12, 206, 107, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(12, 206, 107, 0);
      }
    }
  `;
  
  document.head.appendChild(styleElement);
}

/**
 * Add animation to hero subtitle
 */
function addHeroSubtitleAnimation() {
  const heroSubtitle = document.querySelector('.hero-subtitle');
  
  if (heroSubtitle) {
    const originalText = heroSubtitle.textContent;
    heroSubtitle.textContent = '';
    
    const typeText = (text, index) => {
      if (index < text.length) {
        heroSubtitle.textContent += text.charAt(index);
        setTimeout(() => typeText(text, index + 1), 30);
      }
    };
    
    // Start typing effect after a short delay
    setTimeout(() => typeText(originalText, 0), 1000);
  }
}