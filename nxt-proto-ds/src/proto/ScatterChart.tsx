import * as React from 'react';
import { cn } from '../lib/utils';

/** One plotted observation. */
export interface ScatterChartPoint {
  x: number;
  y: number;
}

export interface ScatterChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The observations; axes auto-scale to the data range. */
  points: ScatterChartPoint[];
  /** Nano grey uppercase card header. */
  title?: string;
  /** Series chips (8px dot + label) rendered under the plot. */
  legend?: string[];
}

const SERIES_COLORS = ['var(--color-cyan)', 'var(--color-accent)', 'var(--color-grey)', 'var(--color-ink)'];

/** proto/Scatter (Figma 460:28) - correlation card: native SVG dot field (cyan r3.5)
 * over quiet hairline gridlines with auto-scaled axes. */
export const ScatterChart = React.forwardRef<HTMLDivElement, ScatterChartProps>(
  ({ points, title, legend, className, ...props }, ref) => {
    const W = 320;
    const H = 168;
    const left = 14;
    const right = W - 12;
    const top = 12;
    const baseline = H - 14;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const plot = points.map((p) => ({
      x: left + 8 + ((p.x - minX) / rangeX) * (right - left - 16),
      y: baseline - 8 - ((p.y - minY) / rangeY) * (baseline - top - 16),
    }));

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
          aria-label={title ?? 'Scatter chart'}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={`h-${f}`}
              x1={left}
              x2={right}
              y1={baseline - f * (baseline - top)}
              y2={baseline - f * (baseline - top)}
              stroke="var(--color-hairline)"
              strokeWidth={1}
            />
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={`v-${f}`}
              x1={left + f * (right - left)}
              x2={left + f * (right - left)}
              y1={top}
              y2={baseline}
              stroke="var(--color-hairline)"
              strokeWidth={1}
            />
          ))}
          <line x1={left} x2={left} y1={top} y2={baseline} stroke="var(--color-ink)" strokeWidth={1} />
          <line x1={left} x2={right} y1={baseline} y2={baseline} stroke="var(--color-ink)" strokeWidth={1} />
          {plot.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="var(--color-cyan)" fillOpacity={0.85} />
          ))}
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
ScatterChart.displayName = 'ScatterChart';
