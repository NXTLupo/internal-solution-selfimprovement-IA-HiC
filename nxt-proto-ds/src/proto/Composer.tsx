import * as React from 'react';
import { Plus, ArrowUp } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ComposerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Placeholder shown in the empty input. */
  placeholder?: string;
  /** Current input value (controlled) or initial text. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Called when the send button is pressed. */
  onSend?: (value: string) => void;
  /** Disable input + send (e.g. while the assistant streams). */
  disabled?: boolean;
}

/** proto/Composer (Figma 404:2) - the chat message input bar: attach button on the
 * panel wash, auto-grow textarea, accent send. Every chat surface ends with one. */
export const Composer = React.forwardRef<HTMLDivElement, ComposerProps>(
  ({ placeholder = 'Message the assistant...', value, onValueChange, onSend, disabled, className, ...props }, ref) => {
    const [inner, setInner] = React.useState(value ?? '');
    const text = value !== undefined ? value : inner;
    const set = (v: string) => {
      if (value === undefined) setInner(v);
      onValueChange?.(v);
    };
    return (
      <div
        ref={ref}
        className={cn('flex items-end gap-2 rounded-[10px] border border-hairline bg-paper p-2', className)}
        {...props}
      >
        <button
          type="button"
          aria-label="Attach"
          disabled={disabled}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-grey transition-colors hover:text-ink disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
        <textarea
          rows={1}
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => set(e.target.value)}
          className="min-h-[34px] w-full resize-none bg-transparent py-1.5 text-micro text-ink outline-none placeholder:text-grey disabled:opacity-50"
        />
        <button
          type="button"
          aria-label="Send"
          disabled={disabled || !text.trim()}
          onClick={() => onSend?.(text)}
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-brand-accent text-on-brand-accent transition-opacity disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>
    );
  }
);
Composer.displayName = 'Composer';
