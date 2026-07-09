import * as React from 'react';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export interface TestimonialProps extends React.HTMLAttributes<HTMLElement> {
  /** The customer quote - clean, complete sentence(s), no surrounding quote marks needed. */
  quote: string;
  /** Who said it. */
  name: string;
  /** Role / company line under the name ("Head of Ops, Fieldstone"). */
  role?: string;
  /** Author avatar image. */
  avatarSrc?: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** proto/Testimonial (Figma 467:16) - customer quote card: figure/blockquote with a
 * large title-face quote and a figcaption attribution row of avatar, name, and role. */
export const Testimonial = React.forwardRef<HTMLElement, TestimonialProps>(
  ({ quote, name, role, avatarSrc, className, ...props }, ref) => (
    <figure
      ref={ref}
      className={cn('flex flex-col gap-4 rounded-lg border border-hairline bg-paper p-6', className)}
      {...props}
    >
      <blockquote className="font-title text-label font-medium leading-relaxed text-ink">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="flex items-center gap-2.5">
        <Avatar className="h-9 w-9">
          {avatarSrc && <AvatarImage src={avatarSrc} alt="" />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="flex flex-col">
          <span className="font-title text-micro font-semibold text-ink">{name}</span>
          {role && <span className="text-nano text-grey">{role}</span>}
        </span>
      </figcaption>
    </figure>
  )
);
Testimonial.displayName = 'Testimonial';
