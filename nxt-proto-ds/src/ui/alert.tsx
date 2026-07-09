import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

// NOTE: the all-sides `border` classes must come BEFORE the side-specific
// `border-l-[3px]` or tailwind-merge drops the left width (live solo-grade finding).
const alertVariants = cva('relative w-full rounded-md border border-hairline border-l-[3px] bg-paper p-4', {
  variants: {
    variant: {
      info: 'border-l-cyan',
      success: 'border-l-success',
      warning: 'border-l-rust',
      error: 'border-l-destructive',
    },
  },
  defaultVariants: { variant: 'info' },
});

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

/** proto/Alert (Figma 450:6) - 3px color-coded left border on paper (cyan info,
 * rust warning, token error/success). */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn('mb-1 font-title font-semibold text-micro text-ink leading-none', className)} {...props} />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-micro text-muted-foreground leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
