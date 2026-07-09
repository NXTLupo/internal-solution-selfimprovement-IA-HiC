import * as React from 'react';
import { cn } from '../lib/utils';

/** One highlighted region on the abstract map. */
export interface MapVizRegion {
  /** Region name rendered as a dot+label chip under the map. */
  label: string;
}

export interface MapVizProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Seed for the deterministic dot grid - same seed, same abstract landmass. */
  seed: number;
  /** 2-4 highlighted regions; nearby dots take the region color. */
  regions: MapVizRegion[];
  /** Nano grey uppercase card header. */
  title?: string;
  /** Extra series chips (8px dot + label) rendered after the region chips. */
  legend?: string[];
}

const REGION_COLORS = ['var(--color-accent)', 'var(--color-cyan)', 'var(--color-ink)', 'var(--color-grey)'];

/** Deterministic PRNG (mulberry32) so a given seed always draws the same map. */
const mulberry32 = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

interface Dot {
  x: number;
  y: number;
  region: number;
}

/** proto/MapViz (Figma 461:83) - abstract geographic card: seeded dot-grid landmass
 * (no real geography), region-colored dot clusters with ringed center pins. */
export const MapViz = React.forwardRef<HTMLDivElement, MapVizProps>(
  ({ seed, regions, title, legend, className, ...props }, ref) => {
    const COLS = 24;
    const ROWS = 13;
    const STEP = 12;
    const W = 312;
    const H = 168;
    const RADIUS = 34;

    const { dots, centers } = React.useMemo(() => {
      // Region centers draw from an independent stream so region count never reshapes the landmass.
      const regionRng = mulberry32(seed + 1);
      const regionCenters = regions.slice(0, 4).map(() => ({
        x: 36 + regionRng() * (W - 72),
        y: 32 + regionRng() * (H - 64),
      }));
      const gridRng = mulberry32(seed);
      const grid: Dot[] = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const roll = gridRng();
          const edge = Math.min(c, COLS - 1 - c, r, ROWS - 1 - r);
          const dropProb = edge === 0 ? 0.55 : edge === 1 ? 0.34 : 0.18;
          if (roll < dropProb) continue;
          const x = 12 + c * STEP;
          const y = 12 + r * STEP;
          let region = -1;
          let best = RADIUS;
          regionCenters.forEach((center, i) => {
            const dist = Math.hypot(center.x - x, center.y - y);
            if (dist < best) {
              best = dist;
              region = i;
            }
          });
          grid.push({ x, y, region });
        }
      }
      return { dots: grid, centers: regionCenters };
    }, [seed, regions]);

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
          aria-label={title ?? `Region map highlighting ${regions.map((r) => r.label).join(', ')}`}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full rounded-md bg-ecru"
        >
          {dots.map((d, i) => (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={1.8}
              fill={d.region >= 0 ? REGION_COLORS[d.region % REGION_COLORS.length] : 'var(--color-hairline)'}
              fillOpacity={d.region >= 0 ? 0.9 : 1}
            />
          ))}
          {centers.map((center, i) => (
            <g key={`pin-${i}`}>
              <circle
                cx={center.x}
                cy={center.y}
                r={7}
                fill="none"
                stroke={REGION_COLORS[i % REGION_COLORS.length]}
                strokeWidth={1.5}
                strokeOpacity={0.45}
              />
              <circle cx={center.x} cy={center.y} r={3.5} fill={REGION_COLORS[i % REGION_COLORS.length]} />
            </g>
          ))}
        </svg>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {regions.slice(0, 4).map((region, i) => (
            <span key={region.label} className="flex items-center gap-1.5 text-nano text-grey">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: REGION_COLORS[i % REGION_COLORS.length] }}
              />
              {region.label}
            </span>
          ))}
          {legend?.map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-nano text-grey">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-grey)' }} />
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  }
);
MapViz.displayName = 'MapViz';
