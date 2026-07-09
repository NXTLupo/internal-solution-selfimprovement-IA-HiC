import * as React from 'react';
import { FeatureGrid } from 'nxt-proto-ds';
import { BookOpenCheck, Layers, Quote, Share2 } from 'lucide-react';

export const ThreeColumn = () => (
  <FeatureGrid
    style={{ width: 640 }}
    features={[
      {
        title: 'Cited answers',
        desc: 'Every response names its sources inline, so review takes minutes instead of days.',
        icon: <Quote />,
      },
      {
        title: 'Corpus management',
        desc: 'Upload client files next to two hundred external articles per engagement.',
        icon: <Layers />,
      },
      {
        title: 'Deck export',
        desc: 'Findings land as editable slides in the house template.',
        icon: <Share2 />,
      },
    ]}
  />
);

export const TwoColumn = () => (
  <FeatureGrid
    columns={2}
    style={{ width: 520 }}
    features={[
      {
        title: 'Reading queue',
        desc: 'Analysts triage new sources before they enter the evidence base.',
        icon: <BookOpenCheck />,
      },
      {
        title: 'Default bolt icon',
        desc: 'Cells fall back to the bolt when no icon is passed.',
      },
    ]}
  />
);
