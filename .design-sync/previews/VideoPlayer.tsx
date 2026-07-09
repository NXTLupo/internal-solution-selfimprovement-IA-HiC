import * as React from 'react';
import { VideoPlayer } from 'nxt-proto-ds';

export const PlayingMid = () => (
  <VideoPlayer
    title="Workbench walkthrough"
    progress={38}
    currentTime="1:24"
    duration="4:10"
    playing
    style={{ width: 480 }}
  />
);

export const PausedStart = () => (
  <VideoPlayer
    title="Partner briefing recording"
    progress={0}
    currentTime="0:00"
    duration="22:05"
    style={{ width: 480 }}
  />
);
