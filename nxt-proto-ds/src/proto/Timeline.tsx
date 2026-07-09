import * as React from 'react';
import { cn } from '../lib/utils';

export interface TimelineEvent {
  /** When it happened ("Mar 12", "09:40", "Week 3"). */
  time: string;
  /** What happened - semibold event title. */
  title: string;
  /** Optional detail line under the title. */
  desc?: string;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ordered events, earliest or latest first per the surrounding narrative. */
  events: TimelineEvent[];
  /** Optional uppercase kicker above the list. */
  label?: string;
}

/** proto/Timeline (Figma 455:34) - ordered events down an accent-dot rail: 9px accent
 * dot + hairline connector per event, semibold title over a quiet time line. */
export const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ events, label, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
      {label && (
        <span className="px-1 font-title text-nano font-medium uppercase tracking-wider text-grey">{label}</span>
      )}
      <ol className="flex flex-col">
        {events.map((ev, i) => (
          <li key={`${ev.title}-${i}`} className="flex gap-3">
            <span className="flex w-[9px] shrink-0 flex-col items-center" aria-hidden>
              <span className="mt-[5px] h-[9px] w-[9px] shrink-0 rounded-full bg-brand-accent" />
              {i < events.length - 1 && <span className="w-[2px] flex-1 bg-hairline" />}
            </span>
            <span className={cn('flex min-w-0 flex-col gap-0.5', i < events.length - 1 && 'pb-4')}>
              <span className="font-title text-micro font-semibold text-ink">{ev.title}</span>
              <time className="text-nano text-grey">{ev.time}</time>
              {ev.desc && <span className="text-nano leading-relaxed text-grey">{ev.desc}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
);
Timeline.displayName = 'Timeline';
