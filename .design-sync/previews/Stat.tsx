import * as React from 'react';
import { Stat, StatRow } from 'nxt-proto-ds';

export const Single = () => (
  <Stat
    style={{ maxWidth: 220 }}
    label="Benefits spend under management"
    value="$3.8T"
    sub="US employer market, 2026"
  />
);

export const WithDelta = () => (
  <Stat
    style={{ maxWidth: 220 }}
    label="Sources indexed"
    value="214"
    delta="18%"
    deltaDirection="up"
    sub="vs. last engagement"
  />
);

export const DownDelta = () => (
  <Stat
    style={{ maxWidth: 220 }}
    label="Unresolved citations"
    value="7"
    delta="12"
    deltaDirection="down"
    sub="vs. last run"
  />
);

export const KpiBand = () => (
  <StatRow
    style={{ maxWidth: 560 }}
    stats={[
      { label: 'Engagements this quarter', value: '23', delta: '4', deltaDirection: 'up' },
      { label: 'Median run time', value: '11m', delta: '2m', deltaDirection: 'down', sub: 'faster than Q2' },
      { label: 'Evidence coverage', value: '92%', sub: 'external-source floor met' },
    ]}
  />
);
