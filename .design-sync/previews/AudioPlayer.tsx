import * as React from 'react';
import { AudioPlayer } from 'nxt-proto-ds';

export const PlayingMidTrack = () => (
  <AudioPlayer
    title="Field notes: claims data in plan design"
    artist="The Benefits Desk"
    progress={62}
    duration="34:12"
    playing
    style={{ width: 560 }}
  />
);

export const PausedAtStart = () => (
  <AudioPlayer
    title="Partner briefing, week of March 9"
    artist="Research operations"
    progress={0}
    duration="12:48"
    style={{ width: 560 }}
  />
);
