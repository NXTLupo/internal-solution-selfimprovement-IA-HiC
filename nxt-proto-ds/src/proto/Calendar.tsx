import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface CalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Zero-based month index (0 = January). */
  month: number;
  /** Full year (e.g. 2026). */
  year: number;
  /** Day of month rendered as the selected date (accent fill). */
  selected?: number;
  /** Days of month carrying an event dot. */
  marked?: number[];
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  /** Called with the day number when a date cell is clicked. */
  onSelectDay?: (day: number) => void;
}

/** proto/Calendar (Figma 455:62) - the static month grid: chevron header with
 * "Month YYYY", quiet day headers, 7-column date cells; selected day fills accent,
 * marked days carry a dot. role=grid with aria-selected. */
export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ month, year, selected, marked = [], onPrevMonth, onNextMonth, onSelectDay, className, ...props }, ref) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    return (
      <div
        ref={ref}
        className={cn('inline-flex flex-col gap-2 rounded-lg border border-hairline bg-paper p-3', className)}
        {...props}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={onPrevMonth}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-grey transition-colors hover:bg-muted hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <span className="font-title text-micro font-semibold text-ink">
            {MONTHS[month]} {year}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={onNextMonth}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-grey transition-colors hover:bg-muted hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div role="grid" aria-label={`${MONTHS[month]} ${year}`} className="grid grid-cols-7 gap-y-0.5">
          {DAY_HEADERS.map((d) => (
            <span key={d} className="flex h-6 w-[30px] items-center justify-center text-nano text-grey">
              {d}
            </span>
          ))}
          {cells.map((day, i) =>
            day === null ? (
              <span key={`pad-${i}`} aria-hidden className="h-[26px] w-[30px]" />
            ) : (
              <button
                key={day}
                type="button"
                role="gridcell"
                aria-selected={day === selected}
                onClick={onSelectDay ? () => onSelectDay(day) : undefined}
                className={cn(
                  'relative flex h-[26px] w-[30px] items-center justify-center rounded-sm text-micro transition-colors',
                  day === selected
                    ? 'bg-brand-accent font-title font-semibold text-on-brand-accent'
                    : 'text-ink hover:bg-muted'
                )}
              >
                {day}
                {marked.includes(day) && day !== selected && (
                  <span aria-hidden className="absolute bottom-0.5 h-1 w-1 rounded-full bg-brand-accent" />
                )}
              </button>
            )
          )}
        </div>
      </div>
    );
  }
);
Calendar.displayName = 'Calendar';
