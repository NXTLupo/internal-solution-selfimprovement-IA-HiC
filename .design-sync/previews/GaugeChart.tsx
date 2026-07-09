import * as React from 'react';
import { GaugeChart } from 'nxt-proto-ds';

export const DroughtProbability = () => (
  <GaugeChart
    title="Drought probability, Dawson County"
    value={72}
    label="of 100 risk index"
    style={{ width: 300 }}
  />
);

export const LowReading = () => (
  <GaugeChart
    title="Reserve utilization"
    value={34}
    label="of capacity"
    legend={['Current season']}
    style={{ width: 300 }}
  />
);
