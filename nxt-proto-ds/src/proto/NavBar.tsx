import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';

export interface NavBarLink {
  label: string;
  href?: string;
  /** Marks the current page (aria-current) - rendered ink + medium. */
  active?: boolean;
}

export interface NavBarProps extends React.HTMLAttributes<HTMLElement> {
  /** Brand wordmark text (left slot). */
  brand: string;
  links?: NavBarLink[];
  /** Primary action label; omit to hide the accent button. */
  cta?: string;
  onCtaClick?: () => void;
  /** Right-side extras (search field, avatar) rendered before the CTA. */
  trailing?: React.ReactNode;
}

/** proto/NavBar (Figma 440:2) - the persistent top navigation: brand wordmark,
 * links (active carries aria-current), flex spacer, accent primary action.
 * Every multi-screen experience carries one. */
export const NavBar = React.forwardRef<HTMLElement, NavBarProps>(
  ({ brand, links = [], cta, onCtaClick, trailing, className, ...props }, ref) => (
    <nav
      ref={ref}
      className={cn('flex w-full items-center gap-5 border-b border-hairline bg-paper px-4 py-3', className)}
      {...props}
    >
      <span className="whitespace-nowrap font-title text-label font-semibold text-ink">{brand}</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href || '#'}
          aria-current={l.active ? 'page' : undefined}
          className={cn(
            'whitespace-nowrap text-micro transition-colors',
            l.active ? 'font-title font-medium text-ink' : 'font-body text-grey hover:text-ink'
          )}
        >
          {l.label}
        </a>
      ))}
      <span className="flex-1" />
      {trailing}
      {cta && (
        <Button size="sm" onClick={onCtaClick} className="rounded-sm">
          {cta}
        </Button>
      )}
    </nav>
  )
);
NavBar.displayName = 'NavBar';
