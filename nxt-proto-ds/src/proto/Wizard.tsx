import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';
import { Stepper } from './Stepper';

export interface WizardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ordered step labels shown in the stepper header. */
  steps: string[];
  /** Zero-based index of the current step. */
  current: number;
  /** The current step's body (compose Field rows, CheckGroups, review panels...). */
  children?: React.ReactNode;
  /** Footer back label; the button hides on the first step. */
  backLabel?: string;
  /** Footer primary label; pass "Finish" on the last step. */
  nextLabel?: string;
  onBack?: () => void;
  onNext?: () => void;
  /** Blocks the primary action while the step has validation errors. */
  nextDisabled?: boolean;
}

/** proto/Wizard (Figma 462:50) - the multi-step flow shell: paper card carrying a
 * Stepper header (aria-current=step), the current step's body, and a hairline-ruled
 * footer with quiet Back + accent Continue. Errors block advance via nextDisabled. */
export const Wizard = React.forwardRef<HTMLDivElement, WizardProps>(
  (
    { steps, current, children, backLabel = 'Back', nextLabel = 'Continue', onBack, onNext, nextDisabled, className, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-4 rounded-lg border border-hairline bg-paper p-5', className)}
      {...props}
    >
      <Stepper steps={steps} current={current} className="bg-transparent p-0" />
      <div className="flex-1">{children}</div>
      <div className="flex items-center justify-between border-t border-hairline pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className={cn('rounded-md bg-muted', current === 0 && 'invisible')}
        >
          {backLabel}
        </Button>
        <Button type="button" onClick={onNext} disabled={nextDisabled} className="rounded-md">
          {nextLabel}
        </Button>
      </div>
    </div>
  )
);
Wizard.displayName = 'Wizard';
