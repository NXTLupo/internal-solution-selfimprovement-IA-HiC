import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

export interface AgentStep {
  /** Step label, e.g. "Search the corpus". */
  label: string;
  /** done = success circle + check; active = accent circle + dot; pending = ecru circle. */
  status: 'done' | 'active' | 'pending';
  /** Right-aligned quiet note, e.g. "working..." on the active step. */
  detail?: string;
}

export interface AgentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The agent's plan steps in execution order. */
  steps: AgentStep[];
}

/** proto/Agent (Figma 412:15) - agent step list: one row per plan step with a status
 * circle (success check when done, accent dot while active, empty ecru when pending),
 * the step label, and an optional right-aligned "working..." note. */
export const Agent = React.forwardRef<HTMLDivElement, AgentProps>(
  ({ steps, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-2.5">
          <span
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
              step.status === 'done' && 'bg-success',
              step.status === 'active' && 'bg-brand-accent',
              step.status === 'pending' && 'bg-muted'
            )}
          >
            {step.status === 'done' && <Check className="h-3 w-3 text-paper" strokeWidth={2.5} />}
            {step.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-on-brand-accent" />}
          </span>
          <span
            className={cn(
              'flex-1 text-micro text-ink',
              step.status === 'active' && 'font-semibold',
              step.status === 'pending' && 'text-grey'
            )}
          >
            {step.label}
          </span>
          {step.detail && <span className="text-nano text-grey">{step.detail}</span>}
        </div>
      ))}
    </div>
  )
);
Agent.displayName = 'Agent';
