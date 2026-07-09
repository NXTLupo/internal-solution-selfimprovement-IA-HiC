import * as React from 'react';
import { cn } from '../lib/utils';

export interface LineChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The trend series - one y value per point, plotted left to right. */
  series: number[];
  /** Optional x-axis labels, one per point (extras ignored). */
  labels?: string[];
  /** Nano grey uppercase card header. */
  title?: string;
  /** Series chips (8px dot + label) rendered under the plot. */
  legend?: string[];
}

const SERIES_COLORS = ['var(--color-accent)', 'var(--color-cyan)', 'var(--color-grey)', 'var(--color-ink)'];

/** proto/Line (Figma 460:11) - trend card: nano grey title, native SVG polyline
 * (accent, 2.5px) with dot-terminated points (r3) over quiet hairline gridlines. */
export const LineChart = React.forwardRef<HTMLDivElement, LineChartProps>(
  ({ series, labels, title, legend, className, ...props }, ref) => {
    const W = 320;
    const left = 12;
    const right = W - 12;
    const top = 12;
    const baseline = 150;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const step = series.length > 1 ? (right - left) / (series.length - 1) : 0;
    const pts = series.map((v, i) => ({
      x: left + i * step,
      y: baseline - 6 - ((v - min) / range) * (baseline - top - 12),
    }));
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
          aria-label={title ?? 'Line chart'}
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
          <line x1={left} x2={right} y1={baseline} y2={baseline} stroke="var(--color-ink)" strokeWidth={1} />
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--color-accent)" />
          ))}
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
LineChart.displayName = 'LineChart';
