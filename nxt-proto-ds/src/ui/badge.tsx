import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-0.5 text-nano font-title font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand-accent text-on-brand-accent',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-hairline text-ink',
        success: 'border-transparent bg-success text-paper',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        info: 'border-transparent bg-cyan text-paper',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

/** Status pill bound to brand tokens (accent / success / info / destructive). */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(function Badge({ className, variant, ...props }, ref) {
  return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
});

export { Badge, badgeVariants };
