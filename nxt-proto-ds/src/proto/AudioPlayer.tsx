import * as React from 'react';
import { Music, Pause, Play } from 'lucide-react';
import { cn } from '../lib/utils';

const BAR_COUNT = 24;
/** Deterministic waveform silhouette (px heights) - pure geometry, no data claim. */
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => 6 + Math.round(9 * Math.abs(Math.sin(i * 1.7 + 0.6))));

export interface AudioPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Track title. */
  title: string;
  /** Artist / show line under the title. */
  artist?: string;
  /** Album art; omit to render the token-colored placeholder well. */
  artSrc?: string;
  /** Played portion 0-100: waveform bars up to this point fill accent, the rest hairline. */
  progress?: number;
  /** Duration label ("3:42"), mono at the row's end. */
  duration?: string;
  /** Whether playback is active (swaps the play-button icon). */
  playing?: boolean;
  onPlayToggle?: () => void;
}

/** proto/Audio (Figma 466:16) - compact audio player row: accent play button, album-art
 * well, title + artist stack, a thin-bar waveform (accent for the played portion,
 * hairline for the rest), and a mono duration. */
export const AudioPlayer = React.forwardRef<HTMLDivElement, AudioPlayerProps>(
  ({ title, artist, artSrc, progress = 0, duration, playing = false, onPlayToggle, className, ...props }, ref) => {
    const playedBars = Math.round((Math.min(100, Math.max(0, progress)) / 100) * BAR_COUNT);
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-3 rounded-lg border border-hairline bg-paper px-4 py-3', className)}
        {...props}
      >
        <button
          type="button"
          onClick={onPlayToggle}
          aria-label={playing ? 'Pause ' + title : 'Play ' + title}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-accent transition-transform hover:scale-105"
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5 text-on-brand-accent" strokeWidth={2} fill="currentColor" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current text-on-brand-accent" strokeWidth={0} />
          )}
        </button>
        {artSrc ? (
          <img src={artSrc} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ecru" aria-hidden="true">
            <Music className="h-4 w-4 text-grey" strokeWidth={1.5} />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-title text-micro font-semibold text-ink">{title}</span>
          {artist && <span className="truncate text-nano text-grey">{artist}</span>}
        </div>
        <div
          className="flex flex-1 items-center gap-[2px]"
          role="slider"
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          tabIndex={0}
        >
          {BAR_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className={cn('w-[2.5px] flex-1 rounded-full', i < playedBars ? 'bg-brand-accent' : 'bg-hairline')}
              style={{ height: h, maxWidth: 4 }}
            />
          ))}
        </div>
        {duration && <span className="shrink-0 font-mono text-nano text-grey">{duration}</span>}
      </div>
    );
  }
);
AudioPlayer.displayName = 'AudioPlayer';
