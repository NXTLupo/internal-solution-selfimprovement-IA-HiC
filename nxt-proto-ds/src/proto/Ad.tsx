import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';

export interface AdProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ad headline copy. */
  headline: string;
  /** Supporting line after the headline. */
  body?: string;
  /** Call-to-action label; omit to hide the button. */
  cta?: string;
  onCtaClick?: () => void;
  /** Text inside the mono disclosure chip. */
  adLabel?: string;
}

/** proto/Ad (Figma 467:35) - slim display-ad banner: a dashed-border box carrying a
 * mono "AD" disclosure chip, headline + support copy, and an outline CTA. Clearly
 * labelled as advertising and never focus-stealing. */
export const Ad = React.forwardRef<HTMLDivElement, AdProps>(
  ({ headline, body, cta, onCtaClick, adLabel = 'AD', className, ...props }, ref) => (
    <div
      ref={ref}
      aria-label="Advertisement"
      className={cn(
        'flex items-center gap-3 rounded-md border border-dashed border-hairline bg-paper px-4 py-3',
        className
      )}
      {...props}
    >
      <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-nano font-semibold text-grey">
        {adLabel}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-title text-micro font-semibold text-ink">{headline}</span>
        {body && <span className="truncate text-nano text-grey">{body}</span>}
      </span>
      {cta && (
        <Button variant="outline" size="sm" onClick={onCtaClick} className="shrink-0 rounded-md">
          {cta}
        </Button>
      )}
    </div>
  )
);
Ad.displayName = 'Ad';
