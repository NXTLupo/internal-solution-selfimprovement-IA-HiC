import * as React from 'react';
import { NavBar } from 'nxt-proto-ds';

export const ProductNav = () => (
  <NavBar
    brand="Corpus Desk"
    links={[
      { label: 'Research', active: true },
      { label: 'Sources' },
      { label: 'Briefs' },
      { label: 'Settings' },
    ]}
    cta="New research run"
    style={{ width: 760 }}
  />
);

export const MinimalBrand = () => (
  <NavBar brand="Corpus Desk" cta="Sign in" style={{ width: 760 }} />
);

export const WithTrailingMeta = () => (
  <NavBar
    brand="Corpus Desk"
    links={[{ label: 'Research' }, { label: 'Sources', active: true }]}
    trailing={<span style={{ fontSize: 12, opacity: 0.65, whiteSpace: 'nowrap' }}>214 sources indexed</span>}
    cta="Upload"
    style={{ width: 760 }}
  />
);
