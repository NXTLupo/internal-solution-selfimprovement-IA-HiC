import * as React from 'react';
import { cn } from '../lib/utils';

/** One donut segment. */
export interface PieChartDatum {
  /** Segment name (pair with the legend prop to show chips). */
  label: string;
  /** Segment magnitude - shares are computed from the sum. */
  value: number;
}

export interface PieChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Segments; palette cycles accent, cyan, grey, ink in order. */
  data: PieChartDatum[];
  /** Center numeral; defaults to the sum of the segment values. */
  centerValue?: string;
  /** Nano grey line under the center numeral. */
  centerLabel?: string;
  /** Nano grey uppercase card header. */
  title?: string;
  /** Series chips (8px dot + label) rendered under the plot. */
  legend?: string[];
}

const SERIES_COLORS = ['var(--color-accent)', 'var(--color-cyan)', 'var(--color-grey)', 'var(--color-ink)'];

/** proto/Pie (Figma 461:2) - donut card: stroke-based ring segments (palette per
 * segment, inner hole) around a center value slot (font-title semibold ink). */
export const PieChart = React.forwardRef<HTMLDivElement, PieChartProps>(
  ({ data, centerValue, centerLabel, title, legend, className, ...props }, ref) => {
    const size = 180;
    const c = size / 2;
    const r = 60;
    const ring = 20;
    const circumference = 2 * Math.PI * r;
    const total = data.reduce((sum, d) => sum + Math.max(d.value, 0), 0) || 1;
    let acc = 0;
    const segments = data.map((d, i) => {
      const frac = Math.max(d.value, 0) / total;
      const seg = { frac, offset: acc, color: SERIES_COLORS[i % SERIES_COLORS.length], key: `${d.label}-${i}` };
      acc += frac;
      return seg;
    });
    const numeral = centerValue ?? total.toLocaleString();

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
          aria-label={title ?? 'Donut chart'}
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto block max-w-[220px]"
        >
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-ecru)" strokeWidth={ring} />
          {segments.map((s) => (
            <circle
              key={s.key}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={ring}
              strokeDasharray={`${s.frac * circumference} ${circumference}`}
              strokeDashoffset={-s.offset * circumference}
              transform={`rotate(-90 ${c} ${c})`}
            />
          ))}
          <text
            x={c}
            y={centerLabel ? c + 2 : c + 8}
            textAnchor="middle"
            fontFamily="var(--font-title)"
            fontWeight={600}
            fontSize={22}
            fill="var(--color-ink)"
          >
            {numeral}
          </text>
          {centerLabel && (
            <text
              x={c}
              y={c + 18}
              textAnchor="middle"
              fontFamily="var(--font-body)"
              fontSize={10}
              fill="var(--color-grey)"
            >
              {centerLabel}
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
PieChart.displayName = 'PieChart';
