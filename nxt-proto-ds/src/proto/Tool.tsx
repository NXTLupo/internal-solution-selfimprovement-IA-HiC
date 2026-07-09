import * as React from 'react';
import { Braces } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ToolProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tool/function name shown in the mono header, e.g. "get_weather". */
  name: string;
  /** Call arguments rendered as a mono JSON line, e.g. '{ "city": "Boston" }'. */
  params: string;
  /** Human-readable result line; omit while the call is still running. */
  result?: string;
  /** Status pill state (colors the pill; text mirrors the state). */
  status?: 'completed' | 'running' | 'error';
}

/** proto/Tool (Figma 405:10) - tool/function-call card: ecru header with braces icon,
 * mono tool name and a status pill, mono params row, and a bordered result row. */
export const Tool = React.forwardRef<HTMLDivElement, ToolProps>(
  ({ name, params, result, status = 'completed', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col overflow-hidden rounded-md border border-hairline bg-paper', className)}
      {...props}
    >
      <div className="flex items-center gap-2 bg-muted px-3 py-2">
        <Braces className="h-3.5 w-3.5 shrink-0 text-ink" strokeWidth={2} />
        <span className="flex-1 font-mono text-nano font-semibold text-ink">{name}</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-nano font-medium text-paper',
            status === 'completed' && 'bg-success',
            status === 'running' && 'bg-cyan',
            status === 'error' && 'bg-rust'
          )}
        >
          {status}
        </span>
      </div>
      <div className="px-3 py-2 font-mono text-nano text-ink">{params}</div>
      {result && (
        <div className="border-t border-hairline px-3 py-2 font-body text-micro text-ink">{result}</div>
      )}
    </div>
  )
);
Tool.displayName = 'Tool';
