import * as React from 'react';
import { Carousel } from 'nxt-proto-ds';

export const ReportShelf = () => (
  <Carousel
    label="Quarterly briefings"
    style={{ width: 400 }}
    items={[
      { title: 'Drought outlook', meta: '12 min read' },
      { title: 'Claims by region', meta: 'Updated Mar' },
      { title: 'Plan benchmarks', meta: '6,000 plans' },
      { title: 'Input costs', meta: 'Weekly' },
    ]}
  />
);

export const ShortRow = () => (
  <Carousel
    style={{ width: 260 }}
    items={[
      { title: 'Field walkthrough', meta: 'S2 E4' },
      { title: 'Adjuster training', meta: '18 min' },
    ]}
  />
);
