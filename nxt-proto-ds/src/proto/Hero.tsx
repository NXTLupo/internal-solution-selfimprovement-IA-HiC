import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';

export interface HeroProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The headline - one plain judgment sentence, display face. */
  headline: string;
  /** Support line under the headline. */
  sub?: string;
  /** Primary action label (accent). */
  cta?: string;
  onCtaClick?: () => void;
  /** Secondary action label (outline). */
  secondaryCta?: string;
  onSecondaryClick?: () => void;
  /** Kicker line above the headline (mono, uppercase). */
  kicker?: string;
  /** Center (default, the Figma anatomy) or left-align the block. */
  align?: 'center' | 'left';
}

/** proto/Hero (Figma 465:57) - the page opener on the ecru wash: display-face
 * headline, support line, accent + outline CTA pair. */
export const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  (
    { headline, sub, cta, onCtaClick, secondaryCta, onSecondaryClick, kicker, align = 'center', className, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-3 rounded-lg bg-ecru px-7 py-8',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className
      )}
      {...props}
    >
      {kicker && (
        <span className="font-mono text-nano font-semibold uppercase tracking-widest text-cyan">{kicker}</span>
      )}
      <h1 className="max-w-2xl font-display text-[length:var(--type-scale-name)] font-semibold leading-tight text-ink">
        {headline}
      </h1>
      {sub && <p className="max-w-xl text-micro leading-relaxed text-grey">{sub}</p>}
      {(cta || secondaryCta) && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {cta && (
            <Button onClick={onCtaClick} className="rounded-md">
              {cta}
            </Button>
          )}
          {secondaryCta && (
            <Button variant="outline" onClick={onSecondaryClick} className="rounded-md">
              {secondaryCta}
            </Button>
          )}
        </div>
      )}
    </div>
  )
);
Hero.displayName = 'Hero';
