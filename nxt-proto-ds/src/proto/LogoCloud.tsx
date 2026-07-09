import * as React from 'react';
import { cn } from '../lib/utils';

export interface LogoCloudProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Customer names rendered as text wordmarks (never image logos). */
  names: string[];
  /** Quiet caption above the row. */
  caption?: string;
}

/** proto/LogoCloud (Figma 467:24) - customer logo band: a centered grey caption over a
 * wrapping row of text wordmarks (title face, semibold, grey). The group carries an
 * accessible label so the roster reads as one region. */
export const LogoCloud = React.forwardRef<HTMLDivElement, LogoCloudProps>(
  ({ names, caption = 'Trusted by teams at', className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      aria-label={caption}
      className={cn('flex flex-col items-center gap-4 rounded-lg bg-ecru px-6 py-6', className)}
      {...props}
    >
      <span className="text-nano uppercase tracking-widest text-grey">{caption}</span>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {names.map((name) => (
          <span key={name} className="whitespace-nowrap font-title text-micro font-semibold text-grey">
            {name}
          </span>
        ))}
      </div>
    </div>
  )
);
LogoCloud.displayName = 'LogoCloud';
