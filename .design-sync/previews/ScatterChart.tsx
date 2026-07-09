import * as React from 'react';
import { ScatterChart } from 'nxt-proto-ds';

export const CostVsSatisfaction = () => (
  <ScatterChart
    title="Plan cost vs member satisfaction"
    style={{ width: 360 }}
    points={[
      { x: 12, y: 62 },
      { x: 18, y: 58 },
      { x: 22, y: 71 },
      { x: 27, y: 66 },
      { x: 31, y: 74 },
      { x: 35, y: 69 },
      { x: 41, y: 80 },
      { x: 46, y: 77 },
      { x: 52, y: 84 },
      { x: 58, y: 79 },
      { x: 63, y: 88 },
      { x: 70, y: 83 },
    ]}
  />
);

export const WithLegend = () => (
  <ScatterChart
    title="Engagement hours vs findings cited"
    legend={['Engagements, trailing year']}
    style={{ width: 360 }}
    points={[
      { x: 40, y: 12 },
      { x: 55, y: 18 },
      { x: 62, y: 15 },
      { x: 78, y: 26 },
      { x: 84, y: 22 },
      { x: 95, y: 31 },
      { x: 110, y: 28 },
      { x: 125, y: 39 },
    ]}
  />
);
