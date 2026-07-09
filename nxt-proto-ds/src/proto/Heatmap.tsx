import * as React from 'react';
import { cn } from '../lib/utils';

export interface HeatmapProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Intensity grid, rows x cols; cell opacity scales with value / grid max. */
  data: number[][];
  /** One label per row, rendered left of the grid. */
  rowLabels: string[];
  /** One label per column, rendered above the grid. */
  colLabels: string[];
  /** Nano grey uppercase card header. */
  title?: string;
  /** Series chips (8px dot + label) rendered under the plot. */
  legend?: string[];
}

const SERIES_COLORS = ['var(--color-accent)', 'var(--color-cyan)', 'var(--color-grey)', 'var(--color-ink)'];

/** proto/Heatmap (Figma 461:32) - intensity-grid card: rounded-sm accent rects whose
 * opacity steps with the value; zero cells fall back to the ecru wash. */
export const Heatmap = React.forwardRef<HTMLDivElement, HeatmapProps>(
  ({ data, rowLabels, colLabels, title, legend, className, ...props }, ref) => {
    const rows = data.length;
    const cols = data.length > 0 ? Math.max(...data.map((r) => r.length)) : 0;
    const cell = 22;
    const gap = 4;
    const labelW = 64;
    const headerH = 16;
    const width = labelW + cols * (cell + gap);
    const height = headerH + rows * (cell + gap);
    const max = Math.max(...data.flat(), 1);

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
          aria-label={title ?? 'Heatmap'}
          viewBox={`0 0 ${width} ${height}`}
          className="block w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {colLabels.slice(0, cols).map((label, cIdx) => (
            <text
              key={`col-${cIdx}`}
              x={labelW + cIdx * (cell + gap) + cell / 2}
              y={headerH - 6}
              textAnchor="middle"
              fontFamily="var(--font-body)"
              fontSize={10}
              fill="var(--color-grey)"
            >
              {label}
            </text>
          ))}
          {data.map((row, rIdx) => (
            <g key={`row-${rIdx}`}>
              <text
                x={labelW - 8}
                y={headerH + rIdx * (cell + gap) + cell / 2 + 3.5}
                textAnchor="end"
                fontFamily="var(--font-body)"
                fontSize={10}
                fill="var(--color-grey)"
              >
                {rowLabels[rIdx] ?? ''}
              </text>
              {row.map((value, cIdx) => {
                const active = value > 0;
                return (
                  <rect
                    key={`cell-${rIdx}-${cIdx}`}
                    x={labelW + cIdx * (cell + gap)}
                    y={headerH + rIdx * (cell + gap)}
                    width={cell}
                    height={cell}
                    rx={3}
                    fill={active ? 'var(--color-accent)' : 'var(--color-ecru)'}
                    fillOpacity={active ? 0.15 + 0.85 * (value / max) : 1}
                  />
                );
              })}
            </g>
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
Heatmap.displayName = 'Heatmap';
