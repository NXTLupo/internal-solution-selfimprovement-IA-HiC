import * as React from 'react';
import { BarChart } from 'nxt-proto-ds';

export const ClaimsByCategory = () => (
  <BarChart
    title="Claims by category, Q1"
    data={[
      { label: 'Hail', value: 342 },
      { label: 'Flood', value: 218 },
      { label: 'Wind', value: 187 },
      { label: 'Drought', value: 96 },
      { label: 'Fire', value: 41 },
    ]}
    style={{ width: 360 }}
  />
);

export const WithLegend = () => (
  <BarChart
    title="Enrollment by plan tier"
    data={[
      { label: 'Bronze', value: 1240 },
      { label: 'Silver', value: 2860 },
      { label: 'Gold', value: 1975 },
      { label: 'Platinum', value: 640 },
    ]}
    legend={['Active members']}
    style={{ width: 360 }}
  />
);
