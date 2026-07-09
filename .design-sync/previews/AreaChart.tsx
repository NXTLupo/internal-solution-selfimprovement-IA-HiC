import * as React from 'react';
import { AreaChart } from 'nxt-proto-ds';

export const CumulativePayouts = () => (
  <AreaChart
    title="Cumulative payouts, season to date"
    series={[120, 340, 610, 890, 1240, 1580, 2050, 2410]}
    labels={['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']}
    style={{ width: 360 }}
  />
);

export const WithLegend = () => (
  <AreaChart
    title="Soil moisture index"
    series={[48, 52, 61, 58, 66, 72, 69]}
    legend={['County average']}
    style={{ width: 360 }}
  />
);
