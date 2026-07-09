import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  /** Total number of pages (rendered as individual cells - keep it small). */
  pageCount: number;
  /** The current page, 1-based. */
  page: number;
  /** Called with the requested 1-based page number. */
  onPageChange?: (page: number) => void;
}

/** proto/Pagination (Figma 441:21) - page-by-page nav: 30px square cells on paper,
 * hairline-bordered numbers with chevron prev/next; the current page fills accent
 * with on-accent text and carries aria-current=page. */
export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ pageCount, page, onPageChange, className, ...props }, ref) => {
    const cell =
      'flex h-[30px] w-[30px] items-center justify-center rounded-sm text-micro transition-colors';
    return (
      <nav
        ref={ref}
        aria-label="Pagination"
        className={cn('flex items-center gap-1 bg-paper px-4 py-3', className)}
        {...props}
      >
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          className={cn(cell, 'border border-hairline text-ink hover:bg-muted disabled:opacity-40')}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onPageChange?.(n)}
            className={cn(
              cell,
              n === page
                ? 'bg-brand-accent font-title font-medium text-on-brand-accent'
                : 'border border-hairline text-ink hover:bg-muted'
            )}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange?.(page + 1)}
          className={cn(cell, 'border border-hairline text-ink hover:bg-muted disabled:opacity-40')}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </nav>
    );
  }
);
Pagination.displayName = 'Pagination';
