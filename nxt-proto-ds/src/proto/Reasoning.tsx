import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ReasoningProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The reasoning trace itself - bind the REAL model trace text. */
  children: React.ReactNode;
  /** Summary row label. */
  summary?: string;
  /** Right-aligned mono badge, e.g. "thought 4s"; omit to hide. */
  badge?: string;
  /** Render the trace body expanded (default true so static previews show the anatomy). */
  open?: boolean;
}

/** proto/Reasoning (Figma 405:2) - collapsible reasoning trace on the ecru wash:
 * sparkle summary row with a mono "thought Ns" badge, quiet grey trace body below. */
export const Reasoning = React.forwardRef<HTMLDivElement, ReasoningProps>(
  ({ children, summary = 'Show reasoning', badge, open = true, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col rounded-md border border-hairline bg-muted', className)}
      {...props}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-grey" strokeWidth={2} />
        <span className="flex-1 text-micro text-grey">{summary}</span>
        {badge && (
          <span className="rounded-sm border border-hairline bg-paper px-1.5 py-0.5 font-mono text-nano text-grey">
            {badge}
          </span>
        )}
      </div>
      {open && (
        <div className="px-3 pb-2.5 text-nano leading-normal text-grey">{children}</div>
      )}
    </div>
  )
);
Reasoning.displayName = 'Reasoning';
