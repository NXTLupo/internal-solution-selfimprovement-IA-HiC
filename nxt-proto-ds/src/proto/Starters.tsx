import * as React from 'react';
import { cn } from '../lib/utils';

export interface StarterItem {
  /** Prompt headline, e.g. "Summarize a document". */
  title: string;
  /** Quiet grey support line under the title. */
  sub: string;
}

export interface StartersProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** The starter prompts (a 2x2 grid reads best with four). */
  starters: StarterItem[];
  /** Called with the picked starter's index. */
  onSelect?: (index: number) => void;
}

/** proto/Starters (Figma 408:18) - empty-state prompt cards: a 2x2 grid of bordered
 * buttons, each a semibold title over a quiet grey subtitle. */
export const Starters = React.forwardRef<HTMLDivElement, StartersProps>(
  ({ starters, onSelect, className, ...props }, ref) => (
    <div ref={ref} className={cn('grid grid-cols-2 gap-2', className)} {...props}>
      {starters.map((s, i) => (
        <button
          key={s.title}
          type="button"
          onClick={() => onSelect?.(i)}
          className="flex flex-col gap-1 rounded-lg border border-hairline bg-paper p-3 text-left transition-colors hover:border-ink"
        >
          <span className="text-micro font-semibold text-ink">{s.title}</span>
          <span className="text-nano text-grey">{s.sub}</span>
        </button>
      ))}
    </div>
  )
);
Starters.displayName = 'Starters';
