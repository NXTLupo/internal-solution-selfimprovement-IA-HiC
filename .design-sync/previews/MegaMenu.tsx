import * as React from 'react';
import { MegaMenu } from 'nxt-proto-ds';

export const Products = () => (
  <MegaMenu
    style={{ maxWidth: 440 }}
    label="Products"
    secondaryLabels={['Solutions', 'Resources']}
    items={[
      { label: 'Research runs' },
      { label: 'Strategy decks' },
      { label: 'Persona sets' },
      { label: 'Journey maps' },
      { label: 'Source packs' },
      { label: 'Evidence graph' },
    ]}
  />
);

export const ShortPanel = () => (
  <MegaMenu
    style={{ maxWidth: 360 }}
    label="Workspace"
    secondaryLabels={['Admin']}
    items={[
      { label: 'Members' },
      { label: 'Billing' },
      { label: 'Integrations' },
    ]}
  />
);
