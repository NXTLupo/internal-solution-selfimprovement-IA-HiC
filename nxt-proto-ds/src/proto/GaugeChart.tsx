import * as React from 'react';
import { cn } from '../lib/utils';

export interface GaugeChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The gauge reading, 0-100 (clamped). */
  value: number;
  /** Nano grey line under the numeral ("of capacity"). */
  label?: string;
  /** Nano grey uppercase card header. */
  title?: string;
  /** Series chips (8px dot + label) rendered under the plot. */
  legend?: string[];
}

const SERIES_COLORS = ['var(--color-accent)', 'var(--color-cyan)', 'var(--color-grey)', 'var(--color-ink)'];

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const arcPath = (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
};

/** proto/Gauge (Figma 461:24) - single-value card: 270-degree hairline track arc,
 * accent fill arc, centered value numeral (font-title semibold ink). */
export const GaugeChart = React.forwardRef<HTMLDivElement, GaugeChartProps>(
  ({ value, label, title, legend, className, ...props }, ref) => {
    const clamped = Math.max(0, Math.min(100, value));
    const cx = 90;
    const cy = 92;
    const r = 62;
    // 270-degree sweep opening downward: 135deg -> 405deg, clockwise through 12 o'clock.
    const start = 135;
    const end = start + (clamped / 100) * 270;

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
          aria-label={title ?? `Gauge at ${Math.round(clamped)} of 100`}
          viewBox="0 0 180 168"
          className="mx-auto block max-w-[220px]"
        >
          <path
            d={arcPath(cx, cy, r, start, start + 270)}
            fill="none"
            stroke="var(--color-hairline)"
            strokeWidth={12}
            strokeLinecap="round"
          />
          {clamped > 0 && (
            <path
              d={arcPath(cx, cy, r, start, end)}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={12}
              strokeLinecap="round"
            />
          )}
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            fontFamily="var(--font-title)"
            fontWeight={600}
            fontSize={30}
            fill="var(--color-ink)"
          >
            {Math.round(clamped)}
          </text>
          {label && (
            <text
              x={cx}
              y={cy + 26}
              textAnchor="middle"
              fontFamily="var(--font-body)"
              fontSize={10}
              fill="var(--color-grey)"
            >
              {label}
            </text>
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
GaugeChart.displayName = 'GaugeChart';
