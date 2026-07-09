import * as React from 'react';
import { cn } from '../lib/utils';

export interface StepperProps extends React.HTMLAttributes<HTMLElement> {
  /** Ordered step labels ("Account", "Billing", "Review"). */
  steps: string[];
  /** Zero-based index of the current step; earlier steps render done. */
  current: number;
}

/** proto/Stepper (Figma 441:36) - progress through ordered steps: 22px numbered
 * circles on paper. Done steps fill accent with on-accent numerals, the current step
 * wears a 2px accent ring + ink label (aria-current=step), upcoming steps sit on the
 * panel wash in quiet grey. */
export const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  ({ steps, current, className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn('flex flex-wrap items-center gap-2.5 bg-paper px-4 py-3.5', className)}
      {...props}
    >
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'upcoming';
        return (
          <li
            key={label}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={cn(
                'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full font-title text-nano font-medium',
                state === 'done' && 'bg-brand-accent text-on-brand-accent',
                state === 'current' && 'border-2 border-brand-accent bg-paper text-ink',
                state === 'upcoming' && 'bg-muted text-grey'
              )}
            >
              {i + 1}
            </span>
            <span className={cn('text-nano', state === 'current' ? 'font-title font-medium text-ink' : 'text-grey')}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  )
);
Stepper.displayName = 'Stepper';
