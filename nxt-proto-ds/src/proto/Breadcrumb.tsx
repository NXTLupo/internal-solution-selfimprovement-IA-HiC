import * as React from 'react';
import { cn } from '../lib/utils';

export interface BreadcrumbItem {
  /** Segment text ("Library", "Quarterly plans"). */
  label: string;
  /** Destination; omit on the current (last) segment. */
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  /** Trail segments in order; the LAST item renders as the current page (aria-current). */
  items: BreadcrumbItem[];
}

/** proto/Breadcrumb (Figma 441:2) - hierarchical location trail: grey links separated
 * by hairline "/" glyphs, ink medium current segment carrying aria-current=page. */
export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ items, className, ...props }, ref) => (
    <nav
      ref={ref}
      aria-label="Breadcrumb"
      className={cn('flex items-center bg-paper px-4 py-3', className)}
      {...props}
    >
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="font-title text-micro font-medium text-ink">
                  {item.label}
                </span>
              ) : (
                <a href={item.href || '#'} className="text-micro text-grey transition-colors hover:text-ink">
                  {item.label}
                </a>
              )}
              {!last && (
                <span aria-hidden="true" className="text-micro text-hairline">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  )
);
Breadcrumb.displayName = 'Breadcrumb';
