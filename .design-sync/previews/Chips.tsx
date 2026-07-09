import * as React from 'react';
import { Chips } from 'nxt-proto-ds';

export const SourceFilters = () => (
  <Chips
    style={{ maxWidth: 420 }}
    chips={[
      { label: 'Academic', selected: true },
      { label: 'News' },
      { label: 'Government', selected: true },
      { label: 'Social' },
      { label: 'Client uploads' },
    ]}
    onToggle={() => {}}
  />
);

export const AllQuiet = () => (
  <Chips
    style={{ maxWidth: 420 }}
    chips={[
      { label: 'Last 30 days' },
      { label: 'Has quotes' },
      { label: 'Cited in deck' },
    ]}
  />
);
