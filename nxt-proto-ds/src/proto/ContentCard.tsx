import * as React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';

export interface ContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card title - the item name, semibold. */
  title: string;
  /** Category pill above the title ("Playbook", "Case study"). */
  category?: string;
  /** Support copy under the title. */
  support?: string;
  /** Media image; omitted renders the token-colored placeholder well. */
  src?: string;
  /** Alt text for the media image. */
  imageAlt?: string;
  /** Primary action label (accent); omit to hide the action row. */
  primaryAction?: string;
  onPrimaryClick?: () => void;
  /** Secondary action label (outline). */
  secondaryAction?: string;
  onSecondaryClick?: () => void;
}

/** proto/Card (Figma 454:27) - the browsable content card: ecru media well, quiet
 * category pill, semibold title, grey support line, accent + outline action pair.
 * Named ContentCard because the structural shadcn Card primitive owns "Card". */
export const ContentCard = React.forwardRef<HTMLDivElement, ContentCardProps>(
  (
    {
      title,
      category,
      support,
      src,
      imageAlt,
      primaryAction,
      onPrimaryClick,
      secondaryAction,
      onSecondaryClick,
      className,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-2.5 rounded-lg border border-hairline bg-paper p-3.5', className)}
      {...props}
    >
      <div className="flex h-[72px] w-full items-center justify-center overflow-hidden rounded-md bg-ecru">
        {src ? (
          <img src={src} alt={imageAlt ?? title} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-grey" strokeWidth={1.6} aria-hidden />
        )}
      </div>
      {category && (
        <span className="self-start rounded-full bg-muted px-2.5 py-0.5 font-title text-nano font-medium text-grey">
          {category}
        </span>
      )}
      <span className="font-title text-label font-semibold leading-snug text-ink">{title}</span>
      {support && <p className="text-micro leading-relaxed text-grey">{support}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="mt-auto flex items-center gap-2 pt-1">
          {primaryAction && (
            <Button size="sm" onClick={onPrimaryClick} className="rounded-sm">
              {primaryAction}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="outline" onClick={onSecondaryClick} className="rounded-sm">
              {secondaryAction}
            </Button>
          )}
        </div>
      )}
    </div>
  )
);
ContentCard.displayName = 'ContentCard';
