import * as React from 'react';
import { Drawer } from 'nxt-proto-ds';

// The component's own bg-rail/60 scrim class is missing from the built CSS
// (tailwind config defines rail without <alpha-value>, safelist is exact-match),
// so the scrim wash is reproduced here from the same rail token.
const scrimFill: React.CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--color-rail) 60%, transparent)',
};

export const FilterPanel = () => (
  <Drawer
    title="Filter claims"
    body="Narrow the board to a peril, county, or adjuster. Filters apply to every column at once."
    actionLabel="Apply filters"
    style={{ width: 480, height: 320, ...scrimFill }}
  />
);

export const LeftSide = () => (
  <Drawer
    side="left"
    title="Report settings"
    body="Choose the counties and seasons included in the exported risk report."
    actionLabel="Save settings"
    style={{ width: 480, height: 320, ...scrimFill }}
  />
);
