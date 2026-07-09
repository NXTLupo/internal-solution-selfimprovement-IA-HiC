import * as React from 'react';
import { Story } from 'nxt-proto-ds';

export const TeamTray = () => (
  <Story
    style={{ width: 480 }}
    items={[
      { name: 'Priya' },
      { name: 'Marcus', seen: true },
      { name: 'Dana' },
      { name: 'Elena' },
      { name: 'Sam', seen: true },
      { name: 'Jordan' },
    ]}
  />
);

export const AllUnseen = () => (
  <Story
    style={{ width: 360 }}
    items={[{ name: 'Field team' }, { name: 'Benchmarks' }, { name: 'Client desk' }, { name: 'Methods' }]}
  />
);
