import * as React from 'react';
import { cn } from '../lib/utils';

export interface CiteSource {
  /** Source host shown next to the numbered chip, e.g. "nature.com". */
  host: string;
  /** Source title line. */
  title: string;
  href?: string;
}

export interface CiteProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Answer paragraph containing inline [n] markers matching the source order. */
  children: React.ReactNode;
  /** The cited sources, rendered as a 2-col card grid below the answer. */
  sources: CiteSource[];
  /** Uppercase mono role label above the paragraph. */
  roleLabel?: string;
}

/** proto/Cite (Figma 408:2) - cited answer plus source cards: role label, paragraph
 * with inline [n] markers, and a 2-col grid of numbered source cards (accent chips). */
export const Cite = React.forwardRef<HTMLDivElement, CiteProps>(
  ({ children, sources, roleLabel = 'Assistant', className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
      <span className="font-mono text-nano uppercase tracking-wide text-grey">{roleLabel}</span>
      <p className="font-body text-micro leading-normal text-ink">{children}</p>
      <div className="grid grid-cols-2 gap-2">
        {sources.map((s, i) => (
          <a
            key={`${s.host}-${s.title}`}
            href={s.href || '#'}
            className="flex flex-col gap-1 rounded-md border border-hairline bg-paper p-2.5 transition-colors hover:border-ink"
          >
            <span className="flex items-center gap-1.5">
              <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-sm border border-brand-accent bg-muted font-mono text-nano leading-none text-brand-accent">
                {i + 1}
              </span>
              <span className="truncate text-nano text-grey">{s.host}</span>
            </span>
            <span className="text-nano leading-snug text-ink">{s.title}</span>
          </a>
        ))}
      </div>
    </div>
  )
);
Cite.displayName = 'Cite';
