import * as React from 'react';
import { MapViz } from 'nxt-proto-ds';

export const RegionCoverage = () => (
  <MapViz
    seed={7}
    title="Study coverage by region"
    regions={[{ label: 'Northeast' }, { label: 'Plains' }, { label: 'Pacific' }]}
    style={{ width: 360 }}
  />
);

export const TwoRegions = () => (
  <MapViz
    seed={23}
    title="Client footprint"
    regions={[{ label: 'Core markets' }, { label: 'Expansion' }]}
    legend={['Unserved']}
    style={{ width: 360 }}
  />
);
