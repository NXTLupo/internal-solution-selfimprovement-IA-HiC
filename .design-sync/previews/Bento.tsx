import * as React from 'react';
import { Bento } from 'nxt-proto-ds';
import { FileSearch, LineChart, ShieldCheck } from 'lucide-react';

export const CapabilityGrid = () => (
  <Bento
    style={{ width: 560 }}
    tiles={[
      {
        title: 'Evidence-linked reports',
        desc: 'Every claim traces back to a named source, so partners can defend the finding in the room.',
        icon: <FileSearch />,
        wide: true,
      },
      {
        title: 'Live benchmarks',
        desc: 'Plan-mix and cost curves refresh weekly.',
        icon: <LineChart />,
      },
      {
        title: 'Client-safe sharing',
        desc: 'Redaction and access rules per engagement.',
        icon: <ShieldCheck />,
      },
    ]}
  />
);

export const WithMediaTile = () => (
  <Bento
    style={{ width: 560 }}
    tiles={[
      {
        title: 'The quarterly review, assembled overnight',
        desc: 'Draft decks arrive with citations attached, ready for the partner pass.',
        media: true,
        wide: true,
      },
      { title: 'Source tracking', desc: 'Named citations on every page.' },
      { title: 'Team workspaces', desc: 'One corpus per engagement.' },
    ]}
  />
);
