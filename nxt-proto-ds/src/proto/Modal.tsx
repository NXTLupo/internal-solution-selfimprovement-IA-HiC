import * as React from 'react';
import { cn } from '../lib/utils';
import { DialogHeader, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Dialog title - semibold, one plain sentence. */
  title: string;
  /** Body copy under the title; children render below it when both are given. */
  body?: string;
  /** Cancel (outline) action label. */
  cancelLabel?: string;
  onCancel?: () => void;
  /** Confirm action label (accent, or destructive when `destructive`). */
  confirmLabel?: string;
  onConfirm?: () => void;
  /** Destructive confirms render on the rust/red destructive token. */
  destructive?: boolean;
  /** Render the dialog; false renders nothing. Default true (static inline). */
  open?: boolean;
  /** Wrap the panel in the rail scrim well so a static render reads as an overlay. */
  scrim?: boolean;
}

/** proto/Modal (Figma 462:2) - the focus-trapped dialog rendered statically: rail
 * scrim well holding a paper panel with a semibold title, quiet body, and a
 * right-aligned Cancel + confirm pair. Composes the '../ui/dialog' anatomy inline
 * (no portal) so a static render or screenshot shows the panel; live focus
 * trapping belongs to the Dialog primitive upstream. */
export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      title,
      body,
      cancelLabel = 'Cancel',
      onCancel,
      confirmLabel = 'Confirm',
      onConfirm,
      destructive,
      open = true,
      scrim = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    if (!open) return null;
    const panel = (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="grid w-full max-w-md gap-4 rounded-lg border border-hairline bg-paper p-6"
      >
        <DialogHeader>
          <h2 className="font-title text-label font-semibold text-ink">{title}</h2>
          {body && <p className="text-micro leading-relaxed text-grey">{body}</p>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="rounded-sm">
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            className="rounded-sm"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </div>
    );
    return (
      <div
        ref={ref}
        className={cn(
          scrim && 'flex items-center justify-center rounded-lg bg-rail/60 p-8',
          className
        )}
        {...props}
      >
        {panel}
      </div>
    );
  }
);
Modal.displayName = 'Modal';
