import * as React from 'react';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export interface StoryItem {
  /** Author name under the tile. */
  name: string;
  /** Avatar image for the story ring. */
  avatarSrc?: string;
  /** Marks the story as already viewed - the ring drops to hairline. */
  seen?: boolean;
}

export interface StoryProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The story tiles, in tray order. */
  items: StoryItem[];
  /** Fires with the item index when a story tile is opened. */
  onOpen?: (index: number) => void;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** proto/Story (Figma 466:52) - story tray: a horizontal strip of rounded story tiles,
 * each an avatar wrapped in a ring (accent for unseen, hairline once viewed) with the
 * author's name beneath. Every tile is a button that opens the story viewer. */
export const Story = React.forwardRef<HTMLDivElement, StoryProps>(({ items, onOpen, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex gap-4 overflow-x-auto rounded-lg border border-hairline bg-paper px-4 py-3', className)}
    {...props}
  >
    {items.map((item, i) => (
      <button
        key={item.name}
        type="button"
        onClick={() => onOpen?.(i)}
        aria-label={'Open story from ' + item.name + (item.seen ? ', viewed' : ', new')}
        className="flex shrink-0 flex-col items-center gap-1.5"
      >
        <span
          className={cn(
            'flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-paper',
            item.seen ? 'ring-hairline' : 'ring-brand-accent'
          )}
        >
          <Avatar className="h-10 w-10">
            {item.avatarSrc && <AvatarImage src={item.avatarSrc} alt="" />}
            <AvatarFallback>{initials(item.name)}</AvatarFallback>
          </Avatar>
        </span>
        <span className="max-w-[3.75rem] truncate text-nano text-ink">{item.name}</span>
      </button>
    ))}
  </div>
));
Story.displayName = 'Story';
