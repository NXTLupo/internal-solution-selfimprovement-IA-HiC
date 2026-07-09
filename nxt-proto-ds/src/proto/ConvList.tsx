import * as React from 'react';
import { cn } from '../lib/utils';

export interface ConvListItem {
  /** Conversation title line. */
  title: string;
  /** Marks the open conversation (ecru wash + accent semibold). */
  active?: boolean;
}

export interface ConvListGroup {
  /** Uppercase mono group header, e.g. "Today", "Previous 7 days". */
  label: string;
  items: ConvListItem[];
}

export interface ConvListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Conversation history grouped by recency. */
  groups: ConvListGroup[];
  /** Called with (groupIndex, itemIndex) of the picked conversation. */
  onSelect?: (groupIndex: number, itemIndex: number) => void;
}

/** proto/ConvList (Figma 412:2) - conversation history sidebar: uppercase mono group
 * headers over rounded item rows; the active conversation sits on the ecru wash with
 * accent semibold text. */
export const ConvList = React.forwardRef<HTMLDivElement, ConvListProps>(
  ({ groups, onSelect, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col', className)} {...props}>
      {groups.map((g, gi) => (
        <React.Fragment key={g.label}>
          <span className="px-2.5 pb-1 pt-2.5 font-mono text-nano uppercase tracking-wide text-grey">
            {g.label}
          </span>
          {g.items.map((item, ii) => (
            <button
              key={item.title}
              type="button"
              aria-current={item.active ? 'true' : undefined}
              onClick={() => onSelect?.(gi, ii)}
              className={cn(
                'truncate rounded-md px-2.5 py-2 text-left text-micro transition-colors',
                item.active
                  ? 'bg-muted font-semibold text-brand-accent'
                  : 'text-grey hover:bg-muted hover:text-ink'
              )}
            >
              {item.title}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  )
);
ConvList.displayName = 'ConvList';
