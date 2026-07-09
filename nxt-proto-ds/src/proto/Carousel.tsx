import * as React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export interface CarouselItem {
  /** Card title under the image. */
  title: string;
  /** Quiet meta line ("12 min", "S2 E4"). */
  meta?: string;
  /** Image URL; omitted renders the token-colored placeholder well. */
  src?: string;
}

export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The cards, in scroll order. */
  items: CarouselItem[];
  /** Accessible name for the carousel region. */
  label?: string;
}

/** proto/Carousel (Figma 456:17) - the horizontal scroller: clipped row of 110px
 * poster cards (tall ecru image well, medium title, quiet meta).
 * role=group with aria-roledescription=carousel. */
export const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ items, label, className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className={cn('flex gap-3 overflow-x-auto pb-1', className)}
      {...props}
    >
      {items.map((it, i) => (
        <div key={`${it.title}-${i}`} className="flex w-[110px] shrink-0 flex-col gap-1.5">
          <div className="flex h-[140px] w-[110px] items-center justify-center overflow-hidden rounded-md bg-ecru">
            {it.src ? (
              <img src={it.src} alt={it.title} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-5 w-5 text-grey" strokeWidth={1.6} aria-hidden />
            )}
          </div>
          <span className="truncate font-title text-micro font-medium text-ink">{it.title}</span>
          {it.meta && <span className="truncate text-nano text-grey">{it.meta}</span>}
        </div>
      ))}
    </div>
  )
);
Carousel.displayName = 'Carousel';
