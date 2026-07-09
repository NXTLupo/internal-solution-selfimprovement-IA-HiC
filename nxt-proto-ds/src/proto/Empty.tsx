import * as React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';

export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Semibold headline ("No proposals yet"). */
  title: string;
  /** Quiet centered guidance under the headline. */
  description?: string;
  /** Primary action label on the accent button; omit to hide it. */
  actionLabel?: string;
  onAction?: () => void;
  /** 30px state icon (a lucide-react component); defaults to the inbox glyph. */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
}

/** proto/Empty (Figma 450:44) - the empty state: centered paper card with a hairline
 * border, quiet grey inbox icon, semibold title, centered guidance line, and an accent
 * primary action to fill the void. */
export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ title, description, actionLabel, onAction, icon, className, ...props }, ref) => {
    const Icon = icon ?? Inbox;
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center gap-2.5 rounded-lg border border-hairline bg-paper px-7 py-6 text-center',
          className
        )}
        {...props}
      >
        <Icon className="h-[30px] w-[30px] text-grey" strokeWidth={1.5} />
        <span className="font-title text-label font-semibold text-ink">{title}</span>
        {description && <p className="max-w-xs text-nano leading-relaxed text-grey">{description}</p>}
        {actionLabel && (
          <Button size="sm" onClick={onAction} className="mt-1 rounded-md">
            {actionLabel}
          </Button>
        )}
      </div>
    );
  }
);
Empty.displayName = 'Empty';
