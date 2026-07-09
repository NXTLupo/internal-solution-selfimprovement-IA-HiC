import * as React from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export interface CodeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The source text, rendered verbatim in the mono body. */
  code: string;
  /** Filename shown in the header bar ("deploy.yml"). */
  filename?: string;
  /** Language label announced next to the filename. */
  language?: string;
}

/** proto/Code (Figma 456:67) - the code block: panel header bar with a mono filename
 * and a copy chip (text flips to "Copied" for feedback), rail-dark mono body.
 * No highlighting dependency; just faithful mono text on the rail. */
export const Code = React.forwardRef<HTMLDivElement, CodeProps>(
  ({ code, filename, language, className, ...props }, ref) => {
    const [copied, setCopied] = React.useState(false);
    const copy = () => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(code);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    };
    return (
      <div
        ref={ref}
        className={cn('overflow-hidden rounded-md border border-hairline', className)}
        {...props}
      >
        <div className="flex items-center gap-2 border-b border-hairline bg-muted px-3 py-1.5">
          <span className="truncate font-mono text-nano text-grey">{filename ?? 'snippet'}</span>
          {language && (
            <span className="rounded-sm border border-hairline bg-paper px-1.5 py-px font-mono text-nano uppercase text-grey">
              {language}
            </span>
          )}
          <button
            type="button"
            onClick={copy}
            className="ml-auto inline-flex items-center gap-1 rounded-sm border border-hairline bg-paper px-2 py-0.5 font-title text-nano text-grey transition-colors hover:text-ink"
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" strokeWidth={2} />
            ) : (
              <Copy className="h-3 w-3" strokeWidth={1.8} />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto bg-rail px-3.5 py-3 font-mono text-micro leading-relaxed text-paper">
          <code>{code}</code>
        </pre>
      </div>
    );
  }
);
Code.displayName = 'Code';
