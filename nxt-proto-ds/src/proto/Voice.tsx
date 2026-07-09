import * as React from 'react';
import { Mic } from 'lucide-react';
import { cn } from '../lib/utils';

const BAR_HEIGHTS = [10, 18, 26, 32, 24, 16, 9];

export interface VoiceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Status line under the waveform, e.g. "Listening...". */
  label: string;
  /** Accessible name for the mic button. */
  micLabel?: string;
  onMicClick?: () => void;
}

/** proto/Voice (Figma 412:33) - voice input: centered accent mic button, a 7-bar
 * accent waveform, and a quiet grey status line ("Listening..."). */
export const Voice = React.forwardRef<HTMLDivElement, VoiceProps>(
  ({ label, micLabel = 'Voice input', onMicClick, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col items-center gap-3', className)} {...props}>
      <button
        type="button"
        aria-label={micLabel}
        onClick={onMicClick}
        className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-brand-accent text-on-brand-accent"
      >
        <Mic className="h-5 w-5" strokeWidth={2} />
      </button>
      <div className="flex items-center gap-1" aria-hidden>
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-brand-accent"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <span className="text-nano text-grey">{label}</span>
    </div>
  )
);
Voice.displayName = 'Voice';
