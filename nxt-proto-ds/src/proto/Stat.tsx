import * as React from 'react';
import { cn } from '../lib/utils';

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Quiet caption above the value ("Proposals sent"). */
  label: string;
  /** The metric itself - bind a REAL value, never a placeholder. */
  value: string;
  /** Context line under the value ("vs. last quarter"). */
  sub?: string;
  /** Delta chip: sign decides the color (success up, rust down). */
  delta?: string;
  deltaDirection?: 'up' | 'down';
}

/** proto/Stat (Figma 454:39) - one metric tile: nano grey label, semibold kicker-size
 * value, optional delta + context line. Compose several in a row for a KPI band. */
export const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  ({ label, value, sub, delta, deltaDirection = 'up', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1 rounded-lg border border-hairline bg-paper px-4 py-3.5', className)}
      {...props}
    >
      <span className="text-nano text-grey">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="whitespace-nowrap font-title text-kicker font-semibold leading-none text-ink">{value}</span>
        {delta && (
          <span
            className={cn(
              'text-nano font-title font-medium',
              deltaDirection === 'up' ? 'text-success' : 'text-rust'
            )}
          >
            {deltaDirection === 'up' ? '↑' : '↓'} {delta}
          </span>
        )}
      </span>
      {sub && <span className="text-nano text-grey">{sub}</span>}
    </div>
  )
);
Stat.displayName = 'Stat';

export interface StatRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The tiles; each binds one real metric. */
  stats: StatProps[];
}

/** A wrapping row of Stat tiles (the kpi-row band). */
export const StatRow = React.forwardRef<HTMLDivElement, StatRowProps>(({ stats, className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-wrap gap-2.5', className)} {...props}>
    {stats.map((s) => (
      <Stat key={s.label} {...s} className={cn('min-w-[30%] flex-1', s.className)} />
    ))}
  </div>
));
StatRow.displayName = 'StatRow';
