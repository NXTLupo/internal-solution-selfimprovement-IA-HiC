import * as React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export interface BentoTile {
  /** Tile heading. */
  title: string;
  /** Supporting line under the heading. */
  desc?: string;
  /** Optional lucide icon element rendered above the heading. */
  icon?: React.ReactNode;
  /** Spans two columns (the anatomy's asymmetric cell); defaults to the first tile. */
  wide?: boolean;
  /** Renders a media well inside the tile (placeholder unless imageSrc is set). */
  media?: boolean;
  /** Media image for the tile's well. */
  imageSrc?: string;
}

export interface BentoProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The tiles; mark one `wide` for the 2-column cell (defaults to the first). */
  tiles: BentoTile[];
}

/** proto/Bento (Figma 467:2) - bento mixed-size grid: soft panel tiles on a two-column
 * grid where one cell spans both columns, each tile a meaningful region with its own
 * heading; reading order matches the visual order. */
export const Bento = React.forwardRef<HTMLDivElement, BentoProps>(({ tiles, className, ...props }, ref) => {
  const hasExplicitWide = tiles.some((t) => t.wide);
  return (
    <div ref={ref} className={cn('grid grid-cols-2 gap-3', className)} {...props}>
      {tiles.map((tile, i) => {
        const wide = tile.wide ?? (!hasExplicitWide && i === 0);
        return (
          <section
            key={tile.title}
            className={cn('flex flex-col gap-2.5 rounded-lg bg-muted p-5', wide && 'col-span-2')}
          >
            {tile.icon && (
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-paper text-ink [&_svg]:h-4 [&_svg]:w-4" aria-hidden="true">
                {tile.icon}
              </span>
            )}
            <h3 className="font-title text-micro font-semibold leading-snug text-ink">{tile.title}</h3>
            {tile.desc && <p className="text-nano leading-relaxed text-grey">{tile.desc}</p>}
            {tile.imageSrc ? (
              <img src={tile.imageSrc} alt="" className="mt-auto aspect-video w-full rounded-md object-cover" />
            ) : (
              tile.media && (
                <div
                  className="mt-auto flex aspect-video w-full items-center justify-center rounded-md bg-ecru"
                  aria-hidden="true"
                >
                  <ImageIcon className="h-5 w-5 text-grey" strokeWidth={1.5} />
                </div>
              )
            )}
          </section>
        );
      })}
    </div>
  );
});
Bento.displayName = 'Bento';
