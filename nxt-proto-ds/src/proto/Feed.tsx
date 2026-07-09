import * as React from 'react';
import { Heart, Image as ImageIcon, MessageCircle, Repeat2, Share } from 'lucide-react';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export interface FeedPost {
  /** Author display name. */
  name: string;
  /** Author handle without the @ ("mira.designs"). */
  handle: string;
  /** Relative timestamp ("2h"). */
  time: string;
  /** Post body text. */
  body: string;
  /** Attached image; omit and set `media` to show the placeholder well. */
  mediaSrc?: string;
  /** Render a media well even without a src (token-colored placeholder). */
  media?: boolean;
  /** Author avatar image. */
  avatarSrc?: string;
  /** Reaction counts rendered on the action chips ("128"). */
  likes?: string;
  comments?: string;
  reposts?: string;
}

export interface FeedProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The posts, newest first. */
  posts: FeedPost[];
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** proto/Feed (Figma 466:28) - social feed: stacked post cards with an avatar-led
 * header (name, @handle · time), body text, an optional media well, and a quiet
 * reaction chip row (like / comment / repost / share) with counts. */
export const Feed = React.forwardRef<HTMLDivElement, FeedProps>(({ posts, className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props}>
    {posts.map((post, i) => (
      <article key={i} className="flex flex-col gap-3 rounded-lg border border-hairline bg-paper p-4">
        <header className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9">
            {post.avatarSrc && <AvatarImage src={post.avatarSrc} alt={post.name} />}
            <AvatarFallback>{initials(post.name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-title text-micro font-semibold text-ink">{post.name}</span>
            <span className="truncate text-nano text-grey">
              @{post.handle} · {post.time}
            </span>
          </div>
        </header>
        <p className="text-micro leading-relaxed text-ink">{post.body}</p>
        {post.mediaSrc ? (
          <img src={post.mediaSrc} alt="" className="aspect-video w-full rounded-md object-cover" />
        ) : (
          post.media && (
            <div className="flex aspect-video w-full items-center justify-center rounded-md bg-ecru" aria-hidden="true">
              <ImageIcon className="h-6 w-6 text-grey" strokeWidth={1.5} />
            </div>
          )
        )}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={'Like' + (post.likes ? ', ' + post.likes + ' likes' : '')}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-nano text-grey transition-colors hover:bg-muted hover:text-ink"
          >
            <Heart className="h-3.5 w-3.5" strokeWidth={2} />
            {post.likes}
          </button>
          <button
            type="button"
            aria-label={'Comment' + (post.comments ? ', ' + post.comments + ' comments' : '')}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-nano text-grey transition-colors hover:bg-muted hover:text-ink"
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
            {post.comments}
          </button>
          <button
            type="button"
            aria-label={'Repost' + (post.reposts ? ', ' + post.reposts + ' reposts' : '')}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-nano text-grey transition-colors hover:bg-muted hover:text-ink"
          >
            <Repeat2 className="h-3.5 w-3.5" strokeWidth={2} />
            {post.reposts}
          </button>
          <span className="flex-1" />
          <button
            type="button"
            aria-label="Share"
            className="flex items-center rounded-full px-2.5 py-1 text-grey transition-colors hover:bg-muted hover:text-ink"
          >
            <Share className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </article>
    ))}
  </div>
));
Feed.displayName = 'Feed';
