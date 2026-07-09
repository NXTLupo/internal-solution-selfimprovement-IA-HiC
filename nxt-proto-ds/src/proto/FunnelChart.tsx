import * as React from 'react';
import { cn } from '../lib/utils';

/** One funnel stage. */
export interface FunnelChartDatum {
  /** Stage name rendered left of the bar. */
  label: string;
  /** Stage magnitude - pass stages in descending order. */
  value: number;
}

export interface FunnelChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stages, widest first; bar width narrows with value / first-stage value. */
  data: FunnelChartDatum[];
  /** Nano grey uppercase card header. */
  title?: string;
  /** Series chips (8px dot + label) rendered under the plot. */
  legend?: string[];
}

const SERIES_COLORS = ['var(--color-accent)', 'var(--color-cyan)', 'var(--color-grey)', 'var(--color-ink)'];

/** proto/Funnel (Figma 460:39) - stage-conversion card: stacked centered horizontal
 * accent bars narrowing by value, stage labels left, values right. */
export const FunnelChart = React.forwardRef<HTMLDivElement, FunnelChartProps>(
  ({ data, title, legend, className, ...props }, ref) => {
    const W = 320;
    const rowH = 16;
    const rowGap = 10;
    const bandCenter = 162;
    const bandMax = 152;
    const max = Math.max(...data.map((d) => d.value), 1);
    const height = data.length * (rowH + rowGap) - rowGap;

    return (
      <div
        ref={ref}
        className={cn('rounded-lg border border-hairline bg-paper p-4', className)}
        {...props}
      >
        {title && (
          <span className="mb-2.5 block font-title text-nano font-medium uppercase tracking-wide text-grey">
            {title}
          </span>
        )}
        <svg
          role="img"
          aria-label={title ?? 'Funnel chart'}
          viewBox={`0 0 ${W} ${Math.max(height, rowH)}`}
          className="block w-full"
        >
          {data.map((d, i) => {
            const y = i * (rowH + rowGap);
            const barW = Math.max((d.value / max) * bandMax, 4);
            return (
              <g key={`${d.label}-${i}`}>
                <text
                  x={0}
                  y={y + rowH / 2 + 3.5}
                  textAnchor="start"
                  fontFamily="var(--font-body)"
                  fontSize={10}
                  fill="var(--color-grey)"
                >
                  {d.label}
                </text>
                <rect
                  x={bandCenter - barW / 2}
                  y={y}
                  width={barW}
                  height={rowH}
                  rx={2}
                  fill="var(--color-accent)"
                />
                <text
                  x={W}
                  y={y + rowH / 2 + 3.5}
                  textAnchor="end"
                  fontFamily="var(--font-body)"
                  fontSize={10}
                  fill="var(--color-grey)"
                >
                  {d.value.toLocaleString()}
                </text>
              </g>
            );
          })}
        </svg>
        {legend && legend.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {legend.map((item, i) => (
              <span key={item} className="flex items-center gap-1.5 text-nano text-grey">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
                />
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
);
FunnelChart.displayName = 'FunnelChart';
