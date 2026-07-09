import * as React from 'react';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';

export interface MegaMenuItem {
  /** Feature tile label ("Analytics", "Payments"). */
  label: string;
  /** 14px tile icon (a lucide-react component); defaults to a grid glyph. */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
}

export interface MegaMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The expanded trigger's label ("Products") - rendered ink semibold, aria-expanded. */
  label: string;
  /** Collapsed sibling triggers rendered quiet grey ("Solutions"). */
  secondaryLabels?: string[];
  /** Feature tiles in the panel grid. */
  items: MegaMenuItem[];
  /** Called with the chosen tile's label. */
  onItemSelect?: (label: string) => void;
}

/** proto/MegaMenu (Figma 444:26) - the multi-column dropdown panel: paper card with a
 * hairline border, trigger row (open trigger in ink semibold + chevron, siblings grey),
 * and a wrapping grid of panel-wash feature tiles (icon + nano label). */
export const MegaMenu = React.forwardRef<HTMLDivElement, MegaMenuProps>(
  ({ label, secondaryLabels = [], items, onItemSelect, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex max-w-md flex-col gap-3 rounded-md border border-hairline bg-paper px-4 py-3.5', className)}
      {...props}
    >
      <div className="flex items-center gap-4">
        <button type="button" aria-expanded="true" className="flex items-center gap-1 font-title text-micro font-semibold text-ink">
          {label}
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        {secondaryLabels.map((s) => (
          <button
            key={s}
            type="button"
            aria-expanded="false"
            className="flex items-center gap-1 text-micro text-grey transition-colors hover:text-ink"
          >
            {s}
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {items.map((item) => {
          const Icon = item.icon ?? LayoutGrid;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onItemSelect?.(item.label)}
              className="flex min-w-[104px] items-center gap-2 rounded-sm bg-muted px-2.5 py-2 text-left transition-colors hover:bg-ecru"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-ink" strokeWidth={1.8} />
              <span className="truncate text-nano text-ink">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  )
);
MegaMenu.displayName = 'MegaMenu';
