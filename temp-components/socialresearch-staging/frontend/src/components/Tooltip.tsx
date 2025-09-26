import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  score?: number;
}

export const Tooltip = ({ children, content, className = '', score }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(setTimeout(() => {}, 0));

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Calculate available space
      const spaceAbove = triggerRect.top;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceRight = window.innerWidth - triggerRect.right;
      
      // Maximum height for tooltip
      const maxHeight = Math.min(300, Math.max(spaceAbove, spaceBelow) - 20);
      
      let top, left;
      
      // Prefer showing to the right if there's space
      if (spaceRight >= tooltipRect.width + 8) {
        left = triggerRect.right + 8;
        top = triggerRect.top - (Math.min(tooltipRect.height, maxHeight) / 2) + (triggerRect.height / 2);
      }
      // Otherwise show above or below
      else {
        left = triggerRect.left - (tooltipRect.width / 2) + (triggerRect.width / 2);
        if (spaceAbove > spaceBelow) {
          top = triggerRect.top - Math.min(tooltipRect.height, maxHeight) - 8;
        } else {
          top = triggerRect.bottom + 8;
        }
      }
      
      // Prevent tooltip from going off-screen
      left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - Math.min(tooltipRect.height, maxHeight) - 8));

      setPosition({ top, left });
    }
  }, [isVisible]);

  return (
    <div 
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && createPortal(
        <div 
          ref={tooltipRef}
          className={`
            fixed w-auto min-w-[200px] max-w-[600px] p-3 
            bg-gray-800 border border-gray-700 rounded-lg 
            shadow-xl z-[9999]
            transition-opacity duration-300 ease-in-out
            ${className}
          `}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxHeight: '400px',
            overflowY: 'auto',
            overflowX: 'hidden',
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? 'auto' : 'none'
          }}
        >
          {score !== undefined && (
            <div 
              className="absolute mr-1 mt-1 -top-0 -right-0 bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 flex items-center gap-0.5 justify-center shadow-lg border-2 border-gray-800 "
            >
              <svg 
                className="w-3 h-3" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              {score}
            </div>
          )}
          {content}
        </div>,
        document.body
      )}
    </div>
  );
}; 