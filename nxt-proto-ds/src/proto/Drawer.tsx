import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { SheetHeader } from '../ui/sheet';
import { Button } from '../ui/button';

export interface DrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Sheet title - semibold header line. */
  title: string;
  /** Body copy under the header; children render below it when both are given. */
  body?: string;
  /** Which edge the panel docks to. */
  side?: 'right' | 'left';
  /** Full-width accent action pinned to the panel foot. */
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  /** Render the drawer; false renders nothing. Default true (static inline). */
  open?: boolean;
}

/** proto/Drawer (Figma 462:11) - the side sheet rendered statically: rail scrim with
 * a 260px paper panel docked to one edge, semibold title + close x header, quiet
 * body, spacer, and a full-width accent Apply action. Composes the '../ui/sheet'
 * anatomy inline (no portal) so a static render shows the panel. */
export const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
  (
    { title, body, side = 'right', actionLabel = 'Apply', onAction, onClose, open = true, className, children, ...props },
    ref
  ) => {
    if (!open) return null;
    return (
      <div
        ref={ref}
        className={cn('relative min-h-[300px] overflow-hidden rounded-lg bg-rail/60', className)}
        {...props}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            'absolute inset-y-0 flex w-[260px] flex-col gap-4 border-hairline bg-paper p-[18px]',
            side === 'right' ? 'right-0 border-l' : 'left-0 border-r'
          )}
        >
          <SheetHeader className="flex-row items-center justify-between gap-2">
            <h2 className="font-title text-label font-semibold text-ink">{title}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-sm text-grey transition-colors hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </SheetHeader>
          {body && <p className="text-micro leading-relaxed text-grey">{body}</p>}
          {children}
          <span className="flex-1" aria-hidden />
          {actionLabel && (
            <Button onClick={onAction} className="w-full rounded-sm">
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }
);
Drawer.displayName = 'Drawer';
