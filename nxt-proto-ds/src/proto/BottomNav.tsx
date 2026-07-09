import * as React from 'react';
import { cn } from '../lib/utils';

export interface BottomNavItem {
  /** Tab caption under the icon ("Home", "Saved"). */
  label: string;
  /** 18px tab icon (a lucide-react component). */
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  /** Marks the current tab - ink icon + label. */
  active?: boolean;
}

export interface BottomNavProps extends React.HTMLAttributes<HTMLElement> {
  /** The 3-5 primary tabs; mark exactly one active. */
  items: BottomNavItem[];
  /** Called with the tapped tab's index. */
  onTabSelect?: (index: number) => void;
}

/** proto/BottomNav (Figma 442:19) - the mobile primary tab bar: hairline top rule on
 * paper, evenly spread icon-over-nano-label tabs with 44px hit targets; the active tab
 * carries ink, the rest stay grey. */
export const BottomNav = React.forwardRef<HTMLElement, BottomNavProps>(
  ({ items, onTabSelect, className, ...props }, ref) => (
    <nav
      ref={ref}
      aria-label="Primary"
      className={cn('flex w-full items-center justify-between border-t border-hairline bg-paper px-5 py-2', className)}
      {...props}
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            aria-current={item.active ? 'page' : undefined}
            onClick={() => onTabSelect?.(i)}
            className={cn(
              'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 transition-colors',
              item.active ? 'text-ink' : 'text-grey hover:text-ink'
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            <span className={cn('text-nano', item.active && 'font-title font-medium')}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  )
);
BottomNav.displayName = 'BottomNav';
