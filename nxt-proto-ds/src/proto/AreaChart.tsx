import * as React from 'react';
import { cn } from '../lib/utils';

export interface AreaChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The cumulative series - one y value per point, plotted left to right. */
  series: number[];
  /** Optional x-axis labels, one per point (extras ignored). */
  labels?: string[];
  /** Nano grey uppercase card header. */
  title?: string;
  /** Series chips (8px dot + label) rendered under the plot. */
  legend?: string[];
}

const SERIES_COLORS = ['var(--color-cyan)', 'var(--color-accent)', 'var(--color-grey)', 'var(--color-ink)'];

/** proto/Area (Figma 460:23) - cumulative-area card: nano grey title, native SVG
 * filled polygon (cyan at .18) under a 2.5px cyan top line with dot-terminated points. */
export const AreaChart = React.forwardRef<HTMLDivElement, AreaChartProps>(
  ({ series, labels, title, legend, className, ...props }, ref) => {
    const W = 320;
    const left = 12;
    const right = W - 12;
    const top = 12;
    const baseline = 150;
    const min = Math.min(...series, 0);
    const max = Math.max(...series);
    const range = max - min || 1;
    const step = series.length > 1 ? (right - left) / (series.length - 1) : 0;
    const pts = series.map((v, i) => ({
      x: left + i * step,
      y: baseline - 4 - ((v - min) / range) * (baseline - top - 10),
    }));
    const area = [
      `${left},${baseline}`,
      ...pts.map((p) => `${p.x},${p.y}`),
      `${pts.length > 0 ? pts[pts.length - 1].x : right},${baseline}`,
    ].join(' ');
    const hasLabels = Boolean(labels && labels.length > 0);

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
          aria-label={title ?? 'Area chart'}
          viewBox={`0 0 ${W} ${hasLabels ? 176 : 160}`}
          className="block w-full"
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={left}
              x2={right}
              y1={baseline - f * (baseline - top)}
              y2={baseline - f * (baseline - top)}
              stroke="var(--color-hairline)"
              strokeWidth={1}
            />
          ))}
          <polygon points={area} fill="var(--color-cyan)" fillOpacity={0.18} />
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="var(--color-cyan)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--color-cyan)" />
          ))}
          <line x1={left} x2={right} y1={baseline} y2={baseline} stroke="var(--color-ink)" strokeWidth={1} />
          {hasLabels &&
            pts.map((p, i) =>
              labels && labels[i] ? (
                <text
                  key={`label-${i}`}
                  x={p.x}
                  y={168}
                  textAnchor="middle"
                  fontFamily="var(--font-body)"
                  fontSize={10}
                  fill="var(--color-grey)"
                >
                  {labels[i]}
                </text>
              ) : null
            )}
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
AreaChart.displayName = 'AreaChart';
