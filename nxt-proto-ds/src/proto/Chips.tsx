import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Chip {
  /** Chip label - a real filter or tag value. */
  label: string;
  /** Selected chips get the panel wash + accent border + dismiss glyph. */
  selected?: boolean;
}

export interface ChipsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The filter/toggle chips, in display order. */
  chips: Chip[];
  /** Called with the chip index on click. */
  onToggle?: (index: number) => void;
}

/** proto/Chips (Figma 454:61) - the filter chip wrap: full-radius pills; selected
 * chips carry the panel wash, a 1.5px accent border, and a dismiss x; unselected
 * chips stay quiet paper + hairline. Toggles carry aria-pressed. */
export const Chips = React.forwardRef<HTMLDivElement, ChipsProps>(
  ({ chips, onToggle, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-wrap gap-2', className)} {...props}>
      {chips.map((c, i) => (
        <button
          key={`${c.label}-${i}`}
          type="button"
          aria-pressed={!!c.selected}
          onClick={onToggle ? () => onToggle(i) : undefined}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-[11px] py-1.5 text-nano transition-colors',
            c.selected
              ? 'border-[1.5px] border-brand-accent bg-muted font-title font-medium text-ink'
              : 'border border-hairline bg-paper text-grey hover:text-ink'
          )}
        >
          {c.label}
          {c.selected && <X className="h-3 w-3 text-grey" strokeWidth={2} aria-hidden />}
        </button>
      ))}
    </div>
  )
);
Chips.displayName = 'Chips';
