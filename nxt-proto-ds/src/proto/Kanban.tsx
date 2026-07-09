import * as React from 'react';
import { cn } from '../lib/utils';

export interface KanbanCard {
  /** Card title - the work item. */
  title: string;
  /** Quiet meta line ("Due Fri", "Maya R."). */
  meta?: string;
}

export interface KanbanColumn {
  /** Column title ("Backlog", "In review"). */
  title: string;
  /** The cards in this column, top to bottom. */
  cards: KanbanCard[];
}

export interface KanbanProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Board columns, left to right. */
  columns: KanbanColumn[];
}

/** proto/Kanban (Figma 456:2) - the board: panel-washed columns with a semibold
 * title + quiet count, stacked paper cards inside each. Columns are labelled lists;
 * drag-and-drop lives upstream with a keyboard alternative. */
export const Kanban = React.forwardRef<HTMLDivElement, KanbanProps>(
  ({ columns, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex gap-2.5 overflow-x-auto', className)} {...props}>
      {columns.map((col) => (
        <div
          key={col.title}
          role="list"
          aria-label={col.title}
          className="flex w-[150px] shrink-0 flex-col gap-2 rounded-md bg-muted p-2.5"
        >
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="truncate font-title text-nano font-semibold uppercase tracking-wide text-ink">
              {col.title}
            </span>
            <span className="text-nano text-grey">{col.cards.length}</span>
          </div>
          {col.cards.map((card, i) => (
            <div
              key={`${card.title}-${i}`}
              role="listitem"
              className="flex flex-col gap-1 rounded-sm border border-hairline bg-paper px-2.5 py-2"
            >
              <span className="text-micro leading-snug text-ink">{card.title}</span>
              {card.meta && <span className="text-nano text-grey">{card.meta}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
);
Kanban.displayName = 'Kanban';
