import * as React from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ListItem {
  /** Row title - the record name ("Q3 pipeline review.pdf"). */
  title: string;
  /** Quiet meta line under the title ("Edited 2h ago - 1.2 MB"). */
  meta?: string;
  /** Trailing value shown instead of the chevron ("$4,200"). */
  value?: string;
  /** Leading icon; defaults to a document glyph. */
  icon?: React.ReactNode;
}

export interface ListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The rows; each binds a real record. */
  items: ListItem[];
  /** Optional uppercase kicker above the card. */
  label?: string;
  /** Called with the row index on click; rows render as buttons when set. */
  onItemClick?: (index: number) => void;
}

/** proto/List (Figma 454:2) - hairline-separated record rows on a paper card:
 * leading glyph, medium title over a quiet meta line, trailing chevron or value.
 * The primary carrier for files, transactions, messages, episodes. */
export const List = React.forwardRef<HTMLDivElement, ListProps>(
  ({ items, label, onItemClick, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
      {label && (
        <span className="px-1 font-title text-nano font-medium uppercase tracking-wider text-grey">{label}</span>
      )}
      <ul className="overflow-hidden rounded-lg border border-hairline bg-paper">
        {items.map((it, i) => {
          const content = (
            <>
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-grey">
                {it.icon ?? <FileText className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate font-title text-micro font-medium text-ink">{it.title}</span>
                {it.meta && <span className="truncate text-nano text-grey">{it.meta}</span>}
              </span>
              {it.value ? (
                <span className="shrink-0 font-title text-micro font-medium text-ink">{it.value}</span>
              ) : (
                <ChevronRight className="h-[15px] w-[15px] shrink-0 text-grey" strokeWidth={1.8} />
              )}
            </>
          );
          return (
            <li key={`${it.title}-${i}`} className={cn(i > 0 && 'border-t border-hairline')}>
              {onItemClick ? (
                <button
                  type="button"
                  onClick={() => onItemClick(i)}
                  className="flex w-full items-center gap-3 px-3.5 py-[11px] text-left transition-colors hover:bg-muted"
                >
                  {content}
                </button>
              ) : (
                <div className="flex w-full items-center gap-3 px-3.5 py-[11px]">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  )
);
List.displayName = 'List';
