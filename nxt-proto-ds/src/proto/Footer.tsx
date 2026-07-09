import * as React from 'react';
import { cn } from '../lib/utils';

export interface FooterColumn {
  /** Column heading ("Product", "Company"). */
  heading: string;
  /** The column's links, top to bottom. */
  links: { label: string; href?: string }[];
}

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  /** Link columns left to right (the Figma anatomy carries four). */
  columns: FooterColumn[];
  /** Legal line under the hairline rule ("(c) 2026 Meridian Labs"). */
  copyright?: string;
}

/** proto/Footer (Figma 444:2) - the site-wide footer landmark: paper panel with a
 * hairline top rule, equal-width link columns (semibold ink heads over quiet grey
 * links), and a hairline-ruled copyright row. */
export const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ columns, copyright, className, ...props }, ref) => (
    <footer
      ref={ref}
      className={cn('flex w-full flex-col gap-3 border-t border-hairline bg-paper p-[18px]', className)}
      {...props}
    >
      <div className="flex flex-wrap gap-4">
        {columns.map((col) => (
          <div key={col.heading} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="font-title text-nano font-semibold text-ink">{col.heading}</span>
            {col.links.map((link) => (
              <a
                key={link.label}
                href={link.href || '#'}
                className="truncate text-nano text-grey transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>
        ))}
      </div>
      {copyright && (
        <div className="border-t border-hairline pt-2.5 text-nano text-grey">{copyright}</div>
      )}
    </footer>
  )
);
Footer.displayName = 'Footer';
