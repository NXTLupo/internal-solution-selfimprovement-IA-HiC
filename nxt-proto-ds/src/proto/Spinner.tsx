import * as React from 'react';
import { cn } from '../lib/utils';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Quiet caption under the arc; pass an empty string to render the arc alone. */
  label?: string;
  /** Arc diameter in px. */
  size?: number;
}

/** proto/Spinner (Figma 451:2) - indeterminate loading: a token-colored 3/4-arc SVG
 * spun by pure CSS (animate-spin) over a quiet grey caption. role=status carries the
 * accessible loading announcement. */
export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ label = 'Loading...', size = 28, className, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-label={label || 'Loading'}
      className={cn('flex flex-col items-center gap-2', className)}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="animate-spin text-brand-accent"
        style={{ width: size, height: size }}
      >
        <path d="M21 12a9 9 0 1 1-9-9" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      </svg>
      {label && <span className="text-nano text-grey">{label}</span>}
    </div>
  )
);
Spinner.displayName = 'Spinner';
