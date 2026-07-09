import * as React from 'react';
import { Model } from 'nxt-proto-ds';

const MODELS = [
  { name: 'Instant', description: 'Fast answers for corpus lookups' },
  { name: 'Analyst', description: 'Deeper reasoning over long documents' },
  { name: 'Deep Research', description: 'Multi-source synthesis with citations' },
];

export const ClosedTrigger = () => (
  <Model value="Analyst" options={MODELS} />
);

export const OpenListbox = () => (
  <Model value="Analyst" options={MODELS} open style={{ minWidth: 280 }} />
);
