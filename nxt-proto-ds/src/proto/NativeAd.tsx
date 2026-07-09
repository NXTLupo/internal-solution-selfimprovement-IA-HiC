import * as React from 'react';
import { Image as ImageIcon, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

export interface NativeAdProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Advertiser name in the header row. */
  advertiser: string;
  /** Promoted headline. */
  title: string;
  /** Supporting body copy. */
  body?: string;
  /** Creative image; omit to render the token-colored placeholder well. */
  mediaSrc?: string;
  /** Call-to-action label; omit to hide the button. */
  cta?: string;
  onCtaClick?: () => void;
  /** Advertiser avatar image. */
  avatarSrc?: string;
  /** Disclosure text under the advertiser name. */
  sponsoredLabel?: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** proto/NativeAd (Figma 467:41) - feed-matched sponsored card: shaped like a feed post
 * (avatar header, media well, body) but carrying a visible nano "Sponsored" disclosure
 * and an info affordance, so it matches the feed format without impersonating it. */
export const NativeAd = React.forwardRef<HTMLDivElement, NativeAdProps>(
  (
    {
      advertiser,
      title,
      body,
      mediaSrc,
      cta,
      onCtaClick,
      avatarSrc,
      sponsoredLabel = 'Sponsored',
      className,
      ...props
    },
    ref
  ) => (
    <article
      ref={ref}
      className={cn('flex flex-col gap-3 rounded-lg border border-hairline bg-paper p-4', className)}
      {...props}
    >
      <header className="flex items-center gap-2.5">
        <Avatar className="h-9 w-9">
          {avatarSrc && <AvatarImage src={avatarSrc} alt={advertiser} />}
          <AvatarFallback>{initials(advertiser)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-title text-micro font-semibold text-ink">{advertiser}</span>
          <span className="text-nano text-grey">{sponsoredLabel}</span>
        </div>
        <button type="button" aria-label="Why this ad" className="text-grey hover:text-ink">
          <Info className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </header>
      {mediaSrc ? (
        <img src={mediaSrc} alt="" className="aspect-video w-full rounded-md object-cover" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-md bg-ecru" aria-hidden="true">
          <ImageIcon className="h-6 w-6 text-grey" strokeWidth={1.5} />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="font-title text-micro font-semibold leading-snug text-ink">{title}</h3>
        {body && <p className="text-nano leading-relaxed text-grey">{body}</p>}
      </div>
      {cta && (
        <Button variant="outline" size="sm" onClick={onCtaClick} className="w-full rounded-md">
          {cta}
        </Button>
      )}
    </article>
  )
);
NativeAd.displayName = 'NativeAd';
