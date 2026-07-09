import * as React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export interface FeatureItem {
  /** Feature heading. */
  title: string;
  /** One-line benefit description. */
  desc: string;
  /** Lucide icon element for the ecru well; defaults to a bolt. */
  icon?: React.ReactNode;
}

export interface FeatureGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The feature cells. */
  features: FeatureItem[];
  /** Column count (the Figma anatomy wraps at three). */
  columns?: 2 | 3 | 4;
}

/** proto/FeatureGrid (Figma 465:65) - feature/benefit grid: bordered cells of a lucide
 * icon in a rounded ecru well, a semibold title, and a grey description. Icons are
 * decorative; each feature carries its own heading. */
export const FeatureGrid = React.forwardRef<HTMLDivElement, FeatureGridProps>(
  ({ features, columns = 3, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'grid gap-3',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
        className
      )}
      {...props}
    >
      {features.map((feature) => (
        <div key={feature.title} className="flex flex-col gap-2.5 rounded-lg border border-hairline bg-paper p-4">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-md bg-ecru text-ink [&_svg]:h-4 [&_svg]:w-4"
            aria-hidden="true"
          >
            {feature.icon ?? <Zap strokeWidth={2} />}
          </span>
          <h3 className="font-title text-micro font-semibold leading-snug text-ink">{feature.title}</h3>
          <p className="text-nano leading-relaxed text-grey">{feature.desc}</p>
        </div>
      ))}
    </div>
  )
);
FeatureGrid.displayName = 'FeatureGrid';
