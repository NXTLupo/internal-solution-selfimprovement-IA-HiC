import * as React from 'react';
import { Heatmap } from 'nxt-proto-ds';

export const RiskByRegion = () => (
  <Heatmap
    title="Drought probability by region"
    rowLabels={['Dawson', 'Custer', 'Hall', 'Buffalo']}
    colLabels={['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']}
    data={[
      [12, 24, 46, 71, 88, 64],
      [8, 18, 39, 62, 74, 51],
      [15, 29, 52, 78, 92, 70],
      [6, 14, 31, 48, 60, 42],
    ]}
    style={{ width: 360 }}
  />
);

export const SparseGrid = () => (
  <Heatmap
    title="Claims filed by weekday"
    rowLabels={['Hail', 'Flood', 'Wind']}
    colLabels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
    data={[
      [14, 9, 0, 22, 17],
      [4, 0, 7, 11, 6],
      [0, 12, 8, 0, 19],
    ]}
    legend={['Cell shade scales with volume']}
    style={{ width: 340 }}
  />
);
