import * as React from 'react';
import { AlertTriangle, Check, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The confirmation line ("Workspace settings saved."). */
  message: string;
  /** Status icon + color: info (cyan), success (green check), error (rust). */
  variant?: 'info' | 'success' | 'error';
}

const TOAST_ICONS = {
  info: { Icon: Info, color: 'text-cyan' },
  success: { Icon: Check, color: 'text-success' },
  error: { Icon: AlertTriangle, color: 'text-rust' },
} as const;

/** proto/Toast (Figma 450:2) - the transient confirmation pill: dark rail surface,
 * status-colored icon, paper message text. role=status + aria-live=polite so it
 * announces without stealing focus. */
export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ message, variant = 'success', className, ...props }, ref) => {
    const { Icon, color } = TOAST_ICONS[variant];
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn('inline-flex items-center gap-2.5 rounded-lg bg-rail px-3.5 py-2.5', className)}
        {...props}
      >
        <Icon className={cn('h-4 w-4 shrink-0', color)} strokeWidth={2.2} />
        <span className="text-micro text-paper">{message}</span>
      </div>
    );
  }
);
Toast.displayName = 'Toast';
