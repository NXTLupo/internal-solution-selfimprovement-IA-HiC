import * as React from 'react';
import { Tree } from 'nxt-proto-ds';

export const WikiHierarchy = () => (
  <Tree
    style={{ maxWidth: 320 }}
    label="Engagement wiki"
    nodes={[
      {
        label: 'evidence',
        children: [
          { label: 'themes', children: [{ label: 'preventive-care-gaps.md' }, { label: 'plan-literacy.md' }] },
          { label: 'quotes.md' },
        ],
      },
      {
        label: 'synthesis',
        children: [{ label: 'cross-engagement-patterns.md' }, { label: 'learned-constraints.md' }],
      },
      { label: 'log.md' },
    ]}
  />
);

export const Collapsed = () => (
  <Tree
    style={{ maxWidth: 320 }}
    nodes={[
      {
        label: 'sources',
        defaultCollapsed: true,
        children: [{ label: 'uploads' }, { label: 'packs' }],
      },
      {
        label: 'sessions',
        children: [{ label: '2026-07-08-benefits-run.json' }],
      },
    ]}
  />
);
