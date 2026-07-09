import * as React from 'react';
import { Minus, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export interface CompareSide {
  /** Panel label ("Before", "Current stack", "After", "With the platform"). */
  label: string;
  /** The statements listed in this panel, top to bottom. */
  items: string[];
}

export interface CompareProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The left (baseline) panel - quiet, minus-marked rows. */
  before: CompareSide;
  /** The right (improved) panel - ink rows with success check marks. */
  after: CompareSide;
}

/** proto/Compare (Figma 456:75) - the two-column before/after panel: a panel-washed
 * header row carrying both labels, then paired hairline rows; baseline items sit
 * quiet with a minus glyph, improved items read ink with a success check. */
export const Compare = React.forwardRef<HTMLDivElement, CompareProps>(
  ({ before, after, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('overflow-hidden rounded-lg border border-hairline bg-paper', className)}
      {...props}
    >
      <div className="grid grid-cols-2 bg-muted">
        <span className="px-3.5 py-2.5 font-title text-nano font-semibold uppercase tracking-wide text-grey">
          {before.label}
        </span>
        <span className="border-l border-hairline px-3.5 py-2.5 font-title text-nano font-semibold uppercase tracking-wide text-ink">
          {after.label}
        </span>
      </div>
      {Array.from({ length: Math.max(before.items.length, after.items.length) }).map((_, i) => (
        <div key={i} className="grid grid-cols-2 border-t border-hairline">
          <span className="flex items-start gap-2 px-3.5 py-2.5">
            {before.items[i] !== undefined && (
              <>
                <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-grey" strokeWidth={2} aria-hidden />
                <span className="text-micro leading-snug text-grey">{before.items[i]}</span>
              </>
            )}
          </span>
          <span className="flex items-start gap-2 border-l border-hairline px-3.5 py-2.5">
            {after.items[i] !== undefined && (
              <>
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.2} aria-hidden />
                <span className="text-micro leading-snug text-ink">{after.items[i]}</span>
              </>
            )}
          </span>
        </div>
      ))}
    </div>
  )
);
Compare.displayName = 'Compare';
