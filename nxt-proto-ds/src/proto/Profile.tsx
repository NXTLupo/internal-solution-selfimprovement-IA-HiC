import * as React from 'react';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

export interface ProfileStat {
  /** The count as display text ("1.2k"). */
  value: string;
  /** What it counts ("followers"). */
  label: string;
}

export interface ProfileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Display name - the card's heading. */
  name: string;
  /** Handle without the @ ("mira.designs"). */
  handle: string;
  /** Role / descriptor appended after the handle ("Product designer"). */
  role?: string;
  /** Short bio paragraph. */
  bio?: string;
  /** Stat trio (posts / followers / following) as number+label pairs. */
  stats?: ProfileStat[];
  /** Avatar image. */
  avatarSrc?: string;
  /** Follow state (drives aria-pressed and the button style). */
  following?: boolean;
  onFollowToggle?: () => void;
  /** Button labels for the two follow states. */
  followLabel?: string;
  followingLabel?: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** proto/Profile (Figma 466:78) - profile header card: accent cover band, overlapping
 * ringed avatar, name + @handle · role row with a follow button, bio, and an inline
 * stat trio (posts / followers / following). */
export const Profile = React.forwardRef<HTMLDivElement, ProfileProps>(
  (
    {
      name,
      handle,
      role,
      bio,
      stats = [],
      avatarSrc,
      following = false,
      onFollowToggle,
      followLabel = 'Follow',
      followingLabel = 'Following',
      className,
      ...props
    },
    ref
  ) => (
    <div ref={ref} className={cn('overflow-hidden rounded-lg border border-hairline bg-paper', className)} {...props}>
      <div className="h-14 w-full bg-brand-accent" aria-hidden="true" />
      <div className="flex flex-col gap-3 px-5 pb-5">
        <div className="flex items-end justify-between">
          <Avatar className="-mt-7 h-16 w-16 ring-4 ring-paper">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={name} />}
            <AvatarFallback className="text-label">{initials(name)}</AvatarFallback>
          </Avatar>
          <Button
            size="sm"
            variant={following ? 'outline' : 'default'}
            aria-pressed={following}
            onClick={onFollowToggle}
            className="rounded-md"
          >
            {following ? followingLabel : followLabel}
          </Button>
        </div>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-title text-label font-semibold leading-tight text-ink">{name}</h2>
          <span className="text-nano text-grey">
            @{handle}
            {role && ' · ' + role}
          </span>
        </div>
        {bio && <p className="text-micro leading-relaxed text-ink">{bio}</p>}
        {stats.length > 0 && (
          <div className="flex items-center gap-6 pt-1">
            {stats.map((stat) => (
              <span key={stat.label} className="flex items-baseline gap-1.5">
                <span className="font-title text-micro font-semibold text-ink">{stat.value}</span>
                <span className="text-nano text-grey">{stat.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
);
Profile.displayName = 'Profile';
