import * as React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '../lib/utils';

export interface NotifItem {
  /** Notification headline ("Maya approved the Q3 brief"). */
  title: string;
  /** Relative timestamp line ("4m ago"). */
  time: string;
  /** Unread rows carry the accent dot (state also lives in the text weight). */
  unread?: boolean;
  /** 18px leading icon (a lucide-react component); defaults to the bell. */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
}

export interface NotifListProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Notifications, newest first. */
  items: NotifItem[];
}

/** proto/NotifList (Figma 450:51) - the notification list: paper card with a hairline
 * border, hairline-separated rows of quiet icon + medium title over a grey timestamp,
 * and an 8px accent unread dot trailing unread rows. */
export const NotifList = React.forwardRef<HTMLUListElement, NotifListProps>(
  ({ items, className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn('divide-y divide-hairline rounded-lg border border-hairline bg-paper', className)}
      {...props}
    >
      {items.map((item) => {
        const Icon = item.icon ?? Bell;
        return (
          <li key={item.title} className="flex items-center gap-3 px-3.5 py-3">
            <Icon className="h-[18px] w-[18px] shrink-0 text-grey" strokeWidth={1.8} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={cn('truncate text-micro text-ink', item.unread && 'font-title font-medium')}>
                {item.title}
              </span>
              <span className="text-nano text-grey">{item.time}</span>
            </div>
            {item.unread && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-brand-accent" aria-label="Unread" />
            )}
          </li>
        );
      })}
    </ul>
  )
);
NotifList.displayName = 'NotifList';
