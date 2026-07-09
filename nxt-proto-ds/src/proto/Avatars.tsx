import * as React from 'react';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export interface AvatarPerson {
  /** Full name; drives the aria-label and derived initials. */
  name: string;
  /** Explicit initials; derived from the name when omitted. */
  initials?: string;
  /** Photo URL; initials fallback renders without one. */
  src?: string;
}

export interface AvatarsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The collaborators, in display order. */
  people: AvatarPerson[];
  /** How many circles to show before collapsing into "+N". */
  max?: number;
  /** Trailing caption; defaults to "N collaborators". */
  caption?: string;
}

const derive = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

/** proto/Avatars (Figma 454:50) - the stacked collaborator strip: overlapping 30px
 * circles with a paper ring, quiet initials fallbacks, accent "+N" overflow chip,
 * trailing collaborator count. */
export const Avatars = React.forwardRef<HTMLDivElement, AvatarsProps>(
  ({ people, max = 4, caption, className, ...props }, ref) => {
    const shown = people.slice(0, max);
    const overflow = people.length - shown.length;
    return (
      <div ref={ref} className={cn('flex items-center gap-2.5', className)} {...props}>
        <div className="flex -space-x-[9px]">
          {shown.map((p) => (
            <Avatar
              key={p.name}
              aria-label={p.name}
              className="h-[30px] w-[30px] ring-2 ring-paper"
            >
              {p.src && <AvatarImage src={p.src} alt={p.name} />}
              <AvatarFallback className="bg-muted text-nano text-grey">
                {p.initials ?? derive(p.name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {overflow > 0 && (
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-brand-accent font-title text-nano font-semibold text-on-brand-accent ring-2 ring-paper">
              +{overflow}
            </span>
          )}
        </div>
        <span className="text-nano text-grey">{caption ?? `${people.length} collaborators`}</span>
      </div>
    );
  }
);
Avatars.displayName = 'Avatars';
