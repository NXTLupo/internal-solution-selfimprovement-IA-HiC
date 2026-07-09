import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ModelOption {
  /** Model display name, e.g. "Instant". */
  name: string;
  /** One-line capability description under the name. */
  description: string;
}

export interface ModelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Name of the currently selected model (shown in the trigger, highlighted in the list). */
  value: string;
  /** The selectable models. */
  options: ModelOption[];
  /** Statically render the open listbox under the trigger (for previews). */
  open?: boolean;
  /** Called with the picked option's name. */
  onSelect?: (name: string) => void;
}

/** proto/Model (Figma 410:2) - model selector: bordered trigger button with the current
 * model name and a chevron, plus an optional open listbox where the selected option
 * sits on the ecru wash with an accent name. */
export const Model = React.forwardRef<HTMLDivElement, ModelProps>(
  ({ value, options, open = false, onSelect, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex w-fit flex-col gap-1.5', className)} {...props}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-hairline bg-paper px-3 py-1.5 text-micro font-medium text-ink"
      >
        {value}
        <ChevronDown className="h-3.5 w-3.5 text-grey" strokeWidth={2} />
      </button>
      {open && (
        <div role="listbox" className="flex flex-col gap-0.5 rounded-lg border border-hairline bg-paper p-1">
          {options.map((o) => {
            const selected = o.name === value;
            return (
              <button
                key={o.name}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect?.(o.name)}
                className={cn(
                  'flex flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors',
                  selected ? 'bg-muted' : 'hover:bg-muted'
                )}
              >
                <span className={cn('text-micro font-semibold', selected ? 'text-brand-accent' : 'text-ink')}>
                  {o.name}
                </span>
                <span className="text-nano text-grey">{o.description}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  )
);
Model.displayName = 'Model';
