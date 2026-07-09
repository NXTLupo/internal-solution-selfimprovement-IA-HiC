import * as React from 'react';
import { cn } from '../lib/utils';

/** One category on the x-axis. */
export interface BarChartDatum {
  /** Category name rendered under the bar. */
  label: string;
  /** Bar magnitude - bind a REAL value, never a placeholder. */
  value: number;
}

export interface BarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Categorical series; one rounded-top bar per entry. */
  data: BarChartDatum[];
  /** Nano grey uppercase card header. */
  title?: string;
  /** Series chips (8px dot + label) rendered under the plot. */
  legend?: string[];
}

const SERIES_COLORS = ['var(--color-accent)', 'var(--color-cyan)', 'var(--color-grey)', 'var(--color-ink)'];

/** proto/Bar (Figma 460:2) - categorical comparison card: nano grey title, native
 * SVG bars (rx2 rounded tops, accent fill) over quiet hairline gridlines. */
export const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>(
  ({ data, title, legend, className, ...props }, ref) => {
    const W = 320;
    const plotTop = 10;
    const baseline = 158;
    const plotH = baseline - plotTop;
    const padX = 8;
    const max = Math.max(...data.map((d) => d.value), 1);
    const band = (W - padX * 2) / Math.max(data.length, 1);
    const barW = Math.min(band * 0.58, 40);

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
          aria-label={title ?? 'Bar chart'}
          viewBox={`0 0 ${W} 184`}
          className="block w-full"
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={padX}
              x2={W - padX}
              y1={baseline - f * plotH}
              y2={baseline - f * plotH}
              stroke="var(--color-hairline)"
              strokeWidth={1}
            />
          ))}
          {data.map((d, i) => {
            const h = Math.max((d.value / max) * plotH, 2);
            const x = padX + i * band + (band - barW) / 2;
            return (
              <g key={`${d.label}-${i}`}>
                <rect x={x} y={baseline - h} width={barW} height={h} rx={2} fill="var(--color-accent)" />
                <text
                  x={x + barW / 2}
                  y={176}
                  textAnchor="middle"
                  fontFamily="var(--font-body)"
                  fontSize={10}
                  fill="var(--color-grey)"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
          <line x1={padX} x2={W - padX} y1={baseline} y2={baseline} stroke="var(--color-ink)" strokeWidth={1} />
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
BarChart.displayName = 'BarChart';
