import * as React from 'react';
import { Gallery } from 'nxt-proto-ds';

export const ThreeColumn = () => (
  <Gallery
    style={{ width: 320 }}
    items={[
      { alt: 'Site visit, loading dock' },
      { alt: 'North field after hail' },
      { alt: 'Irrigation pivot' },
      { alt: 'Grain storage interior' },
      { alt: 'Fence line damage' },
      { alt: 'Equipment shed' },
    ]}
  />
);

export const FourColumn = () => (
  <Gallery
    columns={4}
    style={{ width: 360 }}
    items={[
      { alt: 'Roof inspection' },
      { alt: 'Water line' },
      { alt: 'Soil sample' },
      { alt: 'Drainage ditch' },
    ]}
  />
);

export const TwoColumn = () => (
  <Gallery
    columns={2}
    style={{ width: 240 }}
    items={[{ alt: 'Barn exterior' }, { alt: 'Silo base' }]}
  />
);
