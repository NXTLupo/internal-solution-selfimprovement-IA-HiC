import * as React from 'react';
import { Copy, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ChatMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Turn author: user turns sit on the ecru wash, assistant turns are transparent. */
  role: 'user' | 'assistant';
  /** Message body - bind the REAL turn text, never a placeholder. */
  children: React.ReactNode;
  /** Override the uppercase mono role label (defaults to "You" / "Assistant"). */
  roleLabel?: string;
  /** Show the Copy / Regenerate / thumbs action row (defaults on for assistant turns). */
  showActions?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
}

/** proto/ChatMessage (Figma 404:9) - one assistant/user chat turn: uppercase mono role
 * label, body prose, and a row of bordered action chips (Copy, Regenerate, thumbs). */
export const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(
  (
    { role, children, roleLabel, showActions, onCopy, onRegenerate, onThumbsUp, onThumbsDown, className, ...props },
    ref
  ) => {
    const actions = showActions ?? role === 'assistant';
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-1.5 rounded-lg px-3.5 py-3',
          role === 'user' && 'bg-muted',
          className
        )}
        {...props}
      >
        <span className="font-mono text-nano uppercase tracking-wide text-grey">
          {roleLabel ?? (role === 'user' ? 'You' : 'Assistant')}
        </span>
        <div className="font-body text-micro leading-normal text-ink">{children}</div>
        {actions && (
          <div className="mt-1 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCopy}
              className="flex items-center gap-1 rounded-sm border border-hairline px-2 py-1 text-nano text-grey transition-colors hover:text-ink"
            >
              <Copy className="h-3 w-3" strokeWidth={2} />
              Copy
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              className="flex items-center gap-1 rounded-sm border border-hairline px-2 py-1 text-nano text-grey transition-colors hover:text-ink"
            >
              <RefreshCw className="h-3 w-3" strokeWidth={2} />
              Regenerate
            </button>
            <button
              type="button"
              aria-label="Good response"
              onClick={onThumbsUp}
              className="flex items-center rounded-sm border border-hairline p-1 text-grey transition-colors hover:text-ink"
            >
              <ThumbsUp className="h-3 w-3" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Bad response"
              onClick={onThumbsDown}
              className="flex items-center rounded-sm border border-hairline p-1 text-grey transition-colors hover:text-ink"
            >
              <ThumbsDown className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    );
  }
);
ChatMessage.displayName = 'ChatMessage';
