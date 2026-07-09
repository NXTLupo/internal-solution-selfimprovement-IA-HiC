import * as React from 'react';
import { Copy, RefreshCw, FileText, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from '../ui/skeleton';

export interface ArtifactProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Assistant message shown in the left chat column. */
  message: string;
  /** File name in the canvas title bar, e.g. "landing.html". */
  fileName: string;
  /** Version chip next to the file name, e.g. "v3"; omit to hide. */
  version?: string;
  /** Canvas body; omit to render skeleton placeholder bars (generating state). */
  children?: React.ReactNode;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

/** proto/Artifact (Figma 410:18) - chat + side canvas panel: assistant message with
 * Copy/Regenerate chips on the left, a bordered canvas on the right with an ecru title
 * bar (document icon, file name, version chevron) over the artifact body. */
export const Artifact = React.forwardRef<HTMLDivElement, ArtifactProps>(
  ({ message, fileName, version, children, onCopy, onRegenerate, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-start gap-3', className)} {...props}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-body text-micro leading-normal text-ink">{message}</p>
        <div className="flex items-center gap-1.5">
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
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-hairline bg-paper">
        <div className="flex items-center gap-2 bg-muted px-3 py-2">
          <FileText className="h-3.5 w-3.5 shrink-0 text-grey" strokeWidth={2} />
          <span className="flex-1 truncate font-mono text-nano text-ink">{fileName}</span>
          {version && (
            <span className="flex items-center gap-0.5 text-nano text-grey">
              {version}
              <ChevronDown className="h-3 w-3" strokeWidth={2} />
            </span>
          )}
        </div>
        <div className="p-3">
          {children ?? (
            <div className="flex flex-col gap-2" aria-hidden>
              <Skeleton className="h-2.5 w-3/5 rounded-sm" />
              <Skeleton className="h-2.5 w-full rounded-sm" />
              <Skeleton className="h-2.5 w-4/5 rounded-sm" />
              <Skeleton className="h-2.5 w-2/5 rounded-sm" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
);
Artifact.displayName = 'Artifact';
