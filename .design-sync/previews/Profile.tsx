import * as React from 'react';
import { Profile } from 'nxt-proto-ds';

export const AnalystProfile = () => (
  <Profile
    name="Priya Raman"
    handle="priya.research"
    role="Senior research analyst"
    bio="Benefits and workforce research. I publish the weekly benchmark brief and keep the evidence library honest."
    stats={[
      { value: '312', label: 'briefs' },
      { value: '4.1k', label: 'followers' },
      { value: '188', label: 'following' },
    ]}
    style={{ width: 380 }}
  />
);

export const FollowingState = () => (
  <Profile
    name="Marcus Bell"
    handle="mbell.ops"
    role="Research operations"
    bio="Keeps the corpus pipeline running."
    following
    stats={[
      { value: '96', label: 'briefs' },
      { value: '1.2k', label: 'followers' },
    ]}
    style={{ width: 380 }}
  />
);
