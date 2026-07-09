import * as React from 'react';
import { cn } from '../lib/utils';

export interface SidebarItem {
  /** Row label ("Dashboard", "Members"). */
  label: string;
  href?: string;
  /** Marks the current section - panel wash + ink label. */
  active?: boolean;
  /** 16px leading icon (a lucide-react component). */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** Nav rows top to bottom; mark exactly one active. */
  items: SidebarItem[];
  /** Optional quiet section caption above the rows. */
  heading?: string;
  /** Accessible name for the nav landmark. */
  ariaLabel?: string;
}

/** proto/Sidebar (Figma 442:2) - the vertical primary nav rail: 220px paper column,
 * hairline right edge, soft rounded rows of icon + label; the active row sits on the
 * panel wash with an ink label while the rest stay quiet grey. */
export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ items, heading, ariaLabel = 'Primary', className, ...props }, ref) => (
    <nav
      ref={ref}
      aria-label={ariaLabel}
      className={cn('flex w-[220px] flex-col gap-0.5 border-r border-hairline bg-paper px-2.5 py-3', className)}
      {...props}
    >
      {heading && (
        <span className="px-2.5 pb-2 font-mono text-nano font-semibold uppercase tracking-widest text-grey">
          {heading}
        </span>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.label}
            href={item.href || '#'}
            aria-current={item.active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-micro transition-colors',
              item.active ? 'bg-muted font-title font-medium text-ink' : 'text-grey hover:bg-muted hover:text-ink'
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />}
            <span className="truncate">{item.label}</span>
          </a>
        );
      })}
    </nav>
  )
);
Sidebar.displayName = 'Sidebar';
