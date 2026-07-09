import * as React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export interface GalleryItem {
  /** Accessible name for the thumbnail ("Site visit - loading dock"). */
  alt: string;
  /** Image URL; omitted renders the token-colored placeholder tile. */
  src?: string;
}

export interface GalleryProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The thumbnails, in grid order. */
  items: GalleryItem[];
  /** Grid column count. */
  columns?: 2 | 3 | 4;
  /** Called with the tile index; tiles open a lightbox upstream. */
  onItemClick?: (index: number) => void;
}

/** proto/Gallery (Figma 456:48) - the thumbnail grid: square ecru tiles in a tight
 * 3-column wrap; each tile is a button that opens a lightbox upstream. */
export const Gallery = React.forwardRef<HTMLDivElement, GalleryProps>(
  ({ items, columns = 3, onItemClick, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'grid gap-1.5',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
        className
      )}
      {...props}
    >
      {items.map((it, i) => (
        <button
          key={`${it.alt}-${i}`}
          type="button"
          aria-label={it.alt}
          onClick={onItemClick ? () => onItemClick(i) : undefined}
          className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-ecru transition-opacity hover:opacity-90"
        >
          {it.src ? (
            <img src={it.src} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-grey" strokeWidth={1.6} aria-hidden />
          )}
        </button>
      ))}
    </div>
  )
);
Gallery.displayName = 'Gallery';
