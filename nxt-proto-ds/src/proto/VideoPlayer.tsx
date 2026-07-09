import * as React from 'react';
import { Maximize, Pause, Play } from 'lucide-react';
import { cn } from '../lib/utils';

export interface VideoPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accessible title of the video (labels the play control). */
  title?: string;
  /** Poster frame; omit to render the token-colored placeholder well. */
  posterSrc?: string;
  /** Playback position 0-100 (drives the seek fill). */
  progress?: number;
  /** Elapsed time label ("1:24"), mono in the control bar. */
  currentTime?: string;
  /** Total duration label ("4:10"), mono in the control bar. */
  duration?: string;
  /** Whether playback is active (swaps the control-bar icon). */
  playing?: boolean;
  onPlayToggle?: () => void;
  onFullscreen?: () => void;
}

/** proto/Video (Figma 466:2) - video player: 16:9 poster well with a centered accent
 * play button, plus a control bar carrying play/pause, mono timestamps, a hairline
 * seek track with accent fill, CC, and fullscreen. */
export const VideoPlayer = React.forwardRef<HTMLDivElement, VideoPlayerProps>(
  (
    {
      title = 'Video',
      posterSrc,
      progress = 0,
      currentTime = '0:00',
      duration = '0:00',
      playing = false,
      onPlayToggle,
      onFullscreen,
      className,
      ...props
    },
    ref
  ) => {
    const pct = Math.min(100, Math.max(0, progress));
    return (
      <div
        ref={ref}
        className={cn('flex flex-col overflow-hidden rounded-lg border border-hairline bg-rail', className)}
        {...props}
      >
        <div className="relative aspect-video w-full bg-ecru">
          {posterSrc && <img src={posterSrc} alt={title} className="absolute inset-0 h-full w-full object-cover" />}
          <button
            type="button"
            onClick={onPlayToggle}
            aria-label={playing ? 'Pause ' + title : 'Play ' + title}
            className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-accent transition-transform hover:scale-105"
          >
            {playing ? (
              <Pause className="h-5 w-5 text-on-brand-accent" strokeWidth={2} fill="currentColor" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current text-on-brand-accent" strokeWidth={0} />
            )}
          </button>
        </div>
        <div className="flex items-center gap-3 bg-muted px-3 py-2.5">
          <button
            type="button"
            onClick={onPlayToggle}
            aria-label={playing ? 'Pause' : 'Play'}
            className="text-ink hover:text-grey"
          >
            {playing ? (
              <Pause className="h-3.5 w-3.5" strokeWidth={2} fill="currentColor" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
            )}
          </button>
          <span className="font-mono text-nano text-grey">{currentTime}</span>
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-hairline"
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            tabIndex={0}
          >
            <div className="h-full rounded-full bg-brand-accent" style={{ width: pct + '%' }} />
          </div>
          <span className="font-mono text-nano text-grey">{duration}</span>
          <span className="font-mono text-nano font-semibold text-grey">CC</span>
          <button type="button" onClick={onFullscreen} aria-label="Fullscreen" className="text-ink hover:text-grey">
            <Maximize className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }
);
VideoPlayer.displayName = 'VideoPlayer';
